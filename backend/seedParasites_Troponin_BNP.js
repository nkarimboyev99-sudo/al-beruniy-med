require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

async function createCategory(name, code) {
    let cat = await Category.findOne({ name });
    if (!cat) {
        cat = await Category.create({ name, code, isActive: true });
        console.log('Kategoriya yaratildi:', name);
    } else {
        console.log('Kategoriya mavjud:', name);
    }
    return cat;
}

async function addDiagnoses(category, items) {
    let added = 0, skipped = 0;
    for (const a of items) {
        const exists = await Diagnosis.findOne({ code: a.code, category: category._id });
        if (exists) { skipped++; continue; }
        await Diagnosis.create({
            name: a.name, code: a.code, category: category._id,
            isActive: true, price: 0,
            normalRanges: a.normalRanges
        });
        added++;
        console.log(`  ${a.code} — ${a.name}`);
    }
    console.log(`  -> Qo'shildi: ${added}, O'tkazib yuborildi: ${skipped}\n`);
}

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB ulandi\n');

    // 1. Анализ кала на яйца глист
    const cat1 = await createCategory('Анализ кала на яйца глист', 'KALA-GLIST');
    const nr = [{ ageMin: 0, ageMax: 999, gender: 'both', range: 'отрицательный', unit: '', price: 0 }];
    await addDiagnoses(cat1, [
        { code: 'GL-AMEBA-C',  name: 'Кишечная амёба – Entamoeba coli',                  normalRanges: nr },
        { code: 'GL-AMEBA-D',  name: 'Дизентерийная амёба – Entamoeba histolytica',       normalRanges: nr },
        { code: 'GL-LAMBLIA',  name: 'Лямблия – Limblia intestinalis',                    normalRanges: nr },
        { code: 'GL-TRICH-H',  name: 'Кишечная трихомонада – Trichamonas hominis',        normalRanges: nr },
        { code: 'GL-TRICH-V',  name: 'Влагалищная трихомонада – Trichamonas vaginalis',   normalRanges: nr },
        { code: 'GL-OSTRICA',  name: 'Острица – Enterobius vermicularis',                 normalRanges: nr },
        { code: 'GL-ASCARIS',  name: 'Аскарида человеческая – Ascaris lumbriciodes',      normalRanges: nr },
        { code: 'GL-TOXOCARA', name: 'Собачья аскарида – Toxocara mystax',                normalRanges: nr },
        { code: 'GL-TOXASC',   name: 'Кошачья аскарида – Toxascaris leonine',             normalRanges: nr },
        { code: 'GL-ANKILO',   name: 'Анкилостома – Ancylostoma duodenala',               normalRanges: nr },
        { code: 'GL-VLASOGLAV',name: 'Власоглав – Trichocephalus trichiutus',             normalRanges: nr },
        { code: 'GL-TAENIA-S', name: 'Свиной цепень – Taenia solium',                     normalRanges: nr },
        { code: 'GL-TAENIA-B', name: 'Бычий цепень – Tatniarhunchus saginatus',           normalRanges: nr },
        { code: 'GL-HYMENO-N', name: 'Карликовый цепень – Hymenolepis nana',              normalRanges: nr },
        { code: 'GL-ECHINO',   name: 'Эхинококк – Echinosoccis granulosus',               normalRanges: nr },
        { code: 'GL-HYMENO-D', name: 'Крысиный цепень – Hymenolepis diminuta',            normalRanges: nr },
        { code: 'GL-DIPHY',    name: 'Широкий лентец – Diphyllobothrium',                 normalRanges: nr },
        { code: 'GL-FASCIOLA', name: 'Печеночный сосальщик – Fasciola hepatica',          normalRanges: nr },
        { code: 'GL-SCHISTOMA',name: 'Шистосома Мэнсона – Schistoma man',                 normalRanges: nr },
        { code: 'GL-DICRO',    name: 'Ланцетовидный сосальщик – Dicrocoelium lanceatum',  normalRanges: nr },
    ]);

    // 2. Тропонин I (количественный)
    const cat2 = await createCategory('Тропонин I (количественный)', 'TROPONIN');
    await addDiagnoses(cat2, [
        {
            code: 'TROPONIN-I',
            name: 'Тропонин I (количественный)',
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: 'both', range: '<0,30', unit: 'ng/ml', price: 0 }]
        },
    ]);

    // 3. Натрийуретический пропептид
    const cat3 = await createCategory('Натрийуретический пропептид', 'BNP');
    await addDiagnoses(cat3, [
        {
            code: 'NT-PROBNP',
            name: 'Натрийуретический пропептид',
            normalRanges: [
                { ageMin: 0,  ageMax: 74,  gender: 'both', range: '0-300', unit: 'pg/ml', price: 0 },
                { ageMin: 75, ageMax: 999, gender: 'both', range: '0-450', unit: 'pg/ml', price: 0 },
            ]
        },
    ]);

    console.log('Hammasi tayyor!');
    await mongoose.disconnect();
}

seed().catch(err => { console.error('Xato:', err.message); process.exit(1); });
