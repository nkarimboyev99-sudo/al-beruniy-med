const express = require('express');
const Inventory = require('../models/Inventory');
const { auth, adminOnly, doctorOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all inventory items
router.get('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        const inventory = await Inventory.find()
            .populate('medicine')
            .sort({ createdAt: -1 });

        res.json(inventory);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get low stock items
router.get('/low-stock', auth, doctorOrAdmin, async (req, res) => {
    try {
        const inventory = await Inventory.find()
            .populate('medicine');

        const lowStock = inventory.filter(item => item.quantity <= item.minQuantity);
        res.json(lowStock);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get expiring soon items (within 30 days)
router.get('/expiring', auth, doctorOrAdmin, async (req, res) => {
    try {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const inventory = await Inventory.find({
            expiryDate: { $lte: thirtyDaysFromNow, $gte: new Date() }
        }).populate('medicine');

        res.json(inventory);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get single inventory item
router.get('/:id', auth, doctorOrAdmin, async (req, res) => {
    try {
        const item = await Inventory.findById(req.params.id).populate('medicine');

        if (!item) {
            return res.status(404).json({ message: 'Mahsulot topilmadi' });
        }

        res.json(item);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Add inventory item
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { medicine, quantity, minQuantity, unitPrice, sellPrice, expiryDate, batchNumber, supplier } = req.body;

        // Check if medicine already exists in inventory
        let item = await Inventory.findOne({ medicine });

        if (item) {
            // Update existing item
            item.quantity += quantity;
            item.unitPrice = unitPrice || item.unitPrice;
            item.sellPrice = sellPrice || item.sellPrice;
            item.lastRestocked = new Date();
            await item.save();
        } else {
            // Create new item
            item = await Inventory.create({
                medicine,
                quantity,
                minQuantity,
                unitPrice,
                sellPrice,
                expiryDate,
                batchNumber,
                supplier
            });
        }

        const populated = await Inventory.findById(item._id).populate('medicine');
        res.status(201).json(populated);
    } catch (error) {
        console.error('Inventory error:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Update inventory item
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const item = await Inventory.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).populate('medicine');

        if (!item) {
            return res.status(404).json({ message: 'Mahsulot topilmadi' });
        }

        res.json(item);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Reduce stock (when selling)
router.post('/:id/reduce', auth, doctorOrAdmin, async (req, res) => {
    try {
        const { quantity } = req.body;
        const item = await Inventory.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Mahsulot topilmadi' });
        }

        if (item.quantity < quantity) {
            return res.status(400).json({ message: 'Yetarli miqdor yo\'q' });
        }

        item.quantity -= quantity;
        await item.save();

        const populated = await Inventory.findById(item._id).populate('medicine');
        res.json(populated);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Deduct stock by medicine ID
router.post('/deduct', auth, doctorOrAdmin, async (req, res) => {
    try {
        const { medicineId, quantity } = req.body;

        // Find inventory item by medicine ID
        const item = await Inventory.findOne({ medicine: medicineId });

        if (!item) {
            return res.status(404).json({ message: 'Dori omborxonada topilmadi' });
        }

        if (item.quantity < quantity) {
            return res.status(400).json({ message: 'Yetarli miqdor yo\'q' });
        }

        item.quantity -= quantity;
        await item.save();

        const populated = await Inventory.findById(item._id).populate('medicine');
        res.json(populated);
    } catch (error) {
        console.error('Deduct error:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Delete inventory item
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const item = await Inventory.findByIdAndDelete(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Mahsulot topilmadi' });
        }

        res.json({ message: 'Mahsulot o\'chirildi' });
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

module.exports = router;
