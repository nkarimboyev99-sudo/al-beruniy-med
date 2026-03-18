require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

const items = [
    { code: 'UM-PLEP',   name: 'Плоский эпителий',                          range: 'в небольшом количестве' },
    { code: 'UM-PREP',   name: 'Призматический эпителий',                   range: 'в небольшом количестве' },
    { code: 'UM-LEU',    name: 'Лейкоциты',                                 range: '0-4'                    },
    { code: 'UM-FLORA',  name: 'Флора',                                      range: 'не обнаружено'          },
    { code: 'UM-ER',     name: 'Эритроциты',                                range: 'не обнаружено'          },
    { code: 'UM-DIPLO',  name: 'Внутриклеточные и внеклеточные диплококки', range: 'не обнаружено'          },
    { code: 'UM-TRICH',  name: 'Trichomanas vaginalis',                     range: 'не обнаружено'          },
    { code: 'UM-GARD',   name: 'Gardnerella vaginalis "Ключевые клетки"',   range: 'не обнаружено'          },
    { code: 'UM-CAND',   name: 'Candida spp',                               range: 'не обнаружено'          },
    { code: 'UM-LEPT',   name: 'Leptothrix',                                range: 'не обнаружено'          },
    { code: 'UM-SLIZ',   name: 'Слизь',                                     range: 'не обнаружено'          },
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ulandi');

    let category = await Category.findOne({ name: 'Мазок из уретры (мужской)' });
    if (!category) {
        category = await Category.create({ name: 'Мазок из уретры (мужской)', code: 'MAZOK-M', isActive: true });
        console.log('✅ Kategoriya yaratildi:', category.name);
    } else {
        console.log('ℹ️  Kategoriya mavjud:', category.name);
    }

    let added = 0, skipped = 0;
    for (const a of items) {
        const exists = await Diagnosis.findOne({ code: a.code, category: category._id });
        if (exists) { skipped++; continue; }
        await Diagnosis.create({
            name: a.name, code: a.code, category: category._id,
            isActive: true, price: 0,
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'male', range: a.range, unit: '', price: 0 }]
        });
        added++;
        console.log(`  ✅ ${a.code} — ${a.name}`);
    }

    console.log(`\n🎉 Tayyor! Qo'shildi: ${added}, O'tkazib yuborildi: ${skipped}`);
    await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Xato:', err.message); process.exit(1); });
