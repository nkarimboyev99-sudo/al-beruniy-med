require('dotenv').config();
const mongoose = require('mongoose');
const Diagnosis = require('./models/Diagnosis');

async function fix() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB ulandi');

    // TTG va T4-FREE da ageMin: 1 -> 0 ga o'zgartirish
    const codes = ['TTG', 'T4-FREE'];
    for (const code of codes) {
        const diag = await Diagnosis.findOne({ code });
        if (!diag) { console.log(`Not found: ${code}`); continue; }
        let changed = false;
        for (const r of diag.normalRanges) {
            if (r.ageMin === 1) { r.ageMin = 0; changed = true; }
        }
        if (changed) {
            diag.markModified('normalRanges');
            await diag.save();
            console.log(`  Tuzatildi: ${code}`);
        }
    }

    console.log('Tayyor!');
    await mongoose.disconnect();
}

fix().catch(err => { console.error('Xato:', err.message); process.exit(1); });
