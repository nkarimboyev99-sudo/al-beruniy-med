require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ulandi');

    // ── 1. Время свертывания крови ──────────────────────────────
    let cat1 = await Category.findOne({ name: 'Время свертывания крови' });
    if (!cat1) {
        cat1 = await Category.create({ name: 'Время свертывания крови', code: 'VSK', isActive: true });
        console.log('✅ Kategoriya yaratildi:', cat1.name);
    }
    const vsk = await Diagnosis.findOne({ code: 'VSK', category: cat1._id });
    if (!vsk) {
        await Diagnosis.create({
            name: 'Время свертывания крови',
            code: 'VSK',
            category: cat1._id,
            isActive: true,
            price: 0,
            normalRanges: [
                { ageMin: 0, ageMax: 999, gender: 'both', range: '3-5', unit: 'minut', price: 0 }
            ]
        });
        console.log('  ✅ Время свертывания крови');
    }

    // ── 2. Группа крови и резус-фактор ─────────────────────────
    let cat2 = await Category.findOne({ name: 'Группа крови и резус-фактор' });
    if (!cat2) {
        cat2 = await Category.create({ name: 'Группа крови и резус-фактор', code: 'GKRF', isActive: true });
        console.log('✅ Kategoriya yaratildi:', cat2.name);
    }

    const bloodItems = [
        { code: 'RH',  name: 'Резус-фактор', range: 'Rh(+) yoki Rh(-)', unit: '' },
        { code: 'GKR', name: 'Группа крови',  range: 'O(I), A(II), B(III), AB(IV)', unit: '' },
    ];
    for (const a of bloodItems) {
        const exists = await Diagnosis.findOne({ code: a.code, category: cat2._id });
        if (!exists) {
            await Diagnosis.create({
                name: a.name, code: a.code, category: cat2._id, isActive: true, price: 0,
                normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: a.range, unit: a.unit, price: 0 }]
            });
            console.log('  ✅', a.name);
        }
    }

    // ── 3. СОЭ ─────────────────────────────────────────────────
    let cat3 = await Category.findOne({ name: 'Скорость оседания эритроцитов (СОЭ)' });
    if (!cat3) {
        cat3 = await Category.create({ name: 'Скорость оседания эритроцитов (СОЭ)', code: 'SOE', isActive: true });
        console.log('✅ Kategoriya yaratildi:', cat3.name);
    }

    // Har bir yosh/jins uchun alohida normalRange
    const soe = await Diagnosis.findOne({ code: 'SOE', category: cat3._id });
    if (!soe) {
        await Diagnosis.create({
            name: 'Скорость оседания эритроцитов (СОЭ)',
            code: 'SOE',
            category: cat3._id,
            isActive: true,
            price: 0,
            normalRanges: [
                { ageMin: 0,  ageMax: 5,   gender: 'both',   range: '2-10',  unit: 'мм/ч', price: 0 },
                { ageMin: 6,  ageMax: 14,  gender: 'both',   range: '2-12',  unit: 'мм/ч', price: 0 },
                { ageMin: 15, ageMax: 49,  gender: 'male',   range: '2-10',  unit: 'мм/ч', price: 0 },
                { ageMin: 15, ageMax: 49,  gender: 'female', range: '2-15',  unit: 'мм/ч', price: 0 },
                { ageMin: 50, ageMax: 999, gender: 'both',   range: '2-15',  unit: 'мм/ч', price: 0 },
            ]
        });
        console.log('  ✅ СОЭ — barcha yosh/jins guruhlari bilan');
    }

    console.log('\n🎉 Tayyor!');
    await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Xato:', err.message); process.exit(1); });
