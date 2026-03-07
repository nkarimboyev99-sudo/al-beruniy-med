const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['admin', 'doctor'],
        default: 'doctor'
    },
    phone: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Hash password before save
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Create default admin
userSchema.statics.createDefaultAdmin = async function () {
    try {
        // Default admin
        const adminExists = await this.findOne({ username: 'admin' });
        if (!adminExists) {
            await this.create({
                username: 'admin',
                password: 'admin123',
                fullName: 'Administrator',
                role: 'admin'
            });
            console.log('✅ Default admin user created (admin/admin123)');
        }

        // Qosim admin
        const qosimExists = await this.findOne({ username: 'Qosim' });
        if (!qosimExists) {
            await this.create({
                username: 'Qosim',
                password: 'Qosim123',
                fullName: 'Qosim Admin',
                role: 'admin'
            });
            console.log('✅ Qosim admin user created (Qosim/Qosim123)');
        }
    } catch (error) {
        console.error('Error creating default admin:', error.message);
    }
};

module.exports = mongoose.model('User', userSchema);
