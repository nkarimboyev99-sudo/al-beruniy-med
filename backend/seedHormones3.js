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
            code: 'CORTISOL',
            name: 'Кортизол',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'both', range: 'Сыворотка 7:00-10:00: 201,31-536,54 | Сыворотка 16:00-20:00: 65,78-330,85', unit: 'нмоль/л', price: 0 },
            ]
        },
        {
            code: 'C-PEPTIDE',
            name: 'С-пептид',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'both', range: '1,0-4,8', unit: 'нг/мл', price: 0 },
            ]
        },
        {
            code: '17-OH-PROG',
            name: '17-Гидроксипрогестерон (17-ОН)',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'both', range: '1,0-4,8', unit: 'нг/мл', price: 0 },
            ]
        },
        {
            code: 'INHIBIN-B',
            name: 'Ингибин В',
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'male',   range: '120-400',                                        unit: 'пг/мл', price: 0 },
                { ageMin: 0, ageMax: 999, gender: 'female', range: 'Фолликулярная фаза 45-200 | Постменопауза <10,0', unit: 'пг/мл', price: 0 },
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
