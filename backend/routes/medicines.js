const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Medicine = require('../models/Medicine');
const { auth, adminOnly, doctorOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Setup multer for image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/medicines');
        // Create directory if not exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'medicine-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Faqat rasm fayllari yuklash mumkin (jpeg, png, gif, webp)'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Get all medicines
router.get('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        const medicines = await Medicine.find({ isActive: true }).sort({ name: 1 });
        res.json(medicines);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get single medicine
router.get('/:id', auth, doctorOrAdmin, async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);

        if (!medicine) {
            return res.status(404).json({ message: 'Dori topilmadi' });
        }

        res.json(medicine);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Create medicine with optional image (admin only)
router.post('/', auth, adminOnly, upload.single('image'), async (req, res) => {
    try {
        const { name, genericName, dosage, form, instructions, sideEffects } = req.body;

        const medicineData = {
            name,
            genericName,
            dosage,
            form,
            instructions,
            sideEffects
        };

        // Add image path if uploaded
        if (req.file) {
            medicineData.image = '/uploads/medicines/' + req.file.filename;
        }

        const medicine = await Medicine.create(medicineData);
        res.status(201).json(medicine);
    } catch (error) {
        console.error('Error creating medicine:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Update medicine with optional image (admin only)
router.put('/:id', auth, adminOnly, upload.single('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };

        // If new image uploaded, update path
        if (req.file) {
            updateData.image = '/uploads/medicines/' + req.file.filename;

            // Delete old image if exists
            const oldMedicine = await Medicine.findById(req.params.id);
            if (oldMedicine && oldMedicine.image) {
                const oldImagePath = path.join(__dirname, '..', oldMedicine.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }

        const medicine = await Medicine.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!medicine) {
            return res.status(404).json({ message: 'Dori topilmadi' });
        }

        res.json(medicine);
    } catch (error) {
        console.error('Error updating medicine:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Delete medicine (admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const medicine = await Medicine.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!medicine) {
            return res.status(404).json({ message: 'Dori topilmadi' });
        }

        res.json({ message: 'Dori o\'chirildi' });
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

module.exports = router;
