require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

const items = [
    { code: 'APTT',      name: 'АЧТВ',                  range: '22.2-37.9', unit: 'сек' },
    { code: 'APTT-RATIO',name: 'АЧТВ соотношение',      range: '0.69-1.19', unit: ''    },
    { code: 'PTI',       name: 'ПТИ',                   range: '70-100',    unit: '%'   },
    { code: 'PT',        name: 'Протробиновое время',    range: '10.0-13.9', unit: 'сек' },
    { code: 'INR',       name: 'МНО',                   range: '0.7-1.3',   unit: ''    },
    { code: 'TT',        name: 'Тромбиновое время',      range: '14.0-20.0', unit: 'сек' },
    { code: 'DDIMER',    name: 'Д-димер (D-dimer)',      range: '0-0.5',     unit: 'мг/л'},
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ulandi');

    let category = await Category.findOne({ name: 'Коагулограмма' });
    if (!category) {
        category = await Category.create({ name: 'Коагулограмма', code: 'KOAG', isActive: true });
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
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: a.range, unit: a.unit, price: 0 }]
        });
        added++;
        console.log(`  ✅ ${a.code} — ${a.name}`);
    }

    console.log(`\n🎉 Tayyor! Qo'shildi: ${added}, O'tkazib yuborildi: ${skipped}`);
    await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Xato:', err.message); process.exit(1); });
