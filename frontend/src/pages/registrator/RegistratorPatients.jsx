import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    UserPlus, Plus, Search, Edit2, Eye,
    Phone, Calendar, User, FileText,
    Save, Check, X
} from 'lucide-react'
import '../admin/DataManagement.css'
import '../admin/rfp.css'

const PAGE_SIZE = 25

function RegistratorPatients() {
    const navigate = useNavigate()
    const [patients, setPatients] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [dateFilter, setDateFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)

    const [showModal, setShowModal] = useState(false)
    const [showViewModal, setShowViewModal] = useState(false)
    const [editingPatient, setEditingPatient] = useState(null)
    const [selectedPatient, setSelectedPatient] = useState(null)

    const [formData, setFormData] = useState({
        fullName: '', birthDate: '', gender: 'male', phone: '', passportNumber: '', notes: ''
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Autocomplete
    const [suggestions, setSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [searchLoading, setSearchLoading] = useState(false)
    const debounceRef = useRef(null)

    useEffect(() => { fetchPatients() }, [])

    const fetchPatients = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/patients', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setPatients(await res.json())
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const searchPatients = async (query) => {
        if (!query || query.length < 2) { setSuggestions([]); return }
        setSearchLoading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/patients/search/autocomplete?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setSuggestions(await res.json())
        } catch (e) {
            console.error(e)
        } finally {
            setSearchLoading(false)
        }
    }

    const handleFullNameChange = (value) => {
        setFormData({ ...formData, fullName: value })
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => searchPatients(value), 300)
    }

    const handleSelectSuggestion = (patient) => {
        setSuggestions([])
        setShowSuggestions(false)
        setFormData({
            fullName: patient.fullName || '',
            birthDate: patient.birthDate ? patient.birthDate.split('T')[0] : '',
            gender: patient.gender || 'male',
            phone: patient.phone || '',
            passportNumber: patient.passportNumber || '',
            notes: patient.notes || ''
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        try {
            const token = localStorage.getItem('token')
            const url = editingPatient ? `/api/patients/${editingPatient._id}` : '/api/patients'
            const method = editingPatient ? 'PUT' : 'POST'
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (res.ok) {
                setSuccess(editingPatient ? 'Bemor yangilandi!' : 'Bemor qo\'shildi!')
                fetchPatients()
                setTimeout(() => { setShowModal(false); resetForm() }, 1500)
            } else {
                setError(data.message || 'Xatolik yuz berdi')
            }
        } catch (e) {
            setError('Server bilan aloqa yo\'q')
        }
    }

    const resetForm = () => {
        setFormData({ fullName: '', birthDate: '', gender: 'male', phone: '', passportNumber: '', notes: '' })
        setEditingPatient(null)
        setError('')
        setSuccess('')
        setSuggestions([])
    }

    const handleEdit = (patient) => {
        setEditingPatient(patient)
        setFormData({
            fullName: patient.fullName || '',
            birthDate: patient.birthDate ? patient.birthDate.split('T')[0] : '',
            gender: patient.gender || 'male',
            phone: patient.phone || '',
            passportNumber: patient.passportNumber || '',
            notes: patient.notes || ''
        })
        setError('')
        setSuccess('')
        setShowModal(true)
    }

    const handleView = (patient) => {
        setSelectedPatient(patient)
        setShowViewModal(true)
    }

    // Helpers
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('uz-UZ') : '-'
    const calculateAge = (birthDate) => {
        if (!birthDate) return '-'
        const today = new Date(), b = new Date(birthDate)
        let age = today.getFullYear() - b.getFullYear()
        const m = today.getMonth() - b.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
        return `${age} yosh`
    }
    const isToday = (d) => {
        if (!d) return false
        return new Date(d).toDateString() === new Date().toDateString()
    }
    const isActiveToday = (p) => isToday(p.createdAt || p.registeredAt) || isToday(p.lastDiagnosisDate)

    const filteredPatients = patients.filter(p => {
        const matchesSearch =
            p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.phone?.includes(searchTerm) ||
            p.passportNumber?.toLowerCase().includes(searchTerm.toLowerCase())
        let matchesFilter = true
        if (dateFilter === 'today') matchesFilter = isActiveToday(p)
        return matchesSearch && matchesFilter
    })

    const todayCount = patients.filter(p => isActiveToday(p)).length
    const totalPages = Math.ceil(filteredPatients.length / PAGE_SIZE)
    const pagedPatients = filteredPatients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    const goToPage = (page) => { if (page >= 1 && page <= totalPages) setCurrentPage(page) }
    const handleSearch = (val) => { setSearchTerm(val); setCurrentPage(1) }
    const handleDateFilter = (val) => { setDateFilter(val); setCurrentPage(1) }

    return (
        <div className="pm-page">
            {/* Header */}
            <div className="pm-header">
                <div className="pm-header-left">
                    <div className="pm-header-icon"><UserPlus size={22} /></div>
                    <div>
                        <h1 className="pm-title">Bemorlar</h1>
                        <p className="pm-subtitle">Bemorlar ro'yxatini boshqarish</p>
                    </div>
                </div>
                <button className="pm-add-btn" onClick={() => navigate('/registrator/patients/add')}>
                    <Plus size={18} />
                    Yangi bemor
                </button>
            </div>

            {/* Stats */}
            <div className="pm-stats">
                <div className="pm-stat-card pm-stat-blue">
                    <div className="pm-stat-icon"><UserPlus size={22} /></div>
                    <div>
                        <span className="pm-stat-num">{patients.length}</span>
                        <span className="pm-stat-label">Jami bemorlar</span>
                    </div>
                </div>
                <div className="pm-stat-card pm-stat-green">
                    <div className="pm-stat-icon"><Calendar size={22} /></div>
                    <div>
                        <span className="pm-stat-num">{todayCount}</span>
                        <span className="pm-stat-label">Bugungi bemorlar</span>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="pm-toolbar">
                <div className="pm-toolbar-left">
                    <div className="pm-search">
                        <Search size={16} className="pm-search-icon" />
                        <input
                            type="text"
                            className="pm-search-input"
                            placeholder="Ism, telefon yoki passport bo'yicha qidirish..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>
                    <div className="pm-filters">
                        <button className={`pm-filter-btn ${dateFilter === 'all' ? 'active' : ''}`} onClick={() => handleDateFilter('all')}>
                            Barchasi
                        </button>
                        <button className={`pm-filter-btn ${dateFilter === 'today' ? 'active' : ''}`} onClick={() => handleDateFilter('today')}>
                            <Calendar size={14} /> Bugungi ({todayCount})
                        </button>
                    </div>
                </div>
                <div className="pm-toolbar-info">
                    <span>Jami: <strong>{filteredPatients.length}</strong> ta bemor</span>
                </div>
            </div>

            {/* Table */}
            <div className="pm-table-wrap">
                {loading ? (
                    <div className="pm-state-box">
                        <div className="pm-spinner"></div>
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : filteredPatients.length === 0 ? (
                    <div className="pm-state-box">
                        <UserPlus size={44} className="pm-state-icon" />
                        <h3>Bemorlar topilmadi</h3>
                        <p>Yangi bemor qo'shish uchun "Yangi bemor" tugmasini bosing</p>
                    </div>
                ) : (
                    <table className="pm-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>F.I.O</th>
                                <th>Telefon</th>
                                <th>Tug'ilgan sana</th>
                                <th>Yoshi</th>
                                <th>Jinsi</th>
                                <th>Ro'yxat sanasi</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagedPatients.map((patient, index) => (
                                <tr key={patient._id} className={isToday(patient.createdAt || patient.registeredAt) ? 'pm-today-row' : ''}>
                                    <td className="pm-td-num">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                                    <td>
                                        <div className="pm-user-cell">
                                            <div className="pm-avatar">{patient.fullName?.charAt(0) || 'B'}</div>
                                            <span className="pm-user-name">{patient.fullName}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="pm-phone-cell">
                                            <Phone size={13} /> {patient.phone || '-'}
                                        </div>
                                    </td>
                                    <td>{formatDate(patient.birthDate)}</td>
                                    <td>{calculateAge(patient.birthDate)}</td>
                                    <td>
                                        <span className={`pm-gender ${patient.gender}`}>
                                            {patient.gender === 'male' ? '♂ Erkak' : '♀ Ayol'}
                                        </span>
                                    </td>
                                    <td>{formatDate(patient.createdAt || patient.registeredAt)}</td>
                                    <td>
                                        <div className="pm-actions">
                                            <button className="pm-act-btn pm-act-view" title="Ko'rish" onClick={() => handleView(patient)}>
                                                <Eye size={15} />
                                            </button>
                                            <button className="pm-act-btn pm-act-edit" title="Tahrirlash" onClick={() => handleEdit(patient)}>
                                                <Edit2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pm-pagination">
                        <span className="pm-page-info">
                            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredPatients.length)} / {filteredPatients.length} ta
                        </span>
                        <div className="pm-page-btns">
                            <button className="pm-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>‹</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                                .reduce((acc, p, idx, arr) => {
                                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                                    acc.push(p)
                                    return acc
                                }, [])
                                .map((item, idx) =>
                                    item === '...'
                                        ? <span key={`dots-${idx}`} className="pm-page-dots">…</span>
                                        : <button key={item} className={`pm-page-btn ${item === currentPage ? 'active' : ''}`} onClick={() => goToPage(item)}>{item}</button>
                                )
                            }
                            <button className="pm-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>›</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm() }}>
                    <div className="pe-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="pe-header">
                            <div className="pe-title">
                                <div className="pe-title-icon">
                                    {editingPatient ? <Edit2 size={18} /> : <UserPlus size={18} />}
                                </div>
                                <h2>{editingPatient ? 'Bemorni tahrirlash' : 'Yangi bemor'}</h2>
                            </div>
                            <button className="pe-close" onClick={() => { setShowModal(false); resetForm() }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="pe-body">
                                {error && <div className="pe-alert error">{error}</div>}
                                {success && <div className="pe-alert success"><Check size={16} /> {success}</div>}

                                <div className="pe-field">
                                    <label className="pe-label">F.I.O *</label>
                                    <div className="pe-autocomplete">
                                        <input
                                            type="text"
                                            className="pe-input"
                                            placeholder="To'liq ism familiyani kiriting"
                                            value={formData.fullName}
                                            onChange={(e) => handleFullNameChange(e.target.value)}
                                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            autoComplete="off"
                                            required
                                        />
                                        {searchLoading && <div className="autocomplete-loading"><div className="spinner small"></div></div>}
                                        {showSuggestions && suggestions.length > 0 && (
                                            <div className="autocomplete-dropdown">
                                                <div className="autocomplete-header">Mavjud bemorlar</div>
                                                {suggestions.map((p) => (
                                                    <div key={p._id} className="autocomplete-item" onMouseDown={() => handleSelectSuggestion(p)}>
                                                        <div className="autocomplete-item-name">{p.fullName}</div>
                                                        <div className="autocomplete-item-info">
                                                            {p.phone || "Telefon yo'q"}
                                                            {p.birthDate && ` • ${new Date(p.birthDate).toLocaleDateString('uz-UZ')}`}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pe-row">
                                    <div className="pe-field">
                                        <label className="pe-label">Tug'ilgan sana</label>
                                        <input type="date" className="pe-input" value={formData.birthDate}
                                            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} />
                                    </div>
                                    <div className="pe-field">
                                        <label className="pe-label">Jinsi</label>
                                        <select className="pe-input" value={formData.gender}
                                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                                            <option value="male">Erkak</option>
                                            <option value="female">Ayol</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pe-row">
                                    <div className="pe-field">
                                        <label className="pe-label">Telefon</label>
                                        <input type="text" className="pe-input" placeholder="+998 90 123 45 67"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                    </div>
                                    <div className="pe-field">
                                        <label className="pe-label">Passport raqami</label>
                                        <input type="text" className="pe-input" placeholder="AA1234567"
                                            value={formData.passportNumber}
                                            onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })} />
                                    </div>
                                </div>

                                <div className="pe-field">
                                    <label className="pe-label">Izohlar</label>
                                    <textarea className="pe-input" rows="3" placeholder="Qo'shimcha ma'lumotlar"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                                </div>
                            </div>
                            <div className="pe-footer">
                                <button type="button" className="pe-btn pe-btn-cancel" onClick={() => { setShowModal(false); resetForm() }}>
                                    Bekor qilish
                                </button>
                                <button type="submit" className="pe-btn pe-btn-save">
                                    <Save size={16} />
                                    {editingPatient ? 'Saqlash' : "Qo'shish"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {showViewModal && selectedPatient && (
                <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>Bemor ma'lumotlari</h2>
                            <button className="modal-close" onClick={() => setShowViewModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="pv-body">
                            <div className="pv-header">
                                <div className="pv-avatar">{selectedPatient.fullName?.charAt(0) || 'B'}</div>
                                <div>
                                    <h3 className="pv-name">{selectedPatient.fullName}</h3>
                                    <span className={`pv-gender ${selectedPatient.gender}`}>
                                        {selectedPatient.gender === 'male' ? '♂ Erkak' : '♀ Ayol'}
                                    </span>
                                </div>
                            </div>
                            <div className="pv-info-grid">
                                <div className="pv-info-item">
                                    <Calendar size={16} className="pv-icon" />
                                    <div>
                                        <span className="pv-label">Tug'ilgan sana</span>
                                        <span className="pv-value">{formatDate(selectedPatient.birthDate)}</span>
                                    </div>
                                </div>
                                <div className="pv-info-item">
                                    <User size={16} className="pv-icon" />
                                    <div>
                                        <span className="pv-label">Yoshi</span>
                                        <span className="pv-value">{calculateAge(selectedPatient.birthDate)}</span>
                                    </div>
                                </div>
                                <div className="pv-info-item">
                                    <Phone size={16} className="pv-icon" />
                                    <div>
                                        <span className="pv-label">Telefon</span>
                                        <span className="pv-value">{selectedPatient.phone || '-'}</span>
                                    </div>
                                </div>
                                <div className="pv-info-item">
                                    <FileText size={16} className="pv-icon" />
                                    <div>
                                        <span className="pv-label">Passport</span>
                                        <span className="pv-value">{selectedPatient.passportNumber || '-'}</span>
                                    </div>
                                </div>
                            </div>
                            {selectedPatient.notes && (
                                <div className="pv-notes">
                                    <strong>Izoh:</strong> {selectedPatient.notes}
                                </div>
                            )}
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                                Yopish
                            </button>
                            <button className="btn btn-primary" onClick={() => { setShowViewModal(false); handleEdit(selectedPatient) }}>
                                <Edit2 size={16} /> Tahrirlash
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default RegistratorPatients
