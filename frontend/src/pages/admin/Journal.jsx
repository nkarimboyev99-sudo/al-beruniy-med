import { useState, useEffect, useRef } from 'react'
import {
    BookOpen,
    FileSpreadsheet,
    Printer,
    Search,
    Calendar,
    Edit2,
    Save,
    X,
    Check,
    RefreshCw,
    Plus
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

    // Tahrirlash va Yangi yozuv modal holatlari
    const [editingRowId, setEditingRowId] = useState(null)
    const [editForm, setEditForm] = useState({})
    const [saving, setSaving] = useState(false)
    const [notification, setNotification] = useState('')

    // Yangi yozuv qo'shish modali
    const [showAddModal, setShowAddModal] = useState(false)
    const [newRowForm, setNewRowForm] = useState({
        patientName: '',
        referringDoctor: 'amb',
        totalPrice: '',
        date: new Date().toISOString().split('T')[0],
        results: {}
    })

    const printRef = useRef(null)

    // Kategoriyalarni yuklab olish
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const token = localStorage.getItem('token')
                const res = await fetch('/api/journal/categories', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    if (Array.isArray(data) && data.length > 0) {
                        setCategories(data)
                        setActiveCategory(data[0]._id)
                    }
                }
            } catch (err) {
                console.error('Kategoriyalarni yuklashda xatolik:', err)
            }
        }
        fetchCategories()
    }, [])

    // Jurnal ma'lumotlarini yuklash
    const fetchJournalData = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            let url = `/api/journal?month=${selectedMonth}`
            if (activeCategory) url += `&categoryId=${activeCategory}`

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
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

    // Smart test value extractor
    const getResultForTest = (patient, test) => {
        if (!patient || !test) return '-'
        const resMap = patient.results || {}
        const custMap = patient.customValues || {}

        const code = test.code
        const name = test.name
        const nameLower = name ? name.toLowerCase().trim() : ''

        // 1. Match by code
        if (code && resMap[code] !== undefined && resMap[code] !== '') return resMap[code]
        if (code && custMap[code] !== undefined && custMap[code] !== '') return custMap[code]

        // 2. Direct match by name
        if (name && resMap[name] !== undefined && resMap[name] !== '') return resMap[name]
        if (name && custMap[name] !== undefined && custMap[name] !== '') return custMap[name]

        // 3. Case-insensitive / partial match
        for (const [k, v] of Object.entries(resMap)) {
            if (v === undefined || v === null || v === '' || v === '-') continue
            const kLower = k.toLowerCase().trim()
            if (nameLower && (kLower === nameLower || kLower.includes(nameLower) || nameLower.includes(kLower))) {
                return v
            }
        }

        return '-'
    }

    // Bildirishnoma ko'rsatish
    const showNotice = (msg) => {
        setNotification(msg)
        setTimeout(() => setNotification(''), 3000)
    }

    // Tahrirlashni boshlash
    const handleStartEdit = (patient) => {
        setEditingRowId(patient._id)
        setEditForm({
            referringDoctor: patient.referringDoctor || 'amb',
            totalPrice: patient.totalPrice || 0,
            results: { ...patient.results },
            customValues: { ...patient.customValues }
        })
    }

    // Tahrirlashni bekor qilish
    const handleCancelEdit = () => {
        setEditingRowId(null)
        setEditForm({})
    }

    // Qatordagi o'zgarishni saqlash
    const handleSaveEdit = async (patientId) => {
        setSaving(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/journal/entry/${patientId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editForm)
            })

            if (res.ok) {
                showNotice('✅ Yozuv muvaffaqiyatli yangilandi')
                setEditingRowId(null)
                fetchJournalData()
            } else {
                showNotice('❌ Saqlashda xatolik yuz berdi')
            }
        } catch (err) {
            showNotice('❌ Server bilan aloqa yo\'q')
        } finally {
            setSaving(false)
        }
    }

    // Yangi yozuv saqlash
    const handleCreateNewRow = async (e) => {
        e.preventDefault()
        if (!newRowForm.patientName.trim()) {
            showNotice('⚠️ Bemor F.I.O kiritilishi shart')
            return
        }

        setSaving(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/journal/entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...newRowForm,
                    categoryId: activeCategory
                })
            })

            if (res.ok) {
                showNotice('✅ Yangi yozuv muvaffaqiyatli qo\'shildi')
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
                showNotice('❌ Qo\'shishda xatolik yuz berdi')
            }
        } catch (err) {
            showNotice('❌ Server bilan aloqa yo\'q')
        } finally {
            setSaving(false)
        }
    }

    // Excel formatida yuklab olish (.xlsx / HTML Excel Table)
    const handleExportExcel = () => {
        const catName = journalData.category?.name || 'Jurnal'
        const fileName = `Jurnal_${catName}_${selectedMonth}.xls`

        let tableHTML = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8" />
                <!--[if gte mso 9]>
                <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>${catName.replace(/[\\/*?:[\]]/g, '')}</x:Name>
                            <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                <style>
                    table { border-collapse: collapse; width: 100%; font-family: Calibri, Arial, sans-serif; }
                    th, td { border: 1px solid #999; padding: 6px 10px; text-align: center; font-size: 13px; color: #000; }
                    th { background-color: #e2e8f0; font-weight: bold; }
                    .title { font-size: 18px; font-weight: bold; text-align: center; border: none; padding: 12px; }
                    .number { mso-number-format:"\#\,\#\#0"; }
                </style>
            </head>
            <body>
                <table>
                    <tr>
                        <td colspan="${5 + (journalData.testNames?.length || 0)}" class="title">
                            Журнал для общего анализа (${catName}) - ${selectedMonth}
                        </td>
                    </tr>
                    <tr>
                        <th>№</th>
                        <th>Ф.И.О (Bemor)</th>
                        <th>Дата (Sana)</th>
                        <th>Направил (Yo'naltirgan)</th>
                        ${(journalData.testNames || []).map(t => `<th>${t.name}</th>`).join('')}
                        <th>Narxi (so'm)</th>
                    </tr>
        `

        filteredPatients.forEach((p, idx) => {
            tableHTML += `
                <tr>
                    <td>${p.dailyNumber || idx + 1}</td>
                    <td style="text-align: left;">${p.patientName}</td>
                    <td>${p.date}</td>
                    <td>${p.referringDoctor || 'amb'}</td>
                    ${(journalData.testNames || []).map(t => {
                        const val = getResultForTest(p, t)
                        return `<td>${val}</td>`
                    }).join('')}
                    <td class="number">${Number(p.totalPrice || 0).toLocaleString()}</td>
                </tr>
            `
        })

        tableHTML += `
                </table>
            </body>
            </html>
        `

        const blob = new Blob(['\ufeff' + tableHTML], { type: 'application/vnd.ms-excel;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    // Chop etish (Print)
    const handlePrint = () => {
        window.print()
    }

    // Qidiruv bo'yicha filterlash
    const filteredPatients = (journalData.patients || []).filter(p => {
        const query = searchTerm.toLowerCase()
        return (
            (p.patientName && p.patientName.toLowerCase().includes(query)) ||
            (p.dailyNumber && p.dailyNumber.toString().includes(query)) ||
            (p.referringDoctor && p.referringDoctor.toLowerCase().includes(query))
        )
    })

    const currentCatName = journalData.category?.name || 'Laboratoriya Jurnali'

    return (
        <div className="journal-page">
            {/* Header Section */}
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
                        style={{ background: '#7c3aed', color: '#ffffff' }}
                    >
                        <Plus size={18} />
                        <span>+ Yangi yozuv qo'shish</span>
                    </button>
                    <button
                        className="journal-btn excel-btn"
                        onClick={handleExportExcel}
                        style={{ background: '#16a34a', color: '#ffffff' }}
                    >
                        <FileSpreadsheet size={18} />
                        <span>Excel (.xlsx) yuklash</span>
                    </button>
                    <button
                        className="journal-btn print-btn"
                        onClick={handlePrint}
                        style={{ background: '#2563eb', color: '#ffffff' }}
                    >
                        <Printer size={18} />
                        <span>Chop etish</span>
                    </button>
                </div>
            </div>

            {/* Notification Toast */}
            {notification && <div className="journal-toast">{notification}</div>}

            {/* Filter & Category Bar */}
            <div className="journal-controls-card">
                {/* Search & Month Picker */}
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

                {/* Category Tabs */}
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

            {/* Table Container */}
            <div className="journal-table-card" ref={printRef}>
                <div className="table-header-banner">
                    <div>
                        <h3>Журнал для общего анализа ({currentCatName})</h3>
                        <span className="month-badge">{selectedMonth} y.</span>
                    </div>

                    {/* Secondary Action Buttons for max visibility */}
                    <div className="journal-actions-top no-print">
                        <button
                            className="journal-btn add-btn-sm"
                            onClick={() => setShowAddModal(true)}
                        >
                            <Plus size={16} />
                            <span>+ Qo'shish</span>
                        </button>
                        <button
                            className="journal-btn excel-btn-sm"
                            onClick={handleExportExcel}
                        >
                            <FileSpreadsheet size={16} />
                            <span>Excel</span>
                        </button>
                        <button
                            className="journal-btn print-btn-sm"
                            onClick={handlePrint}
                        >
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
                    <div className="journal-table-wrapper">
                        <table className="journal-excel-table">
                            <thead>
                                <tr>
                                    <th className="col-num">№</th>
                                    <th className="col-name">Ф.И.О (Bemor)</th>
                                    <th className="col-date">Дата (Sana)</th>
                                    <th className="col-ref">Направил</th>
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

                                            {/* Yo'naltirgan shifokor */}
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

                                            {/* Analiz natijalari dinamik ustunlari */}
                                            {(journalData.testNames || []).map((test) => {
                                                const key = test.code || test.name
                                                const val = isEditing
                                                    ? (editForm.results?.[key] ?? editForm.customValues?.[key] ?? '')
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

                                            {/* Narxi (so'm) - OXIRGI USTUN */}
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

                                            {/* Amallar (Tahrirlash / Saqlash) */}
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

            {/* Modal: Yangi yozuv qo'shish */}
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

                                {/* Dynamic test values inputs */}
                                {journalData.testNames && journalData.testNames.length > 0 && (
                                    <div className="form-tests-section">
                                        <label className="section-label">Analiz Ko'rsatkichlari (Natijalar):</label>
                                        <div className="tests-grid">
                                            {journalData.testNames.map((test) => {
                                                const key = test.code || test.name
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
                                                                    [key]: e.target.value
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
