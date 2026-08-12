const express = require('express');
const router = express.Router();
const PatientDiagnosis = require('../models/PatientDiagnosis');
const Patient = require('../models/Patient');
const Category = require('../models/Category');
const Diagnosis = require('../models/Diagnosis');
const { auth, doctorOrAdmin } = require('../middleware/auth');

// Get categories for Journal tabs
router.get('/categories', auth, doctorOrAdmin, async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Kategoriyalarni olishda xatolik' });
    }
});

// Get Journal entries by category and filters
router.get('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        const { categoryId, month, search, dateFrom, dateTo } = req.query;

        let query = {
            isActive: true,
            $or: [
                { 'results.savedAt': { $exists: true, $ne: null } },
                { 'results.isConfirmed': true }
            ]
        };

        // Filter by date range or month
        if (month) {
            const [yearStr, monthStr] = month.split('-');
            const year = parseInt(yearStr, 10);
            const mon = parseInt(monthStr, 10) - 1;
            const start = new Date(year, mon, 1);
            const end = new Date(year, mon + 1, 0, 23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        } else if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) {
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        const patientDiagnoses = await PatientDiagnosis.find(query)
            .populate('patient', 'fullName dailyNumber referringDoctor phone gender age ageType createdAt')
            .populate('doctor', 'fullName')
            .sort({ createdAt: -1 })
            .lean();

        // Get target Category
        let selectedCategory = null;
        if (categoryId) {
            selectedCategory = await Category.findById(categoryId).lean();
        }

        // Get diagnoses for columns in selected category
        let categoryDiagnoses = [];
        if (selectedCategory) {
            categoryDiagnoses = await Diagnosis.find({
                category: selectedCategory._id,
                isActive: true
            }).sort({ order: 1, createdAt: 1 }).lean();
        }

        // Filter patient diagnoses relevant to selected category if specified
        const filteredEntries = patientDiagnoses.filter(pd => {
            if (!categoryId) return true;
            if (!pd.diagnosisPrices || pd.diagnosisPrices.length === 0) return true;
            return pd.diagnosisPrices.some(dp => 
                (dp.categoryId && dp.categoryId.toString() === categoryId) ||
                (selectedCategory && dp.categoryName && dp.categoryName.toLowerCase() === selectedCategory.name.toLowerCase())
            );
        });

        // Format rows for Journal table
        const rows = filteredEntries.map(pd => {
            const patient = pd.patient || {};
            const resultValues = {};

            // Extract results rows values
            if (pd.results && Array.isArray(pd.results.rows)) {
                pd.results.rows.forEach(r => {
                    if (r.values && typeof r.values === 'object') {
                        Object.assign(resultValues, r.values);
                    }
                });
            }

            return {
                _id: pd._id,
                patientId: patient._id || null,
                dailyNumber: pd.dailyNumber || patient.dailyNumber || '-',
                patientName: patient.fullName || pd.patientName || 'Noma\'lum',
                date: pd.createdAt ? new Date(pd.createdAt).toISOString().split('T')[0] : '',
                createdAt: pd.createdAt,
                referringDoctor: pd.customReferringDoctor || patient.referringDoctor || 'amb',
                totalPrice: pd.totalAmount || 0,
                results: resultValues,
                customValues: pd.journalCustomValues || {}
            };
        });

        res.json({
            category: selectedCategory,
            testNames: categoryDiagnoses.map(d => ({ _id: d._id, name: d.name, code: d.code, order: d.order })),
            patients: rows
        });
    } catch (error) {
        console.error('Error fetching journal:', error);
        res.status(500).json({ message: 'Jurnal ma\'lumotlarini olishda xatolik' });
    }
});

// Update a journal entry (inline edit)
router.put('/entry/:id', auth, doctorOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { referringDoctor, totalPrice, results, customValues } = req.body;

        const pd = await PatientDiagnosis.findById(id);
        if (!pd) {
            return res.status(404).json({ message: 'Analiz topilmadi' });
        }

        if (referringDoctor !== undefined) {
            pd.customReferringDoctor = referringDoctor;
            if (pd.patient) {
                await Patient.findByIdAndUpdate(pd.patient, { referringDoctor });
            }
        }

        if (totalPrice !== undefined) {
            pd.totalAmount = Number(totalPrice) || 0;
        }

        if (results && typeof results === 'object') {
            if (!pd.results) pd.results = { rows: [{ values: {} }] };
            if (!Array.isArray(pd.results.rows) || pd.results.rows.length === 0) {
                pd.results.rows = [{ values: {} }];
            }
            pd.results.rows[0].values = { ...pd.results.rows[0].values, ...results };
            pd.markModified('results');
        }

        if (customValues && typeof customValues === 'object') {
            pd.journalCustomValues = { ...pd.journalCustomValues, ...customValues };
            pd.markModified('journalCustomValues');
        }

        await pd.save();
        res.json({ success: true, message: 'Jurnal yozuvi yangilandi', entry: pd });
    } catch (error) {
        console.error('Error updating journal entry:', error);
        res.status(500).json({ message: 'Jurnal yozuvini yangilashda xatolik' });
    }
});

module.exports = router;
