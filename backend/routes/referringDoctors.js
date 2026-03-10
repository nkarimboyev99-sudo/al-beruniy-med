const express = require('express');
const ReferringDoctor = require('../models/ReferringDoctor');
const { auth, doctorOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all referring doctors
router.get('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        const doctors = await ReferringDoctor.find().sort({ fullName: 1 });
        res.json(doctors);
    } catch (error) {
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
        if (!fullName) return res.status(400).json({ message: 'Ism kiritilishi shart' });

        const doctor = await ReferringDoctor.create({ fullName, phone, organization });
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
