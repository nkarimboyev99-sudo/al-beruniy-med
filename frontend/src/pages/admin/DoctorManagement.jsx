import { useState, useEffect } from 'react'
import {
    Stethoscope,
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Check,
    UserPlus,
    Phone,
    Save,
    Eye
} from 'lucide-react'
import './DataManagement.css'

function DoctorManagement() {
    const [doctors, setDoctors] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showViewModal, setShowViewModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [selectedDoctor, setSelectedDoctor] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        fullName: '',
        role: 'doctor',
        phone: ''
    })
    const [editFormData, setEditFormData] = useState({
        username: '',
        password: '',
        fullName: '',
        role: 'doctor',
        phone: '',
        isActive: true
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        fetchDoctors()
    }, [])

    const fetchDoctors = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/auth/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                const data = await response.json()
                // Faqat doktorlarni filter qilish
                const doctorsList = data.filter(user => user.role === 'doctor')
                setDoctors(doctorsList)
            }
        } catch (error) {
            console.error('Error fetching doctors:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (response.ok) {
                setSuccess('Doktor muvaffaqiyatli yaratildi!')
                setFormData({
                    username: '',
                    password: '',
                    fullName: '',
                    role: 'doctor',
                    phone: ''
                })
                fetchDoctors()
                setTimeout(() => {
                    setShowModal(false)
                    setSuccess('')
                }, 1500)
            } else {
                setError(data.message || 'Xatolik yuz berdi')
            }
        } catch (error) {
            setError('Server bilan aloqa yo\'q')
        }
    }

    // Edit doctor
    const handleEditClick = (doctor) => {
        setSelectedDoctor(doctor)
        setEditFormData({
            username: doctor.username,
            password: '', // Parol bo'sh qoldiriladi, faqat o'zgartirmoqchi bo'lsa kiritadi
            fullName: doctor.fullName,
            role: doctor.role,
            phone: doctor.phone || '',
            isActive: doctor.isActive
        })
        setShowEditModal(true)
        setError('')
        setSuccess('')
    }

    const handleEditSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/auth/users/${selectedDoctor._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editFormData)
            })

            const data = await response.json()

            if (response.ok) {
                setSuccess('Doktor muvaffaqiyatli yangilandi!')
                fetchDoctors()
                setTimeout(() => {
                    setShowEditModal(false)
                    setSuccess('')
                    setSelectedDoctor(null)
                }, 1500)
            } else {
                setError(data.message || 'Xatolik yuz berdi')
            }
        } catch (error) {
            setError('Server bilan aloqa yo\'q')
        }
    }

    // Delete doctor
    const handleDeleteClick = (doctor) => {
        setSelectedDoctor(doctor)
        setShowDeleteConfirm(true)
    }

    const handleDeleteConfirm = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/auth/users/${selectedDoctor._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (response.ok) {
                fetchDoctors()
                setShowDeleteConfirm(false)
                setSelectedDoctor(null)
            } else {
                alert(data.message || 'O\'chirishda xatolik yuz berdi')
            }
        } catch (error) {
            alert('Server bilan aloqa yo\'q')
        }
    }

    const filteredDoctors = doctors.filter(doctor =>
        doctor.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.phone?.includes(searchTerm)
    )

    return (
        <div className="data-management-page">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1>Doktorlar</h1>
                    <p>Shifokorlarni boshqarish</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={20} />
                    Yangi doktor
                </button>
            </div>

            {/* Search and Filter */}
            <div className="toolbar glass-card">
                <div className="search-input">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Ism yoki telefon bo'yicha qidirish..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="toolbar-info">
                    <Stethoscope size={18} />
                    <span>Jami: {doctors.length} ta</span>
                </div>
            </div>

            {/* Users Table */}
            <div className="data-table-container glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : filteredDoctors.length === 0 ? (
                    <div className="empty-state">
                        <UserPlus size={48} />
                        <h3>Doktorlar topilmadi</h3>
                        <p>Yangi doktor qo'shish uchun "Yangi doktor" tugmasini bosing</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>F.I.O</th>
                                <th>Username</th>
                                <th>Telefon</th>
                                <th>Holat</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDoctors.map((doctor, index) => (
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
                                    <td><code>{doctor.username}</code></td>
                                    <td>{doctor.phone || '-'}</td>
                                    <td>
                                        <span className={`status-badge ${doctor.isActive ? 'active' : 'inactive'}`}>
                                            {doctor.isActive ? 'Faol' : 'Nofaol'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="action-btn view"
                                                title="Ko'rish"
                                                onClick={() => { setSelectedDoctor(doctor); setShowViewModal(true); }}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                className="action-btn edit"
                                                title="Tahrirlash"
                                                onClick={() => handleEditClick(doctor)}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="action-btn delete"
                                                title="O'chirish"
                                                onClick={() => handleDeleteClick(doctor)}
                                            >
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

            {/* View Doctor Modal */}
            {showViewModal && selectedDoctor && (
                <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>Doktor ma'lumotlari</h2>
                            <button className="modal-close" onClick={() => setShowViewModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="doctor-view-content">
                            <div className="doctor-view-header">
                                <div className="doctor-avatar-lg">
                                    {selectedDoctor.fullName?.charAt(0) || 'D'}
                                </div>
                                <div className="doctor-view-name">
                                    <h3>{selectedDoctor.fullName}</h3>
                                    <span className={`status-badge ${selectedDoctor.isActive ? 'active' : 'inactive'}`}>
                                        {selectedDoctor.isActive ? 'Faol' : 'Nofaol'}
                                    </span>
                                </div>
                            </div>

                            <div className="doctor-view-details">
                                <div className="doctor-detail-item">
                                    <span className="detail-label">Username:</span>
                                    <code>{selectedDoctor.username}</code>
                                </div>
                                <div className="doctor-detail-item">
                                    <span className="detail-label">Telefon:</span>
                                    <span>{selectedDoctor.phone || 'Kiritilmagan'}</span>
                                </div>
                                <div className="doctor-detail-item">
                                    <span className="detail-label">Rol:</span>
                                    <span>{selectedDoctor.role === 'doctor' ? 'Doktor' : 'Admin'}</span>
                                </div>
                                <div className="doctor-detail-item">
                                    <span className="detail-label">Ro'yxatdan o'tgan:</span>
                                    <span>{selectedDoctor.createdAt ? new Date(selectedDoctor.createdAt).toLocaleDateString('uz-UZ') : '-'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                                Yopish
                            </button>
                            <button className="btn btn-primary" onClick={() => { setShowViewModal(false); handleEditClick(selectedDoctor); }}>
                                <Edit2 size={18} />
                                Tahrirlash
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Doctor Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Yangi doktor</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-form">
                            {error && <div className="alert error">{error}</div>}
                            {success && <div className="alert success"><Check size={18} /> {success}</div>}

                            <div className="form-group">
                                <label className="form-label">Ism familiya *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ism familiyani kiriting"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Username *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Username"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Parol *</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="Parol"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                    />
                                </div>
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
                                    <label className="form-label">Rol *</label>
                                    <select
                                        className="form-input"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="doctor">Doktor</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Bekor qilish
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Plus size={20} />
                                    Qo'shish
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Doctor Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Doktorni tahrirlash</h2>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="modal-form">
                            {error && <div className="alert error">{error}</div>}
                            {success && <div className="alert success"><Check size={18} /> {success}</div>}

                            <div className="form-group">
                                <label className="form-label">Ism familiya *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ism familiyani kiriting"
                                    value={editFormData.fullName}
                                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Username *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Username"
                                        value={editFormData.username}
                                        onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Yangi parol (ixtiyoriy)</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="Bo'sh qoldiring yoki yangi parol kiriting"
                                        value={editFormData.password}
                                        onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Telefon</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="+998 90 123 45 67"
                                        value={editFormData.phone}
                                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Holat</label>
                                    <select
                                        className="form-input"
                                        value={editFormData.isActive}
                                        onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.value === 'true' })}
                                    >
                                        <option value="true">Faol</option>
                                        <option value="false">Nofaol</option>
                                    </select>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                                    Bekor qilish
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={20} />
                                    Saqlash
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
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
                            <p style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                                <strong>{selectedDoctor?.fullName}</strong> nomli doktorni o'chirishni xohlaysizmi?
                            </p>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowDeleteConfirm(false)}
                                >
                                    Bekor qilish
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={handleDeleteConfirm}
                                    style={{ background: 'var(--error)', color: 'white' }}
                                >
                                    <Trash2 size={20} />
                                    O'chirish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DoctorManagement
