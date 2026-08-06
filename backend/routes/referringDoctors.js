const express = require('express');
const ReferringDoctor = require('../models/ReferringDoctor');
const Patient = require('../models/Patient');
const PatientDiagnosis = require('../models/PatientDiagnosis');
const { auth, doctorOrAdmin } = require('../middleware/auth');
const { getDiagnosisPaymentAmount } = require('../utils/finance');

const router = express.Router();

const normalizeDoctorName = (value) => (value || '').toString().trim().replace(/\s+/g, ' ');
const normalizeKey = (value) => normalizeDoctorName(value).toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

const getPeriodBounds = (now = new Date()) => {
    const local = new Date(now.getTime() + TASHKENT_OFFSET_MS);
    const year = local.getUTCFullYear();
    const month = local.getUTCMonth();
    const date = local.getUTCDate();

    const startOfTodayLocal = Date.UTC(year, month, date);
    const dayOfWeek = new Date(startOfTodayLocal).getUTCDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;

    return {
        today: new Date(startOfTodayLocal - TASHKENT_OFFSET_MS),
        week: new Date(startOfTodayLocal - (daysSinceMonday * 24 * 60 * 60 * 1000) - TASHKENT_OFFSET_MS),
        month: new Date(Date.UTC(year, month, 1) - TASHKENT_OFFSET_MS)
    };
};

const syncDoctorsFromPatients = async () => {
    const [doctors, referredNames] = await Promise.all([
        ReferringDoctor.find().select('fullName'),
        Patient.distinct('referredBy', {
            referredBy: { $exists: true, $nin: [null, ''] }
        })
    ]);

    const existing = new Set(doctors.map(d => normalizeKey(d.fullName)).filter(Boolean));
    const missing = [];

    referredNames.forEach(name => {
        const fullName = normalizeDoctorName(name);
        const key = normalizeKey(fullName);
        if (!key || existing.has(key)) return;
        existing.add(key);
        missing.push({ fullName });
    });

    if (missing.length > 0) {
        await ReferringDoctor.insertMany(missing, { ordered: false });
    }
};

// Get all referring doctors
router.get('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        await syncDoctorsFromPatients();
        const doctors = await ReferringDoctor.find().sort({ fullName: 1 });
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get patients referred by this doctor (with analysis totals)
router.get('/:id/patients', auth, doctorOrAdmin, async (req, res) => {
    try {
        const doctor = await ReferringDoctor.findById(req.params.id);
        if (!doctor) return res.status(404).json({ message: 'Topilmadi' });
        const name = normalizeDoctorName(doctor.fullName);
        const patients = await Patient.find({
            referredBy: new RegExp(`^\\s*${escapeRegex(name)}\\s*$`, 'i')
        })
            .select('fullName phone birthDate gender createdAt')
            .sort({ createdAt: -1 });

        // For each patient, sum their analysis amounts
        const patientIds = patients.map(p => p._id);
        const diagnoses = await PatientDiagnosis.find({
            patient: { $in: patientIds },
            isActive: true
        }).select('patient totalAmount discount discountPercent diagnosisName diagnosisPrices createdAt');

        // Build a map: patientId -> { total, diagnoses }
        const periodBounds = getPeriodBounds();
        const diagMap = {};
        for (const d of diagnoses) {
            const pid = d.patient.toString();
            if (!diagMap[pid]) {
                diagMap[pid] = {
                    total: 0,
                    todayTotal: 0,
                    weekTotal: 0,
                    monthTotal: 0,
                    diagnosisList: []
                };
            }
            const net = getDiagnosisPaymentAmount(d);
            const createdAt = d.createdAt || new Date(0);
            diagMap[pid].total += net;
            if (createdAt >= periodBounds.today) diagMap[pid].todayTotal += net;
            if (createdAt >= periodBounds.week) diagMap[pid].weekTotal += net;
            if (createdAt >= periodBounds.month) diagMap[pid].monthTotal += net;
            diagMap[pid].diagnosisList.push({
                name: d.diagnosisName,
                amount: net,
                createdAt
            });
        }

        const result = patients.map(p => ({
            ...p.toObject(),
            analysisTotal: diagMap[p._id.toString()]?.total || 0,
            analysisTodayTotal: diagMap[p._id.toString()]?.todayTotal || 0,
            analysisWeekTotal: diagMap[p._id.toString()]?.weekTotal || 0,
            analysisMonthTotal: diagMap[p._id.toString()]?.monthTotal || 0,
            analysisCount: diagMap[p._id.toString()]?.diagnosisList?.length || 0,
            analysisList: diagMap[p._id.toString()]?.diagnosisList || []
        }));

        res.json(result);
    } catch (error) {
        console.error('Error fetching referred patients:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Create
router.post('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Faqat admin uchun' });
        }
        const { fullName, phone, organization } = req.body;
        const name = normalizeDoctorName(fullName);
        if (!name) return res.status(400).json({ message: 'Ism kiritilishi shart' });

        const existing = await ReferringDoctor.findOne({
            fullName: new RegExp(`^\\s*${escapeRegex(name)}\\s*$`, 'i')
        });
        if (existing) {
            existing.phone = phone || existing.phone;
            existing.organization = organization || existing.organization;
            await existing.save();
            return res.json(existing);
        }

        const doctor = await ReferringDoctor.create({ fullName: name, phone, organization });
        res.status(201).json(doctor);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Update
router.put('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Faqat admin uchun' });
        }
        const doctor = await ReferringDoctor.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!doctor) return res.status(404).json({ message: 'Topilmadi' });
        res.json(doctor);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Delete
router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Faqat admin uchun' });
        }
        const doctor = await ReferringDoctor.findByIdAndDelete(req.params.id);
        if (!doctor) return res.status(404).json({ message: 'Topilmadi' });
        res.json({ message: 'O\'chirildi' });
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

module.exports = router;
