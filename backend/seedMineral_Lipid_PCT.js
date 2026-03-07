require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

async function createCategory(name, code) {
    let cat = await Category.findOne({ name });
    if (!cat) {
        cat = await Category.create({ name, code, isActive: true });
        console.log('✅ Kategoriya yaratildi:', name);
    } else {
        console.log('ℹ️  Kategoriya mavjud:', name);
    }
    return cat;
}

async function addDiagnoses(category, items) {
    let added = 0, skipped = 0;
    for (const a of items) {
        const exists = await Diagnosis.findOne({ code: a.code, category: category._id });
        if (exists) { skipped++; continue; }
        await Diagnosis.create({
            name: a.name, code: a.code, category: category._id,
            isActive: true, price: 0, normalRanges: a.normalRanges
        });
        added++;
        console.log(`  ✅ ${a.code} — ${a.name}`);
    }
    console.log(`  → Qo'shildi: ${added}, O'tkazib yuborildi: ${skipped}\n`);
}

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ulandi\n');

    // ── 1. Анализ минерального обмена ──────────────────────────
    const cat1 = await createCategory('Анализ минерального обмена', 'AMO');
    await addDiagnoses(cat1, [
        { code: 'MIN-CA',  name: 'Кальций',  normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '2.02-2.6',   unit: 'ммоль/л', price: 0 }] },
        { code: 'MIN-K',   name: 'Калий',    normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '3.6-5.5',    unit: 'ммоль/л', price: 0 }] },
        { code: 'MIN-NA',  name: 'Натрий',   normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '135-155',    unit: 'ммоль/л', price: 0 }] },
        { code: 'MIN-MG',  name: 'Магний',   normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '0.8-1.0',    unit: 'ммоль/л', price: 0 }] },
        { code: 'MIN-FE',  name: 'Железо',   normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '8.1-28.3',   unit: 'ммоль/л', price: 0 }] },
        { code: 'MIN-PH',  name: 'Фосфор',   normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '0.81-1.45',  unit: 'ммоль/л', price: 0 }] },
    ]);

    // ── 2. Липидный спектр ──────────────────────────────────────
    const cat2 = await createCategory('Липидный спектр', 'LIPID');
    await addDiagnoses(cat2, [
        {
            code: 'CHOL-TOT', name: 'Холестерин общий',
            normalRanges: [
                { ageMin: 1,  ageMax: 14,  gender: 'both',   range: '2.8-4.9',   unit: 'ммоль/л', price: 0 },
                { ageMin: 15, ageMax: 999, gender: 'male',   range: '3.0-5.2',   unit: 'ммоль/л', price: 0 },
                { ageMin: 15, ageMax: 999, gender: 'female', range: '3.0-5.5',   unit: 'ммоль/л', price: 0 },
            ]
        },
        { code: 'CHOL-LDL',  name: 'Холестерол-ЛПНП',       normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '0-4.11',     unit: 'ммоль/л', price: 0 }] },
        { code: 'CHOL-HDL',  name: 'Холестерол-ЛПВП',       normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '>1.15',      unit: 'ммоль/л', price: 0 }] },
        { code: 'CHOL-VLDL', name: 'Холестерол-ЛПОНП',      normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '0.16-0.85',  unit: 'ммоль/л', price: 0 }] },
        { code: 'ATHER',     name: 'Индекс Атерогенности',  normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '0-3.5',      unit: 'ед',      price: 0 }] },
        { code: 'TG',        name: 'Триглицериды',           normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '0-2.3',      unit: 'ммоль/л', price: 0 }] },
    ]);

    // ── 3. Анализы на прокальцитонин и ферритин ────────────────
    const cat3 = await createCategory('Анализы на прокальцитонин и ферритин', 'PCT-FER');
    await addDiagnoses(cat3, [
        { code: 'PCT',  name: 'Прокальцитонин', normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '0.0-0.5',  unit: 'нг/мл', price: 0 }] },
        { code: 'FERR', name: 'Ферритин',        normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '16-220',   unit: 'нг/мл', price: 0 }] },
    ]);

    console.log('🎉 Hammasi tayyor!');
    await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Xato:', err.message); process.exit(1); });
