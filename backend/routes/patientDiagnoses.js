const express = require('express');
const Diagnosis = require('../models/Diagnosis');
const Category = require('../models/Category');
const PatientDiagnosis = require('../models/PatientDiagnosis');
const Patient = require('../models/Patient');
const Transaction = require('../models/Transaction');
const { auth, doctorOrAdmin } = require('../middleware/auth');
const {
    clampDiscountPercent,
    getDiagnosisSubtotal,
    getDiagnosisDiscountAmount,
    getDiagnosisPaymentAmount,
    normalizeDiagnosisPaymentSnapshot
} = require('../utils/finance');
const { getNextDailyNumber, backfillTodayDailyNumbers } = require('../utils/dailyNumber');

const router = express.Router();

const isConfirmRequest = (body = {}) => body.isConfirmed === true || body.confirm === true;
const normalizeText = (value) => (value || '').toString().trim().toLowerCase();
const toId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value._id) return value._id.toString();
    return value.toString();
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

const getCanonicalOrder = (code, fallback) => {
    return fallback ?? Number.MAX_SAFE_INTEGER;
};

const sortByOrder = (items) => items.sort((a, b) => {
    const orderA = getCanonicalOrder(a.code, Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER);
    const orderB = getCanonicalOrder(b.code, Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER);
    if (orderA !== orderB) return orderA - orderB;
    return normalizeText(a.name).localeCompare(normalizeText(b.name));
});

const getDiagnosisNameTags = (diagnosisName = '') =>
    diagnosisName
        .split(',')
        .map(name => name.trim())
        .filter(Boolean);

const getPriceKey = (price = {}) => {
    const diagnosisId = toId(price.diagnosisId);
    if (diagnosisId) return `diagnosis:${diagnosisId}`;

    const categoryId = toId(price.categoryId);
    const code = normalizeText(price.code);
    if (categoryId && code) return `category:${categoryId}:code:${code}`;

    const name = normalizeText(price.name);
    if (categoryId && name) return `category:${categoryId}:name:${name}`;

    return normalizeText(price.code || price.name);
};

const isMomCategory = (category = {}) => {
    const code = normalizeText(category?.code);
    const name = normalizeText(category?.name);
    return code === 'mom' || name === 'микроскопия осадка мочи';
};

const getMicroscopySemanticKey = (item = {}) => normalizeText(item.name || item.code || '');

let categoryContextCache = null;
let categoryContextExpiresAt = 0;
const CATEGORY_CONTEXT_CACHE_TTL_MS = 5000;

async function getCategoryContext() {
    const now = Date.now();
    if (categoryContextCache && categoryContextExpiresAt > now) return categoryContextCache;

    const categories = await Category.find({ isActive: true }).select('name code').lean();
    categoryContextCache = {
        categories,
        categoriesById: new Map(categories.map(category => [toId(category._id), category])),
        categoriesByName: new Map(categories.map(category => [normalizeText(category.name), category])),
        categoriesByCode: new Map(categories.map(category => [normalizeText(category.code), category]))
    };
    categoryContextExpiresAt = now + CATEGORY_CONTEXT_CACHE_TTL_MS;
    return categoryContextCache;
}

async function getActiveDiagnosesForCategories(categoryIds = []) {
    const ids = [...new Set(categoryIds.map(toId).filter(Boolean))].sort();
    if (ids.length === 0) return [];

    const { categoriesById } = await getCategoryContext();

    const items = await Diagnosis.find({
        category: { $in: ids },
        isActive: true
    })
        .select('name code order category')
        .sort({ order: 1, createdAt: 1 })
        .lean();

    const deduped = [];
    const seenMomKeys = new Set();
    items.forEach(item => {
        const category = categoriesById.get(toId(item.category));
        if (isMomCategory(category)) {
            const momKey = getMicroscopySemanticKey(item);
            if (momKey && seenMomKeys.has(momKey)) return;
            if (momKey) seenMomKeys.add(momKey);
        }
        deduped.push(item);
    });

    return deduped;
}

async function getMandatoryLeukocyteDiagnosesForPrices(prices = []) {
    const { categoriesById, categoriesByName, categoriesByCode } = await getCategoryContext();
    const mandatory = [];

    const hasCategory = (code, name) => prices.some(price => {
        const categoryId = toId(price.categoryId);
        const category = categoriesById.get(categoryId);
        const categoryCode = normalizeText(category?.code || price.categoryCode);
        const categoryName = normalizeText(category?.name || price.categoryName || price.name);
        return categoryCode === normalizeText(code) || categoryName === normalizeText(name);
    });

    const addByCode = async (category, diagnosisCode) => {
        if (!category) return;
        const diagnosis = await Diagnosis.findOne({
            category: category._id,
            code: diagnosisCode,
            isActive: true
        }).select('name code order category').lean();
        if (diagnosis) mandatory.push(diagnosis);
    };

    if (hasCategory('OAK', 'Общий анализ крови')) {
        await addByCode(categoriesByCode.get('oak') || categoriesByName.get(normalizeText('Общий анализ крови')), 'WBC');
    }

    return mandatory;
}

async function getSelectedPackageCategoryIds(patientDiagnosis, prices) {
    const { categoriesById, categoriesByName, categoriesByCode } = await getCategoryContext();
    const categoryIds = new Set();

    const addPackageCategoryId = (value) => {
        const id = toId(value);
        if (!id) return;
        const category = categoriesById.get(id);
        if (category && category.hideAnalyses) {
            categoryIds.add(id);
        }
    };

    const diagIds = prices.map(p => toId(p?.diagnosisId)).filter(Boolean);
    let diagCategoryMap = new Map();
    if (diagIds.length > 0) {
        const foundDiags = await Diagnosis.find({ _id: { $in: diagIds } }).select('category name').lean();
        foundDiags.forEach(d => {
            const catId = toId(d.category?._id || d.category);
            if (catId) diagCategoryMap.set(toId(d._id), catId);
        });
    }

    prices.forEach(price => {
        const catIdFromDiag = diagCategoryMap.get(toId(price?.diagnosisId));
        const catId = toId(price?.categoryId) || catIdFromDiag;

        if (price?.isCategoryPrice && catId) {
            categoryIds.add(catId);
        } else if (catId) {
            addPackageCategoryId(catId);
        }

        const rawCatName = price?.categoryName || price?.name || '';
        const cleanCatName = rawCatName.replace(/\s*\(.*?\)/g, '').trim();
        const categoryNameMatch = categoriesByName.get(normalizeText(rawCatName)) || categoriesByName.get(normalizeText(cleanCatName));
        if (categoryNameMatch && (price?.isCategoryPrice || categoryNameMatch.hideAnalyses)) {
            categoryIds.add(toId(categoryNameMatch._id));
        }
    });

    getDiagnosisNameTags(patientDiagnosis?.diagnosisName).forEach(tag => {
        const normTag = normalizeText(tag);
        const cleanTag = normalizeText(tag.replace(/\s*\(.*?\)/g, '').trim());
        const category = categoriesByName.get(normTag) || categoriesByName.get(cleanTag);
        if (category && category.hideAnalyses) {
            categoryIds.add(toId(category._id));
        }
    });

    const oamCategory = categoriesByCode.get('oam') || categoriesByName.get(normalizeText('Общий анализ мочи'));
    const momCategory = categoriesByCode.get('mom') || categoriesByName.get(normalizeText('Микроскопия осадка мочи'));
    if (oamCategory && momCategory && categoryIds.has(toId(oamCategory._id))) {
        categoryIds.add(toId(momCategory._id));
    }

    return { categoryIds: Array.from(categoryIds), categoriesById, momCategoryId: momCategory ? toId(momCategory._id) : null };
}

async function normalizeDiagnosisPrices(patientDiagnosis) {
    let prices = Array.isArray(patientDiagnosis?.diagnosisPrices)
        ? patientDiagnosis.diagnosisPrices.map(item => (
            typeof item?.toObject === 'function' ? item.toObject() : { ...item }
        ))
        : [];

    const { categoryIds, categoriesById, momCategoryId } = await getSelectedPackageCategoryIds(patientDiagnosis, prices);
    const selectedCategoryIds = new Set(categoryIds);
    const selectedNames = new Set(getDiagnosisNameTags(patientDiagnosis?.diagnosisName).map(normalizeText));

    if (selectedCategoryIds.size > 0) {
        prices = prices.filter(price => {
            if (price?.isCategoryPrice) return true;
            const categoryId = toId(price.categoryId);
            if (categoryId && selectedCategoryIds.has(categoryId)) return true;
            return selectedNames.has(normalizeText(price.name));
        });
    }

    // Explicitly filter out MOM items if MOM category was NOT selected
    if (momCategoryId && selectedCategoryIds.size > 0 && !selectedCategoryIds.has(momCategoryId)) {
        prices = prices.filter(price => toId(price.categoryId) !== momCategoryId);
    }

    prices = prices.filter(price => {
        const category = categoriesById.get(toId(price.categoryId));
        const categoryCode = normalizeText(category?.code || price.categoryCode);
        const categoryName = normalizeText(category?.name || price.categoryName);
        const code = normalizeText(price.code);
        const name = normalizeText(price.name);
        const isOam = categoryCode === 'oam' || categoryName === normalizeText('Общий анализ мочи');
        return !(isOam && (code === 'oam-leuco' || name === normalizeText('Лейкоциты')));
    });

    const priceDiagnosisIds = prices.map(price => toId(price.diagnosisId)).filter(Boolean);
    const priceNames = prices.map(price => price.name).filter(Boolean);
    const priceCategoryIds = prices.map(price => toId(price.categoryId)).filter(Boolean);
    const diagnosisQueries = [];
    if (priceDiagnosisIds.length > 0) {
        diagnosisQueries.push({ _id: { $in: priceDiagnosisIds } });
    }
    if (priceNames.length > 0) {
        diagnosisQueries.push({
            name: { $in: priceNames },
            ...(priceCategoryIds.length > 0 ? { category: { $in: priceCategoryIds } } : {})
        });
    }

    const matchedDiagnoses = diagnosisQueries.length > 0
        ? await Diagnosis.find({ $or: diagnosisQueries })
            .populate('category', 'name')
            .select('name code order category')
            .lean()
        : [];
    const diagnosesById = new Map(matchedDiagnoses.map(diagnosis => [toId(diagnosis._id), diagnosis]));
    const diagnosesByCategoryAndName = new Map();
    const diagnosesByName = new Map();
    matchedDiagnoses.forEach(diagnosis => {
        const categoryId = toId(diagnosis.category?._id || diagnosis.category);
        const name = normalizeText(diagnosis.name);
        if (categoryId && name) diagnosesByCategoryAndName.set(`${categoryId}:${name}`, diagnosis);
        if (name && !diagnosesByName.has(name)) diagnosesByName.set(name, diagnosis);
    });

    prices.forEach(price => {
        const diagnosisId = toId(price.diagnosisId);
        const priceCategoryId = toId(price.categoryId);
        const priceName = normalizeText(price.name);
        const diagnosis = diagnosesById.get(diagnosisId) ||
            diagnosesByCategoryAndName.get(`${priceCategoryId}:${priceName}`) ||
            diagnosesByName.get(priceName);

        if (!diagnosis) return;
        const categoryId = priceCategoryId || toId(diagnosis.category?._id || diagnosis.category);
        price.diagnosisId = diagnosis._id;
        price.categoryId = categoryId;
        price.categoryName = price.categoryName || diagnosis.category?.name || categoriesById.get(categoryId)?.name || '';
        price.code = price.code || diagnosis.code || '';
        price.order = Number.isFinite(diagnosis.order)
            ? diagnosis.order
            : (Number.isFinite(price.order) ? price.order : Number.MAX_SAFE_INTEGER);
        price.name = price.name || diagnosis.name;
    });

    const existingKeys = new Set(prices.map(getPriceKey).filter(Boolean));

    if (selectedCategoryIds.size > 0) {
        const packageDiagnoses = await getActiveDiagnosesForCategories(Array.from(selectedCategoryIds));

        packageDiagnoses.forEach(diagnosis => {
            const categoryId = toId(diagnosis.category);
            const category = categoriesById.get(categoryId);
            const categoryCode = normalizeText(category?.code);
            const categoryName = normalizeText(category?.name);
            const code = normalizeText(diagnosis.code);
            const name = normalizeText(diagnosis.name);
            const isOam = categoryCode === 'oam' || categoryName === normalizeText('Общий анализ мочи');
            if (isOam && (code === 'oam-leuco' || name === normalizeText('Лейкоциты'))) {
                return;
            }

            const item = {
                diagnosisId: diagnosis._id,
                categoryId,
                categoryName: category?.name || '',
                code: diagnosis.code || '',
                order: Number.isFinite(diagnosis.order) ? diagnosis.order : Number.MAX_SAFE_INTEGER,
                isCategoryPrice: false,
                name: diagnosis.name,
                price: 0
            };
            const key = getPriceKey(item);
            if (!key || existingKeys.has(key)) return;
            existingKeys.add(key);
            prices.push(item);
        });
    }

    const mandatoryDiagnoses = await getMandatoryLeukocyteDiagnosesForPrices(prices);
    mandatoryDiagnoses.forEach(diagnosis => {
        const categoryId = toId(diagnosis.category);
        const category = categoriesById.get(categoryId);
        const item = {
            diagnosisId: diagnosis._id,
            categoryId,
            categoryName: category?.name || '',
            code: diagnosis.code || '',
            order: Number.isFinite(diagnosis.order) ? diagnosis.order : Number.MAX_SAFE_INTEGER,
            isCategoryPrice: false,
            name: diagnosis.name,
            price: 0
        };
        const key = getPriceKey(item);
        if (!key || existingKeys.has(key)) return;
        existingKeys.add(key);
        prices.push(item);
    });

    const deduped = [];
    const seen = new Set();
    for (const price of prices) {
        const key = getPriceKey(price);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(price);
    }

    const microscopyDeduped = [];
    const seenMomKeys = new Set();
    deduped.forEach(price => {
        const category = categoriesById.get(toId(price.categoryId));
        if (isMomCategory(category)) {
            const key = getMicroscopySemanticKey(price);
            if (key && seenMomKeys.has(key)) return;
            if (key) seenMomKeys.add(key);
        }
        microscopyDeduped.push(price);
    });

    // Final dedup: remove items with same name in same category
    // (catches duplicates where categoryId was missing or mismatched)
    const finalDeduped = [];
    const seenCategoryNameKeys = new Set();
    microscopyDeduped.forEach(price => {
        const catId = toId(price.categoryId);
        const name = normalizeText(price.name);
        if (catId && name) {
            const key = `${catId}:${name}`;
            if (seenCategoryNameKeys.has(key)) return;
            seenCategoryNameKeys.add(key);
        }
        finalDeduped.push(price);
    });

    // Also remove non-MOM items whose name matches an existing MOM item
    // (e.g., Лейкоциты from OAM that slipped through the filter)
    const result = [];
    finalDeduped.forEach(price => {
        const category = categoriesById.get(toId(price.categoryId));
        if (!isMomCategory(category)) {
            const name = normalizeText(price.name);
            if (name && seenMomKeys.has(name)) return;
        }
        result.push(price);
    });

    return sortByOrder(result);
}

const normalizeDiagnosisPayment = (patientDiagnosis) => {
    const subtotal = getDiagnosisSubtotal(patientDiagnosis);
    const discountPercent = clampDiscountPercent(patientDiagnosis.discountPercent);
    
    // Agar frontend to'g'ri hisoblab (dorilarni ham qo'shib) yuborgan bo'lsa, o'zini saqlaymiz
    let discount = patientDiagnosis.discount;
    if (discount === undefined || discount === null) {
        discount = getDiagnosisDiscountAmount(patientDiagnosis, subtotal);
    }
    
    const savedAmount = patientDiagnosis.totalAmount;
    let totalAmount = savedAmount;
    
    if (!totalAmount || totalAmount <= 0) {
        totalAmount = Math.max(0, subtotal - discount);
    }

    patientDiagnosis.discountPercent = discountPercent;
    patientDiagnosis.discount = discount;
    patientDiagnosis.totalAmount = totalAmount;
};

const buildNormalizedResponse = async (diagnosis) => {
    const normalizedPrices = await normalizeDiagnosisPrices(diagnosis);
    return normalizeDiagnosisPaymentSnapshot({
        ...diagnosis,
        diagnosisPrices: normalizedPrices
    });
};

async function syncDiagnosisTransaction(patientDiagnosis, userId) {
    const amount = getDiagnosisPaymentAmount(patientDiagnosis);
    if (!amount || amount <= 0) {
        await Transaction.deleteMany({ patientDiagnosis: patientDiagnosis._id });
        return;
    }

    const patient = await Patient.findById(patientDiagnosis.patient).select('fullName');
    const discountPercent = patientDiagnosis.discountPercent || 0;
    const discountStr = discountPercent > 0 ? ` (${discountPercent}% chegirma)` : '';
    await Transaction.findOneAndUpdate(
        { patientDiagnosis: patientDiagnosis._id },
        {
            $set: {
                type: 'income',
                category: 'service',
                amount,
                description: `Analiz: ${patient?.fullName || ''} - ${patientDiagnosis.diagnosisName || ''}${discountStr}`.trim(),
                patient: patientDiagnosis.patient,
                patientDiagnosis: patientDiagnosis._id,
                paymentMethod: patientDiagnosis.paymentMethod || 'cash',
                date: patientDiagnosis.createdAt || new Date(),
                createdBy: userId
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

// Get current doctor's own diagnoses
router.get('/my', auth, doctorOrAdmin, async (req, res) => {
    try {
        await backfillTodayDailyNumbers();
        const diagnoses = await PatientDiagnosis.find({
            doctor: req.user._id,
            isActive: true
        })
            .populate('patient', 'fullName phone')
            .populate({ path: 'diagnosis', populate: { path: 'category', select: 'name price hideAnalyses' } })
            .sort({ createdAt: -1 })
            .lean();

        const normalized = await Promise.all(diagnoses.map(buildNormalizedResponse));

        res.json(normalized);
    } catch (error) {
        console.error('Error fetching my diagnoses:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get all diagnoses for a specific patient
router.get('/patient/:patientId', auth, doctorOrAdmin, async (req, res) => {
    try {
        await backfillTodayDailyNumbers();
        const filter = { patient: req.params.patientId, isActive: true };
        const diagnoses = await PatientDiagnosis.find(filter)
            .populate({ path: 'diagnosis', populate: { path: 'category', select: 'name price' } })
            .populate('doctor', 'fullName username')
            .populate('medicines.medicine', 'name')
            .populate('results.savedBy', 'fullName')
            .populate('results.confirmedBy', 'fullName')
            .sort({ createdAt: -1 })
            .lean();

        const normalized = await Promise.all(diagnoses.map(buildNormalizedResponse));

        res.json(normalized);
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
            .populate({ path: 'diagnosis', populate: { path: 'category', select: 'name price hideAnalyses' } })
            .populate('doctor', 'fullName username')
            .populate('medicines.medicine', 'name')
            .populate('results.savedBy', 'fullName')
            .populate('results.confirmedBy', 'fullName');

        if (!diagnosis) {
            return res.status(404).json({ message: 'Tashxis topilmadi' });
        }

        res.json(await buildNormalizedResponse(diagnosis.toObject()));
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
            discountPercent,
            paymentMethod
        } = req.body;

        await backfillTodayDailyNumbers();
        const dailyNumber = await getNextDailyNumber();

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
            discountPercent: discountPercent || 0,
            paymentMethod: paymentMethod || 'cash',
            dailyNumber
        });

        const populatedDiagnosis = await PatientDiagnosis.findById(patientDiagnosis._id)
            .populate({ path: 'diagnosis', populate: { path: 'category', select: 'name price hideAnalyses' } });
        const normalizedPrices = await normalizeDiagnosisPrices(populatedDiagnosis);
        patientDiagnosis.diagnosisPrices = normalizedPrices;
        normalizeDiagnosisPayment(patientDiagnosis);
        await patientDiagnosis.save();

        // Update patient's lastDiagnosisDate
        await Patient.findByIdAndUpdate(patient, {
            lastDiagnosisDate: new Date()
        });

        await syncDiagnosisTransaction(patientDiagnosis, req.user._id);

        const populated = await PatientDiagnosis.findById(patientDiagnosis._id)
            .populate('patient')
            .populate({ path: 'diagnosis', populate: { path: 'category', select: 'name price hideAnalyses' } })
            .populate('doctor', 'fullName username')
            .populate('medicines.medicine', 'name');

        res.status(201).json(normalizeDiagnosisPaymentSnapshot({
            ...populated.toObject(),
            diagnosisPrices: normalizedPrices
        }));
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
            .populate({ path: 'diagnosis', populate: { path: 'category', select: 'name price hideAnalyses' } })
            .populate('doctor', 'fullName username')
            .populate('medicines.medicine', 'name');

        if (!diagnosis) {
            return res.status(404).json({ message: 'Tashxis topilmadi' });
        }

        const populatedDiagnosis = await PatientDiagnosis.findById(diagnosis._id)
            .populate({ path: 'diagnosis', populate: { path: 'category', select: 'name price hideAnalyses' } });
        const normalizedPrices = await normalizeDiagnosisPrices(populatedDiagnosis);
        diagnosis.diagnosisPrices = normalizedPrices;
        normalizeDiagnosisPayment(diagnosis);
        await diagnosis.save();
        await syncDiagnosisTransaction(diagnosis, req.user._id);

        res.json(normalizeDiagnosisPaymentSnapshot({
            ...diagnosis.toObject(),
            diagnosisPrices: normalizedPrices
        }));
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

        await Transaction.deleteMany({ patientDiagnosis: diagnosis._id });

        res.json({ message: 'Tashxis o\'chirildi' });
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Save diagnosis results (natijalarni saqlash)
router.put('/:id/results', auth, doctorOrAdmin, async (req, res) => {
    try {
        const { title, columns, rows, conclusion } = req.body;
        const shouldConfirm = isConfirmRequest(req.body);

        const diagnosis = await PatientDiagnosis.findById(req.params.id);
        if (!diagnosis) {
            return res.status(404).json({ message: 'Tashxis topilmadi' });
        }

        const previousResults = diagnosis.results || {};
        const wasConfirmed = previousResults.isConfirmed === true ||
            (previousResults.isConfirmed === undefined && !!previousResults.savedAt);
        const confirmedAt = shouldConfirm ? new Date() : (previousResults.confirmedAt || (wasConfirmed ? previousResults.savedAt : undefined));
        const confirmedBy = shouldConfirm ? req.user._id : (previousResults.confirmedBy || (wasConfirmed ? previousResults.savedBy : undefined));

        // Natijalarni saqlash - dinamik ustunlar bilan
        diagnosis.results = {
            title,
            columns: columns || [],
            rows: (rows || []).map(r => ({
                values: r.values || {}
            })),
            conclusion,
            savedAt: new Date(),
            savedBy: req.user._id,
            isConfirmed: shouldConfirm || wasConfirmed,
            confirmedAt,
            confirmedBy
        };

        await diagnosis.save();

        const updated = await PatientDiagnosis.findById(diagnosis._id)
            .populate('patient')
            .populate({ path: 'diagnosis', populate: { path: 'category', select: 'name price hideAnalyses' } })
            .populate('doctor', 'fullName username')
            .populate('medicines.medicine', 'name')
            .populate('results.savedBy', 'fullName')
            .populate('results.confirmedBy', 'fullName');

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
            .populate('results.savedBy', 'fullName')
            .populate('results.confirmedBy', 'fullName');

        if (!diagnosis) {
            return res.status(404).json({ message: 'Tashxis topilmadi' });
        }

        res.json(diagnosis.results || null);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

module.exports = router;
