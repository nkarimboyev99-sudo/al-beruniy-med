import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import {
    BookOpen,
    Calendar,
    Check,
    ChevronLeft,
    ChevronRight,
    Edit2,
    FileSpreadsheet,
    Plus,
    Printer,
    RefreshCw,
    Search,
    X
} from 'lucide-react'
import './Journal.css'

function Journal() {
    const [categories, setCategories] = useState([])
    const [activeCategory, setActiveCategory] = useState(null)
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const [journalData, setJournalData] = useState({ category: null, testNames: [], patients: [] })
    const [editingRowId, setEditingRowId] = useState(null)
    const [editForm, setEditForm] = useState({})
    const [saving, setSaving] = useState(false)
    const [notification, setNotification] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [newRowForm, setNewRowForm] = useState({
        patientName: '',
        referringDoctor: 'amb',
        totalPrice: '',
        date: new Date().toISOString().split('T')[0],
        results: {}
    })

    const tableScrollRef = useRef(null)

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const token = localStorage.getItem('token')
                const res = await fetch('/api/journal/categories', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (!res.ok) return

                const data = await res.json()
                if (Array.isArray(data) && data.length > 0) {
                    setCategories(data)
                    setActiveCategory((current) => current || data[0]._id)
                }
            } catch (err) {
                console.error('Kategoriyalarni yuklashda xatolik:', err)
            }
        }

        fetchCategories()
    }, [])

    const fetchJournalData = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            let url = `/api/journal?month=${selectedMonth}`
            if (activeCategory) url += `&categoryId=${activeCategory}`

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setJournalData(data)
            }
        } catch (err) {
            console.error('Jurnal ma\'lumotlarini yuklashda xatolik:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchJournalData()
    }, [activeCategory, selectedMonth])

    const normalizeText = (value) => (value || '').toString().trim().toLowerCase()

    const getObjectId = (value) => {
        if (!value) return ''
        if (typeof value === 'string') return value
        if (value._id) return value._id.toString()
        return value.toString()
    }

    const getResultForTest = (patient, test) => {
        if (!patient || !test) return '-'
        const resMap = patient.results || {}
        const custMap = patient.customValues || {}
        const id = getObjectId(test._id)
        const code = test.code
        const name = test.name
        const nameLower = normalizeText(name)

        const keys = [
            id ? `diagnosis:${id}` : '',
            code,
            name
        ].filter(Boolean)

        for (const key of keys) {
            if (resMap[key] !== undefined && resMap[key] !== '') return resMap[key]
            if (custMap[key] !== undefined && custMap[key] !== '') return custMap[key]
        }

        for (const [key, value] of Object.entries(resMap)) {
            if (value === undefined || value === null || value === '' || value === '-') continue
            const keyLower = normalizeText(key)
            if (nameLower && (keyLower === nameLower || keyLower.includes(nameLower) || nameLower.includes(keyLower))) {
                return value
            }
        }

        return '-'
    }

    const showNotice = (msg) => {
        setNotification(msg)
        setTimeout(() => setNotification(''), 3000)
    }

    const handleStartEdit = (patient) => {
        setEditingRowId(patient._id)
        setEditForm({
            referringDoctor: patient.referringDoctor || 'amb',
            totalPrice: patient.totalPrice || 0,
            results: { ...(patient.results || {}) },
            customValues: { ...(patient.customValues || {}) }
        })
    }

    const handleCancelEdit = () => {
        setEditingRowId(null)
        setEditForm({})
    }

    const handleSaveEdit = async (patientId) => {
        setSaving(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/journal/entry/${patientId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(editForm)
            })

            if (res.ok) {
                showNotice('Yozuv muvaffaqiyatli yangilandi')
                setEditingRowId(null)
                fetchJournalData()
            } else {
                showNotice('Saqlashda xatolik yuz berdi')
            }
        } catch {
            showNotice('Server bilan aloqa yo\'q')
        } finally {
            setSaving(false)
        }
    }

    const handleCreateNewRow = async (e) => {
        e.preventDefault()
        if (!newRowForm.patientName.trim()) {
            showNotice('Bemor F.I.O kiritilishi shart')
            return
        }

        setSaving(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/journal/entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...newRowForm,
                    categoryId: activeCategory
                })
            })

            if (res.ok) {
                showNotice('Yangi yozuv muvaffaqiyatli qo\'shildi')
                setShowAddModal(false)
                setNewRowForm({
                    patientName: '',
                    referringDoctor: 'amb',
                    totalPrice: '',
                    date: new Date().toISOString().split('T')[0],
                    results: {}
                })
                fetchJournalData()
            } else {
                showNotice('Qo\'shishda xatolik yuz berdi')
            }
        } catch {
            showNotice('Server bilan aloqa yo\'q')
        } finally {
            setSaving(false)
        }
    }

    const filteredPatients = (journalData.patients || []).filter(p => {
        const query = normalizeText(searchTerm)
        if (!query) return true
        return (
            normalizeText(p.patientName).includes(query) ||
            (p.dailyNumber && p.dailyNumber.toString().includes(query)) ||
            normalizeText(p.referringDoctor).includes(query)
        )
    })

    const buildExportRows = () => filteredPatients.map((p, idx) => {
        const row = {
            '№': p.dailyNumber || idx + 1,
            'F.I.O (Bemor)': p.patientName,
            'Sana': p.date,
            'Yo\'naltirgan': p.referringDoctor || 'amb'
        }

        ;(journalData.testNames || []).forEach(t => {
            row[t.name] = getResultForTest(p, t)
        })

        row['Narxi (so\'m)'] = Number(p.totalPrice || 0)
        return row
    })

    const handleExportExcel = () => {
        const catName = journalData.category?.name || 'Jurnal'
        const rows = buildExportRows()
        const headers = [
            '№',
            'F.I.O (Bemor)',
            'Sana',
            'Yo\'naltirgan',
            ...(journalData.testNames || []).map(t => t.name),
            'Narxi (so\'m)'
        ]
        const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
        ws['!cols'] = headers.map((header) => ({ wch: Math.min(45, Math.max(10, header.length + 4)) }))
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, catName.substring(0, 31) || 'Jurnal')
        XLSX.writeFile(wb, `Jurnal_${catName}_${selectedMonth}.xlsx`)
    }

    const handlePrint = () => {
        window.print()
    }

    const handleTableScroll = (direction) => {
        const node = tableScrollRef.current
        if (!node) return
        node.scrollBy({
            left: direction * Math.max(260, Math.floor(node.clientWidth * 0.75)),
            behavior: 'smooth'
        })
    }

    const currentCatName = journalData.category?.name || 'Laboratoriya Jurnali'

    return (
        <div className="journal-page">
            <div className="journal-header-card">
                <div className="journal-title-box">
                    <BookOpen className="journal-header-icon" size={28} />
                    <div>
                        <h2>Laboratoriya Jurnali</h2>
                        <p className="journal-subtitle">
                            Barcha tahlil natijalari ro'yxati, tahrirlash va Excel yuklab olish
                        </p>
                    </div>
                </div>

                <div className="journal-actions">
                    <button
                        className="journal-btn add-btn"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus size={18} />
                        <span>Yangi yozuv qo'shish</span>
                    </button>
                    <button className="journal-btn excel-btn" onClick={handleExportExcel}>
                        <FileSpreadsheet size={18} />
                        <span>Excel (.xlsx) yuklab olish</span>
                    </button>
                    <button className="journal-btn print-btn" onClick={handlePrint}>
                        <Printer size={18} />
                        <span>Chop etish</span>
                    </button>
                </div>
            </div>

            {notification && <div className="journal-toast">{notification}</div>}

            <div className="journal-controls-card">
                <div className="journal-filter-row">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Bemor F.I.O yoki raqami bo'yicha qidirish..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="month-picker">
                        <Calendar size={18} className="calendar-icon" />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        />
                    </div>

                    <button className="journal-btn refresh-btn" onClick={fetchJournalData} title="Yangilash">
                        <RefreshCw size={18} />
                    </button>
                </div>

                <div className="category-tabs">
                    {categories.map((cat) => (
                        <button
                            key={cat._id}
                            className={`tab-btn ${activeCategory === cat._id ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat._id)}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="journal-table-card">
                <div className="table-header-banner">
                    <div>
                        <h3>Laboratoriya jurnali ({currentCatName})</h3>
                        <span className="month-badge">{selectedMonth} y.</span>
                    </div>

                    <div className="journal-actions-top no-print">
                        <button className="journal-btn add-btn-sm" onClick={() => setShowAddModal(true)}>
                            <Plus size={16} />
                            <span>Qo'shish</span>
                        </button>
                        <button
                            className="journal-btn scroll-btn-sm"
                            onClick={() => handleTableScroll(-1)}
                            title="Jadvalni chapga surish"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            className="journal-btn scroll-btn-sm"
                            onClick={() => handleTableScroll(1)}
                            title="Jadvalni o'ngga surish"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button className="journal-btn excel-btn-sm" onClick={handleExportExcel}>
                            <FileSpreadsheet size={16} />
                            <span>Excel</span>
                        </button>
                        <button className="journal-btn print-btn-sm" onClick={handlePrint}>
                            <Printer size={16} />
                            <span>Chop etish</span>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="table-loader">
                        <RefreshCw size={32} className="spin" />
                        <p>Jurnal ma'lumotlari yuklanmoqda...</p>
                    </div>
                ) : filteredPatients.length === 0 ? (
                    <div className="table-empty">
                        <p>Ushbu oy bo'yicha kiritilgan analiz natijalari topilmadi</p>
                    </div>
                ) : (
                    <div className="journal-table-wrapper" ref={tableScrollRef}>
                        <table className="journal-excel-table">
                            <thead>
                                <tr>
                                    <th className="col-num">№</th>
                                    <th className="col-name">F.I.O (Bemor)</th>
                                    <th className="col-date">Sana</th>
                                    <th className="col-ref">Yo'naltirgan</th>
                                    {(journalData.testNames || []).map((test) => (
                                        <th key={test._id || test.code || test.name} className="col-test">
                                            {test.name}
                                        </th>
                                    ))}
                                    <th className="col-price">Narxi (so'm)</th>
                                    <th className="col-action no-print">Amallar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPatients.map((patient, idx) => {
                                    const isEditing = editingRowId === patient._id

                                    return (
                                        <tr key={patient._id} className={isEditing ? 'editing-row' : ''}>
                                            <td className="col-num font-mono">{patient.dailyNumber || idx + 1}</td>
                                            <td className="col-name font-medium" title={patient.patientName}>
                                                {patient.patientName}
                                            </td>
                                            <td className="col-date">{patient.date}</td>
                                            <td className="col-ref">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        className="cell-input"
                                                        value={editForm.referringDoctor || ''}
                                                        onChange={(e) => setEditForm({
                                                            ...editForm,
                                                            referringDoctor: e.target.value
                                                        })}
                                                    />
                                                ) : (
                                                    <span>{patient.referringDoctor || 'amb'}</span>
                                                )}
                                            </td>

                                            {(journalData.testNames || []).map((test) => {
                                                const key = test.code || test.name
                                                const idKey = test._id ? `diagnosis:${test._id}` : ''
                                                const val = isEditing
                                                    ? (editForm.results?.[idKey] ?? editForm.results?.[key] ?? editForm.customValues?.[key] ?? '')
                                                    : getResultForTest(patient, test)

                                                return (
                                                    <td key={test._id || key} className="col-test">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                className="cell-input test-cell-input"
                                                                value={val}
                                                                onChange={(e) => setEditForm({
                                                                    ...editForm,
                                                                    results: {
                                                                        ...editForm.results,
                                                                        [idKey || key]: e.target.value,
                                                                        [key]: e.target.value
                                                                    }
                                                                })}
                                                            />
                                                        ) : (
                                                            <span className={val !== '-' ? 'result-val' : 'result-empty'}>
                                                                {val}
                                                            </span>
                                                        )}
                                                    </td>
                                                )
                                            })}

                                            <td className="col-price font-mono font-bold">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        className="cell-input num-input"
                                                        value={editForm.totalPrice || 0}
                                                        onChange={(e) => setEditForm({
                                                            ...editForm,
                                                            totalPrice: e.target.value
                                                        })}
                                                    />
                                                ) : (
                                                    <span>{Number(patient.totalPrice || 0).toLocaleString()} so'm</span>
                                                )}
                                            </td>

                                            <td className="col-action no-print">
                                                {isEditing ? (
                                                    <div className="action-row">
                                                        <button
                                                            className="icon-btn save-btn"
                                                            onClick={() => handleSaveEdit(patient._id)}
                                                            disabled={saving}
                                                            title="Saqlash"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            className="icon-btn cancel-btn"
                                                            onClick={handleCancelEdit}
                                                            title="Bekor qilish"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="icon-btn edit-btn"
                                                        onClick={() => handleStartEdit(patient)}
                                                        title="Qo'lda tahrirlash"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content journal-add-modal">
                        <div className="modal-header">
                            <h3>Yangi Jurnal Yozuvi Qo'shish</h3>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateNewRow}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Bemor F.I.O *</label>
                                    <input
                                        type="text"
                                        placeholder="Bemor familiyasi va ismini kiriting"
                                        value={newRowForm.patientName}
                                        onChange={(e) => setNewRowForm({ ...newRowForm, patientName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-row-2">
                                    <div className="form-group">
                                        <label>Yo'naltirgan Shifokor</label>
                                        <input
                                            type="text"
                                            placeholder="amb"
                                            value={newRowForm.referringDoctor}
                                            onChange={(e) => setNewRowForm({ ...newRowForm, referringDoctor: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Narxi (so'm)</label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={newRowForm.totalPrice}
                                            onChange={(e) => setNewRowForm({ ...newRowForm, totalPrice: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Sana</label>
                                    <input
                                        type="date"
                                        value={newRowForm.date}
                                        onChange={(e) => setNewRowForm({ ...newRowForm, date: e.target.value })}
                                    />
                                </div>

                                {journalData.testNames && journalData.testNames.length > 0 && (
                                    <div className="form-tests-section">
                                        <label className="section-label">Analiz Ko'rsatkichlari (Natijalar):</label>
                                        <div className="tests-grid">
                                            {journalData.testNames.map((test) => {
                                                const key = test._id ? `diagnosis:${test._id}` : (test.code || test.name)
                                                return (
                                                    <div key={key} className="test-input-item">
                                                        <span>{test.name}</span>
                                                        <input
                                                            type="text"
                                                            placeholder="Natija"
                                                            value={newRowForm.results[key] || ''}
                                                            onChange={(e) => setNewRowForm({
                                                                ...newRowForm,
                                                                results: {
                                                                    ...newRowForm.results,
                                                                    [key]: e.target.value,
                                                                    [test.code || test.name]: e.target.value
                                                                }
                                                            })}
                                                        />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="journal-btn cancel-modal-btn" onClick={() => setShowAddModal(false)}>
                                    Bekor qilish
                                </button>
                                <button type="submit" className="journal-btn add-btn" disabled={saving}>
                                    {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Journal
