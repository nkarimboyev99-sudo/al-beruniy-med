const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'Token topilmadi' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'Foydalanuvchi topilmadi' });
        }

        if (!user.isActive) {
            return res.status(401).json({ message: 'Hisobingiz bloklangan' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token yaroqsiz' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Faqat admin uchun' });
    }
    next();
};

const doctorOrAdmin = (req, res, next) => {
    if (!['admin', 'doctor', 'registrator'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }
    next();
};

module.exports = { auth, adminOnly, doctorOrAdmin };
