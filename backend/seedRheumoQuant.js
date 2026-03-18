require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB ulandi');

    let category = await Category.findOne({ name: 'Анализ крови на С реактивный белок, ревматоидный фактор и АСЛ-О (количественный метод)' });
    if (!category) {
        category = await Category.create({
            name: 'Анализ крови на С реактивный белок, ревматоидный фактор и АСЛ-О (количественный метод)',
            code: 'REVMO-Q', isActive: true
        });
        console.log('Kategoriya yaratildi:', category.name);
    } else {
        console.log('Kategoriya mavjud:', category.name);
    }

    const items = [
        {
            code: 'CRP-Q',
            name: 'С реактивный белок',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'both', range: '1-10', unit: 'мг/л', price: 0 }
            ]
        },
        {
            code: 'RF-Q',
            name: 'Ревматоидный фактор',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'both', range: '<18', unit: 'МЕ/л', price: 0 }
            ]
        },
        {
            code: 'ASL-Q',
            name: 'АСЛ-О',
            normalRanges: [
                { ageMin: 0, ageMax: 5,   gender: 'both', range: 'до 150', unit: 'МЕ/мл', price: 0 },
                { ageMin: 6, ageMax: 999, gender: 'both', range: 'до 200', unit: 'МЕ/мл', price: 0 }
            ]
        },
    ];

    let added = 0, skipped = 0;
    for (const a of items) {
        const exists = await Diagnosis.findOne({ code: a.code, category: category._id });
        if (exists) { skipped++; continue; }
        await Diagnosis.create({
            name: a.name, code: a.code, category: category._id,
            isActive: true, price: 0,
            normalRanges: a.normalRanges
        });
        added++;
        console.log(`  ${a.code} — ${a.name}`);
    }

    console.log(`\nQo'shildi: ${added}, O'tkazib yuborildi: ${skipped}`);
    await mongoose.disconnect();
}

seed().catch(err => { console.error('Xato:', err.message); process.exit(1); });
