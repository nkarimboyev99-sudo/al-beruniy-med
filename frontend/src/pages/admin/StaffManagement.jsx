import { useState, useEffect } from 'react'
import {
    Users,
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Check,
    UserPlus,
    Save,
    Eye,
    Activity,
    Calendar,
    Phone
} from 'lucide-react'
import './DataManagement.css'

function StaffManagement() {
    const [staff, setStaff] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showViewModal, setShowViewModal] = useState(false)
    const [showActivitiesModal, setShowActivitiesModal] = useState(false)
    const [activities, setActivities] = useState([])
    const [activitiesLoading, setActivitiesLoading] = useState(false)
    const [activitySearch, setActivitySearch] = useState('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [selectedStaff, setSelectedStaff] = useState(null)
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
        fetchStaff()
    }, [])

    const fetchStaff = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/auth/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                const data = await response.json()
                const staffList = data.filter(user => user.role !== 'admin')
                setStaff(staffList)
            }
        } catch (error) {
            console.error('Error fetching staff:', error)
        } finally {
            setLoading(false)
        }
    }

    const getRoleLabel = (role) => {
        if (role === 'doctor') return 'Doktor'
        if (role === 'registrator') return 'Registratsiya'
        return role
    }

    const getPaymentLabel = (method) => {
        if (method === 'cash') return 'Naqd'
        if (method === 'card') return 'Karta'
        if (method === 'transfer') return "O'tkazma"
        return method
    }

    const handleViewActivities = async (member) => {
        setSelectedStaff(member)
        setActivities([])
        setActivitySearch('')
        setActivitiesLoading(true)
        setShowActivitiesModal(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/auth/users/${member._id}/activities`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setActivities(data.activities)
            }
        } catch (error) {
            console.error('Error fetching activities:', error)
        } finally {
            setActivitiesLoading(false)
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
                setSuccess('Xodim muvaffaqiyatli yaratildi!')
                setFormData({ username: '', password: '', fullName: '', role: 'doctor', phone: '' })
                fetchStaff()
                setTimeout(() => { setShowModal(false); setSuccess('') }, 1500)
            } else {
                setError(data.message || 'Xatolik yuz berdi')
            }
        } catch (error) {
            setError('Server bilan aloqa yo\'q')
        }
    }

    const handleEditClick = (member) => {
        setSelectedStaff(member)
        setEditFormData({
            username: member.username,
            password: '',
            fullName: member.fullName,
            role: member.role,
            phone: member.phone || '',
            isActive: member.isActive
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
            const response = await fetch(`/api/auth/users/${selectedStaff._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editFormData)
            })

            const data = await response.json()

            if (response.ok) {
                setSuccess('Xodim muvaffaqiyatli yangilandi!')
                fetchStaff()
                setTimeout(() => {
                    setShowEditModal(false)
                    setSuccess('')
                    setSelectedStaff(null)
                }, 1500)
            } else {
                setError(data.message || 'Xatolik yuz berdi')
            }
        } catch (error) {
            setError('Server bilan aloqa yo\'q')
        }
    }

    const handleDeleteClick = (member) => {
        setSelectedStaff(member)
        setShowDeleteConfirm(true)
    }

    const handleDeleteConfirm = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/auth/users/${selectedStaff._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            const data = await response.json()

            if (response.ok) {
                fetchStaff()
                setShowDeleteConfirm(false)
                setSelectedStaff(null)
            } else {
                alert(data.message || 'O\'chirishda xatolik yuz berdi')
            }
        } catch (error) {
            alert('Server bilan aloqa yo\'q')
        }
    }

    const filteredStaff = staff.filter(member =>
        member.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.phone?.includes(searchTerm)
    )

    return (
        <div className="data-management-page">
            <div className="page-header">
                <div>
                    <h1>Xodimlar</h1>
                    <p>Xodimlarni boshqarish</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={20} />
                    Yangi xodim
                </button>
            </div>

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
                    <Users size={18} />
                    <span>Jami: {staff.length} ta</span>
                </div>
            </div>

            <div className="data-table-container glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : filteredStaff.length === 0 ? (
                    <div className="empty-state">
                        <UserPlus size={48} />
                        <h3>Xodimlar topilmadi</h3>
                        <p>Yangi xodim qo'shish uchun "Yangi xodim" tugmasini bosing</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>F.I.O</th>
                                <th>Username</th>
                                <th>Rol</th>
                                <th>Telefon</th>
                                <th>Holat</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStaff.map((member, index) => (
                                <tr key={member._id}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar-sm doctor">
                                                {member.fullName?.charAt(0) || 'X'}
                                            </div>
                                            {member.fullName}
                                        </div>
                                    </td>
                                    <td><code>{member.username}</code></td>
                                    <td>
                                        <span className={`status-badge ${member.role === 'doctor' ? 'active' : 'pending'}`}>
                                            {getRoleLabel(member.role)}
                                        </span>
                                    </td>
                                    <td>{member.phone || '-'}</td>
                                    <td>
                                        <span className={`status-badge ${member.isActive ? 'active' : 'inactive'}`}>
                                            {member.isActive ? 'Faol' : 'Nofaol'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="action-btn view"
                                                title="Amaliyotlarni ko'rish"
                                                onClick={() => handleViewActivities(member)}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                className="action-btn edit"
                                                title="Tahrirlash"
                                                onClick={() => handleEditClick(member)}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="action-btn delete"
                                                title="O'chirish"
                                                onClick={() => handleDeleteClick(member)}
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

            {/* Activities Modal */}
            {showActivitiesModal && selectedStaff && (
                <div className="modal-overlay" onClick={() => setShowActivitiesModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px', width: '95%' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Activity size={22} />
                                <div>
                                    <h2 style={{ margin: 0 }}>{selectedStaff.fullName} — Amaliyotlar</h2>
                                    <small style={{ color: 'var(--text-secondary)' }}>{getRoleLabel(selectedStaff.role)}</small>
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setShowActivitiesModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ padding: '1rem 1.5rem' }}>
                            <div className="search-input" style={{ marginBottom: '1rem' }}>
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Bemor ismi bo'yicha qidirish..."
                                    value={activitySearch}
                                    onChange={(e) => setActivitySearch(e.target.value)}
                                />
                            </div>

                            {activitiesLoading ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <p>Yuklanmoqda...</p>
                                </div>
                            ) : activities.length === 0 ? (
                                <div className="empty-state" style={{ padding: '2rem' }}>
                                    <Activity size={40} />
                                    <h3>Amaliyotlar topilmadi</h3>
                                </div>
                            ) : (
                                <>
                                    <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        Jami: <strong>{activities.length}</strong> ta amaliyot
                                    </p>
                                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Bemor</th>
                                                    <th>Telefon</th>
                                                    <th>{selectedStaff.role === 'doctor' ? 'Analiz' : 'Harakat'}</th>
                                                    {selectedStaff.role === 'doctor' && <th>Summa</th>}
                                                    {selectedStaff.role === 'doctor' && <th>To'lov</th>}
                                                    <th>Sana</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activities
                                                    .filter(a => a.patientName.toLowerCase().includes(activitySearch.toLowerCase()))
                                                    .map((a, i) => (
                                                        <tr key={i}>
                                                            <td>{i + 1}</td>
                                                            <td>{a.patientName}</td>
                                                            <td>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Phone size={13} />
                                                                    {a.patientPhone}
                                                                </span>
                                                            </td>
                                                            <td>{a.description}</td>
                                                            {selectedStaff.role === 'doctor' && (
                                                                <td><strong>{a.amount?.toLocaleString()} so'm</strong></td>
                                                            )}
                                                            {selectedStaff.role === 'doctor' && (
                                                                <td>{getPaymentLabel(a.paymentMethod)}</td>
                                                            )}
                                                            <td>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                                                                    <Calendar size={13} />
                                                                    {new Date(a.date).toLocaleDateString('uz-UZ')}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                }
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowActivitiesModal(false)}>
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {showViewModal && selectedStaff && (
                <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>Xodim ma'lumotlari</h2>
                            <button className="modal-close" onClick={() => setShowViewModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="doctor-view-content">
                            <div className="doctor-view-header">
                                <div className="doctor-avatar-lg">
                                    {selectedStaff.fullName?.charAt(0) || 'X'}
                                </div>
                                <div className="doctor-view-name">
                                    <h3>{selectedStaff.fullName}</h3>
                                    <span className={`status-badge ${selectedStaff.isActive ? 'active' : 'inactive'}`}>
                                        {selectedStaff.isActive ? 'Faol' : 'Nofaol'}
                                    </span>
                                </div>
                            </div>
                            <div className="doctor-view-details">
                                <div className="doctor-detail-item">
                                    <span className="detail-label">Username:</span>
                                    <code>{selectedStaff.username}</code>
                                </div>
                                <div className="doctor-detail-item">
                                    <span className="detail-label">Telefon:</span>
                                    <span>{selectedStaff.phone || 'Kiritilmagan'}</span>
                                </div>
                                <div className="doctor-detail-item">
                                    <span className="detail-label">Rol:</span>
                                    <span>{getRoleLabel(selectedStaff.role)}</span>
                                </div>
                                <div className="doctor-detail-item">
                                    <span className="detail-label">Ro'yxatdan o'tgan:</span>
                                    <span>{selectedStaff.createdAt ? new Date(selectedStaff.createdAt).toLocaleDateString('uz-UZ') : '-'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                                Yopish
                            </button>
                            <button className="btn btn-primary" onClick={() => { setShowViewModal(false); handleEditClick(selectedStaff); }}>
                                <Edit2 size={18} />
                                Tahrirlash
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Yangi xodim</h2>
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
                                        <option value="registrator">Registratsiya</option>
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

            {/* Edit Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Xodimni tahrirlash</h2>
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
                                    <label className="form-label">Rol</label>
                                    <select
                                        className="form-input"
                                        value={editFormData.role}
                                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                                    >
                                        <option value="doctor">Doktor</option>
                                        <option value="registrator">Registratsiya</option>
                                    </select>
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

            {/* Delete Confirmation */}
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
                                <strong>{selectedStaff?.fullName}</strong> nomli xodimni o'chirishni xohlaysizmi?
                            </p>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
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

export default StaffManagement
