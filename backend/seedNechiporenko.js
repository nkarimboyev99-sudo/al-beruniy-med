require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

const items = [
    { code: 'NECH-LEU',  name: 'Лейкоцитов',  range: 'не более 1000' },
    { code: 'NECH-ER',   name: 'Эритроцитов', range: 'не более 2000' },
    { code: 'NECH-CYL',  name: 'Цилиндров',   range: 'не более 20'   },
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB ulandi');

    let category = await Category.findOne({ name: 'Анализ мочи по Нечипоренко' });
    if (!category) {
        category = await Category.create({ name: 'Анализ мочи по Нечипоренко', code: 'NECH', isActive: true });
        console.log('Kategoriya yaratildi:', category.name);
    } else {
        console.log('Kategoriya mavjud:', category.name);
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
        console.log(`  ${a.code} — ${a.name}`);
    }

    console.log(`\nQo'shildi: ${added}, O'tkazib yuborildi: ${skipped}`);
    await mongoose.disconnect();
}

seed().catch(err => { console.error('Xato:', err.message); process.exit(1); });
