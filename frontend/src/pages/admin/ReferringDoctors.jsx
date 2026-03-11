import { useState, useEffect } from 'react'
import { UserCheck, Plus, Edit2, Trash2, X, Check, Search, Phone, Building2, Save, Eye, Calendar, Users } from 'lucide-react'
import './DataManagement.css'

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
    const [formData, setFormData] = useState({ fullName: '', phone: '', organization: '' })
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
        setFormData({ fullName: '', phone: '', organization: '' })
        setError('')
        setSuccess('')
        setShowModal(true)
    }

    const openEdit = (doctor) => {
        setEditingDoctor(doctor)
        setFormData({ fullName: doctor.fullName, phone: doctor.phone || '', organization: doctor.organization || '' })
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
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                                        Jami {referredPatients.length} ta bemor
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {referredPatients.map((patient, i) => (
                                            <div key={patient._id} style={{
                                                display: 'flex', alignItems: 'center', gap: '14px',
                                                padding: '12px 16px', borderRadius: '10px',
                                                background: i % 2 === 0 ? '#f9fafb' : '#fff',
                                                border: '1px solid #e5e7eb'
                                            }}>
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
                                                <div style={{ fontSize: '0.78rem', color: '#9ca3af', flexShrink: 0 }}>
                                                    {new Date(patient.createdAt).toLocaleDateString('uz-UZ')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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
                                        placeholder="+998 90 123 45 67"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
