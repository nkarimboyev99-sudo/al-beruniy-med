import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    UserPlus, Plus, Search, Edit2, Eye,
    Phone, Calendar, User, FileText,
    Save, Check, X, Stethoscope, ClipboardList, Printer
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
    const [patientDiagnoses, setPatientDiagnoses] = useState([])
    const [diagnosesLoading, setDiagnosesLoading] = useState(false)
    const [diagnosesList, setDiagnosesList] = useState([])

    const [formData, setFormData] = useState({
        fullName: '', birthDate: '', gender: 'male', phone: '', passportNumber: '', referredBy: '', notes: ''
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Patient autocomplete
    const [suggestions, setSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [searchLoading, setSearchLoading] = useState(false)
    const debounceRef = useRef(null)

    // ReferredBy autocomplete
    const [referringDoctors, setReferringDoctors] = useState([])
    const [refDocSuggestions, setRefDocSuggestions] = useState([])
    const [showRefDocSuggestions, setShowRefDocSuggestions] = useState(false)

    useEffect(() => {
        fetchPatients()
        fetchReferringDoctors()
        fetchDiagnosesList()
    }, [])

    const fetchDiagnosesList = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/diagnoses', { headers: { 'Authorization': `Bearer ${token}` } })
            if (res.ok) setDiagnosesList(await res.json())
        } catch (e) { console.error(e) }
    }

    const printReceipt = (d, patient) => {
        const now = new Date()
        const dateStr = new Date(d.createdAt || now).toLocaleString('uz-UZ')
        const registrator = JSON.parse(localStorage.getItem('user') || '{}')
        const clinic = JSON.parse(localStorage.getItem('clinicSettings') || '{}')
        const clinicName = clinic.clinicName || 'Al-Beruniy Med'
        const clinicAddress = clinic.address || ''
        const clinicPhone = clinic.phone || ''
        const birthStr = patient?.birthDate ? new Date(patient.birthDate).toLocaleDateString('uz-UZ') : ''
        const barcodeVal = (patient?._id || '').slice(-8) || '00000000'
        const prices = d.diagnosisPrices || []
        const names = (d.diagnosisName || '').split(',').map(s => s.trim()).filter(Boolean)
        const discount = d.discount || 0
        const total = d.totalAmount || 0
        const payMethod = d.paymentMethod === 'card' ? 'Karta' : d.paymentMethod === 'transfer' ? "O'tkazma" : 'Naqd'

        const rows = names.map(name => {
            const priceObj = prices.find(p => p.name === name)
            const price = priceObj?.price || 0
            return `<tr><td>${name}</td><td>Laboratoriya</td><td>${price.toLocaleString()}</td></tr>`
        }).join('')

        const win = window.open('', '_blank')
        if (!win) { alert("Popup bloklandi! Ruxsat bering."); return }
        win.document.write(`<!DOCTYPE html><html><head><title>Chek</title><meta charset="utf-8"/>
<style>
    @page { margin: 3mm 4mm; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; width: 74mm; font-size: 11px; color: #000; background: #fff; }
    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
    .clinic-name { font-size: 13px; font-weight: 900; margin-top: 4px; }
    .clinic-info { font-size: 10px; line-height: 1.6; margin-top: 3px; }
    .receipt-title { font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 8px 0 0; }
    .patient-block { text-align: center; margin: 8px 0; font-size: 11px; line-height: 1.9; border-bottom: 1px dashed #000; padding-bottom: 8px; }
    .patient-block div { display: flex; justify-content: center; gap: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    th { font-weight: 700; text-align: left; padding: 5px 4px; border: 1px solid #000; }
    td { padding: 5px 4px; border: 1px solid #000; vertical-align: top; word-break: break-word; }
    .total-section { border-top: 2px solid #000; margin-top: 0; padding: 7px 4px; text-align: center; font-size: 13px; font-weight: 900; text-transform: uppercase; }
    .discount-row { text-align: center; font-size: 11px; padding: 3px 0; border-top: 1px dotted #000; }
    .footer { text-align: center; font-size: 10px; padding-top: 6px; border-top: 1px dashed #000; margin-top: 4px; }
    @media print { body { width: 74mm; } }
</style></head><body>
    <div class="header">
        <div class="clinic-name">${clinicName}</div>
        <div class="clinic-info">
            ${clinicAddress ? `<div>Manzil: ${clinicAddress}</div>` : ''}
            ${clinicPhone ? `<div>Tel: ${clinicPhone}</div>` : ''}
        </div>
        <div class="receipt-title">To'lov uchun hisob</div>
    </div>
    <div class="patient-block">
        <div><b>Bemor:</b>&nbsp;${patient?.fullName || ''}</div>
        ${patient?.phone ? `<div><b>Telefon:</b>&nbsp;${patient.phone}</div>` : ''}
        ${birthStr ? `<div><b>Tug'ilgan sana:</b>&nbsp;${birthStr}</div>` : ''}
        <div><b>Registrator:</b>&nbsp;${registrator.fullName || registrator.username || ''}</div>
        <div><b>Sana:</b>&nbsp;${dateStr}</div>
    </div>
    <table>
        <thead><tr><th style="width:52%">Xizmat</th><th style="width:26%">Bo'lim</th><th style="width:22%">Summa</th></tr></thead>
        <tbody>${rows}</tbody>
    </table>
    ${discount > 0 ? `<div class="discount-row">Chegirma: − ${discount.toLocaleString()} so'm</div>` : ''}
    <div class="discount-row">To'lov: ${payMethod}</div>
    <div class="total-section">Jami: ${total.toLocaleString()} so'm</div>
    <div class="footer">Ma'lumotlarning to'g'riligini tekshiring!</div>
</body></html>`)
        win.document.close()
        setTimeout(() => { win.print(); win.close() }, 800)
    }

    // Test nomidan kategoriya nomini olish
    const getCategoryForTest = (testName) => {
        const match = diagnosesList.find(d => d.name === testName)
        return match?.category?.name || null
    }

    // diagnosisName stringini kategoriyalarga guruhlash
    const groupByCategory = (diagnosisName) => {
        const tags = (diagnosisName || '').split(',').map(s => s.trim()).filter(Boolean)
        const groups = {}
        const order = []
        tags.forEach(tag => {
            const cat = getCategoryForTest(tag) || 'Boshqa'
            if (!groups[cat]) { groups[cat] = []; order.push(cat) }
            groups[cat].push(tag)
        })
        return order.map(cat => ({ cat, tests: groups[cat] }))
    }

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

    const fetchReferringDoctors = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/referring-doctors', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setReferringDoctors(await res.json())
        } catch (e) { console.error(e) }
    }

    const fetchPatientDiagnoses = async (patientId) => {
        setDiagnosesLoading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/patient-diagnoses/patient/${patientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setPatientDiagnoses(await res.json())
            else setPatientDiagnoses([])
        } catch (e) {
            console.error(e)
            setPatientDiagnoses([])
        } finally {
            setDiagnosesLoading(false)
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
            referredBy: patient.referredBy || '',
            notes: patient.notes || ''
        })
    }

    const handleRefDocInput = (val) => {
        setFormData(f => ({ ...f, referredBy: val }))
        if (val.length >= 2) {
            const filtered = referringDoctors.filter(d =>
                d.fullName?.toLowerCase().includes(val.toLowerCase())
            )
            setRefDocSuggestions(filtered)
            setShowRefDocSuggestions(filtered.length > 0)
        } else {
            setShowRefDocSuggestions(false)
        }
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
        setFormData({ fullName: '', birthDate: '', gender: 'male', phone: '', passportNumber: '', referredBy: '', notes: '' })
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
            referredBy: patient.referredBy || '',
            notes: patient.notes || ''
        })
        setError('')
        setSuccess('')
        setShowModal(true)
    }

    const handleView = (patient) => {
        setSelectedPatient(patient)
        setPatientDiagnoses([])
        setShowViewModal(true)
        fetchPatientDiagnoses(patient._id)
    }

    // Helpers
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('uz-UZ') : '-'
    const formatDateTime = (d) => d ? new Date(d).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
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

                                <div className="pe-field" style={{ position: 'relative' }}>
                                    <label className="pe-label">Yo'naltirgan doktor</label>
                                    <input
                                        type="text"
                                        className="pe-input"
                                        placeholder="Doktor ismi (2 harf yozing...)"
                                        value={formData.referredBy}
                                        onChange={(e) => handleRefDocInput(e.target.value)}
                                        onBlur={() => setTimeout(() => setShowRefDocSuggestions(false), 150)}
                                        autoComplete="off"
                                    />
                                    {showRefDocSuggestions && (
                                        <ul style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0,
                                            background: 'var(--bg-card,#fff)', border: '1px solid var(--border-color,#e2e8f0)',
                                            borderRadius: '8px', zIndex: 100, margin: 0, padding: '4px 0',
                                            listStyle: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '180px', overflowY: 'auto'
                                        }}>
                                            {refDocSuggestions.map(d => (
                                                <li key={d._id}
                                                    style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '0.9rem' }}
                                                    onMouseDown={() => {
                                                        setFormData(f => ({ ...f, referredBy: d.fullName }))
                                                        setShowRefDocSuggestions(false)
                                                    }}
                                                >
                                                    {d.fullName}
                                                    {d.organization && <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: '0.8rem' }}>— {d.organization}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
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
                    <div className="pv-modal" onClick={(e) => e.stopPropagation()} style={{
                        background: 'var(--bg-card,#fff)', borderRadius: '16px',
                        width: '100%', maxWidth: '580px', maxHeight: '88vh',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.18)'
                    }}>
                        {/* Header */}
                        <div className="pe-header" style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', borderRadius: '16px 16px 0 0' }}>
                            <div className="pe-title">
                                <div className="pe-title-icon"><Eye size={18} /></div>
                                <h2>Bemor ma'lumotlari</h2>
                            </div>
                            <button className="pe-close" onClick={() => setShowViewModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ overflowY: 'auto', flex: 1, background: '#fff' }} className="rp-view-body">
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

                                {selectedPatient.referredBy && (
                                    <div className="pv-notes" style={{ marginTop: '12px' }}>
                                        <Stethoscope size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                        <strong>Yo'naltirgan doktor:</strong> {selectedPatient.referredBy}
                                    </div>
                                )}

                                {/* Analizlar tarixi */}
                                <div className="pv-section" style={{ marginTop: '16px' }}>
                                    <div className="pv-section-header">
                                        <h4>
                                            <ClipboardList size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                            Analizlar tarixi
                                        </h4>
                                    </div>
                                    {diagnosesLoading ? (
                                        <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                                            <div className="spinner-sm" style={{ display: 'inline-block', marginRight: 8 }}></div>
                                            Yuklanmoqda...
                                        </div>
                                    ) : patientDiagnoses.length === 0 ? (
                                        <div className="pv-empty">
                                            <ClipboardList size={24} />
                                            <p>Analizlar topilmadi</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {patientDiagnoses.map((d) => {
                                                const nameStr = d.diagnosisName || d.diagnosis?.name || 'Analiz'
                                                const catGroups = groupByCategory(nameStr)
                                                return (
                                                    <div key={d._id} style={{
                                                        borderRadius: '10px', padding: '10px 14px',
                                                        background: '#fff',
                                                        border: '1px solid #e2e8f0',
                                                        borderLeft: '3px solid #3b82f6'
                                                    }}>
                                                        {/* Kategoriyalar ro'yxati */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '8px' }}>
                                                            {catGroups.map(({ cat, tests }) => (
                                                                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{
                                                                        fontSize: '0.83rem', fontWeight: 600,
                                                                        color: '#1e293b'
                                                                    }}>{cat}</span>
                                                                    <span style={{
                                                                        fontSize: '0.75rem', color: '#fff',
                                                                        background: '#3b82f6', borderRadius: '20px',
                                                                        padding: '1px 7px', fontWeight: 500
                                                                    }}>{tests.length} ta</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {/* Meta + tugmalar */}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.77rem', color: '#64748b' }}>
                                                                <span><Calendar size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />{formatDateTime(d.createdAt)}</span>
                                                                {d.totalAmount > 0 && <span style={{ fontWeight: 600, color: '#059669' }}>{d.totalAmount.toLocaleString()} so'm</span>}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                <button
                                                                    className="pm-act-btn pm-act-view"
                                                                    title="Chek chiqarish"
                                                                    onClick={() => printReceipt(d, selectedPatient)}
                                                                >
                                                                    <Printer size={14} />
                                                                </button>
                                                                <button
                                                                    className="pm-act-btn pm-act-edit"
                                                                    title="Tahrirlash"
                                                                    onClick={() => {
                                                                        setShowViewModal(false)
                                                                        navigate(`/registrator/patients/diagnosis/${selectedPatient._id}?edit=${d._id}`)
                                                                    }}
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 16px 16px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button className="pe-btn pe-btn-cancel" onClick={() => setShowViewModal(false)}>
                                Yopish
                            </button>
                            <button className="pe-btn pe-btn-save" onClick={() => { setShowViewModal(false); handleEdit(selectedPatient) }}>
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
