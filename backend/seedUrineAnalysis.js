require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

const analyses = [
    { code: 'URINE-VOL',  name: 'Количество',                    range: '50-100',       unit: 'мл'      },
    { code: 'URINE-COL',  name: 'Цвет',                          range: 'светло-жёлтый', unit: ''        },
    { code: 'URINE-TRN',  name: 'Прозрачность',                  range: 'прозрачная',   unit: ''        },
    { code: 'UBG',        name: 'Уробилиноген (UBG)',             range: '3.4',          unit: 'мкмол/л' },
    { code: 'BIL',        name: 'Билирубин (BIL)',                range: 'abs',          unit: ''        },
    { code: 'KET',        name: 'Кетон (KET)',                    range: 'abs',          unit: ''        },
    { code: 'CRE',        name: 'Креатинин (CRE)',                range: '4.4-17.6',     unit: 'ммоль/л' },
    { code: 'PRO',        name: 'Белок (PRO)',                    range: 'abs',          unit: 'г/л'     },
    { code: 'NIT',        name: 'Нитрит (NIT)',                   range: 'abs',          unit: ''        },
    { code: 'LEU',        name: 'Лейкоцит (LEU)',                 range: 'abs',          unit: ''        },
    { code: 'GLU',        name: 'Глюкоза (GLU)',                  range: 'abs',          unit: 'ммоль/л' },
    { code: 'MALB',       name: 'Микроальбумин (MALB)',           range: '0-20.0',       unit: 'мг/л'    },
    { code: 'URINE-CA',   name: 'Кальций (Ca)',                   range: '2.5-7.5',      unit: 'ммоль/л' },
    { code: 'SG',         name: 'Относительная плотность (SG)',   range: '1.009-1.026',  unit: 'г/мл'    },
    { code: 'PH',         name: 'Реакция мочи (pH)',              range: '5.0-7.0',      unit: ''        },
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
                ageMin: 0, ageMax: 999, gender: 'both',
                range: a.range, unit: a.unit, price: 0
            }]
        });
        added++;
        console.log(`  ✅ ${a.code} — ${a.name}`);
    }

    console.log(`\n🎉 Tayyor! Qo'shildi: ${added}, O'tkazib yuborildi: ${skipped}`);
    await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Xato:', err.message); process.exit(1); });
