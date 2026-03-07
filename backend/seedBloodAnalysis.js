require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

const analyses = [
    { code: 'WBC',    name: 'Лейкоциты',                                          range: '6.0-17.0',  unit: '10⁹/L' },
    { code: 'NEU#',   name: 'Нейтрофилы',                                         range: '1.0-8.5',   unit: '10⁹/L' },
    { code: 'LYM#',   name: 'Лимфоциты',                                          range: '2.0-9.0',   unit: '10⁹/L' },
    { code: 'MON#',   name: 'Моноциты',                                           range: '0.2-1.2',   unit: '10⁹/L' },
    { code: 'EOS#',   name: 'Эозинофилы',                                         range: '0.05-0.6',  unit: '10⁹/L' },
    { code: 'BAS#',   name: 'Базофилы',                                           range: '0.00-0.1',  unit: '10⁹/L' },
    { code: 'NEU%',   name: 'Процент нейтрофилов',                                range: '45-70',     unit: '%'     },
    { code: 'LYM%',   name: 'Процент лимфоцитов',                                 range: '20-45',     unit: '%'     },
    { code: 'MON%',   name: 'Процент моноцитов',                                  range: '3-10',      unit: '%'     },
    { code: 'EOS%',   name: 'Процент эозинофилов',                                range: '1-6',       unit: '%'     },
    { code: 'BAS%',   name: 'Процент базофилов',                                  range: '0-1',       unit: '%'     },
    { code: 'RBC',    name: 'Эритроциты',                                         range: '3.5-4.8',   unit: '10¹²/L'},
    { code: 'HGB',    name: 'Гемоглобин',                                         range: '100-140',   unit: 'g/L'   },
    { code: 'HCT',    name: 'Гематокрит',                                         range: '0.32-0.40', unit: 'L/L'   },
    { code: 'MCV',    name: 'Средний объём эритроцита',                           range: '72-86',     unit: 'fL'    },
    { code: 'MCH',    name: 'Среднее содержание гемоглобина в эритроците',        range: '24-30',     unit: 'pg'    },
    { code: 'MCHC',   name: 'Средняя концентрация гемоглобина в эритроците',     range: '320-360',   unit: 'g/L'   },
    { code: 'RDW-CV', name: 'Анизоцитоз эритроцитов',                            range: '11.5-14.5', unit: '%'     },
    { code: 'RDW-SD', name: 'Анизоцитоз эритроцитов стандартное отклонение',     range: '35-56',     unit: 'fL'    },
    { code: 'PLT',    name: 'Тромбоциты',                                         range: '200-500',   unit: '10⁹/L' },
    { code: 'MPV',    name: 'Средний объём тромбоцитов',                          range: '7-13',      unit: 'fL'    },
    { code: 'PDW',    name: 'Анизоцитоз тромбоцитов',                            range: '10-18',     unit: 'fL'    },
    { code: 'PCT',    name: 'Тромбокрит',                                         range: '0.1-0.28',  unit: '%'     },
    { code: 'P-LCR',  name: 'Относительное количество крупных тромбоцитов',      range: '13-43',     unit: '%'     },
    { code: 'P-LCC',  name: 'Абсолютное количество крупных тромбоцитов',         range: '30-90',     unit: '10⁹/L' },
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ulandi');

    // Kategoriya qo'shish yoki topish
    let category = await Category.findOne({ name: 'Общий анализ крови' });
    if (!category) {
        category = await Category.create({
            name: 'Общий анализ крови',
            code: 'OAK',
            description: 'Umumiy qon tahlili',
            isActive: true
        });
        console.log('✅ Kategoriya yaratildi:', category.name);
    } else {
        console.log('ℹ️  Kategoriya mavjud:', category.name);
    }

    // Har bir analiz uchun
    let added = 0, skipped = 0;
    for (const a of analyses) {
        const exists = await Diagnosis.findOne({ code: a.code, category: category._id });
        if (exists) { skipped++; continue; }

        await Diagnosis.create({
            name: a.name,
            code: a.code,
            category: category._id,
            isActive: true,
            price: 0,
            normalRanges: [{
                ageMin: 0,
                ageMax: 5,
                gender: 'both',
                range: a.range,
                unit: a.unit,
                price: 0
            }]
        });
        added++;
        console.log(`  ✅ ${a.code} — ${a.name}`);
    }

    console.log(`\n🎉 Tayyor! Qo'shildi: ${added}, O'tkazib yuborildi: ${skipped}`);
    await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Xato:', err.message); process.exit(1); });
