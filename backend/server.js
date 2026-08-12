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
const journalRoutes = require('./routes/journal');
const {
    getDiagnosisPaymentAmount,
    normalizeDiagnosisPaymentSnapshot
} = require('./utils/finance');

const app = express();

// CORS Configuration
const allowedOrigins = new Set([
    'https://al-beruniy-med.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000'
]);

if (process.env.CLIENT_URL) {
    process.env.CLIENT_URL
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
        .forEach(origin => allowedOrigins.add(origin));
}

const isAllowedOrigin = (origin) => {
    if (!origin) return true;

    try {
        const { protocol, hostname } = new URL(origin);
        return (
            allowedOrigins.has(origin) ||
            (protocol === 'https:' && hostname.endsWith('.vercel.app')) ||
            (protocol === 'http:' && hostname === 'localhost')
        );
    } catch {
        return false;
    }
};

const corsOptions = {
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
};

app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (isAllowedOrigin(origin)) {
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Vary', 'Origin');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
        res.header(
            'Access-Control-Allow-Headers',
            req.headers['access-control-request-headers'] || 'Content-Type, Authorization, X-Requested-With, Accept, Origin'
        );
    }

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    return next();
});

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
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
app.use('/api/journal', journalRoutes);

// Health check
app.get('/api/health', (req, res) => {
    const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const dbState = dbStates[mongoose.connection.readyState] || 'unknown';

    res.status(dbState === 'connected' ? 200 : 503).json({
        status: dbState === 'connected' ? 'OK' : 'DEGRADED',
        message: 'Al Beruniy Med API is running',
        database: dbState
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: true, message: 'API resursi topilmadi' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server Xatoligi:', err);
    res.status(err.status || 500).json({
        error: true,
        message: err.message || 'Server ichki xatoligi'
    });
});

mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
})
    .then(async () => {
        console.log('✅ MongoDB connected successfully');
        try {
            const User = require('./models/User');
            await User.createDefaultAdmin();
        } catch (e) {
            console.error('Error creating default admin:', e);
        }
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
