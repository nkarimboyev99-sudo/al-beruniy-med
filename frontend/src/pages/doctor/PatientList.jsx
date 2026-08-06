import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Users,
    Search,
    Eye,
    Stethoscope,
    Phone,
    MapPin,
    Calendar,
    UserPlus,
    X,
    Filter,
    CheckCircle,
    Clock,
    ChevronRight,
    Droplet
} from 'lucide-react'
import './DoctorPages.css'

function PatientList() {
    const [patients, setPatients] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [filterStatus, setFilterStatus] = useState('all')

    useEffect(() => {
        fetchPatients()
    }, [])

    const fetchPatients = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/patients', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                const data = await response.json()
                setPatients(data)
            }
        } catch (error) {
            console.error('Error fetching patients:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredPatients = patients.filter(p => {
        const matchesSearch = p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.phone?.includes(searchTerm)

        if (filterStatus === 'all') return matchesSearch
        if (filterStatus === 'pending') return matchesSearch && (!p.diagnoses || p.diagnoses.length === 0)
        if (filterStatus === 'completed') return matchesSearch && p.diagnoses && p.diagnoses.length > 0
        return matchesSearch
    })

    const stats = {
        total: patients.length,
        pending: patients.filter(p => !p.diagnoses || p.diagnoses.length === 0).length,
        completed: patients.filter(p => p.diagnoses && p.diagnoses.length > 0).length
    }

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('uz-UZ', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    return (
        <div className="patient-list-page">
            {/* Page Header */}
            <div className="page-header-section">
                <div className="page-header-content">
                    <div className="page-title-group">
                        <h1>Bemorlar ro'yxati</h1>
                        <p>Barcha bemorlarni ko'rish va boshqarish</p>
                    </div>
                    <Link to="/doctor/add-patient" className="add-patient-btn">
                        <UserPlus size={20} />
                        <span>Yangi bemor</span>
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="mini-stats-row">
                    <div className="mini-stat-card">
                        <Users size={20} />
                        <div className="mini-stat-info">
                            <span className="mini-stat-value">{stats.total}</span>
                            <span className="mini-stat-label">Jami</span>
                        </div>
                    </div>
                    <div className="mini-stat-card warning">
                        <Clock size={20} />
                        <div className="mini-stat-info">
                            <span className="mini-stat-value">{stats.pending}</span>
                            <span className="mini-stat-label">Kutilmoqda</span>
                        </div>
                    </div>
                    <div className="mini-stat-card success">
                        <CheckCircle size={20} />
                        <div className="mini-stat-info">
                            <span className="mini-stat-value">{stats.completed}</span>
                            <span className="mini-stat-label">Yakunlangan</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filter Toolbar */}
            <div className="search-filter-bar">
                <div className="search-box-large">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Ism yoki telefon raqam bo'yicha qidirish..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="clear-search" onClick={() => setSearchTerm('')}>
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="filter-buttons">
                    <button
                        className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('all')}
                    >
                        <Filter size={16} />
                        Barchasi
                    </button>
                    <button
                        className={`filter-btn warning ${filterStatus === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('pending')}
                    >
                        <Clock size={16} />
                        Kutilmoqda
                    </button>
                    <button
                        className={`filter-btn success ${filterStatus === 'completed' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('completed')}
                    >
                        <CheckCircle size={16} />
                        Yakunlangan
                    </button>
                </div>
            </div>

            {/* Results Count */}
            <div className="results-info">
                <span className="results-count-text">
                    <strong>{filteredPatients.length}</strong> ta bemor topildi
                </span>
            </div>

            {/* Patients Grid */}
            <div className="patients-grid-container">
                {loading ? (
                    <div className="patients-loading-grid">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="patient-card-skeleton">
                                <div className="skeleton-header">
                                    <div className="skeleton-avatar"></div>
                                    <div className="skeleton-info">
                                        <div className="skeleton-line"></div>
                                        <div className="skeleton-line short"></div>
                                    </div>
                                </div>
                                <div className="skeleton-body">
                                    <div className="skeleton-line"></div>
                                    <div className="skeleton-line"></div>
                                </div>
                                <div className="skeleton-footer">
                                    <div className="skeleton-btn"></div>
                                    <div className="skeleton-btn"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredPatients.length === 0 ? (
                    <div className="empty-patients-state">
                        <div className="empty-icon-wrapper">
                            <Users size={56} />
                        </div>
                        <h3>Bemorlar topilmadi</h3>
                        <p>
                            {searchTerm
                                ? `"${searchTerm}" bo'yicha hech narsa topilmadi`
                                : 'Yangi bemor qo\'shish uchun tugmani bosing'
                            }
                        </p>
                        {!searchTerm && (
                            <Link to="/doctor/add-patient" className="empty-add-btn">
                                <UserPlus size={20} />
                                Yangi bemor qo'shish
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="patients-grid-new">
                        {filteredPatients.map(patient => (
                            <div key={patient._id} className="patient-card-new">
                                {/* Card Header */}
                                <div className="card-header-new">
                                    <div className="patient-avatar-new">
                                        {patient.fullName?.charAt(0) || 'B'}
                                    </div>
                                    <div className="patient-header-info">
                                        <h3>{patient.fullName}</h3>
                                        <span className="patient-id-badge">
                                            ID: {patient._id.slice(-6).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="status-indicator">
                                        {patient.diagnoses && patient.diagnoses.length > 0 ? (
                                            <span className="status-tag completed">
                                                <CheckCircle size={14} />
                                                Yakunlangan
                                            </span>
                                        ) : (
                                            <span className="status-tag pending">
                                                <Clock size={14} />
                                                Kutilmoqda
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="card-body-new">
                                    <div className="info-item">
                                        <Calendar size={16} />
                                        <span>{patient.age} yosh • {patient.gender === 'male' ? 'Erkak' : 'Ayol'}</span>
                                    </div>
                                    <div className="info-item">
                                        <Phone size={16} />
                                        <span>{patient.phone || 'Telefon yo\'q'}</span>
                                    </div>
                                    <div className="info-item">
                                        <MapPin size={16} />
                                        <span className="truncate-text">{patient.address || 'Manzil ko\'rsatilmagan'}</span>
                                    </div>
                                    {patient.bloodType && (
                                        <div className="info-item blood-type">
                                            <Droplet size={16} />
                                            <span>{patient.bloodType}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer */}
                                <div className="card-footer-new">
                                    <button
                                        className="card-btn secondary"
                                        onClick={() => setSelectedPatient(patient)}
                                    >
                                        <Eye size={18} />
                                        <span>Ko'rish</span>
                                    </button>
                                    <Link
                                        to={`/doctor/diagnosis?patient=${patient._id}`}
                                        className="card-btn primary"
                                    >
                                        <Stethoscope size={18} />
                                        <span>Analiz</span>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Patient Detail Modal */}
            {selectedPatient && (
                <div className="modal-overlay" onClick={() => setSelectedPatient(null)}>
                    <div className="modal patient-detail-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Bemor ma'lumotlari</h2>
                            <button className="modal-close" onClick={() => setSelectedPatient(null)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="patient-modal-content">
                            {/* Patient Header */}
                            <div className="modal-patient-header">
                                <div className="modal-avatar">
                                    {selectedPatient.fullName?.charAt(0) || 'B'}
                                </div>
                                <div className="modal-patient-info">
                                    <h3>{selectedPatient.fullName}</h3>
                                    <p>{selectedPatient.age} yosh • {selectedPatient.gender === 'male' ? 'Erkak' : 'Ayol'}</p>
                                    {selectedPatient.diagnoses && selectedPatient.diagnoses.length > 0 ? (
                                        <span className="status-tag completed">
                                            <CheckCircle size={14} />
                                            Yakunlangan
                                        </span>
                                    ) : (
                                        <span className="status-tag pending">
                                            <Clock size={14} />
                                            Kutilmoqda
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="modal-info-grid">
                                <div className="modal-info-item">
                                    <Phone size={18} />
                                    <div>
                                        <label>Telefon</label>
                                        <span>{selectedPatient.phone || 'Ko\'rsatilmagan'}</span>
                                    </div>
                                </div>
                                <div className="modal-info-item">
                                    <MapPin size={18} />
                                    <div>
                                        <label>Manzil</label>
                                        <span>{selectedPatient.address || 'Ko\'rsatilmagan'}</span>
                                    </div>
                                </div>
                                <div className="modal-info-item">
                                    <Calendar size={18} />
                                    <div>
                                        <label>Ro'yxatga olingan</label>
                                        <span>{formatDate(selectedPatient.createdAt)}</span>
                                    </div>
                                </div>
                                <div className="modal-info-item">
                                    <Droplet size={18} />
                                    <div>
                                        <label>Qon guruhi</label>
                                        <span>{selectedPatient.bloodType || 'Ko\'rsatilmagan'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Diagnoses Section */}
                            {selectedPatient.diagnoses && selectedPatient.diagnoses.length > 0 && (
                                <div className="modal-diagnoses">
                                    <h4>
                                        <Stethoscope size={18} />
                                        Analizlar tarixi
                                    </h4>
                                    <div className="diagnoses-list">
                                        {selectedPatient.diagnoses.map((d, i) => (
                                            <div key={i} className="diagnosis-list-item">
                                                <div className="diagnosis-icon">
                                                    <Stethoscope size={16} />
                                                </div>
                                                <div className="diagnosis-info">
                                                    <span className="diagnosis-name">{d.diagnosis?.name || 'Noma\'lum'}</span>
                                                    <span className="diagnosis-date">{formatDate(d.date)}</span>
                                                </div>
                                                <ChevronRight size={16} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setSelectedPatient(null)}>
                                Yopish
                            </button>
                            <Link
                                to={`/doctor/diagnosis?patient=${selectedPatient._id}`}
                                className="btn btn-primary"
                                onClick={() => setSelectedPatient(null)}
                            >
                                <Stethoscope size={18} />
                                analiz qo'shish
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default PatientList
