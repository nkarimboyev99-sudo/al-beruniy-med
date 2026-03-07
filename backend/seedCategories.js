/**
 * Kategoriyalar va demo analizlar qo'shish skripti
 * Mavjud ma'lumotlarni o'CHIRMAYDI - faqat yangi qo'shadi
 * Ishlatish: node seedCategories.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('./models/Category');
const Diagnosis = require('./models/Diagnosis');

const seedCategories = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB ulandi');

        // ====== KATEGORIYALAR ======
        console.log('\n📂 Kategoriyalar yaratilmoqda...');

        const categoryData = [
            { name: 'Qon tahlili',    code: 'BLOOD',   description: 'Qon tahlillari va gematologiya' },
            { name: 'Siydik tahlili', code: 'URINE',   description: 'Siydik tahlillari va nefrologiya' },
            { name: 'Biokimyo',       code: 'BIOCHEM', description: 'Qon biokimyoviy tahlillari' },
            { name: 'Gormonal',       code: 'HORMONE', description: 'Gormonal tahlillar' },
            { name: 'Immunologiya',   code: 'IMMUNO',  description: 'Immunologik tahlillar va serologiya' },
            { name: 'Mikrobiologiya', code: 'MICRO',   description: 'Bakteriologik ekinlar va PCR' },
            { name: 'Koagulologiya',  code: 'COAG',    description: 'Qon ivishi tahlillari' },
        ];

        const categories = {};
        for (const data of categoryData) {
            const existing = await Category.findOne({ name: data.name });
            if (existing) {
                categories[data.code] = existing;
                console.log(`   ⚡ Mavjud: ${data.name}`);
            } else {
                const cat = await Category.create(data);
                categories[data.code] = cat;
                console.log(`   ✓ Yaratildi: ${data.name}`);
            }
        }

        // ====== ANALIZLAR ======
        console.log('\n🧪 Analizlar yaratilmoqda...');

        const diagnosesData = [
            // --- QON TAHLILI ---
            { name: 'Umumiy qon tahlili (UAK)',           code: 'CBC-01',   category: categories['BLOOD']._id,   price: 25000,  description: 'Eritrotsit, leykosit, gemoglobin, trombotsit' },
            { name: 'Gemoglobin (Hb)',                    code: 'HGB-01',   category: categories['BLOOD']._id,   price: 15000,  description: 'Qondagi gemoglobin miqdori' },
            { name: 'Eritrotsitlar soni (RBC)',           code: 'RBC-01',   category: categories['BLOOD']._id,   price: 15000,  description: 'Qizil qon hujayralar soni' },
            { name: 'Leykositlar soni (WBC)',             code: 'WBC-01',   category: categories['BLOOD']._id,   price: 15000,  description: 'Oq qon hujayralar soni' },
            { name: 'Trombotsitlar soni (PLT)',           code: 'PLT-01',   category: categories['BLOOD']._id,   price: 15000,  description: 'Qon ivishi uchun trombotsitlar' },
            { name: 'Eritrotsit cho\'kish tezligi (EChT)',code: 'ESR-01',   category: categories['BLOOD']._id,   price: 12000,  description: 'Yallig\'lanish ko\'rsatkichi' },
            { name: 'Qon guruhini aniqlash (ABO+Rh)',     code: 'BG-01',    category: categories['BLOOD']._id,   price: 20000,  description: 'ABO sistemasi va Rh faktor' },
            { name: 'Retikulotsitlar',                    code: 'RET-01',   category: categories['BLOOD']._id,   price: 18000,  description: 'Yosh eritrotsitlar ulushi' },

            // --- SIYDIK TAHLILI ---
            { name: 'Umumiy siydik tahlili (OAM)',        code: 'UA-01',    category: categories['URINE']._id,   price: 18000,  description: 'Rang, zichlik, oqsil, glyukoza, silindrlar' },
            { name: 'Siydikda qand (glyukozuriya)',       code: 'UG-01',    category: categories['URINE']._id,   price: 15000,  description: 'Siydikda glyukoza mavjudligi' },
            { name: 'Siydikda oqsil (proteinuriya)',      code: 'UP-01',    category: categories['URINE']._id,   price: 15000,  description: 'Siydikda oqsil mavjudligi' },
            { name: 'Nechiporenko bo\'yicha siydik',      code: 'UN-01',    category: categories['URINE']._id,   price: 22000,  description: 'Leykosit, eritrosit, silindrlar soni' },
            { name: 'Siydik madaniyati (bakposev)',       code: 'UC-01',    category: categories['URINE']._id,   price: 45000,  description: 'Bakterial o\'stirish va antibiotikka sezgirlik' },
            { name: 'Siydik mikrobiga sezgirlik',         code: 'UAS-01',   category: categories['URINE']._id,   price: 35000,  description: 'Antibiotikka sezgirlik testi' },

            // --- BIOKIMYO ---
            { name: 'Qon glyukozasi (shakar)',            code: 'BG-G01',   category: categories['BIOCHEM']._id, price: 18000,  description: 'Qondagi shakar miqdori' },
            { name: 'Glikozillangan gemoglobin (HbA1c)',  code: 'HBA1C',    category: categories['BIOCHEM']._id, price: 55000,  description: '3 oylik o\'rtacha qand miqdori' },
            { name: 'Umumiy xolesterin',                  code: 'CHOL-T',   category: categories['BIOCHEM']._id, price: 22000,  description: 'Qon xolesterini' },
            { name: 'HDL xolesterin (yaxshi)',            code: 'HDL-01',   category: categories['BIOCHEM']._id, price: 25000,  description: 'Yuqori zichlikdagi lipoprotein' },
            { name: 'LDL xolesterin (yomon)',             code: 'LDL-01',   category: categories['BIOCHEM']._id, price: 25000,  description: 'Past zichlikdagi lipoprotein' },
            { name: 'Triglitseridlar',                    code: 'TG-01',    category: categories['BIOCHEM']._id, price: 22000,  description: 'Qon yog\' miqdori' },
            { name: 'ALT (jigar fermenti)',                code: 'ALT-01',   category: categories['BIOCHEM']._id, price: 20000,  description: 'Jigar zararlanish ko\'rsatkichi' },
            { name: 'AST (jigar fermenti)',                code: 'AST-01',   category: categories['BIOCHEM']._id, price: 20000,  description: 'Jigar va yurak ko\'rsatkichi' },
            { name: 'Umumiy bilirubin',                   code: 'BIL-T',    category: categories['BIOCHEM']._id, price: 20000,  description: 'Jigar funksiyasi' },
            { name: 'To\'g\'ridan bilirubin',             code: 'BIL-D',    category: categories['BIOCHEM']._id, price: 18000,  description: 'To\'g\'ri bilirubin fraksiyasi' },
            { name: 'Kreatinin',                          code: 'CREAT',    category: categories['BIOCHEM']._id, price: 20000,  description: 'Buyrak funksiyasi' },
            { name: 'Mochevina (urea)',                   code: 'UREA-01',  category: categories['BIOCHEM']._id, price: 18000,  description: 'Oqsil metabolizmi ko\'rsatkichi' },
            { name: 'Siydik kislotasi',                   code: 'UA-BIO',   category: categories['BIOCHEM']._id, price: 20000,  description: 'Podagra va buyrak funksiyasi' },
            { name: 'Umumiy oqsil',                       code: 'PROT-T',   category: categories['BIOCHEM']._id, price: 18000,  description: 'Qon umumiy oqsil miqdori' },
            { name: 'C-reaktiv oqsil (CRP)',              code: 'CRP-01',   category: categories['BIOCHEM']._id, price: 30000,  description: 'O\'tkir yallig\'lanish ko\'rsatkichi' },
            { name: 'Temir (Fe)',                         code: 'FE-01',    category: categories['BIOCHEM']._id, price: 25000,  description: 'Qondagi temir miqdori' },
            { name: 'Ferritin',                           code: 'FERR-01',  category: categories['BIOCHEM']._id, price: 55000,  description: 'Temir zahiralari ko\'rsatkichi' },
            { name: 'Kalsiy (Ca)',                        code: 'CA-01',    category: categories['BIOCHEM']._id, price: 20000,  description: 'Qon kalsiy miqdori' },
            { name: 'Kaliy (K)',                          code: 'K-01',     category: categories['BIOCHEM']._id, price: 20000,  description: 'Elektrolit muvozanati' },
            { name: 'Natriy (Na)',                        code: 'NA-01',    category: categories['BIOCHEM']._id, price: 20000,  description: 'Elektrolit muvozanati' },
            { name: 'Magniy (Mg)',                        code: 'MG-01',    category: categories['BIOCHEM']._id, price: 22000,  description: 'Mineral moddalar' },
            { name: 'Amilaza (me\'da osti bezi)',         code: 'AMY-01',   category: categories['BIOCHEM']._id, price: 25000,  description: 'Pankreatit ko\'rsatkichi' },
            { name: 'Lipaza',                             code: 'LIP-01',   category: categories['BIOCHEM']._id, price: 30000,  description: 'Me\'da osti bezi fermenti' },

            // --- GORMONAL ---
            { name: 'TSH (qalqonsimon bez)',              code: 'TSH-01',   category: categories['HORMONE']._id, price: 60000,  description: 'Qalqonsimon bez rag\'batlantiruvchi gormoni' },
            { name: 'T3 (triyodtironin)',                 code: 'T3-01',    category: categories['HORMONE']._id, price: 55000,  description: 'Qalqonsimon bez gormoni' },
            { name: 'T4 (tiroksin)',                      code: 'T4-01',    category: categories['HORMONE']._id, price: 55000,  description: 'Qalqonsimon bez gormoni' },
            { name: 'Kortizol',                           code: 'CORT-01',  category: categories['HORMONE']._id, price: 65000,  description: 'Stressga javoban ishlab chiqiladi' },
            { name: 'Insulin',                            code: 'INS-01',   category: categories['HORMONE']._id, price: 70000,  description: 'Qand boshqaruvchi gormoni' },
            { name: 'Testosteron (umumiy)',               code: 'TEST-T',   category: categories['HORMONE']._id, price: 70000,  description: 'Erkaklik gormoni' },
            { name: 'Estradiol (E2)',                     code: 'E2-01',    category: categories['HORMONE']._id, price: 70000,  description: 'Asosiy ayollik gormoni' },
            { name: 'Prolaktin',                          code: 'PROL-01',  category: categories['HORMONE']._id, price: 65000,  description: 'Sut bezi gormoni' },
            { name: 'LH (lyuteinlashtiruvchi gormon)',    code: 'LH-01',    category: categories['HORMONE']._id, price: 65000,  description: 'Jinsiy gormonlar' },
            { name: 'FSH (follikul rag\'batlantiruvchi)', code: 'FSH-01',   category: categories['HORMONE']._id, price: 65000,  description: 'Jinsiy gormonlar' },
            { name: 'PTG (paratiroid gormon)',            code: 'PTH-01',   category: categories['HORMONE']._id, price: 80000,  description: 'Kalsiy metabolizmi' },
            { name: 'Vitamin D (25-OH)',                  code: 'VITD-01',  category: categories['HORMONE']._id, price: 90000,  description: 'D vitamini miqdori' },
            { name: 'Vitamin B12',                        code: 'B12-01',   category: categories['HORMONE']._id, price: 75000,  description: 'Kobalamin miqdori' },
            { name: 'Folat kislotasi',                    code: 'FOL-01',   category: categories['HORMONE']._id, price: 70000,  description: 'B9 vitamini' },

            // --- IMMUNOLOGIYA ---
            { name: 'IgA (immunoglobulin A)',             code: 'IGA-01',   category: categories['IMMUNO']._id,  price: 55000,  description: 'Immunitet holati' },
            { name: 'IgG (immunoglobulin G)',             code: 'IGG-01',   category: categories['IMMUNO']._id,  price: 55000,  description: 'Asosiy immunoglobulin' },
            { name: 'IgM (immunoglobulin M)',             code: 'IGM-01',   category: categories['IMMUNO']._id,  price: 55000,  description: 'O\'tkir infeksiya ko\'rsatkichi' },
            { name: 'Anti-HBs (gepatit B)',               code: 'ANTI-HBS', category: categories['IMMUNO']._id,  price: 45000,  description: 'Gepatit B immunitet' },
            { name: 'HBsAg (gepatit B antigeni)',         code: 'HBSAG',    category: categories['IMMUNO']._id,  price: 45000,  description: 'Gepatit B yuqtirganligi' },
            { name: 'Anti-HCV (gepatit C)',               code: 'ANTI-HCV', category: categories['IMMUNO']._id,  price: 50000,  description: 'Gepatit C antitanalari' },
            { name: 'HIV antitanalari',                   code: 'HIV-01',   category: categories['IMMUNO']._id,  price: 40000,  description: 'OIV infeksiyasi skrining' },
            { name: 'Sifilis (VDRL/RPR)',                 code: 'SYP-01',   category: categories['IMMUNO']._id,  price: 35000,  description: 'Treponema pallidum' },
            { name: 'Antinuklear antitanalar (ANA)',      code: 'ANA-01',   category: categories['IMMUNO']._id,  price: 85000,  description: 'Autoimmun kasalliklar' },
            { name: 'Revmatoid faktor (RF)',              code: 'RF-01',    category: categories['IMMUNO']._id,  price: 40000,  description: 'Revmatoid artrit ko\'rsatkichi' },
            { name: 'AST (antistreptolisin)',             code: 'ASLO-01',  category: categories['IMMUNO']._id,  price: 35000,  description: 'Streptokokk infeksiyasi' },

            // --- MIKROBIOLOGIYA ---
            { name: 'Tomoq surtmasi (bakteriologik)',     code: 'THR-C01',  category: categories['MICRO']._id,   price: 50000,  description: 'Tomoqdan madaniyat olish' },
            { name: 'Burun surtmasi (bakteriologik)',     code: 'NOS-C01',  category: categories['MICRO']._id,   price: 50000,  description: 'Burundan madaniyat olish' },
            { name: 'Najasda disbakterioz',               code: 'STOOL-D',  category: categories['MICRO']._id,   price: 65000,  description: 'Ichak mikroflora holati' },
            { name: 'Najasda yashirin qon',               code: 'STOOL-B',  category: categories['MICRO']._id,   price: 35000,  description: 'Yashirin qon ketishi' },
            { name: 'Helikobakter pylori (qonda)',        code: 'HB-AB',    category: categories['MICRO']._id,   price: 55000,  description: 'H.pylori antitanalari' },
            { name: 'Koronavirus PCR (COVID-19)',         code: 'COV-PCR',  category: categories['MICRO']._id,   price: 120000, description: 'SARS-CoV-2 PCR tahlili' },
            { name: 'Gripp A/B PCR',                     code: 'FLU-PCR',  category: categories['MICRO']._id,   price: 100000, description: 'Gripp PCR tahlili' },
            { name: 'Chlamydia trachomatis PCR',         code: 'CHL-PCR',  category: categories['MICRO']._id,   price: 90000,  description: 'Xlamidiya PCR' },
            { name: 'Mycoplasma pneumoniae PCR',          code: 'MYC-PCR',  category: categories['MICRO']._id,   price: 90000,  description: 'Mikoplazma PCR' },

            // --- KOAGULOLOGIYA ---
            { name: 'Protrombin vaqti (PT/INR)',          code: 'PT-INR',   category: categories['COAG']._id,    price: 30000,  description: 'Qon ivishi tizimi' },
            { name: 'APTT (aktivlashgan)',                 code: 'APTT-01',  category: categories['COAG']._id,    price: 30000,  description: 'Ichki ivish yo\'li' },
            { name: 'Fibrinogen',                         code: 'FIB-01',   category: categories['COAG']._id,    price: 35000,  description: 'Tromboz ko\'rsatkichi' },
            { name: 'D-dimer',                            code: 'DDIM-01',  category: categories['COAG']._id,    price: 85000,  description: 'Tromboemboliya ko\'rsatkichi' },
            { name: 'Trombin vaqti',                      code: 'TT-01',    category: categories['COAG']._id,    price: 28000,  description: 'Fibrinogen holati' },
            { name: 'Antitrombin III',                    code: 'AT3-01',   category: categories['COAG']._id,    price: 50000,  description: 'Antikoagulyant tizim' },
        ];

        let created = 0;
        let skipped = 0;
        for (const data of diagnosesData) {
            const existing = await Diagnosis.findOne({ code: data.code });
            if (existing) {
                skipped++;
            } else {
                await Diagnosis.create(data);
                created++;
            }
        }

        console.log(`   ✓ ${created} ta analiz yaratildi`);
        if (skipped > 0) console.log(`   ⚡ ${skipped} ta mavjud analiz o'tkazib yuborildi`);

        console.log('\n🎉 Demo ma\'lumotlar muvaffaqiyatli qo\'shildi!');
        console.log('\n📋 Kategoriyalar:');
        for (const [code, cat] of Object.entries(categories)) {
            const count = await Diagnosis.countDocuments({ category: cat._id });
            console.log(`   • ${cat.name}: ${count} ta analiz`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Xatolik:', error.message);
        process.exit(1);
    }
};

seedCategories();
