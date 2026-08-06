require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

const items = [
    { code: 'TORCH-HSV',   name: 'Herpes Simplex 1/2 IgG'       },
    { code: 'TORCH-CMV',   name: 'Cytomegalovirus IgG'           },
    { code: 'TORCH-TOXO',  name: 'Toxoplasma Gondii IgG'         },
    { code: 'TORCH-RUB',   name: 'Rubella IgG'                   },
    { code: 'TORCH-CHLAM', name: 'Chlamydia trachomatis IgG'     },
    { code: 'TORCH-UREA',  name: 'Ureaplasma urealyticum IgG'    },
    { code: 'TORCH-MYCO',  name: 'Mycoplasma hominis IgG'        },
    { code: 'TORCH-BRUS',  name: 'Бруцелла IgG'                  },
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB ulandi');

    let category = await Category.findOne({ name: 'TORCH инфекции' });
    if (!category) {
        category = await Category.create({ name: 'TORCH инфекции', code: 'TORCH', isActive: true });
        console.log('Kategoriya yaratildi:', category.name);
    } else {
        console.log('Kategoriya mavjud:', category.name);
    }

    let added = 0, skipped = 0;
    for (const a of items) {
        const exists = await Diagnosis.findOne({ code: a.code, category: category._id });
        if (exists) { skipped++; continue; }
        await Diagnosis.create({
            name: a.name, code: a.code, category: category._id,
            isActive: true, price: 0,
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: 'отрицательный', unit: '', price: 0 }]
        });
        added++;
        console.log(`  ${a.code} — ${a.name}`);
    }

    console.log(`\nQo'shildi: ${added}, O'tkazib yuborildi: ${skipped}`);
    await mongoose.disconnect();
}

seed().catch(err => { console.error('Xato:', err.message); process.exit(1); });
