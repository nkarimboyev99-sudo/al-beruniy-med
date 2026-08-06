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
            isActive: true, price: 0,
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: 'отрицательный', unit: '', price: 0 }]
        });
        added++;
        console.log(`  ✅ ${a.code} — ${a.name}`);
    }
    console.log(`  → Qo'shildi: ${added}, O'tkazib yuborildi: ${skipped}\n`);
}

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ulandi\n');

    // ── 1. Анализ на вирусный гепатит ──────────────────────────
    const cat1 = await createCategory('Анализ на вирусный гепатит', 'HEPATIT');
    await addDiagnoses(cat1, [
        { code: 'HBSAG',    name: 'HbsAg IgG'    },
        { code: 'ANTI-HCV', name: 'Anti-HCV IgG' },
        { code: 'ANTI-HAV', name: 'Anti-HAV IgM' },
    ]);

    // ── 2. Экспресс тест анализ на RW ──────────────────────────
    const cat2 = await createCategory('Экспресс тест анализ на RW', 'RW');
    await addDiagnoses(cat2, [
        { code: 'TR-PALL', name: 'Tr.Pallidum' },
    ]);

    // ── 3. Антитела к коронавирусу SARS-COV-2 (COVID-19) ───────
    const cat3 = await createCategory('Определение Антитела к коронавирусу SARS-COV-2(COVID-19)', 'COVID19');
    await addDiagnoses(cat3, [
        { code: 'COVID-IGM', name: 'Антитела к коронавирусу SARS-COV-2(COVID-19) IgM' },
        { code: 'COVID-IGG', name: 'Антитела к коронавирусу SARS-COV-2(COVID-19) IgG' },
    ]);

    console.log('🎉 Hammasi tayyor!');
    await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Xato:', err.message); process.exit(1); });
