require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

const analyses = [
    // Эпителий
    { code: 'EP-PLSK',  name: 'плоский',                         range: '0-5',  unit: '', order: 30.1 },
    { code: 'EP-PRKH',  name: 'переходный',                      range: 'abs',  unit: '', order: 30.2 },
    { code: 'EP-POCH',  name: 'почечный',                        range: 'abs',  unit: '', order: 30.3 },
    // Лейкоциты
    { code: 'MOM-LEU',  name: 'Лейкоциты',                      range: '0-5',  unit: '', order: 30.4 },
    // Эритроциты (jins bo'yicha farq qiladi — alohida qo'shamiz)
    { code: 'ER-IZMEN', name: 'измененные',                      range: '',     unit: '', order: 30.5 },
    { code: 'ER-NEIZM', name: 'неизмененные',                    range: 'abs',  unit: '', order: 30.6 },
    // Цилиндры
    { code: 'CIL-GIAL', name: 'гиалиновые',                      range: 'abs',  unit: '', order: 30.7 },
    { code: 'CIL-ZERN', name: 'зернистые',                       range: 'abs',  unit: '', order: 30.8 },
    { code: 'CIL-VOSK', name: 'восковидные',                     range: 'abs',  unit: '', order: 30.9 },
    { code: 'CIL-EPIT', name: 'эпителиальные',                   range: 'abs',  unit: '', order: 31.0 },
    { code: 'CIL-LEUK', name: 'лейкоцитарные',                   range: 'abs',  unit: '', order: 31.1 },
    { code: 'CIL-ERITR', name: 'эритроцитарные',                 range: 'abs',  unit: '', order: 31.2 },
    // Неорганический осадок
    { code: 'URATY',    name: 'Не органич. осадок ураты',         range: 'abs',  unit: '', order: 31.3 },
    { code: 'OXALAT',   name: 'Оксалаты',                        range: 'abs',  unit: '', order: 31.4 },
    { code: 'KRИСТ',    name: 'Кристаллы мочевой кислоты',       range: 'abs',  unit: '', order: 31.5 },
    { code: 'AMFOSFAT', name: 'Аморфные фосфаты',               range: 'abs',  unit: '', order: 31.6 },
    { code: 'MOCHAMM',  name: 'Мочекислой аммоный',              range: 'abs',  unit: '', order: 31.7 },
    { code: 'TRIFOSFAT', name: 'Трипельфосфат',                 range: 'abs',  unit: '', order: 31.8 },
    // Прочее
    { code: 'SLIZ',     name: 'Слизь',                          range: 'abs',  unit: '', order: 31.9 },
    { code: 'BAKTER',   name: 'Бактерии',                       range: 'abs',  unit: '', order: 32.0 },
    { code: 'DROZHZH',  name: 'Дрожжевое грибы',                 range: 'abs',  unit: '', order: 32.1 },
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ulandi');

    let category = await Category.findOne({ code: 'MOM' });
    if (!category) {
        category = await Category.create({ name: 'Микроскопия осадка мочи', code: 'MOM', isActive: true, hideAnalyses: true, price: 0 });
        console.log('✅ Kategoriya yaratildi:', category.name);
    } else {
        console.log('ℹ️  Kategoriya mavjud:', category.name);
    }
    category.hideAnalyses = true;
    category.price = 0;
    await category.save();

    let added = 0, skipped = 0;
    for (const a of analyses) {
        const exists = await Diagnosis.findOne({ code: a.code, category: category._id });
        if (exists) {
            exists.name = a.name;
            exists.order = a.order;
            exists.price = 0;
            exists.isActive = true;
            exists.normalRanges = a.code === 'ER-IZMEN'
                ? [
                    { ageMin: 0, ageMax: 999, gender: 'male',   range: '0-1', unit: '', price: 0 },
                    { ageMin: 0, ageMax: 999, gender: 'female', range: '0-2', unit: '', price: 0 },
                  ]
                : [{ ageMin: 0, ageMax: 999, gender: 'both', range: a.range, unit: a.unit, price: 0 }];
            await exists.save();
            skipped++;
            continue;
        }

        const normalRanges = a.code === 'ER-IZMEN'
            ? [
                { ageMin: 0, ageMax: 999, gender: 'male',   range: '0-1', unit: '', price: 0 },
                { ageMin: 0, ageMax: 999, gender: 'female', range: '0-2', unit: '', price: 0 },
              ]
            : [{ ageMin: 0, ageMax: 999, gender: 'both', range: a.range, unit: a.unit, price: 0 }];

        await Diagnosis.create({
            name: a.name,
            code: a.code,
            category: category._id,
            isActive: true,
            price: 0,
            order: a.order,
            normalRanges
        });
        added++;
        console.log(`  ✅ ${a.code} — ${a.name}`);
    }

    console.log(`\n🎉 Tayyor! Qo'shildi: ${added}, O'tkazib yuborildi: ${skipped}`);
    await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Xato:', err.message); process.exit(1); });
