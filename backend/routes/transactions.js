const express = require('express');
const Transaction = require('../models/Transaction');
const { auth, adminOnly, doctorOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all transactions
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const { startDate, endDate, type, category } = req.query;
        const filter = {};

        if (type) filter.type = type;
        if (category) filter.category = category;

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        const transactions = await Transaction.find(filter)
            .populate('patient', 'fullName')
            .populate('medicine', 'name')
            .populate('createdBy', 'fullName')
            .sort({ date: -1 });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get summary statistics
router.get('/summary', auth, adminOnly, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const filter = {};

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        const transactions = await Transaction.find(filter);

        const summary = {
            totalIncome: 0,
            totalExpense: 0,
            netProfit: 0,
            byCategory: {}
        };

        transactions.forEach(t => {
            if (t.type === 'income') {
                summary.totalIncome += t.amount;
            } else {
                summary.totalExpense += t.amount;
            }

            if (!summary.byCategory[t.category]) {
                summary.byCategory[t.category] = { income: 0, expense: 0 };
            }
            summary.byCategory[t.category][t.type] += t.amount;
        });

        summary.netProfit = summary.totalIncome - summary.totalExpense;

        res.json(summary);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Get daily summary for chart
router.get('/daily', auth, adminOnly, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const transactions = await Transaction.aggregate([
            {
                $match: {
                    date: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                        type: '$type'
                    },
                    total: { $sum: '$amount' }
                }
            },
            {
                $sort: { '_id.date': 1 }
            }
        ]);

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Create transaction
router.post('/', auth, doctorOrAdmin, async (req, res) => {
    try {
        const { type, category, amount, description, patient, medicine, quantity, paymentMethod, date } = req.body;

        const transaction = await Transaction.create({
            type,
            category,
            amount,
            description,
            patient,
            medicine,
            quantity,
            paymentMethod,
            date: date || new Date(),
            createdBy: req.user._id
        });

        const populated = await Transaction.findById(transaction._id)
            .populate('patient', 'fullName')
            .populate('medicine', 'name')
            .populate('createdBy', 'fullName');

        res.status(201).json(populated);
    } catch (error) {
        console.error('Transaction error:', error);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Update transaction
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        )
            .populate('patient', 'fullName')
            .populate('medicine', 'name');

        if (!transaction) {
            return res.status(404).json({ message: 'Tranzaksiya topilmadi' });
        }

        res.json(transaction);
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Delete transaction
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndDelete(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: 'Tranzaksiya topilmadi' });
        }

        res.json({ message: 'Tranzaksiya o\'chirildi' });
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

module.exports = router;
