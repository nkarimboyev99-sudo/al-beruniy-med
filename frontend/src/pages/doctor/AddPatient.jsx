import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    UserPlus,
    User,
    Phone,
    MapPin,
    Calendar,
    Droplet,
    Check,
    AlertCircle
} from 'lucide-react'
import './DoctorPages.css'

function AddPatient() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [formData, setFormData] = useState({
        fullName: '',
        age: '',
        gender: 'male',
        phone: '',
        address: '',
        bloodType: '',
        notes: ''
    })

    // Autocomplete states
    const [suggestions, setSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [searchLoading, setSearchLoading] = useState(false)
    const debounceRef = useRef(null)

    // Search patients when fullName changes
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        if (formData.fullName.length < 2) {
            setSuggestions([])
            setShowSuggestions(false)
            return
        }

        debounceRef.current = setTimeout(async () => {
            setSearchLoading(true)
            try {
                const token = localStorage.getItem('token')
                const response = await fetch(`/api/patients/search/autocomplete?q=${encodeURIComponent(formData.fullName)}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                const data = await response.json()
                setSuggestions(data)
                setShowSuggestions(data.length > 0)
            } catch (err) {
                console.error('Search error:', err)
            } finally {
                setSearchLoading(false)
            }
        }, 300)

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
            }
        }
    }, [formData.fullName])

    // Handle selecting a patient from suggestions
    const handleSelectPatient = async (patient) => {
        // Oldingi bemor tanlanganda to'g'ridan-to'g'ri analiz sahifasiga o'tish
        navigate(`/doctor/diagnosis?patient=${patient._id}`)
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/patients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    age: parseInt(formData.age)
                })
            })

            const data = await response.json()

            if (response.ok) {
                // Bemor saqlandi - to'g'ridan-to'g'ri analiz sahifasiga o'tish
                setSuccess(true)
                setTimeout(() => {
                    navigate(`/doctor/diagnosis?patient=${data._id}`)
                }, 1000)
            } else {
                setError(data.message || 'Xatolik yuz berdi')
            }
        } catch (err) {
            setError('Server bilan aloqa yo\'q')
        } finally {
            setLoading(false)
        }
    }

    // Create and print queue ticket for a patient
    const createAndPrintQueueTicket = async (patientId, patientData) => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/queue-tickets/${patientId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                printQueueTicket(data.ticket, patientData)
            }
        } catch (error) {
            console.error('Queue ticket error:', error)
        }
    }

    // Print queue ticket receipt
    const printQueueTicket = (ticket, patientData) => {
        const now = new Date(ticket.arrivalTime)
        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Navbat chiptasi - ${ticket.queueNumber}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Courier New', monospace;
                        padding: 5mm;
                        max-width: 80mm;
                        margin: 0 auto;
                    }
                    .ticket {
                        border: 2px solid #000;
                        padding: 10px;
                        text-align: center;
                    }
                    .ticket-header {
                        border-bottom: 2px dashed #000;
                        padding-bottom: 10px;
                        margin-bottom: 10px;
                    }
                    .ticket-header h1 {
                        font-size: 14px;
                        margin-bottom: 5px;
                    }
                    .ticket-header p {
                        font-size: 10px;
                        color: #555;
                    }
                    .queue-number {
                        font-size: 48px;
                        font-weight: bold;
                        color: #000;
                        margin: 15px 0;
                        line-height: 1;
                    }
                    .queue-label {
                        font-size: 12px;
                        color: #555;
                        margin-bottom: 5px;
                    }
                    .ticket-info {
                        text-align: left;
                        border-top: 1px dashed #000;
                        padding-top: 10px;
                        margin-top: 10px;
                        font-size: 11px;
                    }
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 5px;
                    }
                    .info-label {
                        color: #555;
                    }
                    .patient-name {
                        font-weight: bold;
                        font-size: 12px;
                        margin: 10px 0;
                        text-align: center;
                    }
                    .ticket-footer {
                        border-top: 1px dashed #000;
                        padding-top: 10px;
                        margin-top: 10px;
                        font-size: 10px;
                        color: #555;
                    }
                    @media print { 
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="ticket">
                    <div class="ticket-header">
                        <h1>TIBBIYOT MARKAZI</h1>
                        <p>NAVBAT CHIPTASI</p>
                    </div>
                    
                    <div class="queue-label">SIZNING NAVBATINGIZ</div>
                    <div class="queue-number">#${String(ticket.queueNumber).padStart(3, '0')}</div>
                    
                    <div class="patient-name">${patientData?.fullName || ticket.patientName}</div>
                    
                    <div class="ticket-info">
                        <div class="info-row">
                            <span class="info-label">Sana:</span>
                            <span>${now.toLocaleDateString('uz-UZ')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Vaqt:</span>
                            <span>${now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Telefon:</span>
                            <span>${patientData?.phone || ticket.phone || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Jinsi:</span>
                            <span>${(patientData?.gender || ticket.gender) === 'male' ? 'Erkak' : 'Ayol'}</span>
                        </div>
                    </div>
                    
                    <div class="ticket-footer">
                        <p>Iltimos, navbatingizni kuting</p>
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

    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

    return (
        <div className="add-patient-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>Yangi bemor qo'shish</h1>
                    <p>Bemor ma'lumotlarini kiriting</p>
                </div>
            </div>

            {/* Form */}
            <div className="form-container glass-card">
                {success ? (
                    <div className="success-state">
                        <div className="success-icon">
                            <Check size={48} />
                        </div>
                        <h2>Bemor muvaffaqiyatli qo'shildi!</h2>
                        <p>Bemorlar ro'yxatiga yo'naltirilmoqdasiz...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="alert error">
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        )}

                        <div className="form-section">
                            <h3>Shaxsiy ma'lumotlar</h3>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        <User size={16} />
                                        To'liq ismi *
                                    </label>
                                    <div className="autocomplete-container">
                                        <input
                                            type="text"
                                            name="fullName"
                                            className="form-input"
                                            placeholder="Familiya Ism Otasining ismi"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            autoComplete="off"
                                            required
                                        />
                                        {searchLoading && (
                                            <div className="autocomplete-loading">
                                                <div className="spinner small"></div>
                                            </div>
                                        )}
                                        {showSuggestions && suggestions.length > 0 && (
                                            <div className="autocomplete-dropdown">
                                                <div className="autocomplete-header">
                                                    Mavjud bemorlar
                                                </div>
                                                {suggestions.map((patient) => (
                                                    <div key={patient._id} className="autocomplete-item" onMouseDown={() => handleSelectPatient(patient)}>
                                                        <div className="autocomplete-item-name">{patient.fullName}</div>
                                                        <div className="autocomplete-item-info">
                                                            {patient.phone || "Telefon yo'q"}
                                                            {patient.birthDate && ` • ${new Date(patient.birthDate).getFullYear()} yil`}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label className="form-label">
                                        <Calendar size={16} />
                                        Yoshi *
                                    </label>
                                    <input
                                        type="number"
                                        name="age"
                                        className="form-input"
                                        placeholder="25"
                                        min="0"
                                        max="150"
                                        value={formData.age}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Jinsi *</label>
                                    <div className="gender-select">
                                        <button
                                            type="button"
                                            className={`gender-btn ${formData.gender === 'male' ? 'active' : ''}`}
                                            onClick={() => setFormData(prev => ({ ...prev, gender: 'male' }))}
                                        >
                                            Erkak
                                        </button>
                                        <button
                                            type="button"
                                            className={`gender-btn ${formData.gender === 'female' ? 'active' : ''}`}
                                            onClick={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
                                        >
                                            Ayol
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Aloqa ma'lumotlari</h3>

                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label className="form-label">
                                        <Phone size={16} />
                                        Telefon raqami
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        className="form-input"
                                        placeholder="+998 90 123 45 67"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        <Droplet size={16} />
                                        Qon guruhi
                                    </label>
                                    <select
                                        name="bloodType"
                                        className="form-input"
                                        value={formData.bloodType}
                                        onChange={handleChange}
                                    >
                                        <option value="">Tanlang</option>
                                        {bloodTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    <MapPin size={16} />
                                    Manzil
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    className="form-input"
                                    placeholder="Toshkent, Chilonzor tumani..."
                                    value={formData.address}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Qo'shimcha ma'lumot</h3>

                            <div className="form-group">
                                <label className="form-label">Eslatmalar</label>
                                <textarea
                                    name="notes"
                                    className="form-input"
                                    placeholder="Bemor haqida qo'shimcha ma'lumotlar..."
                                    rows="3"
                                    value={formData.notes}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => navigate('/doctor/patients')}
                            >
                                Bekor qilish
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <div className="spinner small"></div>
                                        Saqlanmoqda...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={20} />
                                        Bemor qo'shish
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

export default AddPatient
