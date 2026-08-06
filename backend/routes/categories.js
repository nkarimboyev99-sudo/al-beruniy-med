const express = require('express');
const Category = require('../models/Category');
const { auth, adminOnly, doctorOrAdmin } = require('../middleware/auth');

const router = express.Router();

const normalizeText = (value) => (value || '').toString().trim().toLowerCase();
const getCategorySortOrder = (category) => {
    const code = normalizeText(category?.code);
    const name = normalizeText(category?.name);
    // removed hardcoded sorting

    const order = Number(category?.order);
    return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
};

async function saveCategoryOrder(orderedIds = []) {
    const categories = await Category.find({ isActive: true })
        .select('_id order createdAt name code')
        .sort({ order: 1, createdAt: 1, name: 1 })
        .lean();

    const currentIds = categories.map(category => category._id.toString());
    const requestedIds = orderedIds.map(id => id.toString()).filter(Boolean);
    const requestedSet = new Set(requestedIds);
    const remainingIds = currentIds.filter(id => !requestedSet.has(id));
    const finalIds = [...requestedIds, ...remainingIds];

    const bulkOps = finalIds.map((id, index) => ({
        updateOne: {
            filter: { _id: id },
            update: { $set: { order: index } }
        }
    }));

    if (bulkOps.length > 0) {
        await Category.bulkWrite(bulkOps);
    }

    return finalIds;
}

// Get all categories
router.get('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true });
        res.json(categories.sort((a, b) => {
            const orderA = getCategorySortOrder(a);
            const orderB = getCategorySortOrder(b);
            if (orderA !== orderB) return orderA - orderB;
            return (a.name || '').localeCompare(b.name || '', 'uz');
        }));
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Reorder categories (admin only)
router.put('/reorder/batch', auth, adminOnly, async (req, res) => {
    try {
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return res.status(400).json({ message: 'orderedIds massivi kerak' });
        }

        const items = await Category.find({ _id: { $in: orderedIds }, isActive: true })
            .select('_id order')
            .lean();
        if (items.length < orderedIds.length) {
            return res.status(400).json({ message: 'Barcha kategoriyalar topilmadi' });
        }

        const finalIds = await saveCategoryOrder(orderedIds);
        res.json({
            message: 'Kategoriya tartibi saqlandi',
            count: finalIds.length,
            orders: finalIds.map((id, index) => ({ id, order: index }))
        });
    } catch (error) {
        console.error('Category reorder error:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

router.put('/reorder/swap', auth, adminOnly, async (req, res) => {
    try {
        const { sourceId, targetId } = req.body;
        if (!sourceId || !targetId) {
            return res.status(400).json({ message: 'sourceId va targetId kerak' });
        }

        const items = await Category.find({ _id: { $in: [sourceId, targetId] }, isActive: true })
            .select('_id order')
            .lean();
        if (items.length !== 2) {
            return res.status(400).json({ message: 'Barcha kategoriyalar topilmadi' });
        }

        const currentCategories = await Category.find({ isActive: true })
            .select('_id order createdAt name code')
            .sort({ order: 1, createdAt: 1, name: 1 })
            .lean();
        const orderedIds = currentCategories.map(category => category._id.toString());
        const sourceIndex = orderedIds.indexOf(sourceId.toString());
        const targetIndex = orderedIds.indexOf(targetId.toString());
        if (sourceIndex === -1 || targetIndex === -1) {
            return res.status(400).json({ message: 'Kategoriya tartibi topilmadi' });
        }

        const movedId = orderedIds[sourceIndex];
        orderedIds[sourceIndex] = orderedIds[targetIndex];
        orderedIds[targetIndex] = movedId;
        const finalIds = await saveCategoryOrder(orderedIds);

        res.json({
            message: 'Kategoriya tartibi saqlandi',
            count: finalIds.length,
            orders: finalIds.map((id, index) => ({ id, order: index }))
        });
    } catch (error) {
        console.error('Category reorder error:', error);
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
        const { name, code, description, price, hideAnalyses } = req.body;

        // Check if category already exists
        const existing = await Category.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ message: 'Bu kategoriya allaqachon mavjud' });
        }

        const maxOrderDoc = await Category.findOne({ isActive: true }, { order: 1 }, { sort: { order: -1 } });
        const newOrder = Number.isFinite(maxOrderDoc?.order) ? maxOrderDoc.order + 1 : 0;

        const category = await Category.create({
            name: name.trim(),
            code,
            description,
            price: Number(price) || 0,
            hideAnalyses: !!hideAnalyses,
            order: newOrder
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
