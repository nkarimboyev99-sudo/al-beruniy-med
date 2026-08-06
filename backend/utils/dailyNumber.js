const Patient = require('../models/Patient');
const PatientDiagnosis = require('../models/PatientDiagnosis');

async function getNextDailyNumber() {
    const latestPatient = await Patient.findOne({
        dailyNumber: { $exists: true, $ne: null }
    }).sort({ dailyNumber: -1 }).select('dailyNumber').lean();

    const latestDiag = await PatientDiagnosis.findOne({
        dailyNumber: { $exists: true, $ne: null }
    }).sort({ dailyNumber: -1 }).select('dailyNumber').lean();

    const maxPatientNum = (latestPatient && typeof latestPatient.dailyNumber === 'number') ? latestPatient.dailyNumber : 0;
    const maxDiagNum = (latestDiag && typeof latestDiag.dailyNumber === 'number') ? latestDiag.dailyNumber : 0;

    return Math.max(maxPatientNum, maxDiagNum) + 1;
}

async function backfillTodayDailyNumbers() {
    try {
        // Backfill Patient collection
        const unnumberedPatients = await Patient.find({
            $or: [
                { dailyNumber: { $exists: false } },
                { dailyNumber: null },
                { dailyNumber: { $lte: 0 } }
            ]
        }).sort({ createdAt: 1 });

        let nextNum = await getNextDailyNumber();
        for (const p of unnumberedPatients) {
            p.dailyNumber = nextNum++;
            await p.save();
        }

        // Backfill PatientDiagnosis collection
        const unnumberedDiagnoses = await PatientDiagnosis.find({
            $or: [
                { dailyNumber: { $exists: false } },
                { dailyNumber: null },
                { dailyNumber: { $lte: 0 } }
            ]
        }).sort({ createdAt: 1 }).populate('patient');

        for (const diag of unnumberedDiagnoses) {
            if (diag.patient && typeof diag.patient.dailyNumber === 'number' && diag.patient.dailyNumber > 0) {
                diag.dailyNumber = diag.patient.dailyNumber;
            } else if (!diag.dailyNumber || diag.dailyNumber <= 0) {
                diag.dailyNumber = nextNum++;
            }
            await diag.save();
        }
    } catch (err) {
        console.error('Error backfilling dailyNumbers:', err);
    }
}

module.exports = {
    getNextDailyNumber,
    backfillTodayDailyNumbers
};
