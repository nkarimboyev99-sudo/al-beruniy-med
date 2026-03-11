const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username va parol kiritilishi shart' });
        }

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({ message: 'Noto\'g\'ri username yoki parol' });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Noto\'g\'ri username yoki parol' });
        }

        if (!user.isActive) {
            return res.status(401).json({ message: 'Hisobingiz bloklangan' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get current user
router.get('/me', auth, async (req, res) => {
    res.json({ user: req.user });
});

// Register new user (admin only)
router.post('/register', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Faqat admin yangi foydalanuvchi yarata oladi' });
        }

        const { username, password, fullName, role, phone } = req.body;

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Bu username allaqachon mavjud' });
        }

        const user = await User.create({
            username,
            password,
            fullName,
            role: role || 'doctor',
            phone
        });

        res.status(201).json({
            message: 'Foydalanuvchi yaratildi',
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get all users (admin only)
router.get('/users', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Faqat admin uchun' });
        }

        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Update user (admin yoki o'zi uchun)
router.put('/users/:id', auth, async (req, res) => {
    try {
        const isSelf = req.user.id === req.params.id || req.user._id?.toString() === req.params.id;
        const isAdmin = req.user.role === 'admin';

        if (!isAdmin && !isSelf) {
            return res.status(403).json({ message: 'Ruxsat yo\'q' });
        }

        const { fullName, username, phone, role, isActive, password } = req.body;

        // O'zi tahrirlasa faqat fullName, phone, password ga ruxsat
        const updateData = isAdmin
            ? { fullName, username, phone, role, isActive }
            : { fullName, phone };

        // Agar yangi parol berilgan bo'lsa, uni ham yangilash
        if (password && password.trim() !== '') {
            const user = await User.findById(req.params.id);
            if (user) {
                user.password = password;
                await user.save(); // Bu parolni hash qiladi
            }
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
        }

        res.json(user);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Delete user (admin only)
router.delete('/users/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Faqat admin uchun' });
        }

        // O'zini o'chirmasligi uchun tekshiruv
        if (req.user.id === req.params.id) {
            return res.status(400).json({ message: 'O\'zingizni o\'chira olmaysiz' });
        }

        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
        }

        res.json({ message: 'Foydalanuvchi o\'chirildi' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get staff activities (admin only)
router.get('/users/:id/activities', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Faqat admin uchun' });
        }

        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
        }

        const PatientDiagnosis = require('../models/PatientDiagnosis');
        const Patient = require('../models/Patient');

        let activities = [];

        if (user.role === 'doctor') {
            // Doktor qo'shgan analizlar
            const diagnoses = await PatientDiagnosis.find({ doctor: user._id, isActive: true })
                .populate('patient', 'fullName phone')
                .select('diagnosisName patient totalAmount paymentMethod createdAt')
                .sort({ createdAt: -1 });

            activities = diagnoses.map(d => ({
                type: 'diagnosis',
                patientName: d.patient?.fullName || '-',
                patientPhone: d.patient?.phone || '-',
                description: d.diagnosisName,
                amount: d.totalAmount,
                paymentMethod: d.paymentMethod,
                date: d.createdAt
            }));
        } else if (user.role === 'registrator') {
            // Registrator ro'yxatga olgan bemorlar
            const patients = await Patient.find({ registeredBy: user._id })
                .select('fullName phone gender createdAt')
                .sort({ createdAt: -1 });

            activities = patients.map(p => ({
                type: 'patient',
                patientName: p.fullName,
                patientPhone: p.phone || '-',
                description: 'Bemor ro\'yxatga olindi',
                gender: p.gender,
                date: p.createdAt
            }));
        }

        res.json({ user, activities });
    } catch (error) {
        console.error('Activities error:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

module.exports = router;
