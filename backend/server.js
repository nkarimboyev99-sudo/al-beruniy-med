const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const diagnosisRoutes = require('./routes/diagnoses');
const patientDiagnosisRoutes = require('./routes/patientDiagnoses');
const medicineRoutes = require('./routes/medicines');
const inventoryRoutes = require('./routes/inventory');
const transactionRoutes = require('./routes/transactions');
const queueTicketRoutes = require('./routes/queueTickets');
const categoryRoutes = require('./routes/categories');
const referringDoctorRoutes = require('./routes/referringDoctors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/diagnoses', diagnosisRoutes);
app.use('/api/patient-diagnoses', patientDiagnosisRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/queue-tickets', queueTicketRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/referring-doctors', referringDoctorRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Al Beruniy Med API is running' });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB connected successfully');

        // Create default admin user if not exists
        const User = require('./models/User');
        User.createDefaultAdmin();
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
    });

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 API: http://localhost:${PORT}/api`);

    // Render free tier uxlab qolmasligi uchun har 14 daqiqada o'ziga ping
    if (process.env.RENDER_EXTERNAL_URL) {
        const https = require('https');
        setInterval(() => {
            https.get(`${process.env.RENDER_EXTERNAL_URL}/api/health`, (res) => {
                console.log(`🏓 Keep-alive ping: ${res.statusCode}`);
            }).on('error', (err) => {
                console.error('Keep-alive ping xatosi:', err.message);
            });
        }, 14 * 60 * 1000); // 14 daqiqa
    }
});
