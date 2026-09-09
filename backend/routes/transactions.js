const express = require('express');
const Transaction = require('../models/Transaction');
const Patient = require('../models/Patient');
const { auth, adminOnly, doctorOrAdmin } = require('../middleware/auth');
const {
    getDiagnosisPaymentAmount
} = require('../utils/finance');

const router = express.Router();

const PatientDiagnosis = require('../models/PatientDiagnosis');
let accountingSyncPromise = null;
let accountingSyncDone = false;

async function cleanupDuplicateDiagnoses() {
    try {
        const activeDiagnoses = await PatientDiagnosis.find({ isActive: true }).sort({ createdAt: 1 }).lean();
        const grouped = new Map();

        for (const diag of activeDiagnoses) {
            const pid = diag.patient ? diag.patient.toString() : '';
            const name = (diag.diagnosisName || '').trim().toLowerCase();
            const key = `${pid}:${name}:${diag.totalAmount || 0}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(diag);
        }

        const duplicateIds = [];
        for (const list of grouped.values()) {
            if (list.length < 2) continue;
            const firstTime = new Date(list[0].createdAt || 0).getTime();
            for (let i = 1; i < list.length; i++) {
                const itemTime = new Date(list[i].createdAt || 0).getTime();
                if (Math.abs(itemTime - firstTime) <= 5 * 60 * 1000) {
                    duplicateIds.push(list[i]._id);
                }
            }
        }

        if (duplicateIds.length > 0) {
            console.log(`🧹 Cleaning up ${duplicateIds.length} duplicate PatientDiagnosis entries...`);
            await PatientDiagnosis.updateMany(
                { _id: { $in: duplicateIds } },
                { $set: { isActive: false } }
            );
            await Transaction.deleteMany({ patientDiagnosis: { $in: duplicateIds } });
        }
    } catch (e) {
        console.error('Error cleaning up duplicate diagnoses:', e);
    }
}

async function ensureAccountingSync(creatorId = null) {
    await cleanupDuplicateDiagnoses();
    if (accountingSyncDone && !accountingSyncPromise) return;
    if (!accountingSyncPromise) {
        accountingSyncPromise = (async () => {
            const activePatientIds = await Patient.distinct('_id');

            const activeDiagnoses = await PatientDiagnosis.find({
                isActive: true,
                patient: { $in: activePatientIds }
            }).select('patient diagnosisName totalAmount diagnosisPrices discount discountPercent paymentMethod createdAt doctor').lean();

            const activeDiagnosisIds = activeDiagnoses.map(d => d._id);

            const deleteQuery = [];
            if (activePatientIds.length > 0) {
                deleteQuery.push({ patient: { $exists: true, $ne: null, $nin: activePatientIds } });
            }
            if (activeDiagnosisIds.length > 0) {
                deleteQuery.push({ patientDiagnosis: { $exists: true, $ne: null, $nin: activeDiagnosisIds } });
            }
            if (deleteQuery.length > 0) {
                await Transaction.deleteMany({ $or: deleteQuery });
            }

            let defaultCreatorId = creatorId;
            if (!defaultCreatorId) {
                const User = require('../models/User');
                const adminUser = await User.findOne({ role: 'admin' }).select('_id').lean();
                if (adminUser) defaultCreatorId = adminUser._id;
            }

            const existingTx = await Transaction.find({
                patientDiagnosis: { $in: activeDiagnosisIds }
            }).select('patientDiagnosis amount paymentMethod').lean();

            const existingMap = new Map();
            existingTx.forEach(tx => {
                if (tx.patientDiagnosis) {
                    existingMap.set(tx.patientDiagnosis.toString(), tx);
                }
            });

            const bulkOps = [];
            const toDeleteIds = [];

            for (const diagnosis of activeDiagnoses) {
                const amount = getDiagnosisPaymentAmount(diagnosis);
                if (amount <= 0) {
                    toDeleteIds.push(diagnosis._id);
                    continue;
                }

                const existing = existingMap.get(diagnosis._id.toString());
                const paymentMethod = diagnosis.paymentMethod || 'cash';

                if (existing && existing.amount === amount && existing.paymentMethod === paymentMethod) {
                    continue;
                }

                const discountPercent = diagnosis.discountPercent || 0;
                const discountStr = discountPercent > 0 ? ` (${discountPercent}% chegirma)` : '';
                const createdBy = diagnosis.doctor?._id || diagnosis.doctor || defaultCreatorId;

                bulkOps.push({
                    updateOne: {
                        filter: { patientDiagnosis: diagnosis._id },
                        update: {
                            $set: {
                                type: 'income',
                                category: 'service',
                                amount,
                                description: `Analiz: ${diagnosis.diagnosisName || ''}${discountStr}`.trim(),
                                patient: diagnosis.patient,
                                patientDiagnosis: diagnosis._id,
                                paymentMethod,
                                date: diagnosis.createdAt || new Date(),
                                ...(createdBy ? { createdBy } : {})
                            }
                        },
                        upsert: true
                    }
                });
            }

            if (toDeleteIds.length > 0) {
                bulkOps.push({
                    deleteMany: {
                        filter: { patientDiagnosis: { $in: toDeleteIds } }
                    }
                });
            }

            if (bulkOps.length > 0) {
                await Transaction.bulkWrite(bulkOps);
            }

            accountingSyncDone = true;
        })().catch(err => {
            accountingSyncDone = false;
            console.error('Accounting sync error:', err);
        }).finally(() => {
            accountingSyncPromise = null;
        });
    }
    return accountingSyncPromise;
}

async function buildAccountingEntries(filter, creatorId = null) {
    await ensureAccountingSync(creatorId);

    return Transaction.find(filter)
        .populate('patient', 'fullName')
        .populate('patientDiagnosis', 'diagnosisName totalAmount diagnosisPrices discount discountPercent paymentMethod createdAt')
        .populate('medicine', 'name')
        .populate('createdBy', 'fullName')
        .sort({ date: -1 })
        .lean();
}
// Get all transactions
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const { startDate, endDate, type, category } = req.query;
        const filter = {};

        if (type) filter.type = type;
        if (category) filter.category = category;

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        // Only include transactions for active (existing) patients
        const transactions = await buildAccountingEntries(filter, req.user._id);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get summary statistics
router.get('/summary', auth, adminOnly, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const filter = {};

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        // Only include transactions for active (existing) patients
        const transactions = await buildAccountingEntries(filter, req.user._id);

        const summary = {
            totalIncome: 0,
            totalExpense: 0,
            netProfit: 0,
            byCategory: {}
        };

        transactions.forEach(t => {
            if (t.type === 'income') {
                summary.totalIncome += t.amount;
            } else {
                summary.totalExpense += t.amount;
            }

            if (!summary.byCategory[t.category]) {
                summary.byCategory[t.category] = { income: 0, expense: 0 };
            }
            summary.byCategory[t.category][t.type] += t.amount;
        });

        summary.netProfit = summary.totalIncome - summary.totalExpense;

        res.json(summary);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get daily summary for chart
router.get('/daily', auth, adminOnly, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        const filter = {
            date: { $gte: startDate }
        };

        const transactions = await buildAccountingEntries(filter, req.user._id);
        const grouped = {};
        transactions.forEach(t => {
            const d = new Date(t.date);
            const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().split('T')[0];
            const groupKey = `${key}:${t.type}`;
            grouped[groupKey] = grouped[groupKey] || { _id: { date: key, type: t.type }, total: 0 };
            grouped[groupKey].total += Number(t.amount || 0);
        });

        res.json(Object.values(grouped).sort((a, b) => a._id.date.localeCompare(b._id.date)));
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Create transaction
router.post('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        const { type, category, amount, description, patient, medicine, quantity, paymentMethod, date } = req.body;

        const transaction = await Transaction.create({
            type,
            category,
            amount,
            description,
            patient,
            medicine,
            quantity,
            paymentMethod,
            date: date || new Date(),
            createdBy: req.user._id
        });

        const populated = await Transaction.findById(transaction._id)
            .populate('patient', 'fullName')
            .populate('medicine', 'name')
            .populate('createdBy', 'fullName');

        res.status(201).json(populated);
    } catch (error) {
        console.error('Transaction error:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Update transaction
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        )
            .populate('patient', 'fullName')
            .populate('medicine', 'name');

        if (!transaction) {
            return res.status(404).json({ message: 'Tranzaksiya topilmadi' });
        }

        res.json(transaction);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Delete transaction
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndDelete(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: 'Tranzaksiya topilmadi' });
        }

        res.json({ message: 'Tranzaksiya o\'chirildi' });
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

module.exports = router;
