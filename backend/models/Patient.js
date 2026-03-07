const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    birthDate: {
        type: Date
    },
    phone: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    gender: {
        type: String,
        enum: ['male', 'female'],
        default: 'male'
    },
    registeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastDiagnosisDate: {
        type: Date
    },
    diagnoses: [{
        diagnosis: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Diagnosis'
        },
        medicines: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Medicine'
        }],
        notes: String,
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
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Patient', patientSchema);
