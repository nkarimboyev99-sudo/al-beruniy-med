const mongoose = require('mongoose');

const diagnosisSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    recommendedMedicines: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine'
    }],
    normalRanges: [{
        ageMin: { type: Number, default: 0 },
        ageMax: { type: Number, default: null },
        gender: { type: String, enum: ['male', 'female', 'both'], default: 'both' },
        range: { type: String, trim: true },
        unit:  { type: String, trim: true },
        price: { type: Number, default: 0 }
    }],
    price: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Diagnosis', diagnosisSchema);
