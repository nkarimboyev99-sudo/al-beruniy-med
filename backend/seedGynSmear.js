require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

const items = [
    // Vagina
    { code: 'GYN-V-EPIT',  name: 'Эпителий (Vagina)',                    range: 'много',          gender: 'female' },
    { code: 'GYN-V-LEU',   name: 'Лейкоциты (Vagina)',                   range: 'сплошь',         gender: 'female' },
    { code: 'GYN-V-FLORA', name: 'Микрофлора, простейшие (Vagina)',       range: 'смешанная',      gender: 'female' },
    { code: 'GYN-V-CAND',  name: 'Candida spp (Vagina)',                  range: 'не обнаружено',  gender: 'female' },
    // Cervical
    { code: 'GYN-C-EPIT',  name: 'Эпителий (Cervical)',                   range: 'много',          gender: 'female' },
    { code: 'GYN-C-LEU',   name: 'Лейкоциты (Cervical)',                  range: 'сплошь',         gender: 'female' },
    { code: 'GYN-C-FLORA', name: 'Микрофлора, простейшие (Cervical)',     range: 'кокковая',       gender: 'female' },
    { code: 'GYN-C-CAND',  name: 'Candida spp (Cervical)',                range: 'не обнаружено',  gender: 'female' },
    // Uretra
    { code: 'GYN-U-EPIT',  name: 'Эпителий (Uretra)',                    range: 'много',          gender: 'female' },
    { code: 'GYN-U-LEU',   name: 'Лейкоциты (Uretra)',                   range: 'единичные',      gender: 'female' },
    { code: 'GYN-U-FLORA', name: 'Микрофлора, простейшие (Uretra)',      range: 'палочки',        gender: 'female' },
    { code: 'GYN-U-CAND',  name: 'Candida spp (Uretra)',                 range: 'не обнаружено',  gender: 'female' },
    // Общие
    { code: 'GYN-TRICH',   name: 'Trichomonas vaginalis',                 range: 'не обнаружено',  gender: 'female' },
    { code: 'GYN-DIPLO',   name: 'Внутриклеточные диплококки',            range: 'не обнаружено',  gender: 'female' },
    { code: 'GYN-GARD',    name: 'Gardnerella vaginalis',                 range: 'не обнаружено',  gender: 'female' },
    { code: 'GYN-LEPT',    name: 'Leptothrix vaginalis',                  range: 'не обнаружено',  gender: 'female' },
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB ulandi');

    let category = await Category.findOne({ name: 'Гинекологический мазок' });
    if (!category) {
        category = await Category.create({ name: 'Гинекологический мазок', code: 'GYN-SMEAR', isActive: true });
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
            normalRanges: [{ ageMin: 0, ageMax: 999, gender: a.gender, range: a.range, unit: '', price: 0 }]
        });
        added++;
        console.log(`  ${a.code} — ${a.name}`);
    }

    console.log(`\nQo'shildi: ${added}, O'tkazib yuborildi: ${skipped}`);
    await mongoose.disconnect();
}

seed().catch(err => { console.error('Xato:', err.message); process.exit(1); });
