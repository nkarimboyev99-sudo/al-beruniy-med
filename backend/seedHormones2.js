require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB ulandi');

    const category = await Category.findOne({ name: 'Гормоны' });
    if (!category) { console.error('Kategoriya topilmadi!'); process.exit(1); }
    console.log('Kategoriya topildi:', category.name);

    const items = [
        {
            code: 'FREE-TEST',
            name: 'Свободный тестостерон',
            normalRanges: [
                { ageMin: 20, ageMax: 40,  gender: 'male',   range: '9,1-32,2',  unit: 'пг/мл', price: 0 },
                { ageMin: 40, ageMax: 60,  gender: 'male',   range: '5,7-30,7',  unit: 'пг/мл', price: 0 },
                { ageMin: 60, ageMax: 999, gender: 'male',   range: '9,1-32,2',  unit: 'пг/мл', price: 0 },
                { ageMin: 20, ageMax: 40,  gender: 'female', range: '0,1-6,3',   unit: 'пг/мл', price: 0 },
                { ageMin: 40, ageMax: 60,  gender: 'female', range: '0,2-4,1',   unit: 'пг/мл', price: 0 },
                { ageMin: 60, ageMax: 999, gender: 'female', range: '0,5-3,9',   unit: 'пг/мл', price: 0 },
            ]
        },
        {
            code: 'HCG',
            name: 'ХГЧ (хорионический гонадотропин человека)',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'female', range: 'до 15 мМЕ/л | Беременные: 1нед 0-50 | 2нед 20-500 | 3нед 500-5000 | 4нед 3000-19000 | 5-8нед 14000-169000 | 9-13нед 16000-180000', unit: 'мМЕ/л', price: 0 },
                { ageMin: 0, ageMax: 999, gender: 'male',   range: 'до 15',      unit: 'мМЕ/л', price: 0 },
            ]
        },
        {
            code: 'PROGEST',
            name: 'Прогестерон',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'male',   range: '0-0,97', unit: 'нг/мл', price: 0 },
                { ageMin: 0, ageMax: 999, gender: 'female', range: 'Фолликулярная 0-7,0 | Овуляторная 0,6-4,5 | Лютеиновая 2,0-25,0 | Менопауза 0-1,6 | Беременные: 1тр 8,6-49,36 | 2тр 12,5-59,62 | 3тр 59,62-80,0', unit: 'нг/мл', price: 0 },
            ]
        },
        {
            code: 'INSULIN',
            name: 'Инсулин',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'both', range: '2,2-25,0', unit: 'mIU/ml', price: 0 },
            ]
        },
        {
            code: 'DHEA-S',
            name: 'Дегидроэпиандростерон сульфат ДГЭА-С (DHEA-S)',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'female', range: '65-380',   unit: 'ug/dl', price: 0 },
                { ageMin: 0, ageMax: 999, gender: 'male',   range: '120-640',  unit: 'ug/dl', price: 0 },
            ]
        },
        {
            code: 'AMH',
            name: 'Антимюллеров гормон (АМГ)',
            normalRanges: [
                { ageMin: 20, ageMax: 60,  gender: 'male',   range: '0,92-13,89', unit: 'нг/мл', price: 0 },
                { ageMin: 20, ageMax: 29,  gender: 'female', range: '0,88-10,35', unit: 'нг/мл', price: 0 },
                { ageMin: 30, ageMax: 39,  gender: 'female', range: '0,31-7,86',  unit: 'нг/мл', price: 0 },
                { ageMin: 40, ageMax: 50,  gender: 'female', range: '< 5,07',     unit: 'нг/мл', price: 0 },
            ]
        },
        {
            code: 'E2',
            name: 'Эстрадиол Е2',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'male',   range: '1-84', unit: 'пг/мл', price: 0 },
                { ageMin: 0, ageMax: 999, gender: 'female', range: 'Фолликулярная 20-138 | Овуляция 100-440 | Желтое тело 21-317 | Постменопауза 1-84', unit: 'пг/мл', price: 0 },
            ]
        },
        {
            code: 'T4-TOTAL',
            name: 'Тироксин общий Т4',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'both', range: '66-181', unit: 'нмоль/л', price: 0 },
            ]
        },
        {
            code: 'T3-TOTAL',
            name: 'Трийодтиронин общий Т3',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'both', range: '0,58-1,62', unit: 'нг/мл', price: 0 },
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
