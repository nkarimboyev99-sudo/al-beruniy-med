import { useState, useEffect } from 'react'
import { UserCheck, Plus, Edit2, Trash2, X, Check, Search, Phone, Building2, Save, Eye, Calendar, Users } from 'lucide-react'
import './DataManagement.css'

const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '')
    const local = digits.startsWith('998') ? digits.slice(3) : digits
    const d = local.slice(0, 9)
    let result = '+998'
    if (d.length > 0) result += '-' + d.slice(0, 2)
    if (d.length > 2) result += '-' + d.slice(2, 5)
    if (d.length > 5) result += '-' + d.slice(5, 7)
    if (d.length > 7) result += '-' + d.slice(7, 9)
    return result
}

function ReferringDoctors() {
    const [doctors, setDoctors] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showPatientsModal, setShowPatientsModal] = useState(false)
    const [selectedDoctor, setSelectedDoctor] = useState(null)
    const [referredPatients, setReferredPatients] = useState([])
    const [patientsLoading, setPatientsLoading] = useState(false)
    const [editingDoctor, setEditingDoctor] = useState(null)
    const [deletingDoctor, setDeletingDoctor] = useState(null)
    const [formData, setFormData] = useState({ fullName: '', phone: '+998', organization: '' })
    const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => { fetchDoctors() }, [])

    const fetchDoctors = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/referring-doctors', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setDoctors(await res.json())
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const openPatients = async (doctor) => {
        setSelectedDoctor(doctor)
        setReferredPatients([])
        setDateRange({ startDate: '', endDate: '' })
        setPatientsLoading(true)
        setShowPatientsModal(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/referring-doctors/${doctor._id}/patients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setReferredPatients(await res.json())
        } catch (e) {
            console.error(e)
        } finally {
            setPatientsLoading(false)
        }
    }

    const openAdd = () => {
        setEditingDoctor(null)
        setFormData({ fullName: '', phone: '+998', organization: '' })
        setError('')
        setSuccess('')
        setShowModal(true)
    }

    const openEdit = (doctor) => {
        setEditingDoctor(doctor)
        setFormData({ fullName: doctor.fullName, phone: doctor.phone ? formatPhone(doctor.phone) : '+998', organization: doctor.organization || '' })
        setError('')
        setSuccess('')
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        try {
            const token = localStorage.getItem('token')
            const url = editingDoctor ? `/api/referring-doctors/${editingDoctor._id}` : '/api/referring-doctors'
            const method = editingDoctor ? 'PUT' : 'POST'
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (res.ok) {
                setSuccess(editingDoctor ? 'Yangilandi!' : 'Qo\'shildi!')
                fetchDoctors()
                setTimeout(() => { setShowModal(false); setSuccess('') }, 1200)
            } else {
                setError(data.message || 'Xatolik')
            }
        } catch (e) {
            setError('Server bilan aloqa yo\'q')
        }
    }

    const handleDelete = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/referring-doctors/${deletingDoctor._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                fetchDoctors()
                setShowDeleteConfirm(false)
                setDeletingDoctor(null)
            }
        } catch (e) {
            console.error(e)
        }
    }

    const calculateAge = (birthDate) => {
        if (!birthDate) return '-'
        const today = new Date(), birth = new Date(birthDate)
        let age = today.getFullYear() - birth.getFullYear()
        const m = today.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
        return age + ' yosh'
    }

    const formatMoney = (value) => `${Number(value || 0).toLocaleString()} so'm`

    const getReferralTotals = () => referredPatients.reduce((totals, patient) => ({
        today: totals.today + Number(patient.analysisTodayTotal || 0),
        week: totals.week + Number(patient.analysisWeekTotal || 0),
        month: totals.month + Number(patient.analysisMonthTotal || 0),
        all: totals.all + Number(patient.analysisTotal || 0)
    }), { today: 0, week: 0, month: 0, all: 0 })

    const filtered = doctors.filter(d =>
        d.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.phone?.includes(searchTerm)
    )

    return (
        <div className="data-management-page">
            <div className="page-header">
                <div>
                    <h1>Yo'naltirgan shifokorlar</h1>
                    <p>Bemorlarni yo'naltirgan shifokorlar ro'yxati</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>
                    <Plus size={20} />
                    Yangi shifokor
                </button>
            </div>

            <div className="toolbar glass-card">
                <div className="search-input">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Ism yoki muassasa bo'yicha qidirish..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="toolbar-info">
                    <UserCheck size={18} />
                    <span>Jami: {doctors.length} ta</span>
                </div>
            </div>

            <div className="data-table-container glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <UserCheck size={48} />
                        <h3>Shifokorlar topilmadi</h3>
                        <p>Yangi shifokor qo'shish uchun "Yangi shifokor" tugmasini bosing</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>F.I.O</th>
                                <th>Telefon</th>
                                <th>Muassasa</th>
                                <th>Holat</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((doctor, index) => (
                                <tr key={doctor._id}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar-sm doctor">
                                                {doctor.fullName?.charAt(0) || 'D'}
                                            </div>
                                            {doctor.fullName}
                                        </div>
                                    </td>
                                    <td>{doctor.phone || '-'}</td>
                                    <td>{doctor.organization || '-'}</td>
                                    <td>
                                        <span className={`status-badge ${doctor.isActive ? 'active' : 'inactive'}`}>
                                            {doctor.isActive ? 'Faol' : 'Nofaol'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="action-btn view" title="Yo'naltirgan bemorlar" onClick={() => openPatients(doctor)}>
                                                <Eye size={16} />
                                            </button>
                                            <button className="action-btn edit" title="Tahrirlash" onClick={() => openEdit(doctor)}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="action-btn delete" title="O'chirish" onClick={() => { setDeletingDoctor(doctor); setShowDeleteConfirm(true) }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Referred Patients Modal */}
            {showPatientsModal && selectedDoctor && (
                <div className="modal-overlay" onClick={() => setShowPatientsModal(false)}>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff', borderRadius: '16px', width: '90vw', maxWidth: '620px',
                            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '42px', height: '42px', borderRadius: '50%',
                                    background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <UserCheck size={20} color="#2563eb" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, color: '#111827', fontSize: '1rem' }}>
                                        {selectedDoctor.fullName}
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '2px' }}>
                                        {selectedDoctor.organization && <span>{selectedDoctor.organization} · </span>}
                                        Yo'naltirgan bemorlar
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPatientsModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px', borderRadius: '6px' }}
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{
                            flex: 1, overflowY: 'auto', padding: '20px 24px',
                            scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f9fafb'
                        }}>
                            {patientsLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '12px', color: '#6b7280' }}>
                                    <div className="spinner"></div>
                                    <span>Yuklanmoqda...</span>
                                </div>
                            ) : referredPatients.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
                                    <Users size={48} style={{ marginBottom: '12px', opacity: 0.4 }} />
                                    <p style={{ color: '#9ca3af', fontWeight: 500 }}>Yo'naltirgan bemorlar topilmadi</p>
                                </div>
                            ) : (
                                <>
                                    {/* Date Range Calculator Card */}
                                    <div style={{
                                        background: '#f8fafc',
                                        border: '1.5px solid #e2e8f0',
                                        borderRadius: '12px',
                                        padding: '14px 16px',
                                        marginBottom: '16px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                                                <Calendar size={16} color="#2563eb" />
                                                <span>Sana oralig'i bo'yicha hisoblash</span>
                                            </div>
                                            {(dateRange.startDate || dateRange.endDate) && (
                                                <button
                                                    onClick={() => setDateRange({ startDate: '', endDate: '' })}
                                                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                                                >
                                                    Tozalash (Barchasi)
                                                </button>
                                            )}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginBottom: '10px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                                    Boshlang'ich sana
                                                </label>
                                                <input
                                                    type="date"
                                                    value={dateRange.startDate}
                                                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                                    style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                                    Tugash sanasi
                                                </label>
                                                <input
                                                    type="date"
                                                    value={dateRange.endDate}
                                                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                                    style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Range Result Box */}
                                        {(dateRange.startDate || dateRange.endDate) && (
                                            <div style={{
                                                background: '#eff6ff',
                                                border: '1px solid #bfdbfe',
                                                borderRadius: '8px',
                                                padding: '10px 14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                flexWrap: 'wrap',
                                                gap: '8px'
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af' }}>
                                                        Hisoblangan sana oralig'i:
                                                    </div>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1d4ed8', marginTop: '2px' }}>
                                                        {dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString('uz-UZ') : 'Boshidan'} — {dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString('uz-UZ') : 'Bugungacha'}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af' }}>
                                                        {(() => {
                                                            const filteredList = referredPatients.filter(p => {
                                                                if (!p.createdAt) return true
                                                                const d = new Date(p.createdAt)
                                                                if (dateRange.startDate && d < new Date(dateRange.startDate + 'T00:00:00')) return false
                                                                if (dateRange.endDate && d > new Date(dateRange.endDate + 'T23:59:59')) return false
                                                                return true
                                                            })
                                                            return `${filteredList.length} ta bemor`
                                                        })()}
                                                    </div>
                                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                                                        {(() => {
                                                            const filteredList = referredPatients.filter(p => {
                                                                if (!p.createdAt) return true
                                                                const d = new Date(p.createdAt)
                                                                if (dateRange.startDate && d < new Date(dateRange.startDate + 'T00:00:00')) return false
                                                                if (dateRange.endDate && d > new Date(dateRange.endDate + 'T23:59:59')) return false
                                                                return true
                                                            })
                                                            const sum = filteredList.reduce((acc, p) => acc + Number(p.analysisTotal || 0), 0)
                                                            return formatMoney(sum)
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                                        Jami {referredPatients.length} ta bemor (ko'rsatilgan: {(() => {
                                            return referredPatients.filter(p => {
                                                if (!p.createdAt) return true
                                                const d = new Date(p.createdAt)
                                                if (dateRange.startDate && d < new Date(dateRange.startDate + 'T00:00:00')) return false
                                                if (dateRange.endDate && d > new Date(dateRange.endDate + 'T23:59:59')) return false
                                                return true
                                            }).length
                                        })()})
                                    </div>
                                    {(() => {
                                        const totals = getReferralTotals()
                                        const cards = [
                                            { label: 'Bugun', value: totals.today, bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
                                            { label: 'Shu hafta', value: totals.week, bg: '#fefce8', border: '#fde68a', color: '#a16207' },
                                            { label: 'Shu oy', value: totals.month, bg: '#f5f3ff', border: '#ddd6fe', color: '#6d28d9' },
                                            { label: 'Jami (Barchasi)', value: totals.all, bg: '#ecfdf5', border: '#6ee7b7', color: '#059669' }
                                        ]
                                        return (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginBottom: '14px' }}>
                                                {cards.map(card => (
                                                    <div key={card.label} style={{
                                                        background: card.bg,
                                                        border: `1px solid ${card.border}`,
                                                        borderRadius: '10px',
                                                        padding: '10px 12px'
                                                    }}>
                                                        <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                            {card.label}
                                                        </div>
                                                        <div style={{ marginTop: '4px', fontSize: '1rem', color: card.color, fontWeight: 800 }}>
                                                            {formatMoney(card.value)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    })()}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {referredPatients
                                            .filter(p => {
                                                if (!p.createdAt) return true
                                                const d = new Date(p.createdAt)
                                                if (dateRange.startDate && d < new Date(dateRange.startDate + 'T00:00:00')) return false
                                                if (dateRange.endDate && d > new Date(dateRange.endDate + 'T23:59:59')) return false
                                                return true
                                            })
                                            .map((patient, i) => (
                                            <div key={patient._id} style={{
                                                padding: '12px 16px', borderRadius: '10px',
                                                background: i % 2 === 0 ? '#f9fafb' : '#fff',
                                                border: '1px solid #e5e7eb'
                                            }}>
                                                {/* Patient info row */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <div style={{
                                                        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                                                        background: '#dbeafe', color: '#1d4ed8',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 700, fontSize: '0.9rem'
                                                    }}>
                                                        {patient.fullName?.charAt(0) || 'B'}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.92rem' }}>
                                                            {patient.fullName}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '12px', marginTop: '3px', flexWrap: 'wrap' }}>
                                                            {patient.phone && (
                                                                <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                    <Phone size={11} /> {patient.phone}
                                                                </span>
                                                            )}
                                                            {patient.birthDate && (
                                                                <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                    <Calendar size={11} /> {calculateAge(patient.birthDate)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                        <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '2px' }}>
                                                            {new Date(patient.createdAt).toLocaleDateString('uz-UZ')}
                                                        </div>
                                                        {patient.analysisTotal > 0 && (
                                                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#059669' }}>
                                                                {formatMoney(patient.analysisTotal)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Analysis breakdown */}
                                                {patient.analysisList && patient.analysisList.length > 0 && (
                                                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e5e7eb' }}>
                                                        {patient.analysisList.map((a, ai) => (
                                                            <div key={ai} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#6b7280', padding: '2px 0' }}>
                                                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
                                                                    {a.name}
                                                                </span>
                                                                <span style={{ fontWeight: 600, color: '#374151', flexShrink: 0 }}>
                                                                    {a.amount > 0 ? formatMoney(a.amount) : '—'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {/* Grand total */}
                                    {referredPatients.some(p => p.analysisTotal > 0) && (
                                        <div style={{
                                            marginTop: '16px', padding: '14px 16px',
                                            background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                                            borderRadius: '10px', border: '1px solid #6ee7b7',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <span style={{ fontWeight: 600, color: '#065f46', fontSize: '0.9rem' }}>
                                                Jami analiz summasi:
                                            </span>
                                            <span style={{ fontWeight: 800, color: '#059669', fontSize: '1.05rem' }}>
                                                {formatMoney(getReferralTotals().all)}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                            <button className="btn btn-secondary" onClick={() => setShowPatientsModal(false)}>
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingDoctor ? 'Shifokorni tahrirlash' : 'Yangi shifokor'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            {error && <div className="alert error">{error}</div>}
                            {success && <div className="alert success"><Check size={18} /> {success}</div>}

                            <div className="form-group">
                                <label className="form-label">F.I.O *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Shifokor ism familiyasi"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Telefon</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="+998-90-123-45-67"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Muassasa</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Klinika yoki shifoxona nomi"
                                        value={formData.organization}
                                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Bekor qilish
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingDoctor ? <><Save size={18} /> Saqlash</> : <><Plus size={18} /> Qo'shish</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2>O'chirishni tasdiqlang</h2>
                            <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-form">
                            <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#111827', fontSize: '0.95rem' }}>
                                <strong style={{ color: '#111827' }}>{deletingDoctor?.fullName}</strong> ni o'chirishni xohlaysizmi?
                            </p>
                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                                    Bekor qilish
                                </button>
                                <button className="btn btn-danger" onClick={handleDelete}
                                    style={{ background: '#ef4444', color: 'white' }}>
                                    <Trash2 size={18} /> O'chirish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ReferringDoctors
