const express = require('express');
const QueueTicket = require('../models/QueueTicket');
const Patient = require('../models/Patient');
const { auth, doctorOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get today's queue tickets
router.get('/today', auth, doctorOrAdmin, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        const tickets = await QueueTicket.find({ date: today })
            .populate('patient', 'fullName phone')
            .sort({ queueNumber: 1 });

        res.json(tickets);
    } catch (error) {
        console.error('Get queue tickets error:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Create queue ticket for a patient
router.post('/:patientId', auth, doctorOrAdmin, async (req, res) => {
    try {
        const { patientId } = req.params;
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        // Get the patient
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: 'Bemor topilmadi' });
        }

        // Check if patient already has a ticket today
        const existingTicket = await QueueTicket.findOne({
            patient: patientId,
            date: today
        });

        if (existingTicket) {
            // Return existing ticket
            return res.json({
                ticket: existingTicket,
                isNew: false,
                message: 'Bemor bugun allaqachon navbat olgan'
            });
        }

        // Get the next queue number for today
        const lastTicket = await QueueTicket.findOne({ date: today })
            .sort({ queueNumber: -1 });

        const queueNumber = lastTicket ? lastTicket.queueNumber + 1 : 1;

        // Create new ticket
        const ticket = await QueueTicket.create({
            patient: patientId,
            patientName: patient.fullName,
            phone: patient.phone || '',
            gender: patient.gender || 'male',
            queueNumber,
            date: today,
            arrivalTime: new Date(),
            createdBy: req.user._id
        });

        res.status(201).json({
            ticket,
            isNew: true,
            message: 'Navbat chiptasi yaratildi'
        });
    } catch (error) {
        console.error('Create queue ticket error:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get queue statistics for today
router.get('/stats', auth, doctorOrAdmin, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const totalTickets = await QueueTicket.countDocuments({ date: today });
        const lastTicket = await QueueTicket.findOne({ date: today })
            .sort({ queueNumber: -1 });

        res.json({
            totalPatients: totalTickets,
            lastQueueNumber: lastTicket ? lastTicket.queueNumber : 0,
            date: today
        });
    } catch (error) {
        console.error('Get queue stats error:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

module.exports = router;
