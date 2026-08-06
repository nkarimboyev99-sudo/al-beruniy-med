const toMoneyNumber = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const normalized = String(value)
        .trim()
        .replace(/\s+/g, '')
        .replace(/,/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
};

const clampDiscountPercent = (value) => {
    const percent = toMoneyNumber(value);
    return Math.min(100, Math.max(0, percent));
};

const getDiagnosisSubtotal = (diagnosis) => {
    const prices = Array.isArray(diagnosis?.diagnosisPrices) ? diagnosis.diagnosisPrices : [];
    return prices.reduce((sum, item) => sum + toMoneyNumber(item?.price), 0);
};

const getDiagnosisDiscountAmount = (diagnosis, subtotal = getDiagnosisSubtotal(diagnosis)) => {
    const percent = clampDiscountPercent(diagnosis?.discountPercent);
    if (percent > 0) return Math.round(subtotal * percent / 100);

    const discount = toMoneyNumber(diagnosis?.discount);
    return Math.min(subtotal, Math.max(0, Math.round(discount)));
};

const getDiagnosisPaymentAmount = (diagnosis) => {
    // Agar DB da saqlangan totalAmount bo'lsa (frontend dorilarni qo'shib hisoblagan), shuni qaytaramiz
    const savedAmount = toMoneyNumber(diagnosis?.totalAmount);
    if (savedAmount > 0) return savedAmount;

    // Aks holda faqat analizlar narxidan hisoblaymiz
    const subtotal = getDiagnosisSubtotal(diagnosis);
    const discount = getDiagnosisDiscountAmount(diagnosis, subtotal);

    if (subtotal > 0) {
        return Math.max(0, subtotal - discount);
    }

    return 0;
};

const normalizeDiagnosisPaymentSnapshot = (diagnosis = {}) => {
    const subtotal = getDiagnosisSubtotal(diagnosis);
    const discountPercent = clampDiscountPercent(diagnosis?.discountPercent);
    
    // Agar oldindan to'g'ri hisoblangan discount bo'lsa (masalan dorilar bilan), uni buzmaymiz
    let discount = diagnosis?.discount;
    if (discount === undefined || discount === null) {
        discount = getDiagnosisDiscountAmount(diagnosis, subtotal);
    }
    
    const totalAmount = getDiagnosisPaymentAmount({
        ...diagnosis,
        discountPercent,
        discount
    });

    return {
        ...diagnosis,
        discountPercent,
        discount,
        totalAmount
    };
};

module.exports = {
    toMoneyNumber,
    clampDiscountPercent,
    getDiagnosisSubtotal,
    getDiagnosisDiscountAmount,
    getDiagnosisPaymentAmount,
    normalizeDiagnosisPaymentSnapshot
};
