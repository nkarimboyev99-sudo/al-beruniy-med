require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

const analyses = [
    { code: 'URINE-VOL',  name: 'Количество',                    result: '50 мл',           range: '50-100',       unit: 'мл',      order: 20.0 },
    { code: 'URINE-COL',  name: 'Цвет',                          result: 'светло-желтый',   range: 'светло-желтый', unit: '',       order: 20.1 },
    { code: 'URINE-TRN',  name: 'Прозрачность',                  result: 'прозрачная',      range: 'прозрачная',   unit: '',        order: 20.2 },
    { code: 'UBG',        name: 'Уробилиноген (UBG)',             result: 'норма',           range: '3.4',          unit: 'мкмол/л', order: 20.3 },
    { code: 'BIL',        name: 'Билирубин (BIL)',                result: 'abs',             range: 'abs',          unit: '',        order: 20.4 },
    { code: 'KET',        name: 'Кетон (KET)',                    result: 'abs',             range: 'abs',          unit: '',        order: 20.5 },
    { code: 'CRE',        name: 'Креатинин (CRE)',                result: '',                range: '4.4-17.6',     unit: 'ммоль/л', order: 20.6 },
    { code: 'PRO',        name: 'Белок (PRO)',                    result: 'abs',             range: 'abs',          unit: 'г/л',     order: 20.7 },
    { code: 'NIT',        name: 'Нитрит (NIT)',                   result: 'abs',             range: 'abs',          unit: '',        order: 20.8 },
    { code: 'LEU',        name: 'Лейкоцит (LEU)',                 result: 'abs',             range: 'abs',          unit: '',        order: 20.9 },
    { code: 'GLU',        name: 'Глюкоза (GLU)',                  result: 'abs',             range: 'abs',          unit: 'ммоль/л', order: 21.0 },
    { code: 'MALB',       name: 'Микроальбумин (MALB)',           result: '',                range: '0-20.0',       unit: 'мг/л',    order: 21.1 },
    { code: 'URINE-CA',   name: 'Кальций (Ca)',                   result: '',                range: '2.5-7.5',      unit: 'ммоль/л', order: 21.2 },
    { code: 'SG',         name: 'Относительная плотность (SG)',   result: '',                range: '1.009-1.026',  unit: 'г/мл',    order: 21.3 },
    { code: 'PH',         name: 'Реакция мочи (pH)',              result: '',                range: '5.0-7.0',      unit: '',        order: 21.4 },
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ulandi');

    let category = await Category.findOne({ name: 'Общий анализ мочи' });
    if (!category) {
        category = await Category.create({ name: 'Общий анализ мочи', code: 'OAM', isActive: true });
        console.log('✅ Kategoriya yaratildi:', category.name);
    } else {
        console.log('ℹ️  Kategoriya mavjud:', category.name);
    }

    let added = 0, skipped = 0;
    for (let i = 0; i < analyses.length; i++) {
        const a = analyses[i];
        // Use the explicit order from the array, fallback to index position
        const itemOrder = (a.order !== undefined) ? a.order : i;
        const exists = await Diagnosis.findOne({ code: a.code, category: category._id });
        if (exists) {
            exists.name = a.name;
            exists.isActive = true;
            exists.order = itemOrder;
            const defaultRange = exists.normalRanges.find(r => r.ageMin === 0 && r.ageMax === 999 && r.gender === 'both');
            if (defaultRange) {
                defaultRange.range = a.range;
                defaultRange.result = a.result;
                defaultRange.unit = a.unit;
                defaultRange.price = 0;
            } else {
                exists.normalRanges.push({
                    ageMin: 0, ageMax: 999, gender: 'both',
                    range: a.range, result: a.result, unit: a.unit, price: 0
                });
            }
            await exists.save();
            skipped++;
            continue;
        }

        await Diagnosis.create({
            name: a.name,
            code: a.code,
            category: category._id,
            isActive: true,
            price: 0,
            order: itemOrder,
            normalRanges: [{
                ageMin: 0, ageMax: 999, gender: 'both',
                range: a.range, result: a.result, unit: a.unit, price: 0
            }]
        });
        added++;
        console.log(`  ✅ ${a.code} — ${a.name} (order: ${itemOrder})`);
    }

    console.log(`\n🎉 Tayyor! Qo'shildi: ${added}, O'tkazib yuborildi: ${skipped}`);
    await Diagnosis.updateMany(
        { category: category._id, code: { $nin: analyses.map(a => a.code) } },
        { $set: { isActive: false } }
    );
    await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Xato:', err.message); process.exit(1); });
