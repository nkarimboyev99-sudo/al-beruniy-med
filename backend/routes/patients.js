const express = require('express');
const Patient = require('../models/Patient');
const PatientDiagnosis = require('../models/PatientDiagnosis');
const Transaction = require('../models/Transaction');
const ReferringDoctor = require('../models/ReferringDoctor');
const { auth, doctorOrAdmin } = require('../middleware/auth');

const router = express.Router();

const isConfirmRequest = (body = {}) => body.isConfirmed === true || body.confirm === true;
const isResultConfirmed = (results = {}) => results.isConfirmed === true ||
    (results.isConfirmed === undefined && !!results.savedAt);
const normalizeDoctorName = (value) => (value || '').toString().trim().replace(/\s+/g, ' ');
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const syncReferringDoctor = async (name) => {
    const fullName = normalizeDoctorName(name);
    if (!fullName) return;

    const existing = await ReferringDoctor.findOne({
        fullName: new RegExp(`^\\s*${escapeRegex(fullName)}\\s*$`, 'i')
    });
    if (!existing) {
        await ReferringDoctor.create({ fullName });
    }
};

const { backfillTodayDailyNumbers } = require('../utils/dailyNumber');

// Get all patients
router.get('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        await backfillTodayDailyNumbers();
        const patients = await Patient.find({})
            .populate('registeredBy', 'fullName')
            .populate('diagnoses.diagnosis')
            .populate('diagnoses.medicines')
            .sort({ createdAt: -1 })
            .lean();

        // PatientDiagnosis kolleksiyasidan har bir bemor uchun analiz holatini olish
        const allDiagnoses = await PatientDiagnosis.find({ isActive: true })
            .select('patient results.savedAt results.isConfirmed createdAt dailyNumber')
            .lean();

        const diagnosisMap = {};
        allDiagnoses.forEach(d => {
            const pid = d.patient.toString();
            if (!diagnosisMap[pid]) diagnosisMap[pid] = [];
            diagnosisMap[pid].push({
                hasSavedResults: isResultConfirmed(d.results),
                createdAt: d.createdAt,
                dailyNumber: d.dailyNumber
            });
        });

        const result = patients.map(p => {
            const pObj = { ...p };
            const diags = diagnosisMap[p._id.toString()] || [];
            pObj.diagnosisCount = diags.length;
            pObj.allResultsSaved = diags.length > 0 && diags.every(d => d.hasSavedResults);
            pObj.hasUnsavedResults = diags.length > 0 && diags.some(d => !d.hasSavedResults);
            // Eng oxirgi diagnosis sanasini hisoblash (PatientDiagnosis createdAt dan)
            if (diags.length > 0) {
                let maxDt = 0;
                let latestDiag = null;
                diags.forEach(d => {
                    const dt = d.createdAt ? new Date(d.createdAt).getTime() : 0;
                    if (dt >= maxDt) {
                        maxDt = dt;
                        latestDiag = d;
                    }
                });
                if (maxDt > 0) {
                    pObj.latestDiagnosisDate = new Date(maxDt);
                }
            }
            pObj.dailyNumber = p.dailyNumber || (diags.length > 0 ? (diags.find(d => d.dailyNumber)?.dailyNumber) : undefined);
            return pObj;
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Search patients by name (for autocomplete)
router.get('/search/autocomplete', auth, doctorOrAdmin, async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json([]);
        }

        const patients = await Patient.find({
            fullName: { $regex: q, $options: 'i' }
        })
            .select('_id fullName phone address gender birthDate')
            .limit(20)
            .sort({ fullName: 1 });

        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get single patient
router.get('/:id', auth, doctorOrAdmin, async (req, res) => {
    try {
        await backfillTodayDailyNumbers();
        const patient = await Patient.findById(req.params.id)
            .populate('registeredBy', 'fullName')
            .populate('diagnoses.diagnosis')
            .populate('diagnoses.medicines');

        if (!patient) {
            return res.status(404).json({ message: 'Bemor topilmadi' });
        }

        const pObj = patient.toObject();
        const latestDiag = await PatientDiagnosis.findOne({ patient: req.params.id, isActive: true })
            .sort({ createdAt: -1 })
            .select('dailyNumber');
        pObj.dailyNumber = patient.dailyNumber || (latestDiag ? latestDiag.dailyNumber : undefined);

        res.json(pObj);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Create patient
router.post('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        const { fullName, birthDate, phone, address, gender, referredBy } = req.body;
        const normalizedReferredBy = normalizeDoctorName(referredBy);

        // Duplikat tekshiruv: bir xil ism bilan bugun ro'yxatdan o'tgan bemor bormi?
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        if (fullName && fullName.trim()) {
            const duplicateQuery = {
                fullName: new RegExp(`^\\s*${escapeRegex(fullName.trim())}\\s*$`, 'i'),
                createdAt: { $gte: todayStart, $lte: todayEnd }
            };
            if (phone && phone.trim()) {
                duplicateQuery.phone = phone.trim();
            }
            const existingPatient = await Patient.findOne(duplicateQuery);
            if (existingPatient) {
                return res.status(200).json(existingPatient);
            }
        }

        await backfillTodayDailyNumbers();
        const { getNextDailyNumber } = require('../utils/dailyNumber');
        const dailyNumber = await getNextDailyNumber();

        const patient = await Patient.create({
            fullName,
            birthDate,
            phone,
            address,
            gender,
            dailyNumber,
            referredBy: normalizedReferredBy,
            registeredBy: req.user._id
        });
        await syncReferringDoctor(normalizedReferredBy);

        res.status(201).json(patient);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Update patient
router.put('/:id', auth, doctorOrAdmin, async (req, res) => {
    try {
        const body = { ...req.body };
        if (Object.prototype.hasOwnProperty.call(body, 'referredBy')) {
            body.referredBy = normalizeDoctorName(body.referredBy);
        }

        const patient = await Patient.findByIdAndUpdate(
            req.params.id,
            body,
            { new: true }
        );

        if (!patient) {
            return res.status(404).json({ message: 'Bemor topilmadi' });
        }
        await syncReferringDoctor(patient.referredBy);

        res.json(patient);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Add diagnosis to patient
router.post('/:id/diagnosis', auth, doctorOrAdmin, async (req, res) => {
    try {
        const { diagnosis, medicines, notes } = req.body;

        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: 'Bemor topilmadi' });
        }

        patient.diagnoses.push({
            diagnosis,
            medicines,
            notes
        });

        await patient.save();

        const updatedPatient = await Patient.findById(req.params.id)
            .populate('diagnoses.diagnosis')
            .populate('diagnoses.medicines');

        res.json(updatedPatient);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Delete patient
router.delete('/:id', auth, doctorOrAdmin, async (req, res) => {
    try {
        const diagnosisIds = await PatientDiagnosis.distinct('_id', { patient: req.params.id });
        const patient = await Patient.findByIdAndDelete(req.params.id);

        if (!patient) {
            return res.status(404).json({ message: 'Bemor topilmadi' });
        }

        // Cascade: delete all diagnoses and their transactions for this patient
        await PatientDiagnosis.deleteMany({ patient: req.params.id });
        await Transaction.deleteMany({
            $or: [
                { patient: req.params.id },
                { patientDiagnosis: { $in: diagnosisIds } }
            ]
        });

        res.json({ message: 'Bemor o\'chirildi' });
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Save diagnosis results
router.put('/:patientId/diagnosis/:diagnosisId/results', auth, doctorOrAdmin, async (req, res) => {
    try {
        const { patientId, diagnosisId } = req.params;
        const { title, columns, rows, conclusion } = req.body;
        const shouldConfirm = isConfirmRequest(req.body);

        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: 'Bemor topilmadi' });
        }

        const diagnosis = patient.diagnoses.id(diagnosisId);
        if (!diagnosis) {
            return res.status(404).json({ message: 'Tashxis topilmadi' });
        }

        const previousResults = diagnosis.results || {};
        const wasConfirmed = isResultConfirmed(previousResults);
        const confirmedAt = shouldConfirm ? new Date() : (previousResults.confirmedAt || (wasConfirmed ? previousResults.savedAt : undefined));
        const confirmedBy = shouldConfirm ? req.user._id : (previousResults.confirmedBy || (wasConfirmed ? previousResults.savedBy : undefined));

        // Natijalarni saqlash - dinamik ustunlar bilan
        diagnosis.results = {
            title,
            columns: columns || [],
            rows: (rows || []).map(r => ({
                values: r.values || {}
            })),
            conclusion,
            savedAt: new Date(),
            savedBy: req.user._id,
            isConfirmed: shouldConfirm || wasConfirmed,
            confirmedAt,
            confirmedBy
        };

        await patient.save();

        const updatedPatient = await Patient.findById(patientId)
            .populate('diagnoses.diagnosis')
            .populate('diagnoses.medicines')
            .populate('diagnoses.results.savedBy', 'fullName')
            .populate('diagnoses.results.confirmedBy', 'fullName');

        res.json(updatedPatient);
    } catch (error) {
        console.error('Natijalarni saqlashda xatolik:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get diagnosis results
router.get('/:patientId/diagnosis/:diagnosisId/results', auth, doctorOrAdmin, async (req, res) => {
    try {
        const { patientId, diagnosisId } = req.params;

        const patient = await Patient.findById(patientId)
            .populate('diagnoses.results.savedBy', 'fullName')
            .populate('diagnoses.results.confirmedBy', 'fullName');

        if (!patient) {
            return res.status(404).json({ message: 'Bemor topilmadi' });
        }

        const diagnosis = patient.diagnoses.id(diagnosisId);
        if (!diagnosis) {
            return res.status(404).json({ message: 'Tashxis topilmadi' });
        }

        res.json(diagnosis.results || null);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

module.exports = router;
