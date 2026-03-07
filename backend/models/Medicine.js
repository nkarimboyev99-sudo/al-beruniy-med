const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    genericName: {
        type: String,
        trim: true
    },
    dosage: {
        type: String,
        trim: true
    },
    form: {
        type: String,
        enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'other'],
        default: 'tablet'
    },
    instructions: {
        type: String,
        trim: true
    },
    sideEffects: {
        type: String,
        trim: true
    },
    image: {
        type: String,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Medicine', medicineSchema);
