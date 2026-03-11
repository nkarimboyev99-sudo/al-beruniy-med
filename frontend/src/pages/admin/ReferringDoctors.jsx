import { useState, useEffect } from 'react'
import { UserCheck, Plus, Edit2, Trash2, X, Check, Search, Phone, Building2, Save } from 'lucide-react'
import './DataManagement.css'

function ReferringDoctors() {
    const [doctors, setDoctors] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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

    const filtered = doctors.filter(d =>
        d.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.phone?.includes(searchTerm)
    )

    return (
        <div className="data-management-page">
            <div className="page-header">
                <div>
                    <h1>Yo'naltiruvchi shifokorlar</h1>
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
                                    style={{ background: 'var(--error)', color: 'white' }}>
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
