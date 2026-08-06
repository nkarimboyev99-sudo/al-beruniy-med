const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const diagnosisRoutes = require('./routes/diagnoses');
const patientDiagnosisRoutes = require('./routes/patientDiagnoses');
const medicineRoutes = require('./routes/medicines');
const inventoryRoutes = require('./routes/inventory');
const transactionRoutes = require('./routes/transactions');
const queueTicketRoutes = require('./routes/queueTickets');
const categoryRoutes = require('./routes/categories');
const referringDoctorRoutes = require('./routes/referringDoctors');
const {
    getDiagnosisPaymentAmount,
    normalizeDiagnosisPaymentSnapshot
} = require('./utils/finance');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/diagnoses', diagnosisRoutes);
app.use('/api/patient-diagnoses', patientDiagnosisRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/queue-tickets', queueTicketRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/referring-doctors', referringDoctorRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Al Beruniy Med API is running' });
});

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ MongoDB connected successfully');

        // Clean up orphaned transactions and diagnoses of deleted patients
        try {
            const Patient = require('./models/Patient');
            const Transaction = require('./models/Transaction');
            const PatientDiagnosis = require('./models/PatientDiagnosis');
            
            const activePatientIds = await Patient.distinct('_id');
            const delTx = await Transaction.deleteMany({
                patient: { $exists: true, $ne: null, $nin: activePatientIds }
            });
            const delDiag = await PatientDiagnosis.deleteMany({
                patient: { $exists: true, $ne: null, $nin: activePatientIds }
            });
            if (delTx.deletedCount > 0 || delDiag.deletedCount > 0) {
                console.log(`🧹 Startup Cleanup: Deleted ${delTx.deletedCount} orphaned transactions and ${delDiag.deletedCount} orphaned diagnoses`);
            }
        } catch (e) {
            console.error('❌ Startup Cleanup Error:', e);
        }

        /* // Normalize built-in urine and microscopy analysis rows
        try {
            const Category = require('./models/Category');
            const Diagnosis = require('./models/Diagnosis');
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
            const oamCategory = await Category.findOne({
                $or: [{ code: 'OAM' }, { name: 'Общий анализ мочи' }]
            });
            if (oamCategory) {
                const oamDefaults = [
                    { code: 'URINE-VOL', name: 'Количество', result: '50 мл', range: '50-100', unit: 'мл', order: 20.0 },
                    { code: 'URINE-COL', name: 'Цвет', result: 'светло-желтый', range: 'светло-желтый', unit: '', order: 20.1 },
                    { code: 'URINE-TRN', name: 'Прозрачность', result: 'прозрачная', range: 'прозрачная', unit: '', order: 20.2 },
                    { code: 'UBG', name: 'Уробилиноген (UBG)', result: 'норма', range: '3.4', unit: 'мкмол/л', order: 20.3 },
                    { code: 'BIL', name: 'Билирубин (BIL)', result: 'abs', range: 'abs', unit: '', order: 20.4 },
                    { code: 'KET', name: 'Кетон (KET)', result: 'abs', range: 'abs', unit: '', order: 20.5 },
                    { code: 'CRE', name: 'Креатинин (CRE)', result: '', range: '4.4-17.6', unit: 'ммоль/л', order: 20.6 },
                    { code: 'PRO', name: 'Белок (PRO)', result: 'abs', range: 'abs', unit: 'г/л', order: 20.7 },
                    { code: 'NIT', name: 'Нитрит (NIT)', result: 'abs', range: 'abs', unit: '', order: 20.8 },
                    { code: 'LEU', name: 'Лейкоцит (LEU)', result: 'abs', range: 'abs', unit: '', order: 20.9 },
                    { code: 'GLU', name: 'Глюкоза (GLU)', result: 'abs', range: 'abs', unit: 'ммоль/л', order: 21.0 },
                    { code: 'MALB', name: 'Микроальбумин (MALB)', result: '', range: '0-20.0', unit: 'мг/л', order: 21.1 },
                    { code: 'URINE-CA', name: 'Кальций (Ca)', result: '', range: '2.5-7.5', unit: 'ммоль/л', order: 21.2 },
                    { code: 'SG', name: 'Относительная плотность (SG)', result: '', range: '1.009-1.026', unit: 'г/мл', order: 21.3 },
                    { code: 'PH', name: 'Реакция мочи (pH)', result: '', range: '5.0-7.0', unit: '', order: 21.4 }
                ];
                const oamCodes = oamDefaults.map(item => item.code);
                for (const item of oamDefaults) {
                    let diagnosis = await Diagnosis.findOne({ category: oamCategory._id, code: item.code });
                    const normalRanges = [{
                        ageMin: 0, ageMax: 999, gender: 'both',
                        range: item.range, result: item.result, unit: item.unit, price: 0
                    }];
                    if (diagnosis) {
                        diagnosis.name = item.name;
                        diagnosis.category = oamCategory._id;
                        diagnosis.isActive = true;
                        diagnosis.price = 0;
                        await diagnosis.save();
                    } else {
                        diagnosis = await Diagnosis.create({
                            name: item.name,
                            code: item.code,
                            category: oamCategory._id,
                            isActive: true,
                            price: 0,
                            order: item.order,
                            normalRanges
                        });
                    }

                    const duplicates = await Diagnosis.find({
                        category: oamCategory._id,
                        _id: { $ne: diagnosis._id },
                        $or: [{ code: item.code }, { name: item.name }]
                    });
                    if (duplicates.length > 0) {
                        await Diagnosis.updateMany(
                            { _id: { $in: duplicates.map(d => d._id) } },
                            { $set: { isActive: false } }
                        );
                    }
                }
                await Diagnosis.updateMany(
                    { category: oamCategory._id, code: { $nin: oamCodes } },
                    { $set: { isActive: false } }
                );
                console.log('✅ OAM entries normalized');
            }

            const oakCategory = await Category.findOne({
                $or: [{ code: 'OAK' }, { name: 'Общий анализ крови' }]
            });
            if (oakCategory) {
                const wbcEntries = await Diagnosis.find({ category: oakCategory._id, code: 'WBC' }).sort({ order: 1, createdAt: 1 });
                if (wbcEntries.length === 0) {
                    await Diagnosis.updateMany(
                        { category: oakCategory._id, order: { $gte: 0 } },
                        { $inc: { order: 1 } }
                    );
                    await Diagnosis.create({
                        name: 'Лейкоциты',
                        code: 'WBC',
                        category: oakCategory._id,
                        isActive: true,
                        price: 0,
                        order: 0,
                        normalRanges: [{
                            ageMin: 0, ageMax: 5, gender: 'both',
                            range: '6.0-17.0', unit: '10⁹/L', price: 0
                        }]
                    });
                    console.log('✅ OAK: Created "Лейкоциты" (WBC) at order 0');
                } else {
                    const [keep, ...dups] = wbcEntries;
                    if (!keep.normalRanges || keep.normalRanges.length === 0) {
                        keep.normalRanges = [{
                            ageMin: 0, ageMax: 5, gender: 'both',
                            range: '6.0-17.0', unit: '10⁹/L', price: 0
                        }];
                        await keep.save();
                    }
                    if (dups.length > 0) {
                        await Diagnosis.updateMany(
                            { _id: { $in: dups.map(d => d._id) } },
                            { $set: { isActive: false } }
                        );
                    }
                }
                console.log('✅ OAK leukocyte entries updated');
            }

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
            let momCategory = await Category.findOne({ code: 'MOM' });
            if (!momCategory) {
                momCategory = await Category.create({ name: 'Микроскопия осадка мочи', code: 'MOM', isActive: true, hideAnalyses: true, price: 0 });
            }
            if (momCategory) {
                momCategory.name = 'Микроскопия осадка мочи';
                momCategory.isActive = true;
                momCategory.price = 0;
                momCategory.hideAnalyses = true;
                if (oamCategory && Number.isFinite(oamCategory.order)) {
                    momCategory.order = oamCategory.order + 1;
                } else if (!Number.isFinite(momCategory.order) || momCategory.order < 1) {
                    momCategory.order = 21;
                }
                await momCategory.save();

                const microscopyDefaults = [
                    { code: 'EP-PLSK', name: 'плоский', range: '0-5', unit: '', order: 30.1 },
                    { code: 'EP-PRKH', name: 'переходный', range: 'abs', unit: '', order: 30.2 },
                    { code: 'EP-POCH', name: 'почечный', range: 'abs', unit: '', order: 30.3 },
                    { code: 'MOM-LEU', name: 'Лейкоциты', range: '0-5', unit: '', order: 30.4 },
                    { code: 'ER-IZMEN', name: 'измененные', range: '', unit: '', order: 30.5 },
                    { code: 'ER-NEIZM', name: 'неизмененные', range: 'abs', unit: '', order: 30.6 },
                    { code: 'CIL-GIAL', name: 'гиалиновые', range: 'abs', unit: '', order: 30.7 },
                    { code: 'CIL-ZERN', name: 'зернистые', range: 'abs', unit: '', order: 30.8 },
                    { code: 'CIL-VOSK', name: 'восковидные', range: 'abs', unit: '', order: 30.9 },
                    { code: 'CIL-EPIT', name: 'эпителиальные', range: 'abs', unit: '', order: 31.0 },
                    { code: 'CIL-LEUK', name: 'лейкоцитарные', range: 'abs', unit: '', order: 31.1 },
                    { code: 'CIL-ERITR', name: 'эритроцитарные', range: 'abs', unit: '', order: 31.2 },
                    { code: 'URATY', name: 'Не органич. осадок ураты', range: 'abs', unit: '', order: 31.3 },
                    { code: 'OXALAT', name: 'Оксалаты', range: 'abs', unit: '', order: 31.4 },
                    { code: 'KRИСТ', name: 'Кристаллы мочевой кислоты', range: 'abs', unit: '', order: 31.5 },
                    { code: 'AMFOSFAT', name: 'Аморфные фосфаты', range: 'abs', unit: '', order: 31.6 },
                    { code: 'MOCHAMM', name: 'Мочекислой аммоный', range: 'abs', unit: '', order: 31.7 },
                    { code: 'TRIFOSFAT', name: 'Трипельфосфат', range: 'abs', unit: '', order: 31.8 },
                    { code: 'SLIZ', name: 'Слизь', range: 'abs', unit: '', order: 31.9 },
                    { code: 'BAKTER', name: 'Бактерии', range: 'abs', unit: '', order: 32.0 },
                    { code: 'DROZHZH', name: 'Дрожжевое грибы', range: 'abs', unit: '', order: 32.1 }
                ];
                const normalizeDiagName = (value) => (value || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
                const microscopyCodes = microscopyDefaults.map(item => item.code);
                const microscopyNames = new Set(microscopyDefaults.map(item => normalizeDiagName(item.name)));
                await Diagnosis.updateMany(
                    { code: { $in: microscopyCodes }, category: { $ne: momCategory._id } },
                    { $set: { category: momCategory._id } }
                );
                const misplacedMicroscopy = await Diagnosis.find({
                    category: { $ne: momCategory._id },
                    isActive: true
                }).select('name');
                const misplacedIds = misplacedMicroscopy
                    .filter(diagnosis => microscopyNames.has(normalizeDiagName(diagnosis.name)))
                    .map(diagnosis => diagnosis._id);
                if (misplacedIds.length > 0) {
                    await Diagnosis.updateMany(
                        { _id: { $in: misplacedIds } },
                        { $set: { category: momCategory._id } }
                    );
                }
                for (const item of microscopyDefaults) {
                    const microscopyNormalRanges = item.code === 'ER-IZMEN'
                        ? [
                            { ageMin: 0, ageMax: 999, gender: 'male', range: '0-1', unit: '', price: 0 },
                            { ageMin: 0, ageMax: 999, gender: 'female', range: '0-2', unit: '', price: 0 }
                        ]
                        : [{ ageMin: 0, ageMax: 999, gender: 'both', range: item.range, unit: item.unit, price: 0 }];
                    let diagnosis = await Diagnosis.findOne({ category: momCategory._id, code: item.code });
                    if (diagnosis) {
                        diagnosis.name = item.name;
                        diagnosis.category = momCategory._id;
                        diagnosis.isActive = true;
                        diagnosis.price = 0;
                        await diagnosis.save();
                    } else {
                        await Diagnosis.create({
                            name: item.name,
                            code: item.code,
                            category: momCategory._id,
                            isActive: true,
                            price: 0,
                            order: item.order,
                            normalRanges: microscopyNormalRanges
                        });
                    }
                    const duplicates = await Diagnosis.find({
                        category: momCategory._id,
                        $or: [
                            { code: item.code },
                            { name: item.name }
                        ]
                    }).sort({ isActive: -1, order: 1, createdAt: 1 });
                    if (duplicates.length > 1) {
                        const [, ...extra] = duplicates;
                        await Diagnosis.updateMany(
                            { _id: { $in: extra.map(diagnosis => diagnosis._id) } },
                            { $set: { isActive: false } }
                        );
                    }
                }
                console.log('✅ MOM microscopy entries updated');
            }
        } catch (e) {
            console.error('❌ Urine leukocyte order update error:', e);
        } */

        // Populate missing diagnosisId and categoryId in legacy PatientDiagnosis documents
        try {
            const PatientDiagnosis = require('./models/PatientDiagnosis');
            const Diagnosis = require('./models/Diagnosis');
            const pDiags = await PatientDiagnosis.find({ 
                $or: [
                    { 'diagnosisPrices.diagnosisId': { $exists: false } },
                    { 'diagnosisPrices.categoryId': { $exists: false } },
                    { 'diagnosisPrices.diagnosisId': null },
                    { 'diagnosisPrices.categoryId': null }
                ]
            });

            if (pDiags.length > 0) {
                console.log(`🔄 Migrating ${pDiags.length} legacy patient diagnoses...`);
                const allDbDiagnoses = await Diagnosis.find({});
                const normName = (n) => (n || '').toString().toLowerCase().replace(/[^a-zа-яё0-9]/g, '');

                for (const pd of pDiags) {
                    let updated = false;
                    for (let i = 0; i < pd.diagnosisPrices.length; i++) {
                        const dp = pd.diagnosisPrices[i];
                        if (!dp.diagnosisId || !dp.categoryId) {
                            const dpNorm = normName(dp.name);
                            const match = allDbDiagnoses.find(d => normName(d.name) === dpNorm);
                            if (match) {
                                dp.diagnosisId = match._id;
                                dp.categoryId = match.category;
                                updated = true;
                            }
                        }
                    }
                    if (updated) {
                        pd.markModified('diagnosisPrices');
                        await pd.save();
                    }
                }
                console.log('✅ Legacy patient diagnoses migration completed successfully');
            }
        } catch (e) {
            console.error('❌ Legacy patient diagnoses migration error:', e);
        }

        // Normalize stored payment totals on active patient diagnoses
        try {
            const PatientDiagnosis = require('./models/PatientDiagnosis');
            const activeDiagnoses = await PatientDiagnosis.find({ isActive: true })
                .populate({ path: 'diagnosis', populate: { path: 'category', select: 'name price hideAnalyses' } });

            for (const diagnosis of activeDiagnoses) {
                const prices = Array.isArray(diagnosis.diagnosisPrices) ? diagnosis.diagnosisPrices : [];
                if (prices.length === 0) continue;

                const normalized = normalizeDiagnosisPaymentSnapshot(diagnosis.toObject());
                const needsUpdate =
                    Number(diagnosis.discountPercent || 0) !== Number(normalized.discountPercent || 0) ||
                    Number(diagnosis.discount || 0) !== Number(normalized.discount || 0) ||
                    Number(diagnosis.totalAmount || 0) !== Number(normalized.totalAmount || 0);

                if (needsUpdate) {
                    diagnosis.discountPercent = normalized.discountPercent;
                    diagnosis.discount = normalized.discount;
                    diagnosis.totalAmount = normalized.totalAmount;
                    await diagnosis.save();
                }
            }
            console.log('✅ Patient diagnosis payment normalization completed');
        } catch (e) {
            console.error('❌ Patient diagnosis payment normalization error:', e);
        }

        // Ensure accounting rows exist for all paid diagnoses
        try {
            const Patient = require('./models/Patient');
            const PatientDiagnosis = require('./models/PatientDiagnosis');
            const Transaction = require('./models/Transaction');
            const activePatientIds = await Patient.distinct('_id');
            const diagnoses = await PatientDiagnosis.find({
                isActive: true,
                patient: { $in: activePatientIds }
            }).populate('patient', 'fullName');

            for (const diagnosis of diagnoses) {
                const amount = getDiagnosisPaymentAmount(diagnosis);

                if (amount <= 0) {
                    await Transaction.deleteMany({ patientDiagnosis: diagnosis._id });
                    continue;
                }

                const discountPercent = diagnosis.discountPercent || 0;
                const discountStr = discountPercent > 0 ? ` (${discountPercent}% chegirma)` : '';

                await Transaction.findOneAndUpdate(
                    { patientDiagnosis: diagnosis._id },
                    {
                        $set: {
                            type: 'income',
                            category: 'service',
                            amount,
                            description: `Analiz: ${diagnosis.patient?.fullName || ''} - ${diagnosis.diagnosisName || ''}${discountStr}`.trim(),
                            patient: diagnosis.patient?._id || diagnosis.patient,
                            patientDiagnosis: diagnosis._id,
                            paymentMethod: diagnosis.paymentMethod || 'cash',
                            date: diagnosis.createdAt || new Date(),
                            createdBy: diagnosis.doctor
                        }
                    },
                    { upsert: true, setDefaultsOnInsert: true }
                );
            }
            console.log('✅ Accounting backfill completed');
        } catch (e) {
            console.error('❌ Accounting backfill error:', e);
        }

        // Create default admin user if not exists
        const User = require('./models/User');
        User.createDefaultAdmin();
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
    });

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 API: http://localhost:${PORT}/api`);

    // Render free tier uxlab qolmasligi uchun har 14 daqiqada o'ziga ping
    if (process.env.RENDER_EXTERNAL_URL) {
        const https = require('https');
        setInterval(() => {
            https.get(`${process.env.RENDER_EXTERNAL_URL}/api/health`, (res) => {
                console.log(`🏓 Keep-alive ping: ${res.statusCode}`);
            }).on('error', (err) => {
                console.error('Keep-alive ping xatosi:', err.message);
            });
        }, 14 * 60 * 1000); // 14 daqiqa
    }
});
