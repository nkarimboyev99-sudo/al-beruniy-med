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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Lab Registr API is running' });
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
});
