const express = require('express');
const Patient = require('../models/Patient');
const PatientDiagnosis = require('../models/PatientDiagnosis');
const { auth, doctorOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all patients
router.get('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        // viewScope filtri
        let query = {};
        if (req.user.viewScope === 'own') {
            if (req.user.role === 'registrator') {
                query.registeredBy = req.user._id;
            } else if (req.user.role === 'doctor') {
                const myPatientIds = await PatientDiagnosis.find({ doctor: req.user._id, isActive: true }).distinct('patient');
                query._id = { $in: myPatientIds };
            }
        }

        const patients = await Patient.find(query)
            .populate('registeredBy', 'fullName')
            .populate('diagnoses.diagnosis')
            .populate('diagnoses.medicines')
            .sort({ createdAt: -1 });

        // PatientDiagnosis kolleksiyasidan har bir bemor uchun analiz holatini olish
        const allDiagnoses = await PatientDiagnosis.find({ isActive: true })
            .select('patient results.savedAt');

        const diagnosisMap = {};
        allDiagnoses.forEach(d => {
            const pid = d.patient.toString();
            if (!diagnosisMap[pid]) diagnosisMap[pid] = [];
            diagnosisMap[pid].push({
                hasSavedResults: !!d.results?.savedAt
            });
        });

        const result = patients.map(p => {
            const pObj = p.toObject();
            const diags = diagnosisMap[p._id.toString()] || [];
            pObj.diagnosisCount = diags.length;
            pObj.allResultsSaved = diags.length > 0 && diags.every(d => d.hasSavedResults);
            pObj.hasUnsavedResults = diags.length > 0 && diags.some(d => !d.hasSavedResults);
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
            .limit(10000)
            .sort({ fullName: 1 });

        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get single patient
router.get('/:id', auth, doctorOrAdmin, async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id)
            .populate('registeredBy', 'fullName')
            .populate('diagnoses.diagnosis')
            .populate('diagnoses.medicines');

        if (!patient) {
            return res.status(404).json({ message: 'Bemor topilmadi' });
        }

        res.json(patient);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Create patient
router.post('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        const { fullName, birthDate, phone, address, gender } = req.body;

        const patient = await Patient.create({
            fullName,
            birthDate,
            phone,
            address,
            gender,
            registeredBy: req.user._id
        });

        res.status(201).json(patient);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Update patient
router.put('/:id', auth, doctorOrAdmin, async (req, res) => {
    try {
        const patient = await Patient.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!patient) {
            return res.status(404).json({ message: 'Bemor topilmadi' });
        }

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
        const patient = await Patient.findByIdAndDelete(req.params.id);

        if (!patient) {
            return res.status(404).json({ message: 'Bemor topilmadi' });
        }

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

        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: 'Bemor topilmadi' });
        }

        const diagnosis = patient.diagnoses.id(diagnosisId);
        if (!diagnosis) {
            return res.status(404).json({ message: 'Tashxis topilmadi' });
        }

        // Natijalarni saqlash - dinamik ustunlar bilan
        diagnosis.results = {
            title,
            columns: columns || [],
            rows: rows.map(r => ({
                values: r.values || {}
            })),
            conclusion,
            savedAt: new Date(),
            savedBy: req.user._id
        };

        await patient.save();

        const updatedPatient = await Patient.findById(patientId)
            .populate('diagnoses.diagnosis')
            .populate('diagnoses.medicines')
            .populate('diagnoses.results.savedBy', 'fullName');

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
            .populate('diagnoses.results.savedBy', 'fullName');

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

