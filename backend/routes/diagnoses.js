const express = require('express');
const Diagnosis = require('../models/Diagnosis');
const { auth, adminOnly, doctorOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all diagnoses
router.get('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        const diagnoses = await Diagnosis.find({ isActive: true })
            .populate('recommendedMedicines')
            .sort({ name: 1 });

        res.json(diagnoses);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get single diagnosis
router.get('/:id', auth, doctorOrAdmin, async (req, res) => {
    try {
        const diagnosis = await Diagnosis.findById(req.params.id)
            .populate('recommendedMedicines');

        if (!diagnosis) {
            return res.status(404).json({ message: 'Tashxis topilmadi' });
        }

        res.json(diagnosis);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Create diagnosis (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { name, code, description, category, normalRanges, recommendedMedicines } = req.body;

        const diagnosis = await Diagnosis.create({
            name,
            code,
            description,
            category,
            normalRanges: normalRanges || [],
            recommendedMedicines
        });

        const populated = await Diagnosis.findById(diagnosis._id)
            .populate('recommendedMedicines');

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Update diagnosis (admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const diagnosis = await Diagnosis.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).populate('recommendedMedicines');

        if (!diagnosis) {
            return res.status(404).json({ message: 'Tashxis topilmadi' });
        }

        res.json(diagnosis);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Delete diagnosis (admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const diagnosis = await Diagnosis.findByIdAndUpdate(
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

module.exports = router;
