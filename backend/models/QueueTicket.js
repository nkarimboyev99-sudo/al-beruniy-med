const mongoose = require('mongoose');

const queueTicketSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    patientName: {
        type: String,
        required: true
    },
    phone: {
        type: String
    },
    gender: {
        type: String,
        enum: ['male', 'female']
    },
    queueNumber: {
        type: Number,
        required: true
    },
    date: {
        type: String,  // Format: YYYY-MM-DD (for daily grouping)
        required: true
    },
    arrivalTime: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
queueTicketSchema.index({ date: 1, queueNumber: 1 });
queueTicketSchema.index({ patient: 1, date: 1 });

module.exports = mongoose.model('QueueTicket', queueTicketSchema);
