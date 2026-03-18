import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ClipboardList, Search, Calendar,
    Phone, Eye
} from 'lucide-react'
import '../admin/DataManagement.css'

const PAGE_SIZE = 25

function DoctorAnalyses() {
    const navigate = useNavigate()
    const [diagnoses, setDiagnoses] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [dateFilter, setDateFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)

    useEffect(() => { fetchDiagnoses() }, [])

    const fetchDiagnoses = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/patient-diagnoses/my', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setDiagnoses(await res.json())
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('uz-UZ') : '-'
    const formatDateTime = (d) => {
        if (!d) return '-'
        return new Date(d).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
    const isToday = (d) => d ? new Date(d).toDateString() === new Date().toDateString() : false

    const getPaymentLabel = (method) => {
        if (method === 'cash') return 'Naqd'
        if (method === 'card') return 'Karta'
        if (method === 'transfer') return "O'tkazma"
        return method || '-'
    }

    const todayCount = diagnoses.filter(d => isToday(d.createdAt)).length

    const filtered = diagnoses.filter(d => {
        const matchSearch =
            d.patient?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.patient?.phone?.includes(searchTerm) ||
            d.diagnosisName?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchDate = dateFilter === 'today' ? isToday(d.createdAt) : true
        return matchSearch && matchDate
    })

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    const goToPage = (p) => { if (p >= 1 && p <= totalPages) setCurrentPage(p) }
    const handleSearch = (v) => { setSearchTerm(v); setCurrentPage(1) }
    const handleFilter = (v) => { setDateFilter(v); setCurrentPage(1) }

    return (
        <div className="pm-page">
            <div className="pm-header">
                <div className="pm-header-left">
                    <div className="pm-header-icon"><ClipboardList size={22} /></div>
                    <div>
                        <h1 className="pm-title">Oxirgi analizlar</h1>
                        <p className="pm-subtitle">Siz qo'shgan analizlar tarixi</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="pm-stats">
                <div className="pm-stat-card pm-stat-blue">
                    <div className="pm-stat-icon"><ClipboardList size={22} /></div>
                    <div>
                        <span className="pm-stat-num">{diagnoses.length}</span>
                        <span className="pm-stat-label">Jami analizlar</span>
                    </div>
                </div>
                <div className="pm-stat-card pm-stat-green">
                    <div className="pm-stat-icon"><Calendar size={22} /></div>
                    <div>
                        <span className="pm-stat-num">{todayCount}</span>
                        <span className="pm-stat-label">Bugungi analizlar</span>
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
                            placeholder="Bemor ismi yoki analiz bo'yicha qidirish..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>
                    <div className="pm-filters">
                        <button className={`pm-filter-btn ${dateFilter === 'all' ? 'active' : ''}`} onClick={() => handleFilter('all')}>
                            Barchasi
                        </button>
                        <button className={`pm-filter-btn ${dateFilter === 'today' ? 'active' : ''}`} onClick={() => handleFilter('today')}>
                            <Calendar size={14} /> Bugungi ({todayCount})
                        </button>
                    </div>
                </div>
                <div className="pm-toolbar-info">
                    <span>Jami: <strong>{filtered.length}</strong> ta</span>
                </div>
            </div>

            {/* Table */}
            <div className="pm-table-wrap">
                {loading ? (
                    <div className="pm-state-box">
                        <div className="pm-spinner"></div>
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="pm-state-box">
                        <ClipboardList size={44} className="pm-state-icon" />
                        <h3>Analizlar topilmadi</h3>
                        <p>Analiz qo'shish uchun "Analiz qo'shish" tugmasini bosing</p>
                    </div>
                ) : (
                    <table className="pm-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Bemor</th>
                                <th>Telefon</th>
                                <th>Analiz</th>
                                <th>Summa</th>
                                <th>To'lov</th>
                                <th>Sana</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paged.map((d, index) => (
                                <tr key={d._id} className={isToday(d.createdAt) ? 'pm-today-row' : ''}>
                                    <td className="pm-td-num">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                                    <td>
                                        <div className="pm-user-cell">
                                            <div className="pm-avatar">{d.patient?.fullName?.charAt(0) || 'B'}</div>
                                            <span className="pm-user-name">{d.patient?.fullName || '-'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="pm-phone-cell">
                                            <Phone size={13} /> {d.patient?.phone || '-'}
                                        </div>
                                    </td>
                                    <td style={{ maxWidth: '200px' }}>
                                        <span style={{ fontSize: '0.85rem' }}>
                                            {d.diagnosisName?.split(',').slice(0, 2).join(', ')}
                                            {d.diagnosisName?.split(',').length > 2 && ` +${d.diagnosisName.split(',').length - 2}`}
                                        </span>
                                    </td>
                                    <td><strong>{d.totalAmount?.toLocaleString() || 0} so'm</strong></td>
                                    <td>{getPaymentLabel(d.paymentMethod)}</td>
                                    <td style={{ fontSize: '0.82rem' }}>{formatDateTime(d.createdAt)}</td>
                                    <td>
                                        <div className="pm-actions">
                                            <button
                                                className="pm-act-btn pm-act-view"
                                                title="Analizga o'tish"
                                                onClick={() => navigate(`/doctor/patients/diagnosis/${d.patient?._id}`)}
                                            >
                                                <Eye size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {totalPages > 1 && (
                    <div className="pm-pagination">
                        <span className="pm-page-info">
                            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length} ta
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
                                        ? <span key={`d${idx}`} className="pm-page-dots">…</span>
                                        : <button key={item} className={`pm-page-btn ${item === currentPage ? 'active' : ''}`} onClick={() => goToPage(item)}>{item}</button>
                                )
                            }
                            <button className="pm-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>›</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default DoctorAnalyses
