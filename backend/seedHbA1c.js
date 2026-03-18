require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ulandi');

    let category = await Category.findOne({ name: 'Анализ крови на гликолизированный гемоглобин' });
    if (!category) {
        category = await Category.create({ name: 'Анализ крови на гликолизированный гемоглобин', code: 'HBA1C', isActive: true });
        console.log('✅ Kategoriya yaratildi:', category.name);
    } else {
        console.log('ℹ️  Kategoriya mavjud:', category.name);
    }

    const exists = await Diagnosis.findOne({ code: 'HBA1C', category: category._id });
    if (!exists) {
        await Diagnosis.create({
            name: 'Гликолизированный гемоглобин',
            code: 'HBA1C',
            category: category._id,
            isActive: true,
            price: 0,
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'both', range: '4.0-5.6 — Норма', unit: 'IFCC %', price: 0 },
                { ageMin: 0, ageMax: 999, gender: 'both', range: '5.7-6.4 — Предиабет', unit: 'IFCC %', price: 0 },
                { ageMin: 0, ageMax: 999, gender: 'both', range: '>6.5 — Диабет', unit: 'IFCC %', price: 0 },
            ]
        });
        console.log('  ✅ HBA1C — Гликолизированный гемоглобин');
    } else {
        console.log('ℹ️  Mavjud: HBA1C');
    }

    console.log('\n🎉 Tayyor!');
    await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Xato:', err.message); process.exit(1); });
