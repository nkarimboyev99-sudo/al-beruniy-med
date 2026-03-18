require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB ulandi');

    let category = await Category.findOne({ name: 'Опухолевые маркеры' });
    if (!category) {
        category = await Category.create({ name: 'Опухолевые маркеры', code: 'TUMOR-MRK', isActive: true });
        console.log('Kategoriya yaratildi:', category.name);
    } else {
        console.log('Kategoriya mavjud:', category.name);
    }

    const items = [
        {
            code: 'PSA-T',
            name: 'ПСА общий',
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '0-4,0', unit: 'нг/мл', price: 0 }]
        },
        {
            code: 'PSA-F',
            name: 'ПСА свободный',
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '0,04-1,0', unit: 'нг/мл', price: 0 }]
        },
        {
            code: 'CA-125',
            name: 'Углеводный антиген CA 125',
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '0-35,0', unit: 'U/ml', price: 0 }]
        },
        {
            code: 'AFP',
            name: 'Альфа-фетопротеин (АФП)',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'both', range: '0-10', unit: 'IU/ml', price: 0 },
                { ageMin: 0, ageMax: 999, gender: 'both', range: '<10,0', unit: 'ng/ml', price: 0 },
            ]
        },
        {
            code: 'CEA',
            name: 'Раково-эмбриональный антиген (СЕА)',
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '0-5,2', unit: 'нг/мл', price: 0 }]
        },
        {
            code: 'BETA-HCG',
            name: 'Свободный бета хорионический гонадотропин',
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '<5,0', unit: 'IU/l', price: 0 }]
        },
        {
            code: 'HE4',
            name: 'HE4-норма',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'female', range: 'пре-менопауза <70,0 | пост-менопауза <140,0', unit: 'pmol/l', price: 0 },
            ]
        },
        {
            code: 'ROMA',
            name: 'Индекс-ROMA',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'female', range: 'пре-менопауза <7,4% | пост-менопауза <25,3%', unit: '%', price: 0 },
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
