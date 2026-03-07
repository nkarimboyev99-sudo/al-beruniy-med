const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['income', 'expense'],
        required: true
    },
    category: {
        type: String,
        enum: ['medicine_sale', 'medicine_purchase', 'service', 'salary', 'rent', 'utilities', 'other'],
        default: 'other'
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        trim: true
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient'
    },
    medicine: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine'
    },
    quantity: {
        type: Number,
        default: 1
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'transfer', 'other'],
        default: 'cash'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
