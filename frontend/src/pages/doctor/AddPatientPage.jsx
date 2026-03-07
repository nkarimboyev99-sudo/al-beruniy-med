import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    UserPlus, ArrowLeft, Save, Check, AlertCircle,
    User, Phone, Calendar, FileText, ChevronRight,
    Stethoscope, Search
} from 'lucide-react'
import './AddPatientPage.css'

function AddPatientPage() {
    const navigate = useNavigate()
    const basePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/doctor'

    const [formData, setFormData] = useState({
        fullName: '', birthDate: '', gender: 'male',
        phone: '+998', passportNumber: ''
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Autocomplete
    const [suggestions, setSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [searchLoading, setSearchLoading] = useState(false)
    const debounceRef = useRef(null)

    const handlePhoneChange = (value) => {
        // Always keep +998 prefix
        if (!value.startsWith('+998')) value = '+998'
        // Extract only digits after +998
        const digits = value.slice(4).replace(/\D/g, '').slice(0, 9)
        // Format: +998-XX-XXX-XX-XX
        let formatted = '+998'
        if (digits.length > 0) formatted += '-' + digits.slice(0, 2)
        if (digits.length > 2) formatted += '-' + digits.slice(2, 5)
        if (digits.length > 5) formatted += '-' + digits.slice(5, 7)
        if (digits.length > 7) formatted += '-' + digits.slice(7, 9)
        setFormData(prev => ({ ...prev, phone: formatted }))
    }

    const handlePassportChange = (value) => {
        // First 2 chars: Latin letters only, uppercase
        const letters = value.slice(0, 2).replace(/[^a-zA-Z]/g, '').toUpperCase()
        // Next 7 chars: digits only
        const numbers = value.slice(2).replace(/\D/g, '').slice(0, 7)
        setFormData(prev => ({ ...prev, passportNumber: letters + numbers }))
    }

    const searchPatients = async (query) => {
        if (!query || query.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
        setSearchLoading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/patients/search/autocomplete?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setSuggestions(data)
                setShowSuggestions(data.length > 0)
            }
        } catch { setSuggestions([]); setShowSuggestions(false) }
        finally { setSearchLoading(false) }
    }

    const handleNameChange = (value) => {
        setFormData(prev => ({ ...prev, fullName: value }))
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => searchPatients(value), 300)
    }

    const handleSelectExisting = (patient) => {
        setSuggestions([])
        setShowSuggestions(false)
        navigate(`${basePath}/patients/diagnosis/${patient._id}`)
    }

    const calculateAge = (birthDate) => {
        if (!birthDate) return null
        const today = new Date()
        const birth = new Date(birthDate)
        let age = today.getFullYear() - birth.getFullYear()
        const m = today.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
        return age
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.fullName.trim()) { setError("Ism familiya kiritilishi shart"); return }
        if (!formData.birthDate) { setError("Tug'ilgan sana kiritilishi shart"); return }
        if (formData.phone.length < 17) { setError("Telefon raqami to'liq kiritilishi shart"); return }
        setSaving(true); setError('')

        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (res.ok) {
                setSuccess("Bemor qo'shildi! Analizga o'tilmoqda...")
                setTimeout(() => navigate(`${basePath}/patients/diagnosis/${data._id}`), 1000)
            } else {
                setError(data.message || 'Xatolik yuz berdi')
            }
        } catch {
            setError("Server bilan aloqa yo'q")
        } finally {
            setSaving(false)
        }
    }

    const age = calculateAge(formData.birthDate)
    const fields = [
        { icon: User, label: 'F.I.O', filled: !!formData.fullName },
        { icon: Calendar, label: 'Tug\'ilgan sana', filled: !!formData.birthDate },
        { icon: Phone, label: 'Telefon', filled: formData.phone.length > 4 },
        { icon: FileText, label: 'Passport', filled: !!formData.passportNumber },
    ]
    const filledCount = fields.filter(f => f.filled).length

    return (
        <div className="ap-page">
            {/* Header */}
            <div className="ap-header">
                <button className="ap-back-btn" onClick={() => navigate(`${basePath}/patients`)}>
                    <ArrowLeft size={20} />
                    Orqaga
                </button>
                <div className="ap-header-title">
                    <UserPlus size={22} />
                    <h1>Yangi bemor qo'shish</h1>
                </div>
                <div></div>
            </div>

            <div className="ap-body">
                {/* Sidebar */}
                <aside className="ap-sidebar">
                    {/* Preview card */}
                    <div className="ap-preview-card">
                        <div className="ap-preview-avatar">
                            {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : <User size={28} />}
                        </div>
                        <div className="ap-preview-name">
                            {formData.fullName || <span className="ap-placeholder">Ism familiya</span>}
                        </div>
                        <div className="ap-preview-meta">
                            {age !== null && <span>{age} yosh</span>}
                            {formData.gender && (
                                <span className={`ap-gender-badge ${formData.gender}`}>
                                    {formData.gender === 'male' ? 'Erkak' : 'Ayol'}
                                </span>
                            )}
                        </div>
                        {formData.phone && (
                            <div className="ap-preview-detail">
                                <Phone size={14} />
                                <span>{formData.phone}</span>
                            </div>
                        )}
                    </div>

                    {/* Fill progress */}
                    <div className="ap-progress-card">
                        <div className="ap-progress-header">
                            <span>Maydonlar</span>
                            <span>{filledCount}/{fields.length}</span>
                        </div>
                        <div className="ap-progress-bar">
                            <div className="ap-progress-fill" style={{ width: `${(filledCount / fields.length) * 100}%` }}></div>
                        </div>
                        <div className="ap-field-list">
                            {fields.map(({ icon: Icon, label, filled }) => (
                                <div key={label} className={`ap-field-item ${filled ? 'filled' : ''}`}>
                                    <Icon size={14} />
                                    <span>{label}</span>
                                    {filled && <Check size={13} className="ap-check" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Next step hint */}
                    <div className="ap-next-hint">
                        <Stethoscope size={16} />
                        <span>Saqlangandan so'ng analiz qo'shish sahifasiga o'tiladi</span>
                    </div>
                </aside>

                {/* Main form */}
                <main className="ap-main">
                    {error && (
                        <div className="ap-alert error">
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}
                    {success && (
                        <div className="ap-alert success">
                            <Check size={18} /> {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="ap-form">
                        <div className="ap-section">
                            <h2 className="ap-section-title">
                                <User size={18} />
                                Shaxsiy ma'lumotlar
                            </h2>

                            {/* Full name with autocomplete */}
                            <div className="ap-field">
                                <label>F.I.O <span className="required">*</span></label>
                                <div className="ap-autocomplete">
                                    <div className="ap-input-wrap">
                                        <User size={17} className="ap-field-icon" />
                                        <input
                                            type="text"
                                            placeholder="To'liq ism familiyani kiriting"
                                            value={formData.fullName}
                                            onChange={e => handleNameChange(e.target.value)}
                                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            autoComplete="off"
                                            required
                                        />
                                        {searchLoading && <div className="ap-spin"></div>}
                                    </div>
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className="ap-suggestions">
                                            <div className="ap-suggestions-label">
                                                <Search size={13} /> Mavjud bemorlar — bosib analiz qo'shing
                                            </div>
                                            {suggestions.map(p => (
                                                <div key={p._id} className="ap-suggestion-item" onMouseDown={() => handleSelectExisting(p)}>
                                                    <div className="ap-sug-avatar">{p.fullName.charAt(0)}</div>
                                                    <div className="ap-sug-details">
                                                        <div className="ap-sug-name">{p.fullName}</div>
                                                        <div className="ap-sug-info">
                                                            {p.phone || "Telefon yo'q"}
                                                            {p.birthDate && ` • ${new Date(p.birthDate).toLocaleDateString('uz-UZ')}`}
                                                        </div>
                                                    </div>
                                                    <div className="ap-sug-action">
                                                        <span>Analiz qo'shish</span>
                                                        <ChevronRight size={15} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p className="ap-hint">Mavjud bemor topilsa, uning sahifasiga o'tiladi</p>
                            </div>

                            <div className="ap-row">
                                <div className="ap-field">
                                    <label>Tug'ilgan sana <span className="required">*</span></label>
                                    <div className="ap-input-wrap">
                                        <Calendar size={17} className="ap-field-icon" />
                                        <input
                                            type="date"
                                            value={formData.birthDate}
                                            min="1900-01-01"
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={e => setFormData(p => ({ ...p, birthDate: e.target.value }))}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="ap-field">
                                    <label>Jinsi</label>
                                    <div className="ap-gender-select">
                                        <label className={`ap-gender-opt ${formData.gender === 'male' ? 'active' : ''}`}>
                                            <input type="radio" name="gender" value="male" checked={formData.gender === 'male'} onChange={() => setFormData(p => ({ ...p, gender: 'male' }))} />
                                            Erkak
                                        </label>
                                        <label className={`ap-gender-opt ${formData.gender === 'female' ? 'active' : ''}`}>
                                            <input type="radio" name="gender" value="female" checked={formData.gender === 'female'} onChange={() => setFormData(p => ({ ...p, gender: 'female' }))} />
                                            Ayol
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="ap-section">
                            <h2 className="ap-section-title">
                                <Phone size={18} />
                                Aloqa ma'lumotlari
                            </h2>

                            <div className="ap-row">
                                <div className="ap-field">
                                    <label>Telefon raqami <span className="required">*</span></label>
                                    <div className="ap-input-wrap">
                                        <Phone size={17} className="ap-field-icon" />
                                        <input
                                            type="text"
                                            placeholder="+998-90-123-45-67"
                                            value={formData.phone}
                                            onChange={e => handlePhoneChange(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="ap-field">
                                    <label>Passport raqami</label>
                                    <div className="ap-input-wrap">
                                        <FileText size={17} className="ap-field-icon" />
                                        <input
                                            type="text"
                                            placeholder="AA1234567"
                                            value={formData.passportNumber}
                                            onChange={e => handlePassportChange(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className="ap-actions">
                            <button type="button" className="ap-btn secondary" onClick={() => navigate(`${basePath}/patients`)}>
                                Bekor qilish
                            </button>
                            <button type="submit" className="ap-btn primary" disabled={saving || !!success}>
                                {saving ? (
                                    <><span className="ap-spin-sm"></span> Saqlanmoqda...</>
                                ) : success ? (
                                    <><Check size={18} /> Saqlandi!</>
                                ) : (
                                    <><Save size={18} /> Saqlash va analizga o'tish</>
                                )}
                            </button>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    )
}

export default AddPatientPage
