const express = require('express');
const Category = require('../models/Category');
const { auth, adminOnly, doctorOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all categories
router.get('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get single category
router.get('/:id', auth, doctorOrAdmin, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Kategoriya topilmadi' });
        }
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Create category (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { name, code, description } = req.body;

        // Check if category already exists
        const existing = await Category.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ message: 'Bu kategoriya allaqachon mavjud' });
        }

        const category = await Category.create({
            name: name.trim(),
            code,
            description
        });

        res.status(201).json(category);
    } catch (error) {
        console.error('Category create error:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Update category (admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!category) {
            return res.status(404).json({ message: 'Kategoriya topilmadi' });
        }

        res.json(category);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Delete category (soft delete - admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({ message: 'Kategoriya topilmadi' });
        }

        res.json({ message: 'Kategoriya o\'chirildi' });
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

module.exports = router;
