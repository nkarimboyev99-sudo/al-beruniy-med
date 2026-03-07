import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    Stethoscope,
    Search,
    User,
    Check,
    Pill,
    X,
    AlertCircle,
    Printer,
    FileText,
    Calendar,
    Phone,
    MapPin,
    Clock
} from 'lucide-react'
import './DoctorPages.css'

function DiagnosisPage() {
    const [searchParams] = useSearchParams()
    const patientIdFromUrl = searchParams.get('patient')
    const receiptRef = useRef(null)

    const [patients, setPatients] = useState([])
    const [diagnoses, setDiagnoses] = useState([])
    const [medicines, setMedicines] = useState([])
    const [inventory, setInventory] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [showDiagnosisModal, setShowDiagnosisModal] = useState(false)
    const [showReceiptModal, setShowReceiptModal] = useState(false)
    const [receiptData, setReceiptData] = useState(null)
    const [queueNumber, setQueueNumber] = useState(1)
    const [formData, setFormData] = useState({
        selectedDiagnoses: [], // [{id, name, price}]
        medicines: [],
        notes: ''
    })
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')
    const [user, setUser] = useState(null)

    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (userData) {
            setUser(JSON.parse(userData))
        }
        fetchData()
    }, [])

    useEffect(() => {
        if (patientIdFromUrl && patients.length > 0) {
            const patient = patients.find(p => p._id === patientIdFromUrl)
            if (patient) {
                setSelectedPatient(patient)
                setShowDiagnosisModal(true)
            }
        }
    }, [patientIdFromUrl, patients])

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token')

            const [patientsRes, diagnosesRes, medicinesRes, inventoryRes] = await Promise.all([
                fetch('/api/patients', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/diagnoses', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/medicines', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/inventory', { headers: { 'Authorization': `Bearer ${token}` } })
            ])

            if (patientsRes.ok) {
                const data = await patientsRes.json()
                setPatients(data)
            }
            if (diagnosesRes.ok) {
                const data = await diagnosesRes.json()
                setDiagnoses(data)
            }
            if (medicinesRes.ok) {
                const data = await medicinesRes.json()
                setMedicines(data)
            }
            if (inventoryRes.ok) {
                const data = await inventoryRes.json()
                setInventory(data)
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!selectedPatient || formData.selectedDiagnoses.length === 0) {
            setError('Bemor va kamida bitta analizni tanlang')
            return
        }

        try {
            const token = localStorage.getItem('token')
            // Birinchi analizni saqlash (backend uchun)
            const response = await fetch(`/api/patients/${selectedPatient._id}/diagnosis`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    diagnosis: formData.selectedDiagnoses[0]?.id,
                    medicines: formData.medicines,
                    notes: formData.notes
                })
            })

            if (response.ok) {
                // Navbat raqamini oshirish
                const newQueueNumber = queueNumber
                setQueueNumber(prev => prev + 1)

                // Receipt data tayyorlash
                const selectedMedicines = medicines.filter(m => formData.medicines.includes(m._id))

                setReceiptData({
                    queueNumber: newQueueNumber,
                    patient: selectedPatient,
                    diagnoses: formData.selectedDiagnoses, // Ko'p analiz + narxlar
                    medicines: selectedMedicines,
                    notes: formData.notes,
                    doctor: user,
                    date: new Date()
                })

                setSuccess('Analiz muvaffaqiyatli belgilandi!')
                fetchData()

                setTimeout(() => {
                    setShowDiagnosisModal(false)
                    setShowReceiptModal(true)
                    setFormData({ selectedDiagnoses: [], medicines: [], notes: '' })
                    setSelectedPatient(null)
                    setSuccess('')
                }, 1000)
            } else {
                const data = await response.json()
                setError(data.message || 'Xatolik yuz berdi')
            }
        } catch (err) {
            setError('Server bilan aloqa yo\'q')
        }
    }

    // Analiz tanlash/olib tashlash
    const toggleDiagnosis = (diagId, diagName) => {
        setFormData(prev => {
            const exists = prev.selectedDiagnoses.find(d => d.id === diagId)
            if (exists) {
                return {
                    ...prev,
                    selectedDiagnoses: prev.selectedDiagnoses.filter(d => d.id !== diagId)
                }
            } else {
                return {
                    ...prev,
                    selectedDiagnoses: [...prev.selectedDiagnoses, { id: diagId, name: diagName, price: 0 }]
                }
            }
        })
    }

    // Analiz narxini o'zgartirish
    const updateDiagnosisPrice = (diagId, price) => {
        setFormData(prev => ({
            ...prev,
            selectedDiagnoses: prev.selectedDiagnoses.map(d =>
                d.id === diagId ? { ...d, price: parseInt(price) || 0 } : d
            )
        }))
    }

    const toggleMedicine = (medId) => {
        setFormData(prev => ({
            ...prev,
            medicines: prev.medicines.includes(medId)
                ? prev.medicines.filter(id => id !== medId)
                : [...prev.medicines, medId]
        }))
    }

    // Dori narxini inventorydan olish
    const getMedicinePrice = (medicineId) => {
        const invItem = inventory.find(i => i.medicine?._id === medicineId)
        return invItem?.sellPrice || 0
    }

    // Kichik chek (thermal printer) chop etish
    const handlePrint = () => {
        if (!receiptData) return

        const now = receiptData.date
        const selectedDiagnoses = receiptData.diagnoses || []
        const medicines = receiptData.medicines || []

        // Kategoriyalar narxi
        let diagnosesTotal = selectedDiagnoses.reduce((sum, d) => sum + (d.price || 0), 0)

        // Dorilar narxi
        let medicinesTotal = 0
        const medicinesWithPrices = medicines.map(med => {
            const price = getMedicinePrice(med._id)
            medicinesTotal += price
            return { ...med, price }
        })

        const grandTotal = diagnosesTotal + medicinesTotal

        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Analiz cheki #${receiptData.queueNumber}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Courier New', monospace;
                        padding: 5mm;
                        max-width: 80mm;
                        margin: 0 auto;
                        font-size: 12px;
                    }
                    .receipt { border: 1px dashed #000; padding: 10px; }
                    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
                    .header h1 { font-size: 14px; }
                    .header p { font-size: 10px; color: #555; }
                    .queue-number { font-size: 48px; font-weight: bold; text-align: center; margin: 10px 0; }
                    .patient-name { text-align: center; font-weight: bold; margin-bottom: 10px; font-size: 14px; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
                    .section { border-top: 1px dashed #000; padding-top: 8px; margin-top: 8px; }
                    .section-title { font-weight: bold; font-size: 12px; margin-bottom: 5px; text-transform: uppercase; }
                    .item { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
                    .subtotal { border-top: 1px dotted #000; margin-top: 5px; padding-top: 5px; font-size: 11px; }
                    .total { border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; }
                    .footer { text-align: center; margin-top: 10px; font-size: 10px; color: #555; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="header">
                        <h1>TIBBIYOT MARKAZI</h1>
                        <p>ANALIZ CHEKI</p>
                    </div>
                    
                    <div class="queue-number">#${String(receiptData.queueNumber).padStart(3, '0')}</div>
                    <div class="patient-name">${receiptData.patient?.fullName || ''}</div>
                    
                    <div class="info-row">
                        <span>Sana:</span>
                        <span>${new Date(now).toLocaleDateString('uz-UZ')}</span>
                    </div>
                    <div class="info-row">
                        <span>Vaqt:</span>
                        <span>${new Date(now).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    
                    ${selectedDiagnoses.length > 0 ? `
                    <div class="section">
                        <div class="section-title">YO'NALISHLAR:</div>
                        ${selectedDiagnoses.map(d => `
                            <div class="item">
                                <span>${d.name}</span>
                                <span>${(d.price || 0).toLocaleString()} so'm</span>
                            </div>
                        `).join('')}
                        <div class="subtotal">
                            <div class="item">
                                <span>Jami yo'nalishlar:</span>
                                <span>${diagnosesTotal.toLocaleString()} so'm</span>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${medicinesWithPrices.length > 0 ? `
                    <div class="section">
                        <div class="section-title">DORILAR:</div>
                        ${medicinesWithPrices.map(med => `
                            <div class="item">
                                <span>${med.name}</span>
                                <span>${med.price.toLocaleString()} so'm</span>
                            </div>
                        `).join('')}
                        <div class="subtotal">
                            <div class="item">
                                <span>Jami dorilar:</span>
                                <span>${medicinesTotal.toLocaleString()} so'm</span>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="total">
                        <span>UMUMIY SUMMA:</span>
                        <span>${grandTotal.toLocaleString()} so'm</span>
                    </div>
                    
                    <div class="footer">
                        <p>Shifokor: ${receiptData.doctor?.fullName || ''}</p>
                        <p>Sog'lom bo'ling!</p>
                    </div>
                </div>
            </body>
            </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
            printWindow.print()
            printWindow.close()
        }, 250)
    }

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('uz-UZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('uz-UZ', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const filteredPatients = patients.filter(p =>
        p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone?.includes(searchTerm)
    )

    const pendingPatients = filteredPatients.filter(p =>
        !p.diagnoses || p.diagnoses.length === 0
    )

    return (
        <div className="diagnosis-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>analiz qo'shish</h1>
                    <p>Bemorga analiz va dori-darmon tayinlash</p>
                </div>
            </div>

            {/* Search */}
            <div className="toolbar glass-card">
                <div className="search-input">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Bemor qidirish..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="pending-count">
                    <span className="count-badge">{pendingPatients.length}</span>
                    Analiz kutilmoqda
                </div>
            </div>

            {/* Patients Waiting for Diagnosis */}
            <div className="diagnosis-queue glass-card">
                <h3>Bemorlar</h3>

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : filteredPatients.length === 0 ? (
                    <div className="empty-state">
                        <User size={40} />
                        <p>Bemorlar topilmadi</p>
                    </div>
                ) : (
                    <div className="queue-list">
                        {filteredPatients.map(patient => (
                            <div
                                key={patient._id}
                                className={`queue-item ${patient.diagnoses && patient.diagnoses.length > 0 ? 'completed' : ''}`}
                            >
                                <div className="patient-avatar">
                                    {patient.fullName?.charAt(0) || 'B'}
                                </div>
                                <div className="queue-info">
                                    <span className="queue-name">{patient.fullName}</span>
                                    <span className="queue-meta">
                                        {patient.age} yosh • {patient.gender === 'male' ? 'Erkak' : 'Ayol'}
                                    </span>
                                </div>
                                {patient.diagnoses && patient.diagnoses.length > 0 ? (
                                    <span className="status-badge completed">
                                        <Check size={14} /> Yakunlangan
                                    </span>
                                ) : (
                                    <button
                                        className="btn btn-primary small"
                                        onClick={() => {
                                            setSelectedPatient(patient)
                                            setShowDiagnosisModal(true)
                                        }}
                                    >
                                        <Stethoscope size={16} />
                                        Analiz
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Diagnosis Modal */}
            {showDiagnosisModal && selectedPatient && (
                <div className="modal-overlay" onClick={() => setShowDiagnosisModal(false)}>
                    <div className="modal glass-card diagnosis-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>analiz qo'shish</h2>
                            <button className="modal-close" onClick={() => setShowDiagnosisModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="patient-info-bar">
                            <div className="patient-avatar">
                                {selectedPatient.fullName?.charAt(0) || 'B'}
                            </div>
                            <div>
                                <strong>{selectedPatient.fullName}</strong>
                                <p>{selectedPatient.age} yosh • {selectedPatient.gender === 'male' ? 'Erkak' : 'Ayol'}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-form">
                            {error && <div className="alert error"><AlertCircle size={18} />{error}</div>}
                            {success && <div className="alert success"><Check size={18} />{success}</div>}

                            <div className="form-group">
                                <label className="form-label">Yo'nalishlar (kategoriyalar) *</label>
                                <div className="diagnoses-grid" style={{ display: 'grid', gap: '8px' }}>
                                    {diagnoses.map(d => {
                                        const isSelected = formData.selectedDiagnoses.find(sd => sd.id === d._id)
                                        return (
                                            <div
                                                key={d._id}
                                                className={`diagnosis-item ${isSelected ? 'selected' : ''}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '10px',
                                                    border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent'
                                                }}
                                            >
                                                <div
                                                    onClick={() => toggleDiagnosis(d._id, d.name)}
                                                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}
                                                >
                                                    <div style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        border: '2px solid var(--primary)',
                                                        borderRadius: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: isSelected ? 'var(--primary)' : 'transparent'
                                                    }}>
                                                        {isSelected && <Check size={14} color="white" />}
                                                    </div>
                                                    <span style={{ fontWeight: isSelected ? '600' : '400' }}>{d.name}</span>
                                                    <span style={{ fontSize: '11px', color: '#888' }}>({d.category})</span>
                                                </div>
                                                {isSelected && (
                                                    <input
                                                        type="number"
                                                        placeholder="Narx"
                                                        value={isSelected.price || ''}
                                                        onChange={(e) => updateDiagnosisPrice(d._id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            width: '100px',
                                                            padding: '6px 10px',
                                                            border: '1px solid var(--border)',
                                                            borderRadius: '6px',
                                                            fontSize: '13px'
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Dorilar</label>
                                <div className="medicines-grid">
                                    {medicines.map(med => (
                                        <div
                                            key={med._id}
                                            className={`medicine-chip ${formData.medicines.includes(med._id) ? 'selected' : ''}`}
                                            onClick={() => toggleMedicine(med._id)}
                                        >
                                            <Pill size={16} />
                                            <span>{med.name}</span>
                                            {formData.medicines.includes(med._id) && <Check size={14} />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Qo'shimcha izohlar</label>
                                <textarea
                                    className="form-input"
                                    placeholder="Shifokor izohlari..."
                                    rows="3"
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDiagnosisModal(false)}>
                                    Bekor qilish
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Stethoscope size={20} />
                                    analiz qo'shish
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {showReceiptModal && receiptData && (
                <div className="modal-overlay" onClick={() => setShowReceiptModal(false)}>
                    <div className="modal receipt-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                <FileText size={24} />
                                Analiz varaqasi
                            </h2>
                            <button className="modal-close" onClick={() => setShowReceiptModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        {/* Printable Receipt */}
                        <div ref={receiptRef} className="receipt-container">
                            <div className="receipt-content">
                                {/* Receipt Header */}
                                <div className="receipt-header">
                                    <div className="receipt-logo">
                                        <Stethoscope size={40} />
                                        <div>
                                            <h1>LABORATORIYA</h1>
                                            <p>Tibbiy analiz markazi</p>
                                        </div>
                                    </div>
                                    <div className="receipt-number">
                                        <span className="label">Analiz raqami:</span>
                                        <span className="value">#{Date.now().toString().slice(-8)}</span>
                                    </div>
                                </div>

                                {/* Date & Time */}
                                <div className="receipt-datetime">
                                    <div className="datetime-item">
                                        <Calendar size={16} />
                                        <span>{formatDate(receiptData.date)}</span>
                                    </div>
                                    <div className="datetime-item">
                                        <Clock size={16} />
                                        <span>{formatTime(receiptData.date)}</span>
                                    </div>
                                </div>

                                {/* Patient Info Section */}
                                <div className="receipt-section">
                                    <h3 className="section-title">
                                        <User size={18} />
                                        Bemor ma'lumotlari
                                    </h3>
                                    <div className="info-grid">
                                        <div className="info-row">
                                            <span className="label">F.I.O:</span>
                                            <span className="value">{receiptData.patient.fullName}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="label">Yoshi:</span>
                                            <span className="value">{receiptData.patient.age} yosh</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="label">Jinsi:</span>
                                            <span className="value">{receiptData.patient.gender === 'male' ? 'Erkak' : 'Ayol'}</span>
                                        </div>
                                        {receiptData.patient.phone && (
                                            <div className="info-row">
                                                <span className="label">Telefon:</span>
                                                <span className="value">{receiptData.patient.phone}</span>
                                            </div>
                                        )}
                                        {receiptData.patient.bloodType && (
                                            <div className="info-row">
                                                <span className="label">Qon guruhi:</span>
                                                <span className="value">{receiptData.patient.bloodType}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Diagnosis Section */}
                                <div className="receipt-section diagnosis-section">
                                    <h3 className="section-title">
                                        <Stethoscope size={18} />
                                        Analiz
                                    </h3>
                                    <div className="diagnosis-box">
                                        <div className="diagnosis-name">{receiptData.diagnosis.name}</div>
                                        <div className="diagnosis-code">Kod: {receiptData.diagnosis.code}</div>
                                        {receiptData.diagnosis.description && (
                                            <div className="diagnosis-desc">{receiptData.diagnosis.description}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Medicines Section */}
                                {receiptData.medicines.length > 0 && (
                                    <div className="receipt-section">
                                        <h3 className="section-title">
                                            <Pill size={18} />
                                            Tayinlangan dorilar
                                        </h3>
                                        <table className="medicines-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Dori nomi</th>
                                                    <th>Dozasi</th>
                                                    <th>Qo'llash tartibi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {receiptData.medicines.map((med, index) => (
                                                    <tr key={med._id}>
                                                        <td>{index + 1}</td>
                                                        <td><strong>{med.name}</strong></td>
                                                        <td>{med.dosage || '-'}</td>
                                                        <td>{med.instructions || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Notes Section */}
                                {receiptData.notes && (
                                    <div className="receipt-section">
                                        <h3 className="section-title">Shifokor izohlari</h3>
                                        <div className="notes-box">
                                            {receiptData.notes}
                                        </div>
                                    </div>
                                )}

                                {/* Doctor Signature */}
                                <div className="receipt-footer">
                                    <div className="doctor-signature">
                                        <div className="signature-line"></div>
                                        <div className="doctor-info">
                                            <strong>{receiptData.doctor?.fullName || 'Shifokor'}</strong>
                                            <span>Mas'ul shifokor</span>
                                        </div>
                                    </div>
                                    <div className="stamp-area">
                                        <div className="stamp-placeholder">
                                            Muhr joyi
                                        </div>
                                    </div>
                                </div>

                                {/* Receipt Bottom */}
                                <div className="receipt-bottom">
                                    <p>Ushbu hujjat kompyuter tomonidan shakllangan va imzosiz ham kuchga ega.</p>
                                    <p>Savollar uchun: +998 XX XXX XX XX</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowReceiptModal(false)}>
                                Yopish
                            </button>
                            <button className="btn btn-primary" onClick={handlePrint}>
                                <Printer size={20} />
                                Chop etish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DiagnosisPage
