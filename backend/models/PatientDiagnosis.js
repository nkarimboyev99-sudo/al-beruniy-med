const mongoose = require('mongoose');

const patientDiagnosisSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    diagnosis: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Diagnosis'
    },
    diagnosisName: {
        type: String,
        required: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    doctorName: {
        type: String
    },
    notes: {
        type: String
    },
    medicines: [{
        medicine: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Medicine'
        },
        name: String,
        dosage: String,
        quantity: Number,
        instructions: String
    }],
    // To'lov ma'lumotlari (chekni qayta chiqarish uchun)
    diagnosisPrices: [{
        diagnosisId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Diagnosis' // could also point to Category if isCategoryPrice=true, but loose ref is fine
        },
        isCategoryPrice: {
            type: Boolean,
            default: false
        },
        name: String,
        price: Number
    }],
    totalAmount: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'transfer', 'other'],
        default: 'cash'
    },
    // Laboratoriya natijalari - dinamik ustunlar bilan
    results: {
        title: String,
        columns: [{
            id: String,
            name: String,
            width: String
        }],
        rows: [{
            values: mongoose.Schema.Types.Mixed
        }],
        conclusion: String,
        savedAt: Date,
        savedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PatientDiagnosis', patientDiagnosisSchema);
