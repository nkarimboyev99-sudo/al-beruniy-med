const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    medicine: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    minQuantity: {
        type: Number,
        default: 10,
        min: 0
    },
    unitPrice: {
        type: Number,
        default: 0
    },
    sellPrice: {
        type: Number,
        default: 0
    },
    expiryDate: {
        type: Date
    },
    batchNumber: {
        type: String,
        trim: true
    },
    supplier: {
        type: String,
        trim: true
    },
    lastRestocked: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Check if stock is low
inventorySchema.virtual('isLowStock').get(function () {
    return this.quantity <= this.minQuantity;
});

// Check if expired
inventorySchema.virtual('isExpired').get(function () {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
});

inventorySchema.set('toJSON', { virtuals: true });
inventorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Inventory', inventorySchema);
