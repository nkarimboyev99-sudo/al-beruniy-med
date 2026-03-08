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

    // Yangi kategoriyalar (skrinshotdan)
    { name: 'Общий анализ крови',                                                                price: 40000  },
    { name: 'Время свертывания крови',                                                           price: 15000  },
    { name: 'Группа крови и резус-фактор',                                                       price: 50000  },
    { name: 'Анализ крови на гликолизированный гемоглобин',                                      price: 90000  },
    { name: 'Анализ на вирусный гепатит',                                                        price: 45000  },
    { name: 'Экспресс тест анализ на RW',                                                        price: 45000  },
    { name: 'Определение Антитела к коронавирусу SARS-COV-2(COVID-19)',                          price: 50000  },
    { name: 'Коагулограмма',                                                                     price: 50000  },
    { name: 'Анализы на прокальцитонин и ферритин',                                              price: 30000  },
    { name: 'Анализ минерального обмена',                                                        price: 30000  },
    { name: 'Липидный спектр',                                                                   price: 35000  },
    { name: 'Общий анализ мочи',                                                                 price: 30000  },
    { name: 'Микроскопия осадка мочи',                                                           price: 30000  },
    { name: 'Мазок из уретры (мужской)',                                                         price: 50000  },
    { name: 'Общеклинические исследование секрета предстательной железы',                        price: 50000  },
    { name: 'Биохимический анализ крови',                                                        price: 30000  },
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

    // Биохимия
    { code: 'ALT',          price: 30000  },
    { code: 'AST',          price: 30000  },
    { code: 'BILI-TOT',     price: 35000  },
    { code: 'BILI-DIR',     price: 35000  },
    { code: 'BILI-IND',     price: 35000  },
    { code: 'TP',           price: 30000  },
    { code: 'CREAT',        price: 30000  },
    { code: 'UREA',         price: 30000  },
    { code: 'AMYL',         price: 30000  },
    { code: 'UA',           price: 30000  },
    { code: 'ALB',          price: 30000  },
    { code: 'GLU-BIO',      price: 25000  },

    // Прокальцитонин ва Ферритин
    { code: 'PCT',          price: 120000 },
    { code: 'FERR',         price: 30000  },

    // Вирусный гепатит
    { code: 'HBSAG',        price: 45000  },
    { code: 'ANTI-HCV',     price: 45000  },
    { code: 'ANTI-HAV',     price: 50000  },
    { code: 'TR-PALL',      price: 45000  },

    // Ревматоидные факторы (качественный)
    { code: 'RF',           price: 25000  },
    { code: 'ASL',          price: 25000  },
    { code: 'CRP',          price: 25000  },

    // Ревматоидные факторы (количественный)
    { code: 'CRP-Q',        price: 35000  },
    { code: 'RF-Q',         price: 35000  },
    { code: 'ASL-Q',        price: 35000  },

    // Липидный спектр
    { code: 'CHOL-TOT',     price: 35000  },
    { code: 'CHOL-LDL',     price: 35000  },
    { code: 'CHOL-HDL',     price: 35000  },
    { code: 'CHOL-VLDL',    price: 35000  },
    { code: 'ATHER',        price: 35000  },
    { code: 'TG',           price: 35000  },

    // Минеральный обмен (электролиты)
    { code: 'MIN-NA',       price: 35000  },
    { code: 'MIN-K',        price: 35000  },
    { code: 'MIN-PH',       price: 30000  },
    { code: 'MIN-CA',       price: 30000  },
    { code: 'MIN-MG',       price: 30000  },
    { code: 'MIN-FE',       price: 30000  },

    // Коагулограмма
    { code: 'APTT',         price: 50000  },
    { code: 'APTT-RATIO',   price: 50000  },
    { code: 'PTI',          price: 50000  },
    { code: 'PT',           price: 50000  },
    { code: 'INR',          price: 50000  },
    { code: 'TT',           price: 50000  },
    { code: 'DDIMER',       price: 150000 },
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
