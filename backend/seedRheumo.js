require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

const items = [
    { code: 'RF',  name: 'Ревматоидный фактор', range: 'abs' },
    { code: 'ASL', name: 'АСЛ-О',               range: 'abs' },
    { code: 'CRP', name: 'С реактивный белок',  range: 'abs' },
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ulandi');

    let category = await Category.findOne({ name: 'Анализ крови на ревмопробы (качественный метод)' });
    if (!category) {
        category = await Category.create({
            name: 'Анализ крови на ревмопробы (качественный метод)',
            code: 'REVMO', isActive: true
        });
        console.log('✅ Kategoriya yaratildi:', category.name);
    } else {
        console.log('ℹ️  Kategoriya mavjud:', category.name);
    }

    let added = 0, skipped = 0;
    for (const a of items) {
        const exists = await Diagnosis.findOne({ code: a.code, category: category._id });
        if (exists) { skipped++; continue; }
        await Diagnosis.create({
            name: a.name, code: a.code, category: category._id,
            isActive: true, price: 0,
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: a.range, unit: '', price: 0 }]
        });
        added++;
        console.log(`  ✅ ${a.code} — ${a.name}`);
    }

    console.log(`\n🎉 Tayyor! Qo'shildi: ${added}, O'tkazib yuborildi: ${skipped}`);
    await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Xato:', err.message); process.exit(1); });
