require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB ulandi');

    let category = await Category.findOne({ name: 'Витамин Д (25-гидроксивитамин D)' });
    if (!category) {
        category = await Category.create({ name: 'Витамин Д (25-гидроксивитамин D)', code: 'VIT-D', isActive: true });
        console.log('Kategoriya yaratildi:', category.name);
    } else {
        console.log('Kategoriya mavjud:', category.name);
    }

    const exists = await Diagnosis.findOne({ code: 'VIT-D25', category: category._id });
    if (!exists) {
        await Diagnosis.create({
            name: 'Витамин D',
            code: 'VIT-D25',
            category: category._id,
            isActive: true, price: 0,
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'both', range: 'Дефицит <10 | Умеренный дефицит 10-20 | Оптимальный 30-100 | Токсичность >100', unit: 'нг/мл', price: 0 },
            ]
        });
        console.log('  VIT-D25 — Витамин D');
    } else {
        console.log('Mavjud: VIT-D25');
    }

    console.log('\nTayyor!');
    await mongoose.disconnect();
}

seed().catch(err => { console.error('Xato:', err.message); process.exit(1); });
