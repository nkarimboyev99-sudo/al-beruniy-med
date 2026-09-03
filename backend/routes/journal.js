const express = require('express');
const router = express.Router();
const PatientDiagnosis = require('../models/PatientDiagnosis');
const Patient = require('../models/Patient');
const Category = require('../models/Category');
const Diagnosis = require('../models/Diagnosis');
const { auth, doctorOrAdmin } = require('../middleware/auth');

const normalizeText = (value) => (value || '').toString().trim().toLowerCase();
const toId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value._id) return value._id.toString();
    return value.toString();
};

const isResultConfirmed = (results = {}) => results.isConfirmed === true ||
    (results.isConfirmed === undefined && !!results.savedAt);

const getJournalDate = (pd) => pd.results?.savedAt || pd.createdAt;

const rowMatchesCategory = (values = {}, categoryId, categoryName) => {
    if (!categoryId) return true;
    const rowCategoryId = toId(values._categoryId);
    const rowCategoryName = normalizeText(values._categoryName);

    if (!rowCategoryId && !rowCategoryName) return true;

    return (rowCategoryId && rowCategoryId === categoryId) ||
        (rowCategoryName && rowCategoryName === normalizeText(categoryName));
};

const entryMatchesCategory = (pd, categoryId, categoryName) => {
    if (!categoryId) return true;

    if (Array.isArray(pd.diagnosisPrices) && pd.diagnosisPrices.some(dp =>
        toId(dp.categoryId) === categoryId ||
        normalizeText(dp.categoryName) === normalizeText(categoryName)
    )) {
        return true;
    }

    if (toId(pd.diagnosis?.category) === categoryId) return true;

    return (pd.results?.rows || []).some(row => rowMatchesCategory(row.values || {}, categoryId, categoryName));
};

const addResultValue = (target, key, value) => {
    if (!key || value === undefined || value === null || value === '') return;
    target[key] = value;
};

const extractResultValues = (pd, categoryId, categoryName) => {
    const resultValues = {};

    if (!pd.results) return resultValues;

    const columns = Array.isArray(pd.results.columns) ? pd.results.columns : [];
    const idName = columns[0]?.id || 'col_1';
    const idResult = columns[1]?.id || 'col_2';

    (pd.results.rows || []).forEach(row => {
        const values = row.values || {};
        if (!rowMatchesCategory(values, categoryId, categoryName)) return;

        const resultValue = values[idResult];
        const testName = values[idName];
        const diagnosisId = toId(values._diagnosisId);

        addResultValue(resultValues, diagnosisId ? `diagnosis:${diagnosisId}` : '', resultValue);
        addResultValue(resultValues, testName, resultValue);

        Object.entries(values).forEach(([key, value]) => {
            if (key.startsWith('_') || key === idName || key === idResult) return;
            if (value && typeof value === 'object') return;
            addResultValue(resultValues, key, value);
        });
    });

    if (pd.results.values && typeof pd.results.values === 'object') {
        Object.entries(pd.results.values).forEach(([key, value]) => addResultValue(resultValues, key, value));
    }

    return resultValues;
};

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

        let query = { isActive: true };

        // Filter by date range or month. Results saved date is handled after fetching.
        if (month && typeof month === 'string' && month.includes('-')) {
            const [yearStr, monthStr] = month.split('-');
            const year = parseInt(yearStr, 10);
            const mon = parseInt(monthStr, 10) - 1;
            if (!isNaN(year) && !isNaN(mon)) {
                const start = new Date(year, mon, 1);
                const end = new Date(year, mon + 1, 0, 23, 59, 59, 999);
                query.$or = [
                    { 'results.savedAt': { $gte: start, $lte: end } },
                    { 'results.savedAt': { $exists: false }, createdAt: { $gte: start, $lte: end } },
                    { 'results.savedAt': null, createdAt: { $gte: start, $lte: end } }
                ];
            }
        } else if (dateFrom || dateTo) {
            const dateQuery = {};
            if (dateFrom) dateQuery.$gte = new Date(dateFrom);
            if (dateTo) {
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
                dateQuery.$lte = end;
            }
            query.$or = [
                { 'results.savedAt': dateQuery },
                { 'results.savedAt': { $exists: false }, createdAt: dateQuery },
                { 'results.savedAt': null, createdAt: dateQuery }
            ];
        }

        const patientDiagnoses = await PatientDiagnosis.find(query)
            .populate('patient', 'fullName dailyNumber referringDoctor phone gender age ageType createdAt')
            .populate({ path: 'diagnosis', select: 'category name code' })
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
        const filteredEntries = patientDiagnoses.filter(pd =>
            entryMatchesCategory(pd, categoryId, selectedCategory?.name)
        );

        // Format rows for Journal table
        const rows = filteredEntries.map(pd => {
            const patient = pd.patient || {};
            const resultValues = extractResultValues(pd, categoryId, selectedCategory?.name);

            let formattedDate = '';
            try {
                const journalDate = getJournalDate(pd);
                if (journalDate) {
                    formattedDate = new Date(journalDate).toISOString().split('T')[0];
                }
            } catch (e) {
                formattedDate = '';
            }

            return {
                _id: pd._id,
                patientId: patient._id || null,
                dailyNumber: pd.dailyNumber || patient.dailyNumber || '-',
                patientName: patient.fullName || pd.patientName || 'Noma\'lum',
                date: formattedDate,
                createdAt: pd.createdAt,
                referringDoctor: pd.customReferringDoctor || patient.referringDoctor || 'amb',
                totalPrice: pd.totalAmount || 0,
                results: resultValues,
                customValues: pd.journalCustomValues || {},
                hasResults: isResultConfirmed(pd.results)
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

// Add a new journal entry manually
router.post('/entry', auth, doctorOrAdmin, async (req, res) => {
    try {
        const { patientName, categoryId, referringDoctor, totalPrice, date, results } = req.body;

        if (!patientName) {
            return res.status(400).json({ message: 'Bemor F.I.O kiritilishi shart' });
        }

        const { getNextDailyNumber } = require('../utils/dailyNumber');
        const dailyNum = await getNextDailyNumber();

        // Mavjud bemorni qidirish (bugungi sana ichida)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        let patient = await Patient.findOne({
            fullName: new RegExp(`^\\s*${patientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim()}\\s*$`, 'i'),
            createdAt: { $gte: todayStart }
        });

        if (!patient) {
            patient = await Patient.create({
                fullName: patientName,
                referringDoctor: referringDoctor || 'amb',
                dailyNumber: dailyNum,
                registeredBy: req.user._id
            });
        }

        let selectedCat = null;
        if (categoryId) {
            selectedCat = await Category.findById(categoryId);
        }

        const entryDate = date ? new Date(date) : new Date();

        const newEntry = await PatientDiagnosis.create({
            patient: patient._id,
            patientName: patient.fullName,
            doctor: req.user._id,
            doctorName: req.user.fullName,
            diagnosisName: selectedCat ? selectedCat.name : 'Laboratoriya Jurnali',
            dailyNumber: dailyNum,
            customReferringDoctor: referringDoctor || 'amb',
            totalAmount: Number(totalPrice) || 0,
            diagnosisPrices: selectedCat ? [{
                categoryId: selectedCat._id,
                categoryName: selectedCat.name,
                price: Number(totalPrice) || 0
            }] : [],
            results: {
                title: selectedCat ? selectedCat.name : 'Jurnal Yozuvi',
                savedAt: entryDate,
                isConfirmed: true,
                rows: [{
                    values: results || {}
                }]
            },
            createdAt: entryDate
        });

        res.status(201).json({ success: true, message: 'Yangi yozuv qo\'shildi', entry: newEntry });
    } catch (error) {
        console.error('Error creating journal entry:', error);
        res.status(500).json({ message: 'Yangi yozuv qo\'shishda xatolik' });
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
