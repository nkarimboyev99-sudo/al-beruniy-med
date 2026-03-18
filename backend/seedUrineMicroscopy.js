require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

const analyses = [
    // Эпителий
    { code: 'EP-PLSK',  name: 'Эпителий плоский',               range: '0-5',  unit: '' },
    { code: 'EP-PRKH',  name: 'Эпителий переходный',            range: 'abs',  unit: '' },
    { code: 'EP-POCH',  name: 'Эпителий почечный',              range: 'abs',  unit: '' },
    // Лейкоциты
    { code: 'MOM-LEU',  name: 'Лейкоциты',                      range: '0-5',  unit: '' },
    // Эритроциты (jins bo'yicha farq qiladi — alohida qo'shamiz)
    { code: 'ER-IZMEN', name: 'Эритроциты изменённые',          range: '',     unit: '' },
    { code: 'ER-NEIZM', name: 'Эритроциты неизменённые',        range: 'abs',  unit: '' },
    // Цилиндры
    { code: 'CIL-GIAL', name: 'Цилиндры гиалиновые',            range: 'abs',  unit: '' },
    { code: 'CIL-ZERN', name: 'Цилиндры зернистые',             range: 'abs',  unit: '' },
    { code: 'CIL-VOSK', name: 'Цилиндры восковидные',           range: 'abs',  unit: '' },
    { code: 'CIL-EPIT', name: 'Цилиндры эпителиальные',         range: 'abs',  unit: '' },
    { code: 'CIL-LEUK', name: 'Цилиндры лейкоцитарные',         range: 'abs',  unit: '' },
    { code: 'CIL-ERITR',name: 'Цилиндры эритроцитарные',        range: 'abs',  unit: '' },
    // Неорганический осадок
    { code: 'URATY',    name: 'Не органич. осадок ураты',       range: 'abs',  unit: '' },
    { code: 'OXALAT',   name: 'Оксалаты',                       range: 'abs',  unit: '' },
    { code: 'KRИСТ',    name: 'Кристаллы мочевой кислоты',      range: 'abs',  unit: '' },
    { code: 'AMFOSFAT', name: 'Аморфные фосфаты',               range: 'abs',  unit: '' },
    { code: 'MOCHAMM',  name: 'Мочекислой аммоний',             range: 'abs',  unit: '' },
    { code: 'TRIFOSFAT',name: 'Трипельфосфат',                  range: 'abs',  unit: '' },
    // Прочее
    { code: 'SLIZ',     name: 'Слизь',                          range: 'abs',  unit: '' },
    { code: 'BAKTER',   name: 'Бактерии',                       range: 'abs',  unit: '' },
    { code: 'DROZHZH',  name: 'Дрожжевые грибы',               range: 'abs',  unit: '' },
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ulandi');

    let category = await Category.findOne({ name: 'Микроскопия осадка мочи' });
    if (!category) {
        category = await Category.create({ name: 'Микроскопия осадка мочи', code: 'MOM', isActive: true });
        console.log('✅ Kategoriya yaratildi:', category.name);
    } else {
        console.log('ℹ️  Kategoriya mavjud:', category.name);
    }

    let added = 0, skipped = 0;
    for (const a of analyses) {
        const exists = await Diagnosis.findOne({ code: a.code, category: category._id });
        if (exists) { skipped++; continue; }

        // Эритроциты изменённые — jins bo'yicha alohida normalar
        const normalRanges = a.code === 'ER-IZMEN'
            ? [
                { ageMin: 0, ageMax: 999, gender: 'male',   range: '0-1', unit: '', price: 0 },
                { ageMin: 0, ageMax: 999, gender: 'female', range: '0-2', unit: '', price: 0 },
              ]
            : [{ ageMin: 0, ageMax: 999, gender: 'both', range: a.range, unit: a.unit, price: 0 }];

        await Diagnosis.create({
            name: a.name, code: a.code, category: category._id,
            isActive: true, price: 0, normalRanges
        });
        added++;
        console.log(`  ✅ ${a.code} — ${a.name}`);
    }

    console.log(`\n🎉 Tayyor! Qo'shildi: ${added}, O'tkazib yuborildi: ${skipped}`);
    await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Xato:', err.message); process.exit(1); });
