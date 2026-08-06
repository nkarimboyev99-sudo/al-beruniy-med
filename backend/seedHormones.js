require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB ulandi');

    let category = await Category.findOne({ name: 'Гормоны' });
    if (!category) {
        category = await Category.create({ name: 'Гормоны', code: 'HORMONES', isActive: true });
        console.log('Kategoriya yaratildi:', category.name);
    } else {
        console.log('Kategoriya mavjud:', category.name);
    }

    const items = [
        {
            code: 'TTG',
            name: 'ТТГ (тиреотропный гормон)',
            normalRanges: [
                { ageMin: 15, ageMax: 999, gender: 'both',   range: '0,5-5,0',  unit: 'мМЕ/л', price: 0 },
                { ageMin: 1,  ageMax: 14,  gender: 'both',   range: '0,7-6,0',  unit: 'мМЕ/л', price: 0 },
            ]
        },
        {
            code: 'T4-FREE',
            name: 'Т4 свободный',
            normalRanges: [
                { ageMin: 15, ageMax: 999, gender: 'both',   range: '9,0-22,0', unit: 'pmol/l', price: 0 },
                { ageMin: 1,  ageMax: 14,  gender: 'both',   range: '10-25',    unit: 'pmol/l', price: 0 },
            ]
        },
        {
            code: 'T3-FREE',
            name: 'Т3 свободный',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'both',    range: '2,8-7,1',  unit: 'pmol/l', price: 0 },
            ]
        },
        {
            code: 'FSH',
            name: 'Фолликулостимулирующий гормон (ФСГ)',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'male',    range: '1,5-12,4', unit: 'мЕд/мл', price: 0 },
                { ageMin: 0, ageMax: 999, gender: 'female',  range: 'Фолликулярная 3,5-12,5 | Овуляторная 4,7-21,5 | Лютеиновая 1,7-7,7 | Постменопауза 25,8-134,8', unit: 'мЕд/мл', price: 0 },
            ]
        },
        {
            code: 'LH',
            name: 'Лютеинизирующий гормон (ЛГ)',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'male',    range: '1,50-9,25', unit: 'мМЕ/мл', price: 0 },
                { ageMin: 0, ageMax: 999, gender: 'female',  range: 'Менструальная 2,4-12,6 | Фолликулярная 1,25-11,80 | Овуляторная 13,15-94,75 | Лютеиновая 1,05-14,50 | Постменопауза 7,70-64,20', unit: 'мМЕ/мл', price: 0 },
            ]
        },
        {
            code: 'AT-TPO',
            name: 'Антитела к териопероксидазе (АТ-ТПО)',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'both',    range: '0,00-9,00', unit: 'МЕ/мл', price: 0 },
            ]
        },
        {
            code: 'PROLACTIN',
            name: 'Пролактин',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'male',    range: '2,82-26,32', unit: 'нг/мл', price: 0 },
                { ageMin: 0, ageMax: 999, gender: 'female',  range: 'Фолликулярная 2,82-28,2 | Лютеиновая 5,64-42,3 | Менопауза 1,88-25,85 | Беременные: 1тр <94 | 2тр <282 | 3тр <470', unit: 'нг/мл', price: 0 },
            ]
        },
        {
            code: 'TESTOSTERONE',
            name: 'Тестостерон',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'male',    range: '2,6-10,45', unit: 'нг/мл', price: 0 },
                { ageMin: 0, ageMax: 999, gender: 'female',  range: '<1,0',       unit: 'нг/мл', price: 0 },
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
