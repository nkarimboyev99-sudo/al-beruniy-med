require('dotenv').config();
const mongoose = require('mongoose');
const Diagnosis = require('./models/Diagnosis');
const Category = require('./models/Category');

const analyses = [
    { code: 'WBC',    range: '4.5-13.5',  unit: '10⁹/L'  },
    { code: 'NEU#',   range: '1.5-8.0',   unit: '10⁹/L'  },
    { code: 'LYM#',   range: '1.5-7.0',   unit: '10⁹/L'  },
    { code: 'MON#',   range: '0.2-1.0',   unit: '10⁹/L'  },
    { code: 'EOS#',   range: '0.05-0.6',  unit: '10⁹/L'  },
    { code: 'BAS#',   range: '0.00-0.1',  unit: '10⁹/L'  },
    { code: 'NEU%',   range: '40-65',     unit: '%'       },
    { code: 'LYM%',   range: '30-50',     unit: '%'       },
    { code: 'MON%',   range: '3-10',      unit: '%'       },
    { code: 'EOS%',   range: '1-6',       unit: '%'       },
    { code: 'BAS%',   range: '0-1',       unit: '%'       },
    { code: 'RBC',    range: '4.0-5.2',   unit: '10¹²/L' },
    { code: 'HGB',    range: '115-155',   unit: 'g/L'     },
    { code: 'HCT',    range: '0.36-0.44', unit: 'L/L'     },
    { code: 'MCV',    range: '76-90',     unit: 'fL'      },
    { code: 'MCH',    range: '26-32',     unit: 'pg'      },
    { code: 'MCHC',   range: '320-360',   unit: 'g/L'     },
    { code: 'RDW-CV', range: '11.5-14.5', unit: '%'       },
    { code: 'RDW-SD', range: '35-50',     unit: 'fL'      },
    { code: 'PLT',    range: '200-450',   unit: '10⁹/L'  },
    { code: 'MPV',    range: '7-13',      unit: 'fL'      },
    { code: 'PDW',    range: '10-18',     unit: 'fL'      },
    { code: 'PCT',    range: '0.1-0.28',  unit: '%'       },
    { code: 'P-LCR',  range: '13-43',    unit: '%'       },
    { code: 'P-LCC',  range: '30-90',    unit: '10⁹/L'  },
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ulandi');

    const category = await Category.findOne({ name: 'Общий анализ крови' });
    if (!category) { console.error('❌ Kategoriya topilmadi!'); process.exit(1); }

    let updated = 0;
    for (const a of analyses) {
        const diag = await Diagnosis.findOne({ code: a.code, category: category._id });
        if (!diag) { console.log(`⚠️  Topilmadi: ${a.code}`); continue; }

        // 6-14 yosh normalRange allaqachon qo'shilganmi?
        const exists = diag.normalRanges.find(r => r.ageMin === 6 && r.ageMax === 14);
        if (exists) { console.log(`ℹ️  Mavjud: ${a.code}`); continue; }

        diag.normalRanges.push({
            ageMin: 6,
            ageMax: 14,
            gender: 'both',
            range: a.range,
            unit: a.unit,
            price: 0
        });
        await diag.save();
        updated++;
        console.log(`  ✅ ${a.code} — 6-14 yosh qo'shildi`);
    }

    console.log(`\n🎉 Tayyor! Yangilandi: ${updated}`);
    await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Xato:', err.message); process.exit(1); });
