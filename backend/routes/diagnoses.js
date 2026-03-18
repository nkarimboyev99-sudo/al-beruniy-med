const express = require('express');
const Diagnosis = require('../models/Diagnosis');
const { auth, adminOnly, doctorOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all diagnoses — order maydoni bo'yicha tartiblangan
router.get('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        const diagnoses = await Diagnosis.find({ isActive: true })
            .populate('recommendedMedicines')
            .populate('category', 'name price')
            .sort({ order: 1, createdAt: 1 });

        res.json(diagnoses);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get single diagnosis
router.get('/:id', auth, doctorOrAdmin, async (req, res) => {
    try {
        const diagnosis = await Diagnosis.findById(req.params.id)
            .populate('recommendedMedicines')
            .populate('category', 'name price');

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

        // Yangi analiz uchun maksimal order topish
        const maxOrderDoc = await Diagnosis.findOne(
            { isActive: true, category },
            { order: 1 },
            { sort: { order: -1 } }
        );
        const newOrder = maxOrderDoc ? (maxOrderDoc.order || 0) + 1 : 0;

        const diagnosis = await Diagnosis.create({
            name,
            code,
            description,
            category,
            normalRanges: normalRanges || [],
            recommendedMedicines,
            order: newOrder
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

// Reorder diagnoses (admin only) — drag & drop uchun
// Body: { orderedIds: ['id1', 'id2', 'id3', ...] }
router.put('/reorder/batch', auth, adminOnly, async (req, res) => {
    try {
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return res.status(400).json({ message: 'orderedIds massivi kerak' });
        }

        const bulkOps = orderedIds.map((id, index) => ({
            updateOne: {
                filter: { _id: id },
                update: { $set: { order: index } }
            }
        }));

        await Diagnosis.bulkWrite(bulkOps);
        res.json({ message: 'Tartib saqlandi', count: orderedIds.length });
    } catch (error) {
        console.error('Reorder error:', error);
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
