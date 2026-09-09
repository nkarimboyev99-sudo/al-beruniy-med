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

async function cleanupDuplicateDiagnoses() {
    try {
        const activeDiagnoses = await PatientDiagnosis.find({ isActive: true }).sort({ createdAt: 1 }).lean();
        const grouped = new Map();

        for (const diag of activeDiagnoses) {
            const pid = diag.patient ? diag.patient.toString() : '';
            const rawName = diag.diagnosisName || '';
            const normalizedName = rawName.replace(/^Analiz:\s*/i, '').trim().toLowerCase();
            const dateStr = diag.createdAt ? new Date(diag.createdAt).toISOString().split('T')[0] : '';
            const amount = diag.totalAmount || 0;
            const key = `${pid}:${normalizedName}:${amount}:${dateStr}`;

            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(diag);
        }

        const duplicateDiagnosisIds = [];
        for (const list of grouped.values()) {
            if (list.length < 2) continue;
            for (let i = 1; i < list.length; i++) {
                duplicateDiagnosisIds.push(list[i]._id);
            }
        }

        if (duplicateDiagnosisIds.length > 0) {
            console.log(`🧹 Cleaning up ${duplicateDiagnosisIds.length} duplicate PatientDiagnosis entries...`);
            await PatientDiagnosis.updateMany(
                { _id: { $in: duplicateDiagnosisIds } },
                { $set: { isActive: false } }
            );
            await Transaction.deleteMany({ patientDiagnosis: { $in: duplicateDiagnosisIds } });
        }

        const incomeTx = await Transaction.find({ type: 'income' }).sort({ date: 1 }).lean();
        const txGrouped = new Map();

        for (const tx of incomeTx) {
            const pid = tx.patient ? tx.patient.toString() : '';
            const desc = (tx.description || '').replace(/^Analiz:\s*/i, '').trim().toLowerCase();
            const dateStr = tx.date ? new Date(tx.date).toISOString().split('T')[0] : '';
            const pdId = tx.patientDiagnosis ? tx.patientDiagnosis.toString() : '';
            const amount = tx.amount || 0;

            let key = '';
            if (pdId) {
                key = `pd:${pdId}`;
            } else {
                key = `raw:${pid}:${desc}:${amount}:${dateStr}:${tx.paymentMethod || 'cash'}`;
            }

            if (!txGrouped.has(key)) {
                txGrouped.set(key, []);
            }
            txGrouped.get(key).push(tx);
        }

        const duplicateTxIds = [];
        for (const list of txGrouped.values()) {
            if (list.length < 2) continue;
            for (let i = 1; i < list.length; i++) {
                duplicateTxIds.push(list[i]._id);
            }
        }

        if (duplicateTxIds.length > 0) {
            console.log(`🧹 Cleaning up ${duplicateTxIds.length} duplicate Transaction entries...`);
            await Transaction.deleteMany({ _id: { $in: duplicateTxIds } });
        }
    } catch (e) {
        console.error('Error cleaning up duplicate diagnoses/transactions:', e);
    }
}

function deduplicateTransactions(transactions) {
    const seen = new Set();
    const result = [];

    for (const t of transactions) {
        let key = '';
        if (t.patientDiagnosis) {
            const pdId = t.patientDiagnosis._id ? t.patientDiagnosis._id.toString() : t.patientDiagnosis.toString();
            key = `pd:${pdId}`;
        } else {
            const pid = t.patient ? (t.patient._id ? t.patient._id.toString() : t.patient.toString()) : '';
            const dateStr = t.date ? new Date(t.date).toISOString().split('T')[0] : '';
            const desc = (t.description || '').replace(/^Analiz:\s*/i, '').trim().toLowerCase();
            key = `raw:${pid}:${desc}:${t.amount}:${dateStr}:${t.type}:${t.paymentMethod}`;
        }

        if (!seen.has(key)) {
            seen.add(key);
            result.push(t);
        }
    }

    return result;
}

async function ensureAccountingSync(creatorId = null) {
    if (accountingSyncPromise) return accountingSyncPromise;

    accountingSyncPromise = (async () => {
        await cleanupDuplicateDiagnoses();

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
    })().catch(err => {
        console.error('Accounting sync error:', err);
    }).finally(() => {
        accountingSyncPromise = null;
    });

    return accountingSyncPromise;
}

async function buildAccountingEntries(filter, creatorId = null) {
    await ensureAccountingSync(creatorId);

    const transactions = await Transaction.find(filter)
        .populate('patient', 'fullName')
        .populate('patientDiagnosis', 'diagnosisName totalAmount diagnosisPrices discount discountPercent paymentMethod createdAt')
        .populate('medicine', 'name')
        .populate('createdBy', 'fullName')
        .sort({ date: -1 })
        .lean();

    return deduplicateTransactions(transactions);
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
