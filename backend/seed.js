const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Patient = require('./models/Patient');
const Diagnosis = require('./models/Diagnosis');
const Medicine = require('./models/Medicine');
const Inventory = require('./models/Inventory');
const Transaction = require('./models/Transaction');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected');

        // Clear existing data (except admin user)
        console.log('🗑️ Cleaning existing data...');
        await Patient.deleteMany({});
        await Diagnosis.deleteMany({});
        await Medicine.deleteMany({});
        await Inventory.deleteMany({});
        await Transaction.deleteMany({});
        await User.deleteMany({ role: 'doctor' });

        // Create default admin if not exists
        await User.createDefaultAdmin();

        // ====== DOCTORS ======
        console.log('👨‍⚕️ Creating doctors...');

        const doctorData = [
            { username: 'doctor1', password: 'doctor123', fullName: 'Dr. Alisher Karimov', role: 'doctor', isActive: true },
            { username: 'doctor2', password: 'doctor123', fullName: 'Dr. Nodira Rahimova', role: 'doctor', isActive: true },
            { username: 'doctor3', password: 'doctor123', fullName: 'Dr. Sardor Toshmatov', role: 'doctor', isActive: true },
        ];

        const doctors = [];
        for (const data of doctorData) {
            const doctor = await User.create(data);
            doctors.push(doctor);
        }
        console.log(`   ✓ ${doctors.length} doctors created (password: doctor123)`);

        // ====== DIAGNOSES ======
        console.log('🩺 Creating diagnoses...');
        const diagnoses = await Diagnosis.insertMany([
            // Blood diagnoses
            { name: 'Anemiya (kamqonlik)', code: 'D50', category: 'blood', description: 'Qonda gemoglobin yetishmasligi' },
            { name: 'Leykositoz', code: 'D72.8', category: 'blood', description: 'Oq qon hujayralarining ko\'payishi' },
            { name: 'Trombositopeniya', code: 'D69.6', category: 'blood', description: 'Trombotsitlar kamayishi' },
            { name: 'Polistemiya', code: 'D45', category: 'blood', description: 'Qizil qon tanachalarining ortishi' },
            { name: 'Qand kasalligi (1-tip)', code: 'E10', category: 'blood', description: 'Insulin yetishmasligi' },
            { name: 'Qand kasalligi (2-tip)', code: 'E11', category: 'blood', description: 'Insulin ta\'siriga chidamlilik' },
            { name: 'Giperxolesterinemiya', code: 'E78.0', category: 'blood', description: 'Qonda xolesterin ko\'payishi' },

            // Urine diagnoses
            { name: 'Siydik yo\'llari infeksiyasi', code: 'N39.0', category: 'urine', description: 'Bakterial infektsiya' },
            { name: 'Buyrak tosh kasalligi', code: 'N20', category: 'urine', description: 'Buyrakda tosh hosil bo\'lishi' },
            { name: 'Glomerulonefrit', code: 'N00', category: 'urine', description: 'Buyrak yallig\'lanishi' },
            { name: 'Proteinuriya', code: 'R80', category: 'urine', description: 'Siydikda oqsil mavjudligi' },
            { name: 'Gematuria', code: 'R31', category: 'urine', description: 'Siydikda qon mavjudligi' },
            { name: 'Sistit', code: 'N30', category: 'urine', description: 'Siydik pufagi yallig\'lanishi' },
        ]);
        console.log(`   ✓ ${diagnoses.length} diagnoses created`);

        // ====== MEDICINES ======
        console.log('💊 Creating medicines...');
        const medicines = await Medicine.insertMany([
            // Tablets
            { name: 'Ferrum Lek', dosage: '100mg', form: 'tablet', instructions: 'Kuniga 1 ta, ovqatdan keyin', sideEffects: 'Qabziyat, oshqozon og\'rig\'i' },
            { name: 'Metformin', dosage: '500mg', form: 'tablet', instructions: 'Kuniga 2 marta, ovqat bilan birga', sideEffects: 'Ko\'ngil aynash, diareya' },
            { name: 'Atorvastatin', dosage: '20mg', form: 'tablet', instructions: 'Kechqurun 1 ta', sideEffects: 'Mushak og\'rig\'i' },
            { name: 'Amoksitsillin', dosage: '500mg', form: 'capsule', instructions: 'Kuniga 3 marta, 7 kun', sideEffects: 'Allergik reaktsiya' },
            { name: 'Tsiprofloksatsin', dosage: '500mg', form: 'tablet', instructions: 'Kuniga 2 marta', sideEffects: 'Bosh aylanishi' },
            { name: 'Aspirin', dosage: '100mg', form: 'tablet', instructions: 'Kuniga 1 ta, ovqatdan keyin', sideEffects: 'Oshqozon qon ketishi' },
            { name: 'Omeprazol', dosage: '20mg', form: 'capsule', instructions: 'Ovqatdan 30 min oldin', sideEffects: 'Bosh og\'rig\'i' },
            { name: 'Paracetamol', dosage: '500mg', form: 'tablet', instructions: 'Kerak bo\'lganda, max 4 ta/kun', sideEffects: 'Jigar muammolari (katta dozada)' },

            // Injections
            { name: 'Insulin (Novorapid)', dosage: '100IU/ml', form: 'injection', instructions: 'Ovqatdan oldin, sc', sideEffects: 'Gipoglikemiya' },
            { name: 'B12 Vitamin', dosage: '1000mcg', form: 'injection', instructions: 'Haftada 1 marta, im', sideEffects: 'In\'ektsiya joyida og\'riq' },
            { name: 'Seftriakson', dosage: '1g', form: 'injection', instructions: 'Kuniga 1-2 marta, iv/im', sideEffects: 'Allergik reaktsiya' },

            // Syrups
            { name: 'Temir sirop', dosage: '50mg/5ml', form: 'syrup', instructions: 'Bolalarga 5ml kuniga 2 marta', sideEffects: 'Tish rang o\'zgarishi' },
            { name: 'Bromgeksin', dosage: '4mg/5ml', form: 'syrup', instructions: '5-10ml kuniga 3 marta', sideEffects: 'Oshqozon bezovtaligi' },

            // Others
            { name: 'Kanefron', dosage: '-', form: 'drops', instructions: '50 tomchi kuniga 3 marta', sideEffects: 'Allergik reaktsiya' },
            { name: 'Furatsilin', dosage: '0.02%', form: 'other', instructions: 'Tashqi foydalanish uchun', sideEffects: 'Teri quruqligi' },
        ]);
        console.log(`   ✓ ${medicines.length} medicines created`);

        // ====== PATIENTS ======
        console.log('👤 Creating patients...');
        const patientData = [
            { fullName: 'Abdullayev Jamshid Karimovich', age: 45, gender: 'male', phone: '+998901234567', address: 'Toshkent, Chilonzor tumani, 7-mavze', bloodType: 'A+' },
            { fullName: 'Rahimova Dilnoza Shavkatovna', age: 32, gender: 'female', phone: '+998901234568', address: 'Toshkent, Yunusobod tumani, 14-kvartal', bloodType: 'B+' },
            { fullName: 'Toshmatov Olim Rustamovich', age: 58, gender: 'male', phone: '+998901234569', address: 'Toshkent, Mirzo Ulug\'bek tumani', bloodType: 'O+' },
            { fullName: 'Karimova Gulnora Anvarovna', age: 28, gender: 'female', phone: '+998901234570', address: 'Samarqand, Registon ko\'chasi 15', bloodType: 'AB+' },
            { fullName: 'Ismoilov Bekzod Tohirovich', age: 40, gender: 'male', phone: '+998901234571', address: 'Buxoro, Mustaqillik ko\'chasi 23', bloodType: 'A-' },
            { fullName: 'Qodirova Malika Rustamovna', age: 55, gender: 'female', phone: '+998901234572', address: 'Toshkent, Sergeli tumani, 5-mavze', bloodType: 'B-' },
            { fullName: 'Ergashev Sanjar Yuldashovich', age: 35, gender: 'male', phone: '+998901234573', address: 'Namangan, Navoiy ko\'chasi 45', bloodType: 'O-' },
            { fullName: 'Aliyeva Sevinch Abrorovna', age: 22, gender: 'female', phone: '+998901234574', address: 'Toshkent, Yakkasaroy tumani', bloodType: 'A+' },
            { fullName: 'Xolmatov Anvar Shuhratovich', age: 67, gender: 'male', phone: '+998901234575', address: 'Farg\'ona, Margilon ko\'chasi 12', bloodType: 'AB-' },
            { fullName: 'Nazarova Zulfiya Qobilovna', age: 48, gender: 'female', phone: '+998901234576', address: 'Toshkent, Olmazor tumani, 3-mavze', bloodType: 'O+' },
        ];

        const patients = [];
        for (const data of patientData) {
            const patient = await Patient.create({
                ...data,
                registeredBy: doctors[Math.floor(Math.random() * doctors.length)]._id
            });
            patients.push(patient);
        }
        console.log(`   ✓ ${patients.length} patients created`);

        // Add diagnoses to some patients
        console.log('📋 Adding diagnoses to patients...');
        const diagnosesToAssign = [
            { patientIndex: 0, diagnosisIndex: 0, medicineIndices: [0, 9] }, // Anemiya
            { patientIndex: 1, diagnosisIndex: 7, medicineIndices: [3, 13] }, // UTI
            { patientIndex: 2, diagnosisIndex: 5, medicineIndices: [1, 8] }, // Diabet 2
            { patientIndex: 3, diagnosisIndex: 4, medicineIndices: [1, 8] }, // Diabet 1
            { patientIndex: 4, diagnosisIndex: 6, medicineIndices: [2, 5] }, // Xolesterin
            { patientIndex: 5, diagnosisIndex: 8, medicineIndices: [13, 4] }, // Buyrak tosh
            { patientIndex: 6, diagnosisIndex: 12, medicineIndices: [3, 4] }, // Sistit
        ];

        for (const assign of diagnosesToAssign) {
            await Patient.findByIdAndUpdate(patients[assign.patientIndex]._id, {
                $push: {
                    diagnoses: {
                        diagnosis: diagnoses[assign.diagnosisIndex]._id,
                        medicines: assign.medicineIndices.map(i => medicines[i]._id),
                        notes: 'Doimiy nazorat talab etiladi',
                        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
                    }
                }
            });
        }
        console.log(`   ✓ Diagnoses assigned to ${diagnosesToAssign.length} patients`);

        // ====== INVENTORY ======
        console.log('📦 Creating inventory...');
        const inventoryData = medicines.map((med, index) => ({
            medicine: med._id,
            quantity: Math.floor(Math.random() * 200) + 10,
            minQuantity: 20,
            unitPrice: (Math.floor(Math.random() * 50) + 5) * 1000,
            sellPrice: (Math.floor(Math.random() * 80) + 10) * 1000,
            expiryDate: new Date(Date.now() + (Math.random() * 365 + 180) * 24 * 60 * 60 * 1000),
            batchNumber: `LOT-2024-${String(index + 1).padStart(3, '0')}`,
            supplier: ['Dori Darmon', 'Pharma Plus', 'Med Import', 'Uzfarma'][Math.floor(Math.random() * 4)]
        }));

        // Make some items low stock
        inventoryData[0].quantity = 5;
        inventoryData[3].quantity = 8;
        inventoryData[7].quantity = 12;

        await Inventory.insertMany(inventoryData);
        console.log(`   ✓ ${inventoryData.length} inventory items created`);

        // ====== TRANSACTIONS ======
        console.log('💰 Creating transactions...');
        const admin = await User.findOne({ role: 'admin' });
        const transactions = [];

        // Income transactions
        const incomeCategories = ['medicine_sale', 'service'];
        for (let i = 0; i < 25; i++) {
            transactions.push({
                type: 'income',
                category: incomeCategories[Math.floor(Math.random() * incomeCategories.length)],
                amount: (Math.floor(Math.random() * 500) + 50) * 1000,
                description: ['Dori savdosi', 'Qon tahlili', 'Siydik tahlili', 'Konsultatsiya', 'Ultrasoung'][Math.floor(Math.random() * 5)],
                paymentMethod: ['cash', 'card', 'transfer'][Math.floor(Math.random() * 3)],
                createdBy: admin._id,
                date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
            });
        }

        // Expense transactions
        const expenseCategories = ['medicine_purchase', 'salary', 'rent', 'utilities'];
        const expenseDescriptions = {
            medicine_purchase: ['Ferrum Lek xaridi', 'Antibiotiklar', 'Dori to\'ldirish'],
            salary: ['Doktor maoshi', 'Hamshira maoshi', 'Administrator maoshi'],
            rent: ['Oylik ijara', 'Kommunal to\'lovlar'],
            utilities: ['Elektr', 'Gaz', 'Suv']
        };

        for (let i = 0; i < 15; i++) {
            const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
            transactions.push({
                type: 'expense',
                category,
                amount: (Math.floor(Math.random() * 300) + 30) * 1000,
                description: expenseDescriptions[category][Math.floor(Math.random() * expenseDescriptions[category].length)],
                paymentMethod: ['cash', 'transfer'][Math.floor(Math.random() * 2)],
                createdBy: admin._id,
                date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
            });
        }

        await Transaction.insertMany(transactions);
        console.log(`   ✓ ${transactions.length} transactions created`);

        console.log('\n🎉 Demo data seeded successfully!');
        console.log('\n📋 Summary:');
        console.log(`   • 3 Doctors (login: doctor1/doctor2/doctor3, password: doctor123)`);
        console.log(`   • ${diagnoses.length} Diagnoses`);
        console.log(`   • ${medicines.length} Medicines`);
        console.log(`   • ${patients.length} Patients`);
        console.log(`   • ${inventoryData.length} Inventory items (3 low stock)`);
        console.log(`   • ${transactions.length} Transactions`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
