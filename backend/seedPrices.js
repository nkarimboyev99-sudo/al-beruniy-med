require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

// Kategoriya nomi -> narx (so'm)
// DB dagi haqiqiy nomlar ishlatilgan
const categoryPrices = [
    // Eski Uzbekcha kategoriyalar (admin qo'lda yaratgan)
    { name: 'Qon tahlili',                                                                       price: 40000 },
    { name: 'Biokimyo',                                                                          price: 30000 },
    { name: 'Koagulologiya',                                                                     price: 50000 },
    { name: 'Siydik tahlili',                                                                    price: 30000 },
    { name: 'Gormonal',                                                                          price: 75000 },
    { name: 'Immunologiya',                                                                      price: 50000 },
    { name: 'Mikrobiologiya',                                                                    price: 50000 },

    // Ruscha seed kategoriyalar
    { name: 'Анализ крови на С реактивный белок, ревматоидный фактор и АСЛ-О (количественный метод)', price: 35000 },
    { name: 'Анализ крови на ревмопробы (качественный метод)',                                  price: 25000 },
    { name: 'Анализ кала на яйца глист',                                                         price: 40000 },
    { name: 'Анализ мочи по Нечипоренко',                                                        price: 30000 },
    { name: 'Витамин Д (25-гидроксивитамин D)',                                                  price: 150000 },
    { name: 'Гинекологический мазок',                                                            price: 50000 },
    { name: 'Гормоны',                                                                           price: 75000 },
    { name: 'Натрийуретический пропептид',                                                       price: 0      },
    { name: 'Опухолевые маркеры',                                                                price: 90000  },
    { name: 'TORCH инфекции',                                                                    price: 50000  },
    { name: 'Тропонин I (количественный)',                                                       price: 50000  },
];

// Diagnosis кодига кўра алохида нарxлар
const diagnosisPrices = [
    { code: 'INHIBIN-B',    price: 100000 },
    { code: 'AMH',          price: 250000 },
    { code: 'FREE-TEST',    price: 80000  },
    { code: 'CORTISOL',     price: 75000  },
    { code: 'C-PEPTIDE',    price: 90000  },
    { code: 'INSULIN',      price: 90000  },
    { code: 'DHEA-S',       price: 90000  },
    { code: 'AT-TPO',       price: 90000  },
    { code: 'ROMA',         price: 200000 },
    { code: 'BETA-HCG',     price: 100000 },
    { code: 'HE4',          price: 100000 },
    { code: 'PSA-T',        price: 75000  },
    { code: 'PSA-F',        price: 75000  },
    { code: 'CA-125',       price: 90000  },
    { code: 'AFP',          price: 90000  },
    { code: 'CEA',          price: 90000  },
    { code: 'TROPONIN-I',   price: 50000  },
    { code: 'NT-PROBNP',    price: 0      }, // narx yo'q
    { code: 'VIT-D25',      price: 150000 },
    { code: 'HBA1C',        price: 90000  },
    // TORCH - Brucella alohida
    { code: 'TORCH-BRUS',   price: 65000  },
    // Д-димер
    { code: 'DDIM-01',      price: 150000 },
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB ulandi\n');

    // 1. Kategoriya narxlarini yangilash
    console.log('--- Kategoriya narxlari ---');
    for (const item of categoryPrices) {
        const result = await Category.updateOne({ name: item.name }, { $set: { price: item.price } });
        if (result.matchedCount === 0) {
            console.log(`  TOPILMADI: ${item.name}`);
        } else {
            console.log(`  OK: ${item.name} -> ${item.price.toLocaleString()}`);
        }
    }

    // 2. Diagnosis narxlarini yangilash
    console.log('\n--- Diagnosis narxlari ---');
    for (const item of diagnosisPrices) {
        const result = await Diagnosis.updateOne({ code: item.code }, { $set: { price: item.price } });
        if (result.matchedCount === 0) {
            console.log(`  TOPILMADI: ${item.code}`);
        } else {
            console.log(`  OK: ${item.code} -> ${item.price.toLocaleString()}`);
        }
    }

    console.log('\nTayyor!');
    await mongoose.disconnect();
}

seed().catch(err => { console.error('Xato:', err.message); process.exit(1); });
