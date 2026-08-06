require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ulandi');

    let category = await Category.findOne({ name: 'Биохимический анализ крови' });
    if (!category) {
        category = await Category.create({ name: 'Биохимический анализ крови', code: 'BAK', isActive: true });
        console.log('✅ Kategoriya yaratildi:', category.name);
    } else {
        console.log('ℹ️  Kategoriya mavjud:', category.name);
    }

    const items = [
        {
            code: 'ALT', name: 'Аланин-аминотрансфераза (АЛТ)',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'female', range: '5-32', unit: 'ед/л', price: 0 },
                { ageMin: 0, ageMax: 999, gender: 'male',   range: '5-42', unit: 'ед/л', price: 0 },
            ]
        },
        {
            code: 'AST', name: 'Аспартат-аминотрансфераза (АСТ)',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'female', range: '5-32', unit: 'ед/л', price: 0 },
                { ageMin: 0, ageMax: 999, gender: 'male',   range: '5-40', unit: 'ед/л', price: 0 },
            ]
        },
        {
            code: 'BILI-TOT', name: 'Билирубин',
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '8.5-20.5', unit: 'мкмоль/л', price: 0 }]
        },
        {
            code: 'BILI-DIR', name: 'Билирубин прямой',
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '0.9-5.1', unit: 'мкмоль/л', price: 0 }]
        },
        {
            code: 'BILI-IND', name: 'Билирубин не прямой',
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '1.7-18.8', unit: 'мкмоль/л', price: 0 }]
        },
        {
            code: 'GLU-BIO', name: 'Глюкоза',
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '4.2-6.4', unit: 'ммоль/л', price: 0 }]
        },
        {
            code: 'TP', name: 'Общий белок',
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '66-83', unit: 'г/л', price: 0 }]
        },
        {
            code: 'CREAT', name: 'Креатинин',
            normalRanges: [
                { ageMin: 0,  ageMax: 14,  gender: 'both',   range: '27-62',   unit: 'мкмоль/л', price: 0 },
                { ageMin: 15, ageMax: 999, gender: 'male',   range: '62-115',  unit: 'мкмоль/л', price: 0 },
                { ageMin: 15, ageMax: 999, gender: 'female', range: '53-97',   unit: 'мкмоль/л', price: 0 },
            ]
        },
        {
            code: 'UREA', name: 'Мочевина',
            normalRanges: [
                { ageMin: 0,  ageMax: 14,  gender: 'both', range: '1.8-6.5', unit: 'ммоль/л', price: 0 },
                { ageMin: 15, ageMax: 999, gender: 'both', range: '2.5-8.3', unit: 'ммоль/л', price: 0 },
            ]
        },
        {
            code: 'ALB', name: 'Альбумин',
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '38-51', unit: 'г/л', price: 0 }]
        },
        {
            code: 'AMYL', name: 'Альфа-амилаза (диастаза)',
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '24-151', unit: 'ед/л', price: 0 }]
        },
        {
            code: 'UA', name: 'Мочевая кислота',
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '3.20-19.60', unit: 'нг/мл', price: 0 }]
        },
    ];

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

    console.log(`\n🎉 Tayyor! Qo'shildi: ${added}, O'tkazib yuborildi: ${skipped}`);
    await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Xato:', err.message); process.exit(1); });
