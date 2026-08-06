const express = require('express');
const Diagnosis = require('../models/Diagnosis');
const Category = require('../models/Category');
const { auth, adminOnly, doctorOrAdmin } = require('../middleware/auth');

const router = express.Router();

const urineOrder = {
    'URINE-VOL': 20.0,
    'URINE-COL': 20.1,
    'URINE-TRN': 20.2,
    'UBG': 20.3,
    'BIL': 20.4,
    'KET': 20.5,
    'CRE': 20.6,
    'PRO': 20.7,
    'NIT': 20.8,
    'LEU': 20.9,
    'GLU': 21.0,
    'MALB': 21.1,
    'URINE-CA': 21.2,
    'SG': 21.3,
    'PH': 21.4
};

const microscopyOrder = {
    'EP-PLSK': 30.1,
    'EP-PRKH': 30.2,
    'EP-POCH': 30.3,
    'MOM-LEU': 30.4,
    'ER-IZMEN': 30.5,
    'ER-NEIZM': 30.6,
    'CIL-GIAL': 30.7,
    'CIL-ZERN': 30.8,
    'CIL-VOSK': 30.9,
    'CIL-EPIT': 31.0,
    'CIL-LEUK': 31.1,
    'CIL-ERITR': 31.2,
    'URATY': 31.3,
    'OXALAT': 31.4,
    'KRИСТ': 31.5,
    'AMFOSFAT': 31.6,
    'MOCHAMM': 31.7,
    'TRIFOSFAT': 31.8,
    'SLIZ': 31.9,
    'BAKTER': 32.0,
    'DROZHZH': 32.1
};

const bloodOrder = {
    'WBC': 40.0,
    'LYM#': 40.1,
    'NEU#': 40.2,
    'MON#': 40.3,
    'EOS#': 40.4,
    'BAS#': 40.5,
    'NEU%': 40.6,
    'LYM%': 40.7,
    'MON%': 40.8,
    'EOS%': 40.9,
    'BAS%': 41.0,
    'RBC': 41.1,
    'HGB': 41.2,
    'HCT': 41.3,
    'MCV': 41.4,
    'MCH': 41.5,
    'MCHC': 41.6,
    'RDW-CV': 41.7,
    'RDW-SD': 41.8,
    'PLT': 41.9,
    'MPV': 42.0,
    'PDW': 42.1,
    'PCT': 42.2,
    'P-LCR': 42.3,
    'P-LCC': 42.4
};

const normalizeText = (value) => (value || '').toString().trim().toLowerCase();
const isMomCategory = (category = {}) => {
    const code = normalizeText(category?.code);
    const name = normalizeText(category?.name);
    return code === 'mom' || name === 'микроскопия осадка мочи';
};

async function ensureRequiredLeukocyteRows() {
    const ensureRow = async ({ categoryCode, categoryName, diagnosisCode, diagnosisName, defaultOrder, normalRanges, afterCode }) => {
        const category = await Category.findOne({
            $or: [{ code: categoryCode }, { name: categoryName }]
        });
        if (!category) return;

        const existing = await Diagnosis.findOne({ category: category._id, code: diagnosisCode }).sort({ order: 1, createdAt: 1 });
        if (existing) {
            if (!existing.normalRanges || existing.normalRanges.length === 0) {
                existing.normalRanges = normalRanges;
                await existing.save();
            }
            return;
        }

        let insertOrder = defaultOrder;
        if (afterCode) {
            const previous = await Diagnosis.findOne({ category: category._id, code: afterCode }).select('order').lean();
            if (Number.isFinite(previous?.order)) insertOrder = previous.order + 1;
        }

        await Diagnosis.updateMany(
            { category: category._id, order: { $gte: insertOrder } },
            { $inc: { order: 1 } }
        );
        await Diagnosis.create({
            name: diagnosisName,
            code: diagnosisCode,
            category: category._id,
            isActive: true,
            price: 0,
            order: insertOrder,
            normalRanges
        });
    };

    await ensureRow({
        categoryCode: 'OAK',
        categoryName: 'Общий анализ крови',
        diagnosisCode: 'WBC',
        diagnosisName: 'Лейкоциты',
        defaultOrder: 0,
        normalRanges: [{ ageMin: 0, ageMax: 5, gender: 'both', range: '6.0-17.0', unit: '10⁹/L', price: 0 }]
    });

}

async function saveDiagnosisCategoryOrder(categoryId, orderedIds = []) {
    const categoryItems = await Diagnosis.find({ category: categoryId, isActive: true })
        .select('_id order createdAt name')
        .sort({ order: 1, createdAt: 1, name: 1 })
        .lean();

    const currentIds = categoryItems.map(item => item._id.toString());
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
        await Diagnosis.bulkWrite(bulkOps);
    }

    return finalIds;
}

// Get all diagnoses â€” order maydoni bo'yicha tartiblangan
router.get('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        // await ensureRequiredLeukocyteRows();

        const diagnoses = await Diagnosis.find({ isActive: true })
            .populate('recommendedMedicines')
            .populate('category', 'name price hideAnalyses')
            .sort({ order: 1, createdAt: 1 });

        const savedOrder = (diagnosis) => Number.isFinite(diagnosis?.order)
            ? diagnosis.order
            : Number.MAX_SAFE_INTEGER;

        const seen = new Set();
        const seenMomKeys = new Set();
        const uniqueDiagnoses = diagnoses.filter(diagnosis => {
            const categoryId = (diagnosis.category?._id || diagnosis.category || '').toString();
            const code = (diagnosis.code || '').trim().toLowerCase();
            const name = (diagnosis.name || '').trim().toLowerCase();
            const key = code ? `${categoryId}:code:${code}` : `${categoryId}:name:${name}`;
            if (seen.has(key)) return false;
            seen.add(key);
            if (isMomCategory(diagnosis.category)) {
                const momKey = normalizeText(diagnosis.name || diagnosis.code || '');
                if (momKey) {
                    if (seenMomKeys.has(momKey)) return false;
                    seenMomKeys.add(momKey);
                }
            }
            return true;
        });

        res.json(uniqueDiagnoses.sort((a, b) => savedOrder(a) - savedOrder(b) || (a.name || '').localeCompare(b.name || '')));
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Reorder diagnoses (admin only) â€” drag & drop uchun
// Body: { orderedIds: ['id1', 'id2', 'id3', ...] }
router.put('/reorder/swap', auth, adminOnly, async (req, res) => {
    try {
        const { sourceId, targetId } = req.body;
        if (!sourceId || !targetId) {
            return res.status(400).json({ message: 'sourceId va targetId kerak' });
        }

        const items = await Diagnosis.find({ _id: { $in: [sourceId, targetId] }, isActive: true })
            .select('_id category order')
            .lean();
        if (items.length !== 2) {
            return res.status(400).json({ message: 'Barcha analizlar topilmadi' });
        }

        const categoryIds = [...new Set(items.map(item => item.category?.toString()).filter(Boolean))];
        if (categoryIds.length !== 1) {
            return res.status(400).json({ message: 'Tartib faqat bitta kategoriya ichida almashtiriladi' });
        }

        const categoryId = categoryIds[0];
        const categoryItems = await Diagnosis.find({ category: categoryId, isActive: true })
            .select('_id order createdAt name')
            .sort({ order: 1, createdAt: 1, name: 1 })
            .lean();
        const orderedIds = categoryItems.map(item => item._id.toString());
        const sourceIndex = orderedIds.indexOf(sourceId.toString());
        const targetIndex = orderedIds.indexOf(targetId.toString());
        if (sourceIndex === -1 || targetIndex === -1) {
            return res.status(400).json({ message: 'Analiz tartibi topilmadi' });
        }

        const movedId = orderedIds[sourceIndex];
        orderedIds[sourceIndex] = orderedIds[targetIndex];
        orderedIds[targetIndex] = movedId;
        const finalIds = await saveDiagnosisCategoryOrder(categoryId, orderedIds);

        res.json({
            message: 'Tartib saqlandi',
            count: finalIds.length,
            orders: finalIds.map((id, index) => ({ id, order: index }))
        });
    } catch (error) {
        console.error('Reorder error:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

router.put('/reorder/batch', auth, adminOnly, async (req, res) => {
    try {
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return res.status(400).json({ message: 'orderedIds massivi kerak' });
        }

        const items = await Diagnosis.find({ _id: { $in: orderedIds }, isActive: true })
            .select('_id category order')
            .lean();
        if (items.length < orderedIds.length) {
            return res.status(400).json({ message: 'Barcha analizlar topilmadi' });
        }

        const categoryIds = [...new Set(items.map(item => item.category?.toString()).filter(Boolean))];
        if (categoryIds.length !== 1) {
            return res.status(400).json({ message: 'Tartib faqat bitta kategoriya ichida saqlanadi' });
        }

        const finalIds = await saveDiagnosisCategoryOrder(categoryIds[0], orderedIds);
        res.json({
            message: 'Tartib saqlandi',
            count: finalIds.length,
            orders: finalIds.map((id, index) => ({ id, order: index }))
        });
    } catch (error) {
        console.error('Reorder error:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get single diagnosis
router.get('/:id', auth, doctorOrAdmin, async (req, res) => {
    try {
        const diagnosis = await Diagnosis.findById(req.params.id)
            .populate('recommendedMedicines')
            .populate('category', 'name price hideAnalyses');

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
        const { name, code, description, category, normalRanges, recommendedMedicines, price } = req.body;

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
            price: Number(price) || 0,
            order: newOrder
        });

        const populated = await Diagnosis.findById(diagnosis._id)
            .populate('recommendedMedicines')
            .populate('category', 'name price hideAnalyses');

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
        )
            .populate('recommendedMedicines')
            .populate('category', 'name price hideAnalyses');

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
