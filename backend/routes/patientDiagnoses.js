const express = require('express');
const PatientDiagnosis = require('../models/PatientDiagnosis');
const Patient = require('../models/Patient');
const { auth, doctorOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get current doctor's own diagnoses
router.get('/my', auth, doctorOrAdmin, async (req, res) => {
    try {
        const diagnoses = await PatientDiagnosis.find({
            doctor: req.user._id,
            isActive: true
        })
            .populate('patient', 'fullName phone')
            .sort({ createdAt: -1 });

        res.json(diagnoses);
    } catch (error) {
        console.error('Error fetching my diagnoses:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get all diagnoses for a specific patient
router.get('/patient/:patientId', auth, doctorOrAdmin, async (req, res) => {
    try {
        // Doktor + viewScope=own bo'lsa: o'zi qo'ygan + bajarilmagan analizlarni ko'rsatish
        const filter = { patient: req.params.patientId, isActive: true };
        if (req.user.role === 'doctor' && req.user.viewScope === 'own') {
            filter.$or = [
                { doctor: req.user._id },
                { 'results.savedAt': { $exists: false } }
            ];
        }
        const diagnoses = await PatientDiagnosis.find(filter)
            .populate({ path: 'diagnosis', populate: { path: 'category', select: 'name price' } })
            .populate('doctor', 'fullName username')
            .populate('medicines.medicine', 'name')
            .sort({ createdAt: -1 });

        res.json(diagnoses);
    } catch (error) {
        console.error('Error fetching patient diagnoses:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get single patient diagnosis
router.get('/:id', auth, doctorOrAdmin, async (req, res) => {
    try {
        const diagnosis = await PatientDiagnosis.findById(req.params.id)
            .populate('patient')
            .populate('diagnosis')
            .populate('doctor', 'fullName username')
            .populate('medicines.medicine', 'name');

        if (!diagnosis) {
            return res.status(404).json({ message: 'Tashxis topilmadi' });
        }

        res.json(diagnosis);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Create patient diagnosis (doctor or admin)
router.post('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        const {
            patient,
            diagnosis,
            diagnosisName,
            notes,
            medicines,
            diagnosisPrices,
            totalAmount,
            discount,
            paymentMethod
        } = req.body;

        const patientDiagnosis = await PatientDiagnosis.create({
            patient,
            diagnosis,
            diagnosisName,
            doctor: req.user._id,
            doctorName: req.user.fullName,
            notes,
            medicines,
            diagnosisPrices: diagnosisPrices || [],
            totalAmount: totalAmount || 0,
            discount: discount || 0,
            paymentMethod: paymentMethod || 'cash'
        });

        // Update patient's lastDiagnosisDate
        await Patient.findByIdAndUpdate(patient, {
            lastDiagnosisDate: new Date()
        });

        const populated = await PatientDiagnosis.findById(patientDiagnosis._id)
            .populate('patient')
            .populate('diagnosis')
            .populate('doctor', 'fullName username')
            .populate('medicines.medicine', 'name');

        res.status(201).json(populated);
    } catch (error) {
        console.error('Error creating patient diagnosis:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Update patient diagnosis
router.put('/:id', auth, doctorOrAdmin, async (req, res) => {
    try {
        const diagnosis = await PatientDiagnosis.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        )
            .populate('patient')
            .populate('diagnosis')
            .populate('doctor', 'fullName username')
            .populate('medicines.medicine', 'name');

        if (!diagnosis) {
            return res.status(404).json({ message: 'Tashxis topilmadi' });
        }

        res.json(diagnosis);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Delete patient diagnosis (soft delete)
router.delete('/:id', auth, doctorOrAdmin, async (req, res) => {
    try {
        const diagnosis = await PatientDiagnosis.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!diagnosis) {
            return res.status(404).json({ message: 'Tashxis topilmadi' });
        }

        res.json({ message: 'Tashxis o\'chirildi' });
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Save diagnosis results (natijalarni saqlash)
router.put('/:id/results', auth, doctorOrAdmin, async (req, res) => {
    try {
        const { title, columns, rows, conclusion } = req.body;

        const diagnosis = await PatientDiagnosis.findById(req.params.id);
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

        await diagnosis.save();

        const updated = await PatientDiagnosis.findById(diagnosis._id)
            .populate('patient')
            .populate('diagnosis')
            .populate('doctor', 'fullName username')
            .populate('medicines.medicine', 'name')
            .populate('results.savedBy', 'fullName');

        res.json(updated);
    } catch (error) {
        console.error('Natijalarni saqlashda xatolik:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get diagnosis results
router.get('/:id/results', auth, doctorOrAdmin, async (req, res) => {
    try {
        const diagnosis = await PatientDiagnosis.findById(req.params.id)
            .populate('results.savedBy', 'fullName');

        if (!diagnosis) {
            return res.status(404).json({ message: 'Tashxis topilmadi' });
        }

        res.json(diagnosis.results || null);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

module.exports = router;
