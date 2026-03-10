import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    UserPlus,
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Check,
    Eye,
    Phone,
    Calendar,
    MapPin,
    User,
    FileText,
    Stethoscope,
    Printer,
    ClipboardList,
    PlusCircle,
    Save,
    AlertTriangle,
    ArrowLeft,
    ChevronDown
} from 'lucide-react'
import './DataManagement.css'
import './rfp.css'
import '../doctor/DiagnosisForm.css'

function PatientManagement({ readOnly = false }) {
    const navigate = useNavigate()
    const getBase = () => {
        const p = window.location.pathname
        if (p.startsWith('/doctor')) return '/doctor'
        if (p.startsWith('/registrator')) return '/registrator'
        return '/admin'
    }
    const [patients, setPatients] = useState([])
    const [diagnosesList, setDiagnosesList] = useState([])
    const [categoriesList, setCategoriesList] = useState([])
    const [activeCategory, setActiveCategory] = useState(null)
    const [medicinesList, setMedicinesList] = useState([])
    const [inventory, setInventory] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showViewModal, setShowViewModal] = useState(false)
    const [showDiagnosisModal, setShowDiagnosisModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showResultsEntryModal, setShowResultsEntryModal] = useState(false)
    const [selectedDiagnosisForResults, setSelectedDiagnosisForResults] = useState(null)
    const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
    const [sidebarDateFrom, setSidebarDateFrom] = useState('')
    const [sidebarDateTo, setSidebarDateTo] = useState('')
    const [expandedCats, setExpandedCats] = useState({})
    const [categoryResults, setCategoryResults] = useState([])
    const categoryResultsRef = useRef([])
    const setCategoryResultsAndRef = (valOrFn) => {
        const next = typeof valOrFn === 'function'
            ? valOrFn(categoryResultsRef.current)
            : valOrFn
        categoryResultsRef.current = next
        setCategoryResults(next)
    }
    const [deletingPatient, setDeletingPatient] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [editingPatient, setEditingPatient] = useState(null)
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [patientDiagnoses, setPatientDiagnoses] = useState([])
    const [diagnosesLoading, setDiagnosesLoading] = useState(false)
    const [selectedDiagnosis, setSelectedDiagnosis] = useState(null)
    const [lastSavedDiagnosis, setLastSavedDiagnosis] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [medicineSearchTerm, setMedicineSearchTerm] = useState('')
    const [dateFilter, setDateFilter] = useState('all') // 'all', 'today', 'pending', 'completed'
    const [currentPage, setCurrentPage] = useState(1)
    const PAGE_SIZE = 25
    const [formData, setFormData] = useState({
        fullName: '',
        birthDate: '',
        gender: 'male',
        phone: '',
        passportNumber: '',
        notes: ''
    })
    const [diagnosisFormData, setDiagnosisFormData] = useState({
        diagnoses: [], // Array of { diagnosisId, diagnosisName, medicines: [] }
        notes: ''
    })
    const [paymentData, setPaymentData] = useState({
        consultationFee: 50000,
        medicinesCost: 0,
        discount: 0,
        paymentMethod: 'cash',
        medicines: []
    })
    const [error, setError] = useState('')
    const [toast, setToast] = useState(null) // { msg, type: 'success'|'error' }

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }
    const [success, setSuccess] = useState('')
    const [diagnosisError, setDiagnosisError] = useState('')
    const [diagnosisSuccess, setDiagnosisSuccess] = useState('')
    const [diagnosisStep, setDiagnosisStep] = useState(1) // 1 = analiz tanlash, 2 = dori tayinlash
    const [savingDiagnosis, setSavingDiagnosis] = useState(false)
    const [savingPayment, setSavingPayment] = useState(false)
    const printRef = useRef(null)
    const receiptRef = useRef(null)
    const debounceRef = useRef(null)

    // Autocomplete states for patient search
    const [suggestions, setSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [searchLoading, setSearchLoading] = useState(false)

    useEffect(() => {
        fetchPatients()
        fetchDiagnosesList()
        fetchCategoriesList()
        fetchMedicinesList()
        fetchInventory()
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

    const fetchDiagnosesList = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/diagnoses', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setDiagnosesList(data)
            }
        } catch (error) {
            console.error('Error fetching diagnoses:', error)
        }
    }

    const fetchCategoriesList = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/categories', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setCategoriesList(data)
                if (data.length > 0) setActiveCategory(data[0]._id)
            }
        } catch (error) {
            console.error('Error fetching categories:', error)
        }
    }

    const fetchMedicinesList = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/medicines', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setMedicinesList(data)
            }
        } catch (error) {
            console.error('Error fetching medicines:', error)
        }
    }

    const fetchInventory = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/inventory', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setInventory(data)
            }
        } catch (error) {
            console.error('Error fetching inventory:', error)
        }
    }

    // Get medicine price from inventory
    const getMedicinePrice = (medicineId) => {
        const invItem = inventory.find(i => i.medicine?._id === medicineId)
        return invItem?.sellPrice || 0
    }

    // ========== NATIJALAR KIRITISH FUNKSIYALARI - KO'P KATEGORIYALI EXCEL ==========

    // Default ustunlar
    const defaultColumns = [
        { id: 'col_1', name: 'Название', width: '35%' },
        { id: 'col_2', name: 'Результат', width: '20%' },
        { id: 'col_3', name: 'Норма', width: '25%' },
        { id: 'col_4', name: 'Ед.', width: '15%' }
    ]

    // Taglardan avtomatik qatorlar yaratish (Название va Norma auto-fill)
    // columns - ustun ID larini aniqlash uchun (dinamik)
    // savedRows - avval saqlangan natijalar (Результат qiymatlarini saqlab qolish uchun)
    const buildAutoRows = (diagnosisName, patient = null, savedRows = [], columns = null) => {
        const cols = columns || defaultColumns
        const idName = cols[0]?.id || 'col_1'
        const idResult = cols[1]?.id || 'col_2'
        const idNorma = cols[2]?.id || 'col_3'
        const idUnit = cols[3]?.id || 'col_4'

        const tags = (diagnosisName || '').split(',').map(s => s.trim()).filter(Boolean)
        if (tags.length === 0) {
            const empty = {}
            cols.forEach(c => { empty[c.id] = '' })
            return [{ id: Date.now(), values: empty }]
        }

        const p = patient || selectedPatient
        let patientAge = null
        if (p?.birthDate) {
            const today = new Date(), birth = new Date(p.birthDate)
            patientAge = today.getFullYear() - birth.getFullYear()
            const m = today.getMonth() - birth.getMonth()
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) patientAge--
        }

        const patientGender = (patient || selectedPatient)?.gender || null

        return tags.map((tag, i) => {
            const match = diagnosesList.find(d => d.name === tag)
            let norma = '', unit = ''
            if (match && match.normalRanges && match.normalRanges.length > 0) {
                let found = null
                if (patientAge !== null) {
                    // Age + gender match
                    found = match.normalRanges.find(r => {
                        const min = r.ageMin !== '' && r.ageMin !== undefined ? Number(r.ageMin) : -Infinity
                        const max = r.ageMax !== '' && r.ageMax !== undefined ? Number(r.ageMax) : Infinity
                        const ageOk = patientAge >= min && patientAge <= max
                        const genderOk = !patientGender || !r.gender || r.gender === 'both' || r.gender === patientGender
                        return ageOk && genderOk
                    })
                    // Fallback: age match only
                    if (!found) {
                        found = match.normalRanges.find(r => {
                            const min = r.ageMin !== '' && r.ageMin !== undefined ? Number(r.ageMin) : -Infinity
                            const max = r.ageMax !== '' && r.ageMax !== undefined ? Number(r.ageMax) : Infinity
                            return patientAge >= min && patientAge <= max
                        })
                    }
                }
                if (!found) found = match.normalRanges[0]
                norma = found.range || ''
                unit = found.unit || ''
            }
            // Avval saqlangan Результат qiymatini saqlab qolish (nom bo'yicha qidirish)
            const savedRow = savedRows.find(r => r.values?.[idName] === tag)
            const rezultat = savedRow?.values?.[idResult] || ''
            return {
                id: Date.now() + i + Math.random(),
                values: {
                    [idName]: tag,
                    [idResult]: rezultat,
                    [idNorma]: norma,
                    [idUnit]: unit
                }
            }
        })
    }

    // Ko'p kategoriyali natijalar modalini ochish
    const openResultsEntryModal = async () => {
        if (!patientDiagnoses || patientDiagnoses.length === 0) {
            alert('Bu bemorda hali analizlar yo\'q!')
            return
        }

        // Barcha kategoriyalar uchun jadvallarni tayyorlash
        const allCategoryTables = patientDiagnoses.map(diagnosis => {
            const saved = diagnosis.results
            const cols = (saved?.columns?.length > 0) ? saved.columns : [...defaultColumns]
            const categoryName = diagnosis.diagnosis?.category?.name || diagnosis.diagnosisName?.split(',')[0]?.trim() || 'Natija'
            return {
                diagnosisId: diagnosis._id,
                diagnosisName: diagnosis.diagnosisName || 'Kategoriya',
                createdAt: diagnosis.createdAt,
                title: categoryName,
                columns: cols,
                rows: buildAutoRows(diagnosis.diagnosisName, null, saved?.rows || [], cols),
                conclusion: saved?.conclusion || '',
                notes: diagnosis.notes || ''
            }
        })

        setCategoryResultsAndRef(allCategoryTables)
        setShowResultsEntryModal(true)
    }

    // Bitta kategoriya jadvalini ochish
    const openSingleCategoryModal = (diagnosis) => {
        setSelectedDiagnosisForResults(diagnosis)
        setCurrentCategoryIndex(0)

        const saved = diagnosis.results
        const cols = [...defaultColumns]
        const rows = buildAutoRows(diagnosis.diagnosisName, null, saved?.rows || [], cols)

        const categoryName = diagnosis.diagnosis?.category?.name || diagnosis.diagnosisName?.split(',')[0]?.trim() || 'Natija'
        setCategoryResultsAndRef([{
            diagnosisId: diagnosis._id,
            diagnosisName: diagnosis.diagnosisName || 'Kategoriya',
            title: categoryName,
            columns: cols,
            rows,
            conclusion: saved?.conclusion || '',
            notes: diagnosis.notes || ''
        }])
        setShowResultsEntryModal(true)
    }

    // Ustun qo'shish (kategoriya indeksi bilan)
    const addResultColumn = (categoryIndex) => {
        const newColId = `col_${Date.now()}`
        setCategoryResultsAndRef(prev => prev.map((cat, idx) => {
            if (idx === categoryIndex) {
                return {
                    ...cat,
                    columns: [...cat.columns, { id: newColId, name: '', width: '15%' }],
                    rows: cat.rows.map(row => ({
                        ...row,
                        values: { ...row.values, [newColId]: '' }
                    }))
                }
            }
            return cat
        }))
    }

    // Ustunni o'chirish (kategoriya indeksi bilan)
    const removeResultColumn = (categoryIndex, colId) => {
        setCategoryResultsAndRef(prev => prev.map((cat, idx) => {
            if (idx === categoryIndex) {
                if (cat.columns.length <= 2) {
                    alert('Kamida 2 ta ustun bo\'lishi kerak!')
                    return cat
                }
                return {
                    ...cat,
                    columns: cat.columns.filter(c => c.id !== colId),
                    rows: cat.rows.map(row => {
                        const newValues = { ...row.values }
                        delete newValues[colId]
                        return { ...row, values: newValues }
                    })
                }
            }
            return cat
        }))
    }

    // Ustun nomini o'zgartirish (kategoriya indeksi bilan)
    const updateColumnName = (categoryIndex, colId, newName) => {
        setCategoryResultsAndRef(prev => prev.map((cat, idx) => {
            if (idx === categoryIndex) {
                return {
                    ...cat,
                    columns: cat.columns.map(c =>
                        c.id === colId ? { ...c, name: newName } : c
                    )
                }
            }
            return cat
        }))
    }

    // Kategoriya sarlavhasini o'zgartirish
    const updateCategoryTitle = (categoryIndex, newTitle) => {
        setCategoryResultsAndRef(prev => prev.map((cat, idx) =>
            idx === categoryIndex ? { ...cat, title: newTitle } : cat
        ))
    }

    // Kategoriya xulosasini o'zgartirish
    const updateCategoryConclusion = (categoryIndex, conclusion) => {
        setCategoryResultsAndRef(prev => prev.map((cat, idx) =>
            idx === categoryIndex ? { ...cat, conclusion } : cat
        ))
    }

    // Kategoriya izohini o'zgartirish
    const updateCategoryNotes = (categoryIndex, notes) => {
        setCategoryResultsAndRef(prev => prev.map((cat, idx) =>
            idx === categoryIndex ? { ...cat, notes } : cat
        ))
    }


    // Natijalarni saqlash - barcha kategoriyalar uchun
    const saveResults = async () => {
        const current = categoryResultsRef.current
        if (!current || !Array.isArray(current) || current.length === 0) return false

        try {
            const token = localStorage.getItem('token')
            let allSaved = true

            for (const category of current) {
                const response = await fetch(
                    `/api/patient-diagnoses/${category.diagnosisId}/results`,
                    {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            title: category.title,
                            columns: category.columns,
                            rows: category.rows.filter(r =>
                                Object.values(r.values || {}).some(v => v && v.toString().trim())
                            ).map(r => ({ values: r.values })),
                            conclusion: category.conclusion
                        })
                    }
                )

                if (response.ok) {
                    const updatedDiagnosis = await response.json()
                    setPatientDiagnoses(prev => prev.map(d =>
                        d._id === updatedDiagnosis._id ? updatedDiagnosis : d
                    ))
                } else {
                    allSaved = false
                }
            }

            if (allSaved) {
                showToast('Natijalar muvaffaqiyatli saqlandi!')
                fetchPatients()
                return true
            } else {
                showToast("Ba'zi natijalarni saqlashda xatolik yuz berdi!", 'error')
            }
        } catch {
            showToast("Server bilan aloqa yo'q", 'error')
        }
        return false
    }

    // Chop etish va saqlash
    const handlePrintAndSaveResults = () => {
        // Avval joriy holatdan chop et (save kutmasdan)
        const allCats = categoryResultsRef.current
        if (!allCats || allCats.length === 0) return

        // Barcha kategoriyalarning qatorlarini birlashtirib chiqarish
        const allRows = []
        const firstCols = (allCats[0]?.columns?.length > 0) ? allCats[0].columns : defaultColumns
        allCats.forEach(cat => {
            const cols = (cat.columns?.length > 0) ? cat.columns : defaultColumns
            const filtered = (cat.rows || []).filter(r =>
                Object.values(r.values || {}).some(v => v !== undefined && v !== null && v.toString().trim() !== '')
            )
            filtered.forEach(row => {
                const mapped = {}
                firstCols.forEach((col, ci) => {
                    mapped[col.id] = row.values?.[cols[ci]?.id] || ''
                })
                // Kategoriya nomini to'g'ridan-to'g'ri teglash
                allRows.push({ ...row, values: mapped, _catName: cat.title || '—' })
            })
        })

        const columns = firstCols
        const rows = allRows
        if (rows.length === 0) { alert('Natijalar kiritilmagan!'); return }

        const cat = allCats[currentCategoryIndex] || allCats[0]
        const now = new Date()
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const doctorName = user?.fullName || ''
        const logoUrl = `${window.location.origin}/logo.png`

        const printWindow = window.open('', '_blank')
        if (!printWindow) { alert('Popup bloklandi! Brauzer manzil qatoridagi popup belgisiga bosing va ruxsat bering.'); return }
        printWindow.document.write(`<!DOCTYPE html><html><head>
            <meta charset="utf-8"/>
            <title>${selectedPatient?.fullName} — ${cat.title || 'natija'}</title>
            <style>${getPrintStyle()}</style>
        </head><body>
            ${buildPrintHeader(logoUrl)}
            ${buildPatientBlock(now, now)}
            <div class="print-title-row">
                <div class="print-title">${cat.title || 'LABORATORIYA TAHLILI'}</div>
            </div>
            ${buildTableHTML(columns, rows, true)}
            <div class="print-footer">
                <span class="doctor-label">Врач:</span> <span class="doctor-name">${doctorName}</span>
            </div>
        </body></html>`)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => { printWindow.print(); printWindow.close() }, 500)

        // Fonda saqlash
        saveResults()
    }

    // Umumiy print uslubi (CSS)
    const getPrintStyle = () => `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 12mm 15mm; }
        body { font-family: Arial, sans-serif; font-size: 10pt; color: #111; background: #fff; }

        /* ── Header ── */
        .print-header {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 16px;
            padding-bottom: 10px;
            border-bottom: 2px solid #555;
            margin-bottom: 12px;
        }
        .ph-logo { width: 72px; height: 72px; object-fit: contain; }
        .ph-clinic { text-align: left; }
        .ph-clinic-name {
            font-size: 22pt;
            font-weight: 900;
            line-height: 1.1;
            color: #111;
        }
        .ph-clinic-name span { color: #d63031; }
        .ph-clinic-sub { font-size: 9pt; color: #555; margin-top: 2px; }

        /* ── Bemor ma'lumotlari ── */
        .print-patient {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3px 20px;
            margin-bottom: 14px;
            font-size: 10pt;
        }
        .print-patient span { display: block; }
        .print-patient b { font-weight: 600; }

        /* ── Tahlil sarlavhasi ── */
        .print-title-row {
            display: flex;
            align-items: baseline;
            justify-content: center;
            margin-bottom: 4px;
            position: relative;
        }
        .print-title {
            font-size: 10pt;
            font-weight: 700;
            text-align: center;
        }
        .print-title-date {
            position: absolute;
            right: 0;
            font-size: 8.5pt;
            color: #555;
        }

        /* ── Jadval ── */
        .results-table {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 9.5pt;
        }
        .results-table th {
            border: 1px solid #333;
            padding: 5px 7px;
            background: #f0f0f0;
            font-weight: 700;
            text-align: left;
            word-wrap: break-word;
        }
        .results-table td {
            border: 1px solid #aaa;
            padding: 4px 7px;
            text-align: left;
            word-wrap: break-word;
        }
        .results-table td.result-val { font-weight: 700; }
        .results-table tr.out-of-range td { background: #ffe0e0; }

        /* ── Xulosa ── */
        .print-conclusion {
            margin: 10px 0;
            padding: 8px 12px;
            border-left: 3px solid #555;
            font-size: 9.5pt;
            color: #222;
        }
        .print-conclusion b { display: block; margin-bottom: 4px; }

        /* ── Footer ── */
        .print-footer {
            margin-top: 18px;
            text-align: right;
            font-size: 10pt;
        }
        .print-footer .doctor-label { font-weight: 700; }
        .print-footer .doctor-name { font-weight: 700; }

        @media print { body { padding: 0; } }
    `

    // Bemor ma'lumotlari bloki (HTML)
    const buildPatientBlock = (regDate, readyDate) => {
        const p = selectedPatient
        const fmt = (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '-'
        const fmtDt = (d) => d ? `${new Date(d).toLocaleDateString('ru-RU')} ${new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : '-'
        return `
            <div class="print-patient">
                <span><b>Ф.И.О.:</b> ${p?.fullName || '-'}</span>
                <span><b>Дата рег.:</b> ${fmtDt(regDate)}</span>
                <span><b>Дата рож.:</b> ${fmt(p?.birthDate)}</span>
                <span><b>Дата гот.:</b> ${fmtDt(readyDate)}</span>
            </div>
        `
    }

    // Header bloki (HTML)
    const buildPrintHeader = (logoUrl) => `
        <div class="print-header">
            <img src="${logoUrl}" class="ph-logo" alt="logo" onerror="this.style.display='none'" />
            <div class="ph-clinic">
                <div class="ph-clinic-name">Al-Beruniy <span>Med</span></div>
                <div class="ph-clinic-sub">Tibbiy laboratoriya markazi</div>
            </div>
        </div>
    `

    // Jadval HTML yaratish (groupByCategory=true bo'lsa chap tomonda vertikal kategoriya nomi)
    const buildTableHTML = (columns, rows, groupByCategory = false) => {
        const colIds = columns.map(c => c.id)
        const resultColId = colIds[1]
        const normaColId  = colIds[2] || null
        const colW = `${(100 / columns.length).toFixed(1)}%`
        const nameColId = colIds[0]

        if (groupByCategory) {
            // Qatorlarni kategoriya bo'yicha guruhlash (_catName tegidan foydalanish)
            const groups = []
            rows.forEach(row => {
                const catName = row._catName || '—'
                const last = groups[groups.length - 1]
                if (last && last.catName === catName) {
                    last.rows.push(row)
                } else {
                    groups.push({ catName, rows: [row] })
                }
            })

            let bodyRows = ''
            groups.forEach(group => {
                group.rows.forEach((row, ri) => {
                    const resultVal = row.values?.[resultColId] || ''
                    const normaVal  = normaColId ? (row.values?.[normaColId] || '') : ''
                    const isOut = normaVal && resultVal && resultVal.trim() !== normaVal.trim()
                    const catCell = ri === 0
                        ? `<td rowspan="${group.rows.length}" style="width:22px;padding:2px 3px;text-align:center;vertical-align:middle;background:#eef2ff;border-right:2px solid #a5b4fc;font-size:0.68rem;font-weight:700;color:#3730a3;writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;">${group.catName}</td>`
                        : ''
                    bodyRows += `<tr class="${isOut ? 'out-of-range' : ''}">${catCell}${columns.map((col, ci) => `<td class="${ci === 1 ? 'result-val' : ''}">${row.values?.[col.id] || ''}</td>`).join('')}</tr>`
                })
            })

            return `
                <table class="results-table">
                    <colgroup>
                        <col style="width:22px"/>
                        ${columns.map(() => `<col style="width:${colW}"/>`).join('')}
                    </colgroup>
                    <thead>
                        <tr>
                            <th style="width:22px;background:#eef2ff;"></th>
                            ${columns.map(col => `<th>${col.name}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>${bodyRows}</tbody>
                </table>
            `
        }

        const bodyRows = rows.map(row => {
            const resultVal = row.values?.[resultColId] || ''
            const normaVal  = normaColId ? (row.values?.[normaColId] || '') : ''
            const isOut = normaVal && resultVal && resultVal.trim() !== normaVal.trim()
            return `<tr class="${isOut ? 'out-of-range' : ''}">${columns.map((col, ci) => `<td class="${ci === 1 ? 'result-val' : ''}">${row.values?.[col.id] || ''}</td>`).join('')}</tr>`
        }).join('')

        return `
            <table class="results-table">
                <colgroup>
                    ${columns.map(() => `<col style="width:${colW}"/>`).join('')}
                </colgroup>
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${col.name}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>${bodyRows}</tbody>
            </table>
        `
    }

    // Analiz natijalarini to'g'ridan-to'g'ri chop etish (avvaldan saqlangan)
    const handlePrintSavedResults = (diagnosis) => {
        if (!diagnosis.results || !diagnosis.results.rows || diagnosis.results.rows.length === 0) {
            alert('Bu analiz uchun hali natijalar kiritilmagan!')
            return
        }

        const now = new Date()
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const doctorName = diagnosis.doctor?.fullName || diagnosis.doctorName || user?.fullName || ''
        const columns = diagnosis.results.columns || [
            { id: 'col_1', name: 'Название' },
            { id: 'col_2', name: 'Результат' },
            { id: 'col_3', name: 'Норма' },
            { id: 'col_4', name: 'Ед.' }
        ]
        const catName = diagnosis.diagnosis?.category?.name || diagnosis.results?.title || '—'
        const rows = diagnosis.results.rows.filter(r =>
            Object.values(r.values || {}).some(v => v && v.trim())
        ).map(r => ({ ...r, _catName: catName }))
        const logoUrl = `${window.location.origin}/logo.png`
        const titleDate = `${now.toLocaleDateString('ru-RU')} ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`

        const printWindow = window.open('', '_blank')
        printWindow.document.write(`<!DOCTYPE html><html><head>
            <meta charset="utf-8"/>
            <title>${selectedPatient?.fullName} — natijalar</title>
            <style>${getPrintStyle()}</style>
        </head><body>
            ${buildPrintHeader(logoUrl)}
            ${buildPatientBlock(diagnosis.createdAt, now)}
            <div class="print-title-row">
                <div class="print-title">${diagnosis.results.title || 'LABORATORIYA TAHLILI'}</div>
            </div>
            ${buildTableHTML(columns, rows, true)}
            ${diagnosis.results.conclusion ? `
                <div class="print-conclusion">
                    <b>Xulosa:</b>${diagnosis.results.conclusion}
                </div>` : ''}
            <div class="print-footer">
                <span class="doctor-label">Врач:</span> <span class="doctor-name">${doctorName}</span>
            </div>
        </body></html>`)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
    }


    // Yangi qator qo'shish (kategoriya indeksi bilan)
    const addResultRow = (categoryIndex) => {
        setCategoryResultsAndRef(prev => prev.map((cat, idx) => {
            if (idx === categoryIndex) {
                const newValues = {}
                cat.columns.forEach(col => {
                    newValues[col.id] = ''
                })
                return {
                    ...cat,
                    rows: [...cat.rows, { id: Date.now() + Math.random(), values: newValues }]
                }
            }
            return cat
        }))
    }

    // Qatorni o'chirish (kategoriya indeksi bilan)
    const removeResultRow = (categoryIndex, rowId) => {
        setCategoryResultsAndRef(prev => prev.map((cat, idx) => {
            if (idx === categoryIndex) {
                return {
                    ...cat,
                    rows: cat.rows.filter(row => row.id !== rowId)
                }
            }
            return cat
        }))
    }

    // Qator qiymatini o'zgartirish (kategoriya indeksi bilan)
    const updateResultRow = (categoryIndex, rowId, colId, value) => {
        setCategoryResultsAndRef(prev => prev.map((cat, idx) => {
            if (idx === categoryIndex) {
                return {
                    ...cat,
                    rows: cat.rows.map(row =>
                        row.id === rowId
                            ? { ...row, values: { ...row.values, [colId]: value } }
                            : row
                    )
                }
            }
            return cat
        }))
    }

    // Barcha natijalarni A4 da chop etish - ko'p kategoriyali
    const handlePrintAllCategoryResults = () => {
        const allCats = categoryResultsRef.current
        if (!selectedPatient || !allCats || !Array.isArray(allCats) || allCats.length === 0) return

        const now = new Date()
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const doctorName = user?.fullName || ''
        const logoUrl = `${window.location.origin}/logo.png`

        const categoriesHTML = allCats.map((category, catIdx) => {
            const columns = category.columns || []
            const rows = (category.rows || []).filter(r =>
                Object.values(r.values || {}).some(v => v && v.toString().trim())
            )
            if (rows.length === 0) return ''

            const titleDate = `${now.toLocaleDateString('ru-RU')} ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
            return `
                <div ${catIdx > 0 ? 'style="page-break-before: always;"' : ''}>
                    ${catIdx > 0 ? buildPrintHeader(logoUrl) + buildPatientBlock(now, now) : ''}
                    <div class="print-title-row">
                        <div class="print-title">${category.title || 'LABORATORIYA TAHLILI'}</div>
                    </div>
                    ${buildTableHTML(columns, rows)}
                    ${category.conclusion ? `
                        <div class="print-conclusion">
                            <b>Xulosa:</b>${category.conclusion}
                        </div>` : ''}
                </div>
            `
        }).filter(Boolean).join('')

        const firstTitleDate = `${now.toLocaleDateString('ru-RU')} ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
        const firstCat = allCats.find(c =>
            (c.rows || []).some(r => Object.values(r.values || {}).some(v => v && v.toString().trim()))
        )

        const printWindow = window.open('', '_blank')
        printWindow.document.write(`<!DOCTYPE html><html><head>
            <meta charset="utf-8"/>
            <title>${selectedPatient.fullName} — natijalar</title>
            <style>${getPrintStyle()}</style>
        </head><body>
            ${buildPrintHeader(logoUrl)}
            ${buildPatientBlock(now, now)}
            ${firstCat ? `
            <div class="print-title-row">
                <div class="print-title">${firstCat.title || 'LABORATORIYA TAHLILI'}</div>
            </div>
            ${buildTableHTML(firstCat.columns || [], (firstCat.rows || []).filter(r => Object.values(r.values || {}).some(v => v && v.toString().trim())))}
            ${firstCat.conclusion ? `<div class="print-conclusion"><b>Xulosa:</b>${firstCat.conclusion}</div>` : ''}
            ` : ''}
            ${allCats.slice(1).map((category, i) => {
                const columns = category.columns || []
                const rows = (category.rows || []).filter(r =>
                    Object.values(r.values || {}).some(v => v && v.toString().trim())
                )
                if (rows.length === 0) return ''
                return `
                    <div style="page-break-before: always;">
                        ${buildPrintHeader(logoUrl)}
                        ${buildPatientBlock(now, now)}
                        <div class="print-title-row">
                            <div class="print-title">${category.title || 'LABORATORIYA TAHLILI'}</div>
                                    </div>
                        ${buildTableHTML(columns, rows)}
                        ${category.conclusion ? `<div class="print-conclusion"><b>Xulosa:</b>${category.conclusion}</div>` : ''}
                    </div>
                `
            }).filter(Boolean).join('')}
            <div class="print-footer">
                <span class="doctor-label">Врач:</span> <span class="doctor-name">${doctorName}</span>
            </div>
        </body></html>`)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
    }

    // Search patients for autocomplete
    const searchPatients = async (query) => {
        if (query.length < 2) {
            setSuggestions([])
            setShowSuggestions(false)
            return
        }

        setSearchLoading(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/patients/search/autocomplete?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setSuggestions(data)
                setShowSuggestions(data.length > 0)
            }
        } catch (error) {
            console.error('Search error:', error)
        } finally {
            setSearchLoading(false)
        }
    }

    // Handle fullName change with debounce for autocomplete
    const handleFullNameChange = (value) => {
        setFormData({ ...formData, fullName: value })

        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        debounceRef.current = setTimeout(() => {
            searchPatients(value)
        }, 300)
    }

    // Handle selecting a patient from autocomplete suggestions
    const handleSelectPatient = async (patient) => {
        // Close add modal and suggestions
        setSuggestions([])
        setShowSuggestions(false)
        setShowModal(false)
        resetForm()

        // Bemorni tanlash va analiz modalini ochish
        setSelectedPatient(patient)
        openDiagnosisModal()
    }

    const fetchPatientDiagnoses = async (patientId) => {
        setDiagnosesLoading(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/patient-diagnoses/patient/${patientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                const data = await response.json()
                setPatientDiagnoses(data)
            } else {
                setPatientDiagnoses([])
            }
        } catch (error) {
            console.error('Error fetching diagnoses:', error)
            setPatientDiagnoses([])
        } finally {
            setDiagnosesLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        try {
            const token = localStorage.getItem('token')
            const url = editingPatient
                ? `/api/patients/${editingPatient._id}`
                : '/api/patients'
            const method = editingPatient ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (response.ok) {
                setSuccess(editingPatient
                    ? 'Bemor muvaffaqiyatli yangilandi!'
                    : 'Bemor muvaffaqiyatli qo\'shildi!')
                fetchPatients()

                // Yangi bemor uchun - to'g'ridan-to'g'ri analiz oynasini ochish
                if (!editingPatient && data._id) {
                    setSelectedPatient(data)
                    setTimeout(() => {
                        setShowModal(false)
                        resetForm()
                        // Analiz modalini ochish
                        openDiagnosisModal()
                    }, 1000)
                } else {
                    setTimeout(() => {
                        setShowModal(false)
                        resetForm()
                    }, 1500)
                }
            } else {
                setError(data.message || 'Xatolik yuz berdi')
            }
        } catch (error) {
            setError('Server bilan aloqa yo\'q')
        }
    }

    const handleView = async (patient) => {
        setSelectedPatient(patient)
        setSelectedDiagnosis(null)
        setShowViewModal(true)
        await fetchPatientDiagnoses(patient._id)
    }

    const handleViewAnalyzes = async (patient) => {
        setSelectedPatient(patient)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/patient-diagnoses/patient/${patient._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const diagnoses = res.ok ? await res.json() : []
            if (!diagnoses.length) { alert('Bu bemorda hali analizlar yo\'q!'); return }
            const tables = diagnoses.map(d => {
                const catName = d.diagnosis?.category?.name || d.diagnosisName?.split(',')[0]?.trim() || 'Natija'
                if (d.results?.rows?.length > 0) {
                    return {
                        diagnosisId: d._id,
                        diagnosisName: d.diagnosisName || 'Kategoriya',
                        createdAt: d.createdAt,
                        title: catName,
                        columns: (d.results.columns?.length > 0) ? d.results.columns : [...defaultColumns],
                        rows: d.results.rows.map((r, i) => ({ id: Date.now() + i + Math.random(), values: r.values || {} })),
                        conclusion: d.results.conclusion || ''
                    }
                }
                const dCols = (d.results?.columns?.length > 0) ? d.results.columns : [...defaultColumns]
                return {
                    diagnosisId: d._id,
                    diagnosisName: d.diagnosisName || 'Kategoriya',
                    createdAt: d.createdAt,
                    title: catName,
                    columns: dCols,
                    rows: buildAutoRows(d.diagnosisName, patient, d.results?.rows || [], dCols),
                    conclusion: d.results?.conclusion || ''
                }
            })
            setPatientDiagnoses(diagnoses)
            setCategoryResultsAndRef(tables)
            setCurrentCategoryIndex(0)
            setShowResultsEntryModal(true)
        } catch (e) {
            console.error(e)
        }
    }

    const handleDelete = (patient) => {
        setDeletingPatient(patient)
        setShowDeleteModal(true)
    }

    const closeDeleteModal = () => {
        setDeletingPatient(null)
        setShowDeleteModal(false)
        setDeleteLoading(false)
    }

    const confirmDelete = async () => {
        if (!deletingPatient) return

        setDeleteLoading(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/patients/${deletingPatient._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                fetchPatients()
                closeDeleteModal()
            } else {
                setDeleteLoading(false)
            }
        } catch (error) {
            console.error('Error deleting patient:', error)
            setDeleteLoading(false)
        }
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

    const resetForm = () => {
        setFormData({
            fullName: '',
            birthDate: '',
            gender: 'male',
            phone: '',
            passportNumber: '',
            notes: ''
        })
        setEditingPatient(null)
        setError('')
        setSuccess('')
    }

    const openAddModal = () => {
        resetForm()
        setShowModal(true)
    }

    // Open diagnosis modal — DiagnosisForm sahifasiga o'tish
    const openDiagnosisModal = () => {
        if (!selectedPatient?._id) return
        const base = getBase()
        navigate(`${base}/patients/diagnosis/${selectedPatient._id}`)
    }

    // Bemorning yoshiga va jinsiga qarab normalRanges dan narxni topish
    const getPriceForPatient = (diagnosis) => {
        const categoryPrice = diagnosis?.category?.price || 0
        if (!diagnosis?.normalRanges?.length) return diagnosis?.price || categoryPrice
        let age = null
        if (selectedPatient?.birthDate) {
            const today = new Date(), birth = new Date(selectedPatient.birthDate)
            age = today.getFullYear() - birth.getFullYear()
            const m = today.getMonth() - birth.getMonth()
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
        }
        const gender = selectedPatient?.gender || null
        let found = null
        if (age !== null) {
            found = diagnosis.normalRanges.find(r => {
                const min = r.ageMin !== '' && r.ageMin != null ? Number(r.ageMin) : 0
                const max = r.ageMax !== '' && r.ageMax != null ? Number(r.ageMax) : 999
                const ageOk = age >= min && age <= max
                const genderOk = !gender || !r.gender || r.gender === 'both' || r.gender === gender
                return ageOk && genderOk
            })
            if (!found) found = diagnosis.normalRanges.find(r => {
                const min = r.ageMin !== '' && r.ageMin != null ? Number(r.ageMin) : 0
                const max = r.ageMax !== '' && r.ageMax != null ? Number(r.ageMax) : 999
                return age >= min && age <= max
            })
        }
        if (!found) found = diagnosis.normalRanges[0]
        const rangePrice = found?.price ?? 0
        if (rangePrice > 0) return rangePrice
        if (diagnosis?.price > 0) return diagnosis.price
        return categoryPrice
    }

    // Category helper funksiyalar (doctor uslubida)
    const getDiagnosesByCategory = (categoryId) =>
        diagnosesList.filter(d => d.category === categoryId || d.category?._id === categoryId)

    const getSelectedCountByCategory = (categoryId) => {
        const catDiags = getDiagnosesByCategory(categoryId)
        const selectedIds = new Set(diagnosisFormData.diagnoses.map(d => d.diagnosisId))
        return catDiags.filter(d => selectedIds.has(d._id)).length
    }

    const toggleAllInCategory = (categoryId) => {
        const catDiags = getDiagnosesByCategory(categoryId)
        const selectedIds = new Set(diagnosisFormData.diagnoses.map(d => d.diagnosisId))
        const allSelected = catDiags.length > 0 && catDiags.every(d => selectedIds.has(d._id))
        setDiagnosisFormData(prev => {
            if (allSelected) {
                const catIds = new Set(catDiags.map(d => d._id))
                return { ...prev, diagnoses: prev.diagnoses.filter(x => !catIds.has(x.diagnosisId)) }
            } else {
                const existing = new Set(prev.diagnoses.map(x => x.diagnosisId))
                const newDiags = catDiags
                    .filter(d => !existing.has(d._id))
                    .map(d => ({ diagnosisId: d._id, diagnosisName: d.name, price: getPriceForPatient(d), medicines: [] }))
                return { ...prev, diagnoses: [...prev.diagnoses, ...newDiags] }
            }
        })
    }

    // Handle diagnosis toggle (multi-select)
    const handleDiagnosisToggle = (diagnosisId) => {
        const selected = diagnosesList.find(d => d._id === diagnosisId)
        if (!selected) return

        setDiagnosisFormData(prev => {
            const exists = prev.diagnoses.find(d => d.diagnosisId === diagnosisId)
            if (exists) {
                // Remove diagnosis
                return {
                    ...prev,
                    diagnoses: prev.diagnoses.filter(d => d.diagnosisId !== diagnosisId)
                }
            } else {
                // Add diagnosis with its related medicines and price
                const relatedMedicines = selected.medicines || []
                return {
                    ...prev,
                    diagnoses: [...prev.diagnoses, {
                        diagnosisId,
                        diagnosisName: selected.name,
                        price: getPriceForPatient(selected),
                        medicines: relatedMedicines.map(med => ({
                            medicine: med._id || med,
                            name: med.name || '',
                            dosage: '',
                            quantity: 1
                        }))
                    }]
                }
            }
        })
    }

    // Update diagnosis price
    const updateDiagnosisPrice = (diagnosisId, price) => {
        setDiagnosisFormData(prev => ({
            ...prev,
            diagnoses: prev.diagnoses.map(d =>
                d.diagnosisId === diagnosisId ? { ...d, price: Number(price) || 0 } : d
            )
        }))
    }

    // Handle medicine toggle for a specific diagnosis
    const handleMedicineToggle = (diagnosisId, medicineId, medicineName) => {
        setDiagnosisFormData(prev => ({
            ...prev,
            diagnoses: prev.diagnoses.map(d => {
                if (d.diagnosisId !== diagnosisId) return d

                const exists = d.medicines.find(m => m.medicine === medicineId)
                if (exists) {
                    return {
                        ...d,
                        medicines: d.medicines.filter(m => m.medicine !== medicineId)
                    }
                } else {
                    return {
                        ...d,
                        medicines: [...d.medicines, {
                            medicine: medicineId,
                            name: medicineName,
                            dosage: '',
                            quantity: 1
                        }]
                    }
                }
            })
        }))
    }

    // Update medicine details for a specific diagnosis
    const updateMedicineDetails = (diagnosisId, medicineId, field, value) => {
        setDiagnosisFormData(prev => ({
            ...prev,
            diagnoses: prev.diagnoses.map(d => {
                if (d.diagnosisId !== diagnosisId) return d
                return {
                    ...d,
                    medicines: d.medicines.map(m =>
                        m.medicine === medicineId ? { ...m, [field]: value } : m
                    )
                }
            })
        }))
    }

    // Submit diagnosis
    const handleDiagnosisSubmit = async (e) => {
        e.preventDefault()
        setDiagnosisError('')
        setDiagnosisSuccess('')

        if (diagnosisFormData.diagnoses.length === 0) {
            setDiagnosisError('Kamida bitta analiz tanlang')
            return
        }

        setSavingDiagnosis(true)

        try {
            const token = localStorage.getItem('token')

            // Collect all medicines from all diagnoses
            const allMedicines = diagnosisFormData.diagnoses.flatMap(d => d.medicines)
            const diagnosisNames = diagnosisFormData.diagnoses.map(d => d.diagnosisName).join(', ')

            const response = await fetch('/api/patient-diagnoses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    patient: selectedPatient._id,
                    diagnosis: diagnosisFormData.diagnoses[0]?.diagnosisId || null,
                    diagnosisName: diagnosisNames,
                    notes: diagnosisFormData.notes,
                    medicines: allMedicines,
                    diagnosisPrices: diagnosisFormData.diagnoses.map(d => ({ name: d.diagnosisName, price: d.price || 0 })),
                    totalAmount: diagnosisFormData.diagnoses.reduce((s, d) => s + (d.price || 0), 0) - (paymentData.discount || 0),
                    discount: paymentData.discount || 0,
                    paymentMethod: paymentData.paymentMethod || 'cash'
                })
            })

            const data = await response.json()

            if (response.ok) {
                setDiagnosisSuccess('Analiz muvaffaqiyatli saqlandi!')
                setLastSavedDiagnosis(data)
                await fetchPatientDiagnoses(selectedPatient._id)
                fetchPatients()

                // Calculate medicine costs and open payment modal
                const medicinesWithPrices = allMedicines.map(m => ({
                    ...m,
                    price: getMedicinePrice(m.medicine),
                    total: getMedicinePrice(m.medicine) * (m.quantity || 1)
                }))

                const totalMedicinesCost = medicinesWithPrices.reduce((sum, m) => sum + m.total, 0)

                // Update payment data with calculated medicines cost
                const updatedPaymentData = {
                    ...paymentData,
                    medicinesCost: totalMedicinesCost,
                    medicines: medicinesWithPrices
                }
                setPaymentData(updatedPaymentData)

                // Create transaction for payment
                const totalAmount = paymentData.consultationFee + totalMedicinesCost - paymentData.discount
                await fetch('/api/transactions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        type: 'income',
                        category: 'medicine_sale',
                        amount: totalAmount,
                        description: `Konsultatsiya va dori: ${selectedPatient?.fullName} - ${diagnosisFormData.diagnoses.map(d => d.diagnosisName).join(', ')}`,
                        patient: selectedPatient?._id,
                        paymentMethod: paymentData.paymentMethod
                    })
                })

                // Deduct inventory for medicines
                for (const med of medicinesWithPrices) {
                    if (med.quantity > 0) {
                        await fetch('/api/inventory/deduct', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                medicineId: med.medicine,
                                quantity: med.quantity
                            })
                        })
                    }
                }

                // Refresh inventory
                fetchInventory()

                // Set last saved diagnosis for printing
                const printData = {
                    ...data,
                    consultationFee: paymentData.consultationFee,
                    totalAmount,
                    discount: paymentData.discount,
                    paymentMethod: paymentData.paymentMethod,
                    medicines: medicinesWithPrices
                }

                setDiagnosisSuccess('Analiz va to\'lov saqlandi!')

                // Print diagnosis sheet + receipt
                setTimeout(() => {
                    setShowDiagnosisModal(false)
                    setDiagnosisSuccess('')

                    // Print combined diagnosis and receipt
                    handlePrintCombined(data, updatedPaymentData, totalAmount)
                }, 1000)
            } else {
                setDiagnosisError(data.message || 'Xatolik yuz berdi')
            }
        } catch (error) {
            setDiagnosisError('Server bilan aloqa yo\'q')
        } finally {
            setSavingDiagnosis(false)
        }
    }

    // Handle payment submit
    const handlePaymentSubmit = async () => {
        setSavingPayment(true)

        try {
            const token = localStorage.getItem('token')
            const totalAmount = paymentData.consultationFee + paymentData.medicinesCost - paymentData.discount

            // Create transaction for consultation
            await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: 'income',
                    category: 'medicine_sale',
                    amount: totalAmount,
                    description: `Konsultatsiya va dori: ${selectedPatient?.fullName} - ${lastSavedDiagnosis?.diagnosisName || 'Analiz'}`,
                    patient: selectedPatient?._id,
                    paymentMethod: paymentData.paymentMethod
                })
            })

            // Deduct medicines from inventory
            for (const med of paymentData.medicines) {
                if (med.medicine) {
                    try {
                        await fetch(`/api/inventory/deduct`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                medicineId: med.medicine,
                                quantity: med.quantity || 1
                            })
                        })
                    } catch (err) {
                        console.error('Inventory deduct error:', err)
                    }
                }
            }

            // Refresh inventory data
            fetchInventory()

            // Print receipt and close modal
            handlePrintReceipt()

        } catch (error) {
            console.error('Payment error:', error)
        } finally {
            setSavingPayment(false)
        }
    }

    // Print diagnosis and receipt together on same document
    const handlePrintDiagnosisAndReceipt = (diagnosis) => {
        const now = new Date(diagnosis.createdAt || new Date())
        const receiptNumber = `CHK-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`
        const birthDate = selectedPatient?.birthDate ? new Date(selectedPatient.birthDate).toLocaleDateString('uz-UZ') : '-'

        // Calculate medicines cost
        let medicinesCost = 0
        const medicines = diagnosis.medicines || []
        medicines.forEach(med => {
            const price = getMedicinePrice(med.medicine?._id || med.medicine)
            medicinesCost += price * (med.quantity || 1)
        })

        const consultationFee = 50000
        const totalAmount = consultationFee + medicinesCost

        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Chop etish</title>
                <style>
                    @page { margin: 0; size: A4; }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Times New Roman', serif; }
                    
                    /* Diagnosis Sheet */
                    .diagnosis-page {
                        padding: 10mm;
                        height: 50%;
                        border-bottom: 2px dashed #ccc;
                    }
                    .diagnosis-header {
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 10px;
                        margin-bottom: 15px;
                    }
                    .diagnosis-header h1 { font-size: 18px; margin-bottom: 3px; }
                    .diagnosis-header p { font-size: 10px; color: #666; }
                    .diagnosis-meta {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                        font-size: 11px;
                    }
                    .patient-info {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 5px;
                        margin-bottom: 10px;
                        padding: 8px;
                        border: 1px solid #ddd;
                        font-size: 11px;
                    }
                    .info-label { font-weight: bold; }
                    .diagnosis-content h2 { font-size: 12px; margin-bottom: 5px; }
                    .diagnosis-name { font-size: 14px; font-weight: bold; color: #2c5aa0; }
                    .medicines-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 8px 0;
                        font-size: 10px;
                    }
                    .medicines-table th, .medicines-table td {
                        border: 1px solid #333;
                        padding: 4px;
                        text-align: left;
                    }
                    .medicines-table th { background: #f0f0f0; }
                    
                    /* Receipt */
                    .receipt-page {
                        padding: 10mm;
                        font-family: 'Courier New', monospace;
                        font-size: 11px;
                    }
                    .receipt-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
                    .receipt-header h1 { font-size: 14px; margin-bottom: 3px; }
                    .receipt-header p { font-size: 9px; }
                    .receipt-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                    .receipt-items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; margin: 8px 0; }
                    .receipt-item { margin-bottom: 4px; }
                    .receipt-item-name { font-weight: bold; }
                    .receipt-item-details { display: flex; justify-content: space-between; font-size: 10px; }
                    .receipt-total-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                    .receipt-total-row.final { font-weight: bold; font-size: 12px; border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px; }
                    .receipt-footer { text-align: center; margin-top: 10px; font-size: 9px; border-top: 1px dashed #000; padding-top: 8px; }
                </style>
            </head>
            <body>
                <!-- DIAGNOSIS SHEET -->
                <div class="diagnosis-page">
                    <div class="diagnosis-header">
                        <h1>AL-BERUNIY MED</h1>
                        <p>Analiz varaqasi</p>
                    </div>
                    
                    <div class="diagnosis-meta">
                        <span><strong>Sana:</strong> ${now.toLocaleDateString('uz-UZ')} ${now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span><strong>Shifokor:</strong> ${diagnosis.doctor?.fullName || diagnosis.doctorName || '_______________'}</span>
                    </div>
                    
                    <div class="patient-info">
                        <div><span class="info-label">Bemor:</span> ${selectedPatient?.fullName}</div>
                        <div><span class="info-label">Tug'ilgan:</span> ${birthDate}</div>
                        <div><span class="info-label">Jinsi:</span> ${selectedPatient?.gender === 'male' ? 'Erkak' : 'Ayol'}</div>
                        <div><span class="info-label">Tel:</span> ${selectedPatient?.phone || '-'}</div>
                    </div>
                    
                    <div class="diagnosis-content">
                        <h2>Analiz:</h2>
                        <p class="diagnosis-name">${diagnosis.diagnosisName || '-'}</p>
                    </div>
                    
                    ${medicines.length > 0 ? `
                        <table class="medicines-table">
                            <thead>
                                <tr><th>#</th><th>Dori</th><th>Miqdor</th><th>Doza</th></tr>
                            </thead>
                            <tbody>
                                ${medicines.map((m, i) => `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td>${m.name || m.medicine?.name}</td>
                                        <td>${m.quantity || 1}</td>
                                        <td>${m.dosage || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : ''}
                    
                    ${diagnosis.notes ? `<p><strong>Izoh:</strong> ${diagnosis.notes}</p>` : ''}
                </div>
                
                <!-- RECEIPT -->
                <div class="receipt-page">
                    <div class="receipt-header">
                        <h1>TO'LOV CHEKI</h1>
                        <p>${receiptNumber}</p>
                    </div>
                    
                    <div class="receipt-row"><span>Sana:</span><span>${now.toLocaleDateString('uz-UZ')} ${now.toLocaleTimeString('uz-UZ')}</span></div>
                    <div class="receipt-row"><span>Bemor:</span><span>${selectedPatient?.fullName}</span></div>
                    
                    <div class="receipt-items">
                        <div class="receipt-item">
                            <div class="receipt-item-name">Konsultatsiya</div>
                            <div class="receipt-item-details">
                                <span>1 x ${consultationFee.toLocaleString()}</span>
                                <span>${consultationFee.toLocaleString()} so'm</span>
                            </div>
                        </div>
                        ${medicines.map(med => `
                            <div class="receipt-item">
                                <div class="receipt-item-name">${med.name || med.medicine?.name || 'Dori'}</div>
                                <div class="receipt-item-details">
                                    <span>${med.quantity || 1} x ${getMedicinePrice(med.medicine?._id || med.medicine).toLocaleString()}</span>
                                    <span>${(getMedicinePrice(med.medicine?._id || med.medicine) * (med.quantity || 1)).toLocaleString()} so'm</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="receipt-total-row final">
                        <span>JAMI:</span>
                        <span>${totalAmount.toLocaleString()} so'm</span>
                    </div>
                    
                    <div class="receipt-footer">
                        <p>Xaridingiz uchun rahmat!</p>
                    </div>
                </div>
            </body>
            </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
            printWindow.print()
            printWindow.close()
        }, 250)
    }

    // Print payment receipt from diagnosis history
    const handlePrintPaymentReceipt = (diagnosis) => {
        const now = new Date(diagnosis.createdAt || new Date())
        const dateStr = `${now.getDate().toString().padStart(2,'0')}.${(now.getMonth()+1).toString().padStart(2,'0')}.${now.getFullYear()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`

        const clinic = JSON.parse(localStorage.getItem('clinicSettings') || '{}')
        const clinicName = clinic.clinicName || 'Al-Beruniy Med'
        const clinicAddress = clinic.address || ''
        const clinicPhone = clinic.phone || ''
        const logoUrl = `${window.location.origin}/logo.png`

        const savedDiscount = diagnosis.discount || 0
        const savedTotal = diagnosis.totalAmount || 0

        // Saqlangan narxlardan foydalanish (agar mavjud bo'lsa)
        const savedPrices = diagnosis.diagnosisPrices || []
        let diagnosisItems = []
        if (savedPrices.length > 0) {
            diagnosisItems = savedPrices
        } else {
            const names = (diagnosis.diagnosisName || '').split(',').map(s => s.trim()).filter(Boolean)
            const diagPrice = diagnosis.diagnosis?.price || 0
            diagnosisItems = names.map((name, i) => ({
                name,
                price: i === 0 ? diagPrice : 0
            }))
        }

        const diagnosisTotal = diagnosisItems.reduce((s, d) => s + (d.price || 0), 0)

        let medicinesCost = 0
        const medicines = diagnosis.medicines || []
        medicines.forEach(med => {
            const price = getMedicinePrice(med.medicine?._id || med.medicine)
            medicinesCost += price * (med.quantity || 1)
        })

        const totalAmount = savedTotal > 0 ? savedTotal : (diagnosisTotal + medicinesCost - savedDiscount)

        // Barcode: patient ID ning oxirgi 8 belgisi
        const barcodeVal = (selectedPatient?._id || '').slice(-8)
        const birthStr = selectedPatient?.birthDate ? new Date(selectedPatient.birthDate).toLocaleDateString('uz-UZ') : ''

        const printWindow = window.open('', '_blank')
        printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Chek - ${selectedPatient?.fullName}</title>
<meta charset="utf-8"/>
<style>
    @page { margin: 3mm 4mm; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; width: 74mm; font-size: 11px; color: #000; background: #fff; }
    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
    .logo-wrap img { max-width: 80px; max-height: 70px; object-fit: contain; }
    .clinic-name { font-size: 13px; font-weight: 900; margin-top: 4px; letter-spacing: 0.3px; }
    .clinic-info { font-size: 10px; line-height: 1.6; margin-top: 3px; }
    .receipt-title { font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 8px 0 0; letter-spacing: 0.5px; }
    .patient-block { text-align: center; margin: 8px 0; font-size: 11px; line-height: 1.9; border-bottom: 1px dashed #000; padding-bottom: 8px; }
    .patient-block div { display: flex; justify-content: center; gap: 4px; }
    .patient-block b { font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 10.5px; }
    th { font-weight: 700; text-align: left; padding: 5px 4px; border: 1px solid #000; background: #fff; }
    td { padding: 5px 4px; border: 1px solid #000; vertical-align: top; word-break: break-word; }
    .total-section { border-top: 2px solid #000; margin-top: 0; padding: 7px 4px; text-align: center; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3px; }
    .discount-row { text-align: center; font-size: 11px; padding: 3px 0; border-top: 1px dotted #000; }
    .barcode-wrap { text-align: center; margin: 10px 0 4px; }
    .barcode-wrap canvas { display: block; margin: 0 auto; max-width: 100%; }
    .footer { text-align: center; font-size: 10px; padding-top: 6px; border-top: 1px dashed #000; margin-top: 4px; }
    @media print { body { width: 74mm; } }
</style>
</head>
<body>
    <div class="header">
        <div class="logo-wrap">
            <img src="${logoUrl}" alt="logo" onerror="this.style.display='none'" />
        </div>
        <div class="clinic-name">${clinicName}</div>
        <div class="clinic-info">
            ${clinicAddress ? `<div>Manzil: ${clinicAddress}</div>` : ''}
            ${clinicPhone ? `<div>Tel: ${clinicPhone}</div>` : ''}
        </div>
        <div class="receipt-title">To'lov uchun hisob</div>
    </div>

    <div class="patient-block">
        <div><b>Bemor:</b>&nbsp;${selectedPatient?.fullName || ''}</div>
        ${selectedPatient?.phone ? `<div><b>Telefon:</b>&nbsp;${selectedPatient.phone}</div>` : ''}
        ${birthStr ? `<div><b>Tug'ilgan sana:</b>&nbsp;${birthStr}</div>` : ''}
        <div><b>Sana:</b>&nbsp;${dateStr}</div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:52%">Xizmat</th>
                <th style="width:26%">Mutaxassis</th>
                <th style="width:22%">Summa</th>
            </tr>
        </thead>
        <tbody>
            ${diagnosisItems.map(d => `
            <tr>
                <td>${d.name}</td>
                <td>Laboratoriya</td>
                <td>${(d.price||0).toLocaleString()}</td>
            </tr>`).join('')}
            ${medicines.map(med => `
            <tr>
                <td>${med.name || med.medicine?.name || 'Dori'} \xd7 ${med.quantity||1}</td>
                <td>Dori</td>
                <td>${(getMedicinePrice(med.medicine?._id || med.medicine) * (med.quantity||1)).toLocaleString()}</td>
            </tr>`).join('')}
        </tbody>
    </table>

    ${savedDiscount > 0 ? `<div class="discount-row">Chegirma: \u2212 ${savedDiscount.toLocaleString()} so'm</div>` : ''}
    <div class="total-section">Umumiy summa: ${totalAmount.toLocaleString()} so'm</div>

    ${barcodeVal ? `<div class="barcode-wrap">
        <canvas id="bc"></canvas>
    </div>
    <script>
    (function(){
        var val = "${barcodeVal}";
        var T = [
            "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
            "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
            "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
            "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
            "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
            "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
            "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
            "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
            "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
            "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
            "114131","311141","411131","211412","211214","211232","2331112"
        ];
        var codes = [104];
        var check = 104;
        for(var i=0;i<val.length;i++){
            var v = val.charCodeAt(i)-32;
            codes.push(v);
            check += v*(i+1);
        }
        codes.push(check%103);
        codes.push(106);
        var bars=[], h=50, scale=2, quiet=20;
        for(var i=0;i<codes.length;i++){
            var pat=T[codes[i]];
            for(var j=0;j<pat.length;j++){
                bars.push({w:parseInt(pat[j])*scale,dark:j%2===0});
            }
        }
        var totalW=bars.reduce(function(s,b){return s+b.w;},0)+quiet*2;
        var c=document.getElementById('bc');
        c.width=totalW; c.height=h;
        var ctx=c.getContext('2d');
        ctx.fillStyle='#fff'; ctx.fillRect(0,0,totalW,h);
        var px=quiet;
        bars.forEach(function(b){
            if(b.dark){ctx.fillStyle='#000';ctx.fillRect(px,0,b.w,h);}
            px+=b.w;
        });
    })();
    <\/script>` : ''}

    <div class="footer">Ma'lumotlarning to'g'riligini tekshiring!</div>
</body></html>`)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
            printWindow.print()
            printWindow.close()
        }, 1200)
    }

    // Print only receipt (thermal printer)
    const handlePrintCombined = (diagnosisData, payment, totalAmount) => {
        const now = new Date()
        const receiptNumber = `CHK-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`

        // Kategoriyalar (analizlar) narxi
        const categoriesTotal = diagnosisFormData.diagnoses.reduce((sum, d) => sum + (d.price || 0), 0)

        // Dorilar narxi
        const medicinesWithPrices = payment.medicines?.map(m => ({
            ...m,
            price: getMedicinePrice(m.medicine),
            total: getMedicinePrice(m.medicine) * (m.quantity || 1)
        })) || []
        const medicinesTotal = medicinesWithPrices.reduce((sum, m) => sum + m.total, 0)

        const grandTotal = categoriesTotal + medicinesTotal

        const logoUrl = `${window.location.origin}/logo.png`
        const payMethodLabel = { cash: "Naqd pul", card: "Karta", transfer: "O'tkazma" }[payment.paymentMethod] || payment.paymentMethod

        const printWindow = window.open('', '_blank')
        printWindow.document.write(`<!DOCTYPE html>
<html><head>
<title>Chek - ${selectedPatient?.fullName}</title>
<style>
    @page { margin: 0; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 6mm; max-width: 80mm; font-size: 11px; background: #fff; color: #111; }
    .header { text-align: center; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 2px dashed #333; }
    .logo-wrap { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 4px; }
    .logo-wrap img { width: 40px; height: 40px; object-fit: contain; }
    .clinic-name { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; }
    .clinic-name span { color: #1a6abf; }
    .receipt-label { font-size: 10px; color: #555; margin-top: 3px; }
    .chk-num { font-size: 9px; color: #888; font-family: monospace; margin-top: 2px; }
    .info-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; border-bottom: 1px dotted #ddd; }
    .info-row:last-child { border-bottom: none; }
    .info-block { margin-bottom: 8px; }
    .section { border-top: 1px dashed #aaa; padding-top: 7px; margin-top: 7px; }
    .section-title { font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #444; margin-bottom: 5px; }
    .item-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
    .item-name { flex: 1; padding-right: 8px; }
    .item-price { font-weight: 600; white-space: nowrap; }
    .subtotal { display: flex; justify-content: space-between; padding: 4px 0; font-size: 10px; color: #555; border-top: 1px dotted #ccc; margin-top: 4px; }
    .discount-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; color: #c00; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0 4px; font-size: 14px; font-weight: 900; border-top: 2px solid #111; margin-top: 6px; }
    .payment-method { text-align: center; font-size: 10px; color: #555; padding: 4px 0; }
    .footer { text-align: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #aaa; }
    .footer p { font-size: 10px; color: #666; margin-bottom: 2px; }
    .footer .thank { font-size: 12px; font-weight: 700; color: #1a6abf; }
    @media print { body { padding: 0; } }
</style>
</head>
<body>
    <div class="header">
        <div class="logo-wrap">
            <img src="${logoUrl}" alt="logo" onerror="this.style.display='none'" />
            <div class="clinic-name">Al-Beruniy <span>Med</span></div>
        </div>
        <div class="receipt-label">To'lov cheki</div>
        <div class="chk-num">${receiptNumber}</div>
    </div>

    <div class="info-block">
        <div class="info-row"><span>Sana:</span><span>${now.toLocaleDateString('uz-UZ')} ${now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span></div>
        <div class="info-row"><span>Bemor:</span><span><b>${selectedPatient?.fullName}</b></span></div>
    </div>

    ${diagnosisFormData.diagnoses.length > 0 ? `
    <div class="section">
        <div class="section-title">Yo'nalishlar</div>
        ${diagnosisFormData.diagnoses.map(d => `<div class="item-row"><span class="item-name">${d.diagnosisName}</span><span class="item-price">${(d.price||0).toLocaleString()} so'm</span></div>`).join('')}
        <div class="subtotal"><span>Jami yo'nalishlar:</span><span>${categoriesTotal.toLocaleString()} so'm</span></div>
    </div>` : ''}

    ${medicinesWithPrices.length > 0 ? `
    <div class="section">
        <div class="section-title">Dorilar</div>
        ${medicinesWithPrices.map(m => `<div class="item-row"><span class="item-name">${m.name} × ${m.quantity||1}</span><span class="item-price">${m.total.toLocaleString()} so'm</span></div>`).join('')}
        <div class="subtotal"><span>Jami dorilar:</span><span>${medicinesTotal.toLocaleString()} so'm</span></div>
    </div>` : ''}

    <div class="total-row"><span>JAMI TO'LOV:</span><span>${grandTotal.toLocaleString()} so'm</span></div>
    <div class="payment-method">To'lov usuli: ${payMethodLabel}</div>

    <div class="footer">
        <p class="thank">Rahmat! Sog'lom bo'ling!</p>
        <p>Al-Beruniy Med tibbiyot markazi</p>
    </div>
</body></html>`)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
            printWindow.print()
            printWindow.close()
        }, 250)
    }

    // Print only receipt (not diagnosis)
    const handlePrintReceipt = () => {
        const totalAmount = paymentData.consultationFee + paymentData.medicinesCost - paymentData.discount
        const now = new Date()
        const receiptNumber = `CHK-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`

        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Chop etish</title>
                <style>
                    @page { margin: 0; }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Courier New', monospace;
                        padding: 10mm;
                        max-width: 80mm;
                        margin: 0 auto;
                        font-size: 12px;
                    }
                    .receipt { border: 1px dashed #000; padding: 10px; }
                    .receipt-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                    .receipt-header h1 { font-size: 16px; margin-bottom: 5px; }
                    .receipt-header p { font-size: 10px; }
                    .receipt-info { margin-bottom: 10px; }
                    .receipt-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                    .receipt-items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 10px 0; }
                    .receipt-item { margin-bottom: 5px; }
                    .receipt-item-name { font-weight: bold; }
                    .receipt-item-details { display: flex; justify-content: space-between; font-size: 11px; }
                    .receipt-totals { margin-top: 10px; }
                    .receipt-total-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                    .receipt-total-row.final { font-weight: bold; font-size: 14px; border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
                    .receipt-footer { text-align: center; margin-top: 15px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="receipt-header">
                        <h1>AL-BERUNIY MED</h1>
                        <p>To'lov cheki</p>
                        <p>${receiptNumber}</p>
                    </div>
                    
                    <div class="receipt-info">
                        <div class="receipt-row"><span>Sana:</span><span>${now.toLocaleDateString('uz-UZ')} ${now.toLocaleTimeString('uz-UZ')}</span></div>
                        <div class="receipt-row"><span>Bemor:</span><span>${selectedPatient?.fullName}</span></div>
                        <div class="receipt-row"><span>Analiz:</span><span>${lastSavedDiagnosis?.diagnosisName || '-'}</span></div>
                    </div>
                    
                    <div class="receipt-items">
                        <div class="receipt-item">
                            <div class="receipt-item-name">Konsultatsiya</div>
                            <div class="receipt-item-details">
                                <span>1 x ${paymentData.consultationFee.toLocaleString()} so'm</span>
                                <span>${paymentData.consultationFee.toLocaleString()} so'm</span>
                            </div>
                        </div>
                        ${paymentData.medicines.map(m => `
                            <div class="receipt-item">
                                <div class="receipt-item-name">${m.name}</div>
                                <div class="receipt-item-details">
                                    <span>${m.quantity || 1} x ${m.price?.toLocaleString() || 0} so'm</span>
                                    <span>${m.total?.toLocaleString() || 0} so'm</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="receipt-totals">
                        <div class="receipt-total-row"><span>Konsultatsiya:</span><span>${paymentData.consultationFee.toLocaleString()} so'm</span></div>
                        <div class="receipt-total-row"><span>Dorilar:</span><span>${paymentData.medicinesCost.toLocaleString()} so'm</span></div>
                        ${paymentData.discount > 0 ? `<div class="receipt-total-row"><span>Chegirma:</span><span>-${paymentData.discount.toLocaleString()} so'm</span></div>` : ''}
                        <div class="receipt-total-row final"><span>JAMI:</span><span>${totalAmount.toLocaleString()} so'm</span></div>
                        <div class="receipt-total-row"><span>To'lov usuli:</span><span>${paymentData.paymentMethod}</span></div>
                    </div>
                    
                    <div class="receipt-footer">
                        <p>Xaridingiz uchun rahmat!</p>
                        <p>Sog'lom bo'ling!</p>
                    </div>
                </div>
            </body>
            </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
            printWindow.print()
            printWindow.close()
            setShowPaymentModal(false)
        }, 250)
    }

    const handlePrintDiagnosis = (diagnosis) => {
        setSelectedDiagnosis(diagnosis)
        setTimeout(() => {
            const printContent = printRef.current
            if (!printContent) return

            const printWindow = window.open('', '_blank')
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Chop etish</title>
                    <style>
                        @page { 
                            margin: 0; 
                            size: A4;
                        }
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: 'Times New Roman', serif; 
                            padding: 15mm; 
                            max-width: 210mm;
                            margin: 0 auto;
                            color: #000;
                        }
                        .header { 
                            text-align: center; 
                            border-bottom: 2px solid #000; 
                            padding-bottom: 15px; 
                            margin-bottom: 20px;
                        }
                        .header h1 { font-size: 18pt; margin-bottom: 5px; }
                        .header p { font-size: 10pt; color: #555; }
                        .section { margin-bottom: 20px; }
                        .section-title { 
                            font-size: 12pt; 
                            font-weight: bold; 
                            background: #f0f0f0; 
                            padding: 8px 12px;
                            margin-bottom: 10px;
                            border-left: 4px solid #333;
                        }
                        .info-grid {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 10px;
                        }
                        .info-item {
                            padding: 8px 0;
                            border-bottom: 1px dotted #ccc;
                        }
                        .info-label { 
                            font-size: 9pt; 
                            color: #666; 
                            display: block;
                            margin-bottom: 2px;
                        }
                        .info-value { font-size: 11pt; font-weight: 500; }
                        .diagnosis-content {
                            padding: 15px;
                            background: #fafafa;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            min-height: 100px;
                        }
                        .medicines-list {
                            list-style: none;
                            padding: 0;
                        }
                        .medicines-list li {
                            padding: 8px 12px;
                            border-bottom: 1px solid #eee;
                            display: flex;
                            justify-content: space-between;
                        }
                        .medicines-list li:last-child { border-bottom: none; }
                        .footer {
                            margin-top: 20px;
                            display: flex;
                            justify-content: space-between;
                            padding-top: 15px;
                            border-top: 1px solid #ccc;
                        }
                        .signature-block {
                            text-align: center;
                        }
                        .signature-line {
                            width: 150px;
                            border-bottom: 1px solid #000;
                            margin-bottom: 5px;
                            height: 30px;
                        }
                        .signature-label { font-size: 9pt; }
                        
                        /* Fit to single A4 page */
                        html, body {
                            height: 297mm;
                            width: 210mm;
                            overflow: hidden;
                        }
                        .page-container {
                            height: 100%;
                            display: flex;
                            flex-direction: column;
                        }
                        @media print {
                            html, body { 
                                height: 100%; 
                                overflow: hidden;
                            }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                </body>
                </html>
            `)
            printWindow.document.close()
            printWindow.focus()
            setTimeout(() => {
                printWindow.print()
                printWindow.close()
            }, 250)
        }, 100)
    }

    // Check if date is today
    const isToday = (dateString) => {
        if (!dateString) return false
        const date = new Date(dateString)
        const today = new Date()
        return date.toDateString() === today.toDateString()
    }

    // Check if patient was active today (registered or had diagnosis today)
    const isActiveToday = (patient) => {
        // Check registration date
        if (isToday(patient.createdAt || patient.registeredAt)) {
            return true
        }
        // Check last diagnosis date
        if (isToday(patient.lastDiagnosisDate)) {
            return true
        }
        return false
    }

    // Bajarilmagan: kamida 1 ta analizi bor VA kamida bittasida natija saqlanmagan
    const hasPendingResults = (patient) => {
        return patient.hasUnsavedResults === true
    }

    // Bajarilgan: kamida 1 ta analizi bor VA hammasida natija saqlangan
    const hasAllResultsCompleted = (patient) => {
        return patient.allResultsSaved === true
    }

    const filteredPatients = patients.filter(patient => {
        // Text search filter (includes _id for barcode scanner support)
        const matchesSearch =
            patient.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.phone?.includes(searchTerm) ||
            patient.passportNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient._id?.toLowerCase().includes(searchTerm.toLowerCase())

        // Date/status filter
        let matchesFilter = true
        if (dateFilter === 'today') matchesFilter = isActiveToday(patient)
        else if (dateFilter === 'pending') matchesFilter = hasPendingResults(patient)
        else if (dateFilter === 'completed') matchesFilter = hasAllResultsCompleted(patient)

        return matchesSearch && matchesFilter
    })

    // Get today's active patients count (registered or diagnosed today)
    const todayPatientsCount = patients.filter(p => isActiveToday(p)).length
    const pendingCount = patients.filter(p => hasPendingResults(p)).length
    const completedCount = patients.filter(p => hasAllResultsCompleted(p)).length

    // Pagination
    const totalPages = Math.ceil(filteredPatients.length / PAGE_SIZE)
    const pagedPatients = filteredPatients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return
        setCurrentPage(page)
    }

    // Reset to page 1 when filter/search changes
    const handleSearch = (val) => { setSearchTerm(val); setCurrentPage(1) }
    const handleDateFilter = (val) => { setDateFilter(val); setCurrentPage(1) }

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleDateString('uz-UZ')
    }

    const formatDateTime = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleString('uz-UZ')
    }

    const calculateAge = (birthDate) => {
        if (!birthDate) return '-'
        const today = new Date()
        const birth = new Date(birthDate)
        let age = today.getFullYear() - birth.getFullYear()
        const monthDiff = today.getMonth() - birth.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--
        }
        return age + ' yosh'
    }

    // Create and print queue ticket for a patient
    const createAndPrintQueueTicket = async (patientId, patientData) => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/queue-tickets/${patientId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                printQueueTicket(data.ticket, patientData)
            }
        } catch (error) {
            console.error('Queue ticket error:', error)
        }
    }

    // Print queue ticket receipt
    const printQueueTicket = (ticket, patientData) => {
        const now = new Date(ticket.arrivalTime)
        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Navbat chiptasi - ${ticket.queueNumber}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Courier New', monospace;
                        padding: 5mm;
                        max-width: 80mm;
                        margin: 0 auto;
                    }
                    .ticket {
                        border: 2px solid #000;
                        padding: 10px;
                        text-align: center;
                    }
                    .ticket-header {
                        border-bottom: 2px dashed #000;
                        padding-bottom: 10px;
                        margin-bottom: 10px;
                    }
                    .ticket-header h1 {
                        font-size: 14px;
                        margin-bottom: 5px;
                    }
                    .ticket-header p {
                        font-size: 10px;
                        color: #555;
                    }
                    .queue-number {
                        font-size: 48px;
                        font-weight: bold;
                        color: #000;
                        margin: 15px 0;
                        line-height: 1;
                    }
                    .queue-label {
                        font-size: 12px;
                        color: #555;
                        margin-bottom: 5px;
                    }
                    .ticket-info {
                        text-align: left;
                        border-top: 1px dashed #000;
                        padding-top: 10px;
                        margin-top: 10px;
                        font-size: 11px;
                    }
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 5px;
                    }
                    .info-label {
                        color: #555;
                    }
                    .patient-name {
                        font-weight: bold;
                        font-size: 12px;
                        margin: 10px 0;
                        text-align: center;
                    }
                    .ticket-footer {
                        border-top: 1px dashed #000;
                        padding-top: 10px;
                        margin-top: 10px;
                        font-size: 10px;
                        color: #555;
                    }
                    @media print { 
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="ticket">
                    <div class="ticket-header">
                        <h1>AL-BERUNIY MED</h1>
                        <p>NAVBAT CHIPTASI</p>
                    </div>
                    
                    <div class="queue-label">SIZNING NAVBATINGIZ</div>
                    <div class="queue-number">#${String(ticket.queueNumber).padStart(3, '0')}</div>
                    
                    <div class="patient-name">${patientData?.fullName || ticket.patientName}</div>
                    
                    <div class="ticket-info">
                        <div class="info-row">
                            <span class="info-label">Sana:</span>
                            <span>${now.toLocaleDateString('uz-UZ')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Vaqt:</span>
                            <span>${now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Telefon:</span>
                            <span>${patientData?.phone || ticket.phone || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Jinsi:</span>
                            <span>${(patientData?.gender || ticket.gender) === 'male' ? 'Erkak' : 'Ayol'}</span>
                        </div>
                    </div>
                    
                    <div class="ticket-footer">
                        <p>Iltimos, navbatingizni kuting</p>
                        <p>Sog'lom bo'ling!</p>
                    </div>
                </div>
            </body>
            </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
            printWindow.print()
            printWindow.close()
        }, 250)
    }

    return (
        <div className="pm-page">
            {/* Page Header */}
            <div className="pm-header">
                <div className="pm-header-left">
                    <div className="pm-header-icon">
                        <UserPlus size={22} />
                    </div>
                    <div>
                        <h1 className="pm-title">Bemorlar</h1>
                        <p className="pm-subtitle">Bemorlar ro'yxatini boshqarish</p>
                    </div>
                </div>
                {getBase() !== '/doctor' && (
                    <button className="pm-add-btn" onClick={() => {
                        const base = getBase()
                        navigate(`${base}/patients/add`)
                    }}>
                        <Plus size={18} />
                        Yangi bemor
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="pm-stats">
                <div className="pm-stat-card pm-stat-blue">
                    <div className="pm-stat-icon">
                        <UserPlus size={22} />
                    </div>
                    <div>
                        <span className="pm-stat-num">{patients.length}</span>
                        <span className="pm-stat-label">Jami bemorlar</span>
                    </div>
                </div>
                <div className="pm-stat-card pm-stat-green">
                    <div className="pm-stat-icon">
                        <Calendar size={22} />
                    </div>
                    <div>
                        <span className="pm-stat-num">{todayPatientsCount}</span>
                        <span className="pm-stat-label">Bugungi bemorlar</span>
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
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
                        <button
                            className={`pm-filter-btn ${dateFilter === 'all' ? 'active' : ''}`}
                            onClick={() => handleDateFilter('all')}
                        >
                            Barchasi
                        </button>
                        <button
                            className={`pm-filter-btn ${dateFilter === 'today' ? 'active' : ''}`}
                            onClick={() => handleDateFilter('today')}
                        >
                            <Calendar size={14} />
                            Bugungi ({todayPatientsCount})
                        </button>
                        <button
                            className={`pm-filter-btn pm-filter-btn--pending ${dateFilter === 'pending' ? 'active' : ''}`}
                            onClick={() => handleDateFilter('pending')}
                        >
                            Bajarilmagan ({pendingCount})
                        </button>
                        <button
                            className={`pm-filter-btn pm-filter-btn--completed ${dateFilter === 'completed' ? 'active' : ''}`}
                            onClick={() => handleDateFilter('completed')}
                        >
                            Bajarilgan ({completedCount})
                        </button>
                    </div>
                </div>
                <div className="pm-toolbar-info">
                    <span>Jami: <strong>{filteredPatients.length}</strong> ta bemor</span>
                </div>
            </div>

            {/* Patients Table */}
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
                                            <div className="pm-avatar">
                                                {patient.fullName?.charAt(0) || 'B'}
                                            </div>
                                            <span className="pm-user-name">{patient.fullName}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="pm-phone-cell">
                                            <Phone size={13} />
                                            {patient.phone || '-'}
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
                                            {!readOnly && (
                                                <button className="pm-act-btn pm-act-list" title="Analizlar" onClick={() => handleViewAnalyzes(patient)}>
                                                    <ClipboardList size={15} />
                                                </button>
                                            )}
                                            <button className="pm-act-btn pm-act-edit" title="Tahrirlash" onClick={() => handleEdit(patient)}>
                                                <Edit2 size={15} />
                                            </button>
                                            {!readOnly && (
                                                <button className="pm-act-btn pm-act-del" title="O'chirish" onClick={() => handleDelete(patient)}>
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
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

            {/* Add/Edit Patient Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
                    <div className="pe-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="pe-header">
                            <div className="pe-title">
                                <div className="pe-title-icon">
                                    {editingPatient ? <Edit2 size={18} /> : <UserPlus size={18} />}
                                </div>
                                <h2>{editingPatient ? 'Bemorni tahrirlash' : 'Yangi bemor'}</h2>
                            </div>
                            <button className="pe-close" onClick={() => { setShowModal(false); resetForm(); }}>
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
                                        {searchLoading && (
                                            <div className="autocomplete-loading">
                                                <div className="spinner small"></div>
                                            </div>
                                        )}
                                        {showSuggestions && suggestions.length > 0 && (
                                            <div className="autocomplete-dropdown">
                                                <div className="autocomplete-header">Mavjud bemorlar</div>
                                                {suggestions.map((patient) => (
                                                    <div key={patient._id} className="autocomplete-item" onMouseDown={() => handleSelectPatient(patient)}>
                                                        <div className="autocomplete-item-name">{patient.fullName}</div>
                                                        <div className="autocomplete-item-info">
                                                            {patient.phone || "Telefon yo'q"}
                                                            {patient.birthDate && ` • ${new Date(patient.birthDate).toLocaleDateString('uz-UZ')}`}
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
                                        <input
                                            type="date"
                                            className="pe-input"
                                            value={formData.birthDate}
                                            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="pe-field">
                                        <label className="pe-label">Jinsi</label>
                                        <select
                                            className="pe-input"
                                            value={formData.gender}
                                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        >
                                            <option value="male">Erkak</option>
                                            <option value="female">Ayol</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pe-row">
                                    <div className="pe-field">
                                        <label className="pe-label">Telefon</label>
                                        <input
                                            type="text"
                                            className="pe-input"
                                            placeholder="+998 90 123 45 67"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="pe-field">
                                        <label className="pe-label">Passport raqami</label>
                                        <input
                                            type="text"
                                            className="pe-input"
                                            placeholder="AA1234567"
                                            value={formData.passportNumber}
                                            onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="pe-field">
                                    <label className="pe-label">Izohlar</label>
                                    <textarea
                                        className="pe-input"
                                        placeholder="Qo'shimcha ma'lumotlar"
                                        rows="3"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pe-footer">
                                <button type="button" className="pe-btn pe-btn-cancel" onClick={() => { setShowModal(false); resetForm(); }}>
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

            {/* View Patient Modal */}
            {showViewModal && selectedPatient && (
                <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="modal glass-card modal-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Bemor ma'lumotlari</h2>
                            <button className="modal-close" onClick={() => setShowViewModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="pv-body">
                            {/* Bemor sarlavhasi */}
                            <div className="pv-header">
                                <div className="pv-avatar">
                                    {selectedPatient.fullName?.charAt(0) || 'B'}
                                </div>
                                <div>
                                    <h3 className="pv-name">{selectedPatient.fullName}</h3>
                                    <span className={`pv-gender ${selectedPatient.gender}`}>
                                        {selectedPatient.gender === 'male' ? '♂ Erkak' : '♀ Ayol'}
                                    </span>
                                </div>
                            </div>

                            {/* Ma'lumotlar panjarasi */}
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
                                <div className="pv-notes">
                                    <strong>Yuborgan doktor:</strong> {selectedPatient.referredBy}
                                </div>
                            )}

                            {selectedPatient.notes && (
                                <div className="pv-notes">
                                    <strong>Izoh:</strong> {selectedPatient.notes}
                                </div>
                            )}

                            {/* Analizlar bo'limi */}
                            <div className="pv-section">
                                <div className="pv-section-header">
                                    <h4>
                                        <Stethoscope size={18} />
                                        Analizlar tarixi
                                    </h4>
                                    <div className="pv-section-actions">
                                        {!readOnly && patientDiagnoses.length > 0 && (
                                            <button
                                                className="btn btn-success btn-sm"
                                                onClick={openResultsEntryModal}
                                            >
                                                <ClipboardList size={16} />
                                                Barcha natijalarni kiritish
                                            </button>
                                        )}
                                        <button className="btn btn-primary btn-sm" onClick={() => {
                                            navigate(`${getBase()}/patients/diagnosis/${selectedPatient._id}`)
                                        }}>
                                            <PlusCircle size={16} />
                                            analiz qo'shish
                                        </button>
                                    </div>
                                </div>

                                {diagnosesLoading ? (
                                    <div className="loading-inline">
                                        <div className="spinner-sm"></div>
                                        <span>Analizlar yuklanmoqda...</span>
                                    </div>
                                ) : patientDiagnoses.length === 0 ? (
                                    <div className="pv-empty">
                                        <ClipboardList size={28} />
                                        <p>Analizlar topilmadi</p>
                                        <button className="btn btn-outline btn-sm" onClick={() => {
                                            navigate(`${getBase()}/patients/diagnosis/${selectedPatient._id}`)
                                        }}>
                                            <Plus size={14} />
                                            Birinchi analizni qo'shish
                                        </button>
                                    </div>
                                ) : (
                                    <div className="pv-diagnoses-list">
                                        {patientDiagnoses.map((diagnosis, idx) => {
                                            const nameStr = diagnosis.diagnosisName || diagnosis.diagnosis?.name || 'Analiz'
                                            const tags = nameStr.split(',').map(s => s.trim()).filter(Boolean)
                                            return (
                                                <div key={diagnosis._id} className="pv-dc">
                                                    {/* Tartib raqami + asosiy nom + soni */}
                                                    <div className="pv-dc-top">
                                                        <span className="pv-dc-num">{idx + 1}</span>
                                                        <div className="pv-dc-tags">
                                                            <span className="pv-dc-tag">{tags[0]}</span>
                                                            {tags.length > 1 && (
                                                                <span className="pv-dc-tag pv-dc-tag--count">+{tags.length - 1} ta analiz</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Sana + doktor */}
                                                    <div className="pv-dc-meta">
                                                        <span className="pv-dc-meta-item">
                                                            <Calendar size={13} />
                                                            {formatDateTime(diagnosis.createdAt)}
                                                        </span>
                                                        <span className="pv-dc-meta-item">
                                                            <User size={13} />
                                                            {diagnosis.doctor?.fullName || diagnosis.doctorName || 'Noma\'lum'}
                                                        </span>
                                                    </div>

                                                    {/* Tugmalar */}
                                                    <div className="pv-dc-actions">
                                                        {!readOnly && (
                                                            <button
                                                                className="pv-dc-btn pv-dc-btn--results"
                                                                onClick={() => openSingleCategoryModal(diagnosis)}
                                                            >
                                                                <ClipboardList size={14} />
                                                                Natijalar
                                                            </button>
                                                        )}
                                                        <button
                                                            className="pv-dc-btn pv-dc-btn--print"
                                                            onClick={() => handlePrintSavedResults(diagnosis)}
                                                        >
                                                            <Printer size={14} />
                                                            Chop etish
                                                        </button>
                                                        <button
                                                            className="pv-dc-btn pv-dc-btn--chek"
                                                            onClick={() => handlePrintPaymentReceipt(diagnosis)}
                                                        >
                                                            <FileText size={14} />
                                                            Chek
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Diagnosis Modal */}
            {showDiagnosisModal && selectedPatient && (
                <div className="modal-overlay" onClick={() => setShowDiagnosisModal(false)}>
                    <div className="modal glass-card modal-wide" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                <Stethoscope size={24} />
                                analiz qo'shish
                            </h2>
                            <button className="modal-close" onClick={() => setShowDiagnosisModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="diagnosis-patient-info">
                            <div className="patient-badge">
                                <div className="patient-avatar-sm">
                                    {selectedPatient.fullName?.charAt(0) || 'B'}
                                </div>
                                <div>
                                    <strong>{selectedPatient.fullName}</strong>
                                    <span>{calculateAge(selectedPatient.birthDate)} • {selectedPatient.gender === 'male' ? 'Erkak' : 'Ayol'}</span>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleDiagnosisSubmit} className="modal-form">
                            {diagnosisError && <div className="alert error">{diagnosisError}</div>}
                            {diagnosisSuccess && <div className="alert success"><Check size={18} /> {diagnosisSuccess}</div>}

                            {/* Wizard Steps Indicator */}
                            <div className="wizard-steps">
                                <div className={`wizard-step ${diagnosisStep >= 1 ? 'active' : ''} ${diagnosisStep > 1 ? 'completed' : ''}`}>
                                    <span className="step-number">1</span>
                                    <span className="step-label">Analiz</span>
                                </div>
                                <div className="wizard-step-line"></div>
                                <div className={`wizard-step ${diagnosisStep >= 2 ? 'active' : ''} ${diagnosisStep > 2 ? 'completed' : ''}`}>
                                    <span className="step-number">2</span>
                                    <span className="step-label">Dori</span>
                                </div>
                                <div className="wizard-step-line"></div>
                                <div className={`wizard-step ${diagnosisStep >= 3 ? 'active' : ''}`}>
                                    <span className="step-number">3</span>
                                    <span className="step-label">To'lov</span>
                                </div>
                            </div>

                            {/* 1-BOSQICH: Analizlarni tanlash (doctor uslubida) */}
                            {diagnosisStep === 1 && (() => {
                                const selectedIds = new Set(diagnosisFormData.diagnoses.map(d => d.diagnosisId))
                                const activeCategoryDiags = activeCategory ? getDiagnosesByCategory(activeCategory) : []
                                const activeCategoryObj = categoriesList.find(c => c._id === activeCategory)
                                const allSelectedInCategory = activeCategoryDiags.length > 0 && activeCategoryDiags.every(d => selectedIds.has(d._id))
                                const totalAmount = diagnosisFormData.diagnoses.reduce((s, d) => s + (d.price || 0), 0)
                                return (
                                    <div className="df-modal-body">
                                        {/* Chap panel: kategoriyalar + tanlangan */}
                                        <div className="df-modal-sidebar">
                                            <div className="df-cat-list">
                                                <div className="df-cat-list-title">Kategoriyalar</div>
                                                {categoriesList.map(cat => {
                                                    const cnt = getSelectedCountByCategory(cat._id)
                                                    return (
                                                        <div
                                                            key={cat._id}
                                                            className={`df-cat-item ${activeCategory === cat._id ? 'active' : ''}`}
                                                            onClick={() => setActiveCategory(cat._id)}
                                                        >
                                                            <div className="df-cat-item-info">
                                                                <span className="df-cat-item-name">{cat.name}</span>
                                                                <span className="df-cat-badge">{getDiagnosesByCategory(cat._id).length}</span>
                                                            </div>
                                                            {cnt > 0 && <span className="df-cat-selected-badge">{cnt} tanlangan</span>}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            {diagnosisFormData.diagnoses.length > 0 && (
                                                <div className="df-summary-card">
                                                    <h4>Tanlangan ({diagnosisFormData.diagnoses.length})</h4>
                                                    {diagnosisFormData.diagnoses.map(d => (
                                                        <div key={d.diagnosisId} className="df-summary-row">
                                                            <span>→ {d.diagnosisName}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* O'ng panel: analizlar grid */}
                                        <div className="df-modal-main">
                                            <div className="df-section-header-row">
                                                <div>
                                                    <h3>{activeCategoryObj?.name || 'Analizlar'}</h3>
                                                    <p>{activeCategoryDiags.length} ta analiz</p>
                                                </div>
                                                {activeCategoryDiags.length > 0 && (
                                                    <button
                                                        type="button"
                                                        className={`df-select-all-btn ${allSelectedInCategory ? 'active' : ''}`}
                                                        onClick={() => toggleAllInCategory(activeCategory)}
                                                    >
                                                        {allSelectedInCategory ? 'Barchasini bekor qilish' : 'Barchasini tanlash'}
                                                    </button>
                                                )}
                                            </div>

                                            <div className="df-diagnoses-grid">
                                                {activeCategoryDiags.length > 0 ? activeCategoryDiags.map(d => {
                                                    const isSelected = selectedIds.has(d._id)
                                                    return (
                                                        <div
                                                            key={d._id}
                                                            className={`df-diag-item ${isSelected ? 'selected' : ''}`}
                                                            onClick={() => handleDiagnosisToggle(d._id)}
                                                        >
                                                            <div className="df-diag-check">
                                                                {isSelected ? <Check size={16} /> : null}
                                                            </div>
                                                            <div className="df-diag-info">
                                                                <span className="df-diag-name">{d.name}</span>
                                                                {d.code && <span className="df-diag-code">{d.code}</span>}
                                                            </div>
                                                            {getPriceForPatient(d) > 0 && (
                                                                <div className="df-diag-price">
                                                                    <span className="df-price-label">{getPriceForPatient(d).toLocaleString()} so'm</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                }) : (
                                                    <div className="df-empty-category">Bu kategoriyada analizlar topilmadi</div>
                                                )}
                                            </div>

                                            <div className="df-bottom-bar">
                                                <div className="df-bottom-info">
                                                    <span><strong>{diagnosisFormData.diagnoses.length}</strong> ta analiz tanlandi</span>
                                                    <span>Jami: <strong>{totalAmount.toLocaleString()} so'm</strong></span>
                                                </div>
                                                <div className="df-bottom-actions">
                                                    <button type="button" className="btn btn-secondary" onClick={() => setShowDiagnosisModal(false)}>
                                                        Bekor qilish
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary"
                                                        disabled={diagnosisFormData.diagnoses.length === 0}
                                                        onClick={() => setDiagnosisStep(2)}
                                                    >
                                                        Keyingi →
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* 2-BOSQICH: Dori tayinlash */}
                            {diagnosisStep === 2 && (
                                <div className="diagnosis-section">
                                    <h3 className="section-title-lg">Dori tayinlash</h3>
                                    <p className="section-subtitle">Dorilarni qidiring va tanlang</p>

                                    {/* Medicine Search */}
                                    <div className="medicine-search-box">
                                        <Search size={20} />
                                        <input
                                            type="text"
                                            placeholder="Dori nomini qidiring..."
                                            value={medicineSearchTerm || ''}
                                            onChange={(e) => setMedicineSearchTerm(e.target.value)}
                                            className="form-input"
                                        />
                                    </div>

                                    {/* Unified Medicines List - Recommended first */}
                                    <div className="unified-medicines-list">
                                        {(() => {
                                            // Get all recommended medicine IDs from selected diagnoses
                                            const recommendedIds = new Set()
                                            diagnosisFormData.diagnoses.forEach(diag => {
                                                const diagnosisData = diagnosesList.find(d => d._id === diag.diagnosisId)
                                                if (diagnosisData?.recommendedMedicines) {
                                                    diagnosisData.recommendedMedicines.forEach(m => {
                                                        recommendedIds.add(m._id || m)
                                                    })
                                                }
                                            })

                                            // Get all selected medicine IDs across all diagnoses
                                            const selectedMeds = {}
                                            diagnosisFormData.diagnoses.forEach(diag => {
                                                diag.medicines.forEach(m => {
                                                    selectedMeds[m.medicine] = { ...m, diagnosisId: diag.diagnosisId }
                                                })
                                            })

                                            // Filter and sort medicines
                                            const searchTerm = (medicineSearchTerm || '').toLowerCase()
                                            const filteredMeds = medicinesList
                                                .filter(med => med.name.toLowerCase().includes(searchTerm))
                                                .sort((a, b) => {
                                                    const aRec = recommendedIds.has(a._id)
                                                    const bRec = recommendedIds.has(b._id)
                                                    if (aRec && !bRec) return -1
                                                    if (!aRec && bRec) return 1
                                                    return a.name.localeCompare(b.name)
                                                })

                                            return filteredMeds.map(med => {
                                                const isRecommended = recommendedIds.has(med._id)
                                                const isSelected = selectedMeds[med._id]
                                                // Use first diagnosis for medicine assignment
                                                const firstDiagId = diagnosisFormData.diagnoses[0]?.diagnosisId

                                                return (
                                                    <div key={med._id} className={`medicine-item-unified ${isSelected ? 'selected' : ''} ${isRecommended ? 'recommended' : ''}`}>
                                                        <label className="medicine-checkbox">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!isSelected}
                                                                onChange={() => handleMedicineToggle(firstDiagId, med._id, med.name)}
                                                            />
                                                            <span className="medicine-name">{med.name}</span>
                                                            {isRecommended && <span className="recommended-badge">★ Tavsiya</span>}
                                                        </label>
                                                        {isSelected && (
                                                            <div className="medicine-details-inline">
                                                                <input
                                                                    type="number"
                                                                    placeholder="Soni"
                                                                    min="1"
                                                                    value={isSelected.quantity}
                                                                    onChange={(e) => updateMedicineDetails(firstDiagId, med._id, 'quantity', parseInt(e.target.value) || 1)}
                                                                    className="quantity-input"
                                                                />
                                                                <span className="medicine-price">{getMedicinePrice(med._id).toLocaleString()} so'm</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })
                                        })()}
                                    </div>

                                    {/* Selected Medicines Summary */}
                                    {diagnosisFormData.diagnoses.some(d => d.medicines.length > 0) && (
                                        <div className="selected-medicines-summary">
                                            <strong>Tanlangan dorilar:</strong>{' '}
                                            {diagnosisFormData.diagnoses.flatMap(d => d.medicines).map(m => m.name).join(', ')}
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label className="form-label">Izoh / Qo'shimcha ma'lumot</label>
                                        <textarea
                                            className="form-input"
                                            placeholder="Analiz bo'yicha izohlar..."
                                            rows="2"
                                            value={diagnosisFormData.notes}
                                            onChange={(e) => setDiagnosisFormData({ ...diagnosisFormData, notes: e.target.value })}
                                        />
                                    </div>

                                    <div className="modal-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => setDiagnosisStep(1)}>
                                            ← Orqaga
                                        </button>
                                        <button type="button" className="btn btn-primary" onClick={() => setDiagnosisStep(3)}>
                                            Keyingi →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 3-BOSQICH: To'lov */}
                            {diagnosisStep === 3 && (
                                <div className="diagnosis-section">
                                    <h3 className="section-title-lg">💳 To'lov</h3>
                                    <p className="section-subtitle">To'lov ma'lumotlarini kiriting</p>

                                    <div className="payment-summary-box">
                                        {/* Kategoriyalar (Analizlar) */}
                                        {diagnosisFormData.diagnoses.length > 0 && (
                                            <div className="payment-categories">
                                                <div className="payment-section-title">Yo'nalishlar:</div>
                                                {diagnosisFormData.diagnoses.map((d, idx) => (
                                                    <div key={idx} className="payment-summary-item">
                                                        <span>{d.diagnosisName}</span>
                                                        <span style={{ fontWeight: '600' }}>{(d.price || 0).toLocaleString()} so'm</span>
                                                    </div>
                                                ))}
                                                <div className="payment-subtotal">
                                                    <span>Jami yo'nalishlar:</span>
                                                    <span>{diagnosisFormData.diagnoses.reduce((sum, d) => sum + (d.price || 0), 0).toLocaleString()} so'm</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Dorilar */}
                                        {diagnosisFormData.diagnoses.flatMap(d => d.medicines).length > 0 && (
                                            <div className="payment-categories" style={{ marginTop: '16px' }}>
                                                <div className="payment-section-title">Dorilar:</div>
                                                {diagnosisFormData.diagnoses.flatMap(d => d.medicines).map((m, idx) => {
                                                    const price = getMedicinePrice(m.medicine)
                                                    const qty = m.quantity || 1
                                                    return (
                                                        <div key={idx} className="payment-summary-item">
                                                            <span>{m.name} x{qty}</span>
                                                            <span style={{ fontWeight: '600' }}>{(price * qty).toLocaleString()} so'm</span>
                                                        </div>
                                                    )
                                                })}
                                                <div className="payment-subtotal">
                                                    <span>Jami dorilar:</span>
                                                    <span>{diagnosisFormData.diagnoses.flatMap(d => d.medicines).reduce((sum, m) => sum + (getMedicinePrice(m.medicine) * (m.quantity || 1)), 0).toLocaleString()} so'm</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="payment-summary-item">
                                            <span>Chegirma:</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                    type="number"
                                                    value={paymentData.discount}
                                                    onChange={(e) => setPaymentData({ ...paymentData, discount: parseInt(e.target.value) || 0 })}
                                                    style={{ width: '120px' }}
                                                    className="form-input"
                                                    min="0"
                                                />
                                                <span>so'm</span>
                                            </div>
                                        </div>
                                        <div className="payment-summary-total">
                                            <span>JAMI:</span>
                                            <span>{(
                                                diagnosisFormData.diagnoses.reduce((sum, d) => sum + (d.price || 0), 0) +
                                                diagnosisFormData.diagnoses.flatMap(d => d.medicines).reduce((sum, m) => sum + (getMedicinePrice(m.medicine) * (m.quantity || 1)), 0) -
                                                paymentData.discount
                                            ).toLocaleString()} so'm</span>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">To'lov usuli</label>
                                        <div className="payment-methods">
                                            {[
                                                { value: 'cash', label: 'Naqd' },
                                                { value: 'card', label: 'Karta' },
                                                { value: 'transfer', label: "O'tkazma" }
                                            ].map(method => (
                                                <label key={method.value} className={`payment-method-option ${paymentData.paymentMethod === method.value ? 'selected' : ''}`}>
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value={method.value}
                                                        checked={paymentData.paymentMethod === method.value}
                                                        onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                                                    />
                                                    <span>{method.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="modal-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => setDiagnosisStep(2)}>
                                            ← Orqaga
                                        </button>
                                        <button type="submit" className="btn btn-success" disabled={savingDiagnosis}>
                                            {savingDiagnosis ? (
                                                <>
                                                    <span className="spinner-sm"></span>
                                                    Saqlanmoqda...
                                                </>
                                            ) : (
                                                <>
                                                    <Save size={20} />
                                                    Saqlash va Chop etish
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* Hidden Print Content */}
            <div style={{ display: 'none' }}>
                <div ref={printRef}>
                    {selectedDiagnosis && selectedPatient && (
                        <div className="print-content">
                            <div className="header">
                                <h1>ANALIZ VARAQASI</h1>
                                <p>Tibbiy muassasa</p>
                            </div>

                            <div className="section">
                                <div className="section-title">Bemor ma'lumotlari</div>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">F.I.O</span>
                                        <span className="info-value">{selectedPatient.fullName}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Tug'ilgan sana</span>
                                        <span className="info-value">{formatDate(selectedPatient.birthDate)}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Yoshi</span>
                                        <span className="info-value">{calculateAge(selectedPatient.birthDate)}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Jinsi</span>
                                        <span className="info-value">{selectedPatient.gender === 'male' ? 'Erkak' : 'Ayol'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Telefon</span>
                                        <span className="info-value">{selectedPatient.phone || '-'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Passport</span>
                                        <span className="info-value">{selectedPatient.passportNumber || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="section">
                                <div className="section-title">Analiz ma'lumotlari</div>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Analiz sanasi</span>
                                        <span className="info-value">{formatDateTime(selectedDiagnosis.createdAt)}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Shifokor</span>
                                        <span className="info-value">{selectedDiagnosis.doctor?.fullName || selectedDiagnosis.doctorName || '-'}</span>
                                    </div>
                                </div>
                                <div style={{ marginTop: '15px' }}>
                                    <span className="info-label">Analiz</span>
                                    <div className="diagnosis-content">
                                        {selectedDiagnosis.diagnosisName || selectedDiagnosis.diagnosis?.name || '-'}
                                    </div>
                                </div>
                                {selectedDiagnosis.notes && (
                                    <div style={{ marginTop: '15px' }}>
                                        <span className="info-label">Izoh</span>
                                        <div className="diagnosis-content">
                                            {selectedDiagnosis.notes}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {selectedDiagnosis.medicines && selectedDiagnosis.medicines.length > 0 && (
                                <div className="section">
                                    <div className="section-title">Tayinlangan dorilar</div>
                                    <ul className="medicines-list">
                                        {selectedDiagnosis.medicines.map((med, idx) => (
                                            <li key={idx}>
                                                <span>{idx + 1}. {med.name || med.medicine?.name}</span>
                                                <span>
                                                    {med.dosage && `${med.dosage}`}
                                                    {med.quantity && ` - ${med.quantity} dona`}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="footer">
                                <div className="signature-block">
                                    <div className="signature-line"></div>
                                    <span className="signature-label">Shifokor imzosi</span>
                                </div>
                                <div className="signature-block">
                                    <div className="signature-line"></div>
                                    <span className="signature-label">Muhr</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && deletingPatient && (
                <div className="modal-overlay" onClick={closeDeleteModal}>
                    <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="pd-body">
                            <div className="pd-icon">
                                <AlertTriangle size={26} />
                            </div>
                            <h3 className="pd-title">O'chirishni tasdiqlang</h3>
                            <p className="pd-desc">
                                <strong>"{deletingPatient.fullName}"</strong> bemorini o'chirishni xohlaysizmi?
                            </p>
                            <div className="pd-warning">
                                Bu amalni ortga qaytarib bo'lmaydi!
                            </div>
                        </div>
                        <div className="pd-footer">
                            <button
                                className="pd-btn pd-btn-cancel"
                                onClick={closeDeleteModal}
                                disabled={deleteLoading}
                            >
                                Bekor qilish
                            </button>
                            <button
                                className="pd-btn pd-btn-delete"
                                onClick={confirmDelete}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? (
                                    <>
                                        <span className="spinner-sm"></span>
                                        O'chirilmoqda...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} />
                                        Ha, o'chirish
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal glass-card payment-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>💳 To'lovni rasmiylashtirish</h2>
                            <button className="modal-close" onClick={() => setShowPaymentModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="payment-content">
                            <div className="payment-patient-info">
                                <div className="patient-avatar-sm">
                                    {selectedPatient?.fullName?.charAt(0) || 'B'}
                                </div>
                                <div>
                                    <strong>{selectedPatient?.fullName}</strong>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        Analiz: {lastSavedDiagnosis?.diagnosisName || '-'}
                                    </p>
                                </div>
                            </div>

                            <div className="payment-items">
                                <table className="payment-table">
                                    <thead>
                                        <tr>
                                            <th>Xizmat/Dori</th>
                                            <th>Soni</th>
                                            <th>Narxi</th>
                                            <th>Jami</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Konsultatsiya</td>
                                            <td>1</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-input-sm"
                                                    value={paymentData.consultationFee}
                                                    onChange={(e) => setPaymentData({
                                                        ...paymentData,
                                                        consultationFee: parseInt(e.target.value) || 0
                                                    })}
                                                />
                                            </td>
                                            <td>{paymentData.consultationFee.toLocaleString()} so'm</td>
                                        </tr>
                                        {paymentData.medicines.map((m, idx) => (
                                            <tr key={idx}>
                                                <td>{m.name}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="form-input-sm"
                                                        value={m.quantity || 1}
                                                        min="0.5"
                                                        step="0.5"
                                                        onChange={(e) => {
                                                            const newQty = parseFloat(e.target.value) || 1
                                                            const newMedicines = [...paymentData.medicines]
                                                            newMedicines[idx] = {
                                                                ...newMedicines[idx],
                                                                quantity: newQty,
                                                                total: newQty * (newMedicines[idx].price || 0)
                                                            }
                                                            const newMedicinesCost = newMedicines.reduce((sum, med) => sum + (med.total || 0), 0)
                                                            setPaymentData({
                                                                ...paymentData,
                                                                medicines: newMedicines,
                                                                medicinesCost: newMedicinesCost
                                                            })
                                                        }}
                                                        style={{ width: '70px' }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="form-input-sm"
                                                        value={m.price || 0}
                                                        onChange={(e) => {
                                                            const newPrice = parseInt(e.target.value) || 0
                                                            const newMedicines = [...paymentData.medicines]
                                                            newMedicines[idx] = {
                                                                ...newMedicines[idx],
                                                                price: newPrice,
                                                                total: (newMedicines[idx].quantity || 1) * newPrice
                                                            }
                                                            const newMedicinesCost = newMedicines.reduce((sum, med) => sum + (med.total || 0), 0)
                                                            setPaymentData({
                                                                ...paymentData,
                                                                medicines: newMedicines,
                                                                medicinesCost: newMedicinesCost
                                                            })
                                                        }}
                                                        style={{ width: '100px' }}
                                                    />
                                                </td>
                                                <td style={{ fontWeight: '600', color: 'var(--success)' }}>
                                                    {(m.total || 0).toLocaleString()} so'm
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="payment-summary">
                                <div className="summary-row">
                                    <span>Konsultatsiya:</span>
                                    <span>{paymentData.consultationFee.toLocaleString()} so'm</span>
                                </div>
                                <div className="summary-row">
                                    <span>Dorilar:</span>
                                    <span>{paymentData.medicinesCost.toLocaleString()} so'm</span>
                                </div>
                                <div className="summary-row discount">
                                    <span>Chegirma:</span>
                                    <input
                                        type="number"
                                        className="form-input-sm"
                                        value={paymentData.discount}
                                        onChange={(e) => setPaymentData({
                                            ...paymentData,
                                            discount: parseInt(e.target.value) || 0
                                        })}
                                        style={{ width: '100px', textAlign: 'right' }}
                                    />
                                </div>
                                <div className="summary-row total">
                                    <span>JAMI TO'LOV:</span>
                                    <span>{(paymentData.consultationFee + paymentData.medicinesCost - paymentData.discount).toLocaleString()} so'm</span>
                                </div>
                            </div>

                            <div className="payment-method">
                                <label className="form-label">To'lov usuli</label>
                                <div className="method-buttons">
                                    <button
                                        className={`method-btn ${paymentData.paymentMethod === 'Naqd' ? 'active' : ''}`}
                                        onClick={() => setPaymentData({ ...paymentData, paymentMethod: 'Naqd' })}
                                    >
                                        💵 Naqd
                                    </button>
                                    <button
                                        className={`method-btn ${paymentData.paymentMethod === 'Karta' ? 'active' : ''}`}
                                        onClick={() => setPaymentData({ ...paymentData, paymentMethod: 'Karta' })}
                                    >
                                        💳 Karta
                                    </button>
                                </div>
                            </div>

                            <div className="payment-actions">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowPaymentModal(false)}
                                >
                                    Bekor qilish
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handlePaymentSubmit}
                                    disabled={savingPayment}
                                >
                                    {savingPayment ? (
                                        <>
                                            <span className="spinner-sm"></span>
                                            Saqlanmoqda...
                                        </>
                                    ) : (
                                        <>
                                            <Printer size={18} />
                                            To'lovni saqlash va chek chiqarish
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .user-avatar-sm.patient {
                    background: linear-gradient(135deg, #722ed1, #eb2f96);
                }

                /* Delete Modal */
                .delete-modal {
                    max-width: 420px !important;
                    text-align: center;
                }
                .delete-modal-content {
                    padding: var(--space-xl);
                }
                .delete-icon {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto var(--space-lg);
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.25));
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #ef4444;
                    animation: pulse-warning 2s infinite;
                }
                @keyframes pulse-warning {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                .delete-modal h3 {
                    margin: 0 0 var(--space-md) 0;
                    font-size: 1.25rem;
                    color: var(--text-primary);
                }
                .delete-modal p {
                    margin: 0 0 var(--space-sm) 0;
                    color: var(--text-secondary);
                }
                .delete-modal p strong {
                    color: var(--text-primary);
                }
                .delete-warning {
                    font-size: 0.875rem;
                    color: #ef4444 !important;
                    font-weight: 500;
                }
                .delete-modal-actions {
                    display: flex;
                    justify-content: center;
                    gap: var(--space-md);
                    margin-top: var(--space-xl);
                }
                .btn-danger {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    border: none;
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                }
                .btn-danger:hover:not(:disabled) {
                    background: linear-gradient(135deg, #dc2626, #b91c1c);
                }
                .btn-danger:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                .spinner-sm {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                .gender-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: var(--radius-full);
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                .gender-badge.male {
                    background: rgba(24, 144, 255, 0.15);
                    color: var(--primary-400);
                }
                .gender-badge.female {
                    background: rgba(235, 47, 150, 0.15);
                    color: #eb2f96;
                }

                .action-btn.view {
                    color: var(--primary-400);
                }
                .action-btn.view:hover {
                    background: rgba(24, 144, 255, 0.1);
                }

                .modal-lg {
                    max-width: 900px;
                    max-height: 90vh;
                    overflow-y: auto;
                }

                .modal-wide {
                    max-width: 800px;
                    width: 95vw;
                }

                .patient-view {
                    padding: var(--space-lg) 0;
                }
                .patient-header {
                    display: flex;
                    align-items: center;
                    gap: var(--space-lg);
                    padding-bottom: var(--space-lg);
                    border-bottom: 1px solid var(--border-color);
                    margin-bottom: var(--space-lg);
                }
                .patient-avatar-lg {
                    width: 72px;
                    height: 72px;
                    background: linear-gradient(135deg, #722ed1, #eb2f96);
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: white;
                }
                .patient-avatar-sm {
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, #722ed1, #eb2f96);
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1rem;
                    font-weight: 700;
                    color: white;
                }
                .patient-main-info h3 {
                    margin: 0 0 var(--space-xs) 0;
                    font-size: 1.25rem;
                }
                .patient-details {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: var(--space-md);
                }
                .detail-item {
                    display: flex;
                    align-items: flex-start;
                    gap: var(--space-md);
                    padding: var(--space-md);
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                }
                .detail-item.full-width {
                    grid-column: 1 / -1;
                }
                .detail-item svg {
                    color: var(--accent-500);
                    flex-shrink: 0;
                    margin-top: 2px;
                }
                .detail-label {
                    display: block;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    margin-bottom: 2px;
                }
                .detail-value {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                .patient-notes {
                    margin-top: var(--space-lg);
                    padding: var(--space-md);
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                }
                .patient-notes h4 {
                    margin: 0 0 var(--space-sm) 0;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }
                .patient-notes p {
                    margin: 0;
                    color: var(--text-primary);
                }

                /* Diagnoses Section */
                .diagnoses-section {
                    margin-top: var(--space-xl);
                    padding-top: var(--space-lg);
                    border-top: 1px solid var(--border-color);
                }
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-lg);
                }
                .section-header h4 {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                    margin: 0;
                    font-size: 1.1rem;
                    color: var(--text-primary);
                }
                .section-header h4 svg {
                    color: var(--accent-500);
                }

                .btn-sm {
                    padding: 8px 16px;
                    font-size: 0.875rem;
                }

                .btn-outline {
                    background: transparent;
                    border: 1px solid var(--primary-500);
                    color: var(--primary-500);
                }
                .btn-outline:hover {
                    background: rgba(var(--primary-rgb), 0.1);
                }

                .loading-inline {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                    padding: var(--space-lg);
                    color: var(--text-muted);
                }
                .spinner-sm {
                    width: 20px;
                    height: 20px;
                    border: 2px solid var(--border-color);
                    border-top-color: var(--accent-500);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                .empty-diagnoses {
                    text-align: center;
                    padding: var(--space-xl);
                    color: var(--text-muted);
                }
                .empty-diagnoses svg {
                    margin-bottom: var(--space-sm);
                    opacity: 0.5;
                }
                .empty-diagnoses p {
                    margin: 0 0 var(--space-md) 0;
                }

                .diagnoses-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-md);
                }
                .diagnosis-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                }
                .diagnosis-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-md) var(--space-lg);
                    background: rgba(var(--accent-rgb), 0.05);
                    border-bottom: 1px solid var(--border-color);
                }
                .diagnosis-info h5 {
                    margin: 0 0 var(--space-xs) 0;
                    font-size: 1rem;
                    color: var(--text-primary);
                }
                .diagnosis-date {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }
                .btn-print {
                    background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
                    color: white;
                    border: none;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    border-radius: var(--radius-md);
                    transition: all 0.2s;
                }
                .btn-print:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
                }
                .diagnosis-body {
                    padding: var(--space-lg);
                }
                .doctor-info {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                    margin-bottom: var(--space-md);
                    color: var(--text-secondary);
                }
                .doctor-info svg {
                    color: var(--accent-500);
                }
                .diagnosis-notes {
                    padding: var(--space-md);
                    background: rgba(var(--accent-rgb), 0.05);
                    border-radius: var(--radius-md);
                    margin-bottom: var(--space-md);
                    font-size: 0.875rem;
                }
                .diagnosis-medicines {
                    font-size: 0.875rem;
                }
                .diagnosis-medicines ul {
                    margin: var(--space-sm) 0 0 var(--space-lg);
                    padding: 0;
                }
                .diagnosis-medicines li {
                    padding: var(--space-xs) 0;
                    color: var(--text-secondary);
                }

                /* Add Diagnosis Modal */
                .diagnosis-patient-info {
                    padding: var(--space-md);
                    background: rgba(var(--accent-rgb), 0.05);
                    border-radius: var(--radius-md);
                    margin-bottom: var(--space-lg);
                }
                .patient-badge {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                }
                .patient-badge strong {
                    display: block;
                    font-size: 1rem;
                }
                .patient-badge span {
                    display: block;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }

                .medicines-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: var(--space-md);
                    max-height: 300px;
                    overflow-y: auto;
                    padding: var(--space-md);
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                }
                .medicine-item {
                    padding: var(--space-md);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                    transition: all 0.2s;
                }
                .medicine-item.selected {
                    border-color: var(--primary-500);
                    background: rgba(var(--primary-rgb), 0.05);
                }
                .medicine-checkbox {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                    cursor: pointer;
                }
                .medicine-checkbox input {
                    accent-color: var(--primary-500);
                }
                .medicine-details {
                    display: flex;
                    gap: var(--space-sm);
                    margin-top: var(--space-sm);
                }
                .medicine-details input {
                    flex: 1;
                    padding: 6px 10px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-sm);
                    background: var(--bg-input);
                    color: var(--text-primary);
                    font-size: 0.75rem;
                }
                .medicine-details input[type="number"] {
                    width: 70px;
                    flex: none;
                }

                /* Unified Medicine List Styles */
                .medicine-search-box {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                    margin-bottom: var(--space-md);
                    padding: var(--space-sm) var(--space-md);
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                }
                .medicine-search-box input {
                    flex: 1;
                    border: none;
                    background: transparent;
                }
                .medicine-search-box svg {
                    color: var(--text-muted);
                }
                .unified-medicines-list {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: var(--space-sm);
                    max-height: 350px;
                    overflow-y: auto;
                    padding: var(--space-md);
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                    margin-bottom: var(--space-md);
                }
                .medicine-item-unified {
                    padding: var(--space-md);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                    transition: all 0.2s;
                }
                .medicine-item-unified.selected {
                    border-color: var(--primary-500);
                    background: rgba(var(--primary-rgb), 0.08);
                }
                .medicine-item-unified.recommended {
                    border-color: var(--accent);
                    background: rgba(var(--accent-rgb), 0.05);
                }
                .medicine-item-unified.recommended.selected {
                    border-color: var(--primary-500);
                    background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.08), rgba(var(--primary-rgb), 0.08));
                }
                .medicine-name {
                    font-weight: 500;
                }
                .recommended-badge {
                    display: inline-block;
                    font-size: 0.7rem;
                    padding: 2px 8px;
                    border-radius: var(--radius-full);
                    background: linear-gradient(135deg, #fbbf24, #f59e0b);
                    color: #000;
                    margin-left: var(--space-sm);
                    font-weight: 600;
                }
                .medicine-details-inline {
                    display: flex;
                    gap: var(--space-sm);
                    margin-top: var(--space-sm);
                }
                .dosage-input {
                    flex: 1;
                    padding: 6px 10px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-sm);
                    background: var(--bg-input);
                    color: var(--text-primary);
                    font-size: 0.8rem;
                }
                .quantity-input {
                    width: 70px;
                    padding: 6px 10px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-sm);
                    background: var(--bg-input);
                    color: var(--text-primary);
                    font-size: 0.8rem;
                }
                .selected-medicines-summary {
                    padding: var(--space-md);
                    background: rgba(var(--primary-rgb), 0.05);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--primary-500);
                    margin-bottom: var(--space-lg);
                    font-size: 0.9rem;
                }

                /* Payment Step Styles */
                .payment-summary-box {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    padding: var(--space-lg);
                    margin-bottom: var(--space-lg);
                }
                .payment-summary-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-sm) 0;
                    border-bottom: 1px dashed var(--border-color);
                }
                .payment-summary-item:last-child {
                    border-bottom: none;
                }
                .payment-summary-total {
                    display: flex;
                    justify-content: space-between;
                    padding: var(--space-md) 0 0;
                    margin-top: var(--space-md);
                    border-top: 2px solid var(--primary-500);
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--primary-500);
                }
                .payment-methods {
                    display: flex;
                    gap: var(--space-md);
                    flex-wrap: wrap;
                }
                .payment-method-option {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                    padding: var(--space-md) var(--space-lg);
                    border: 2px solid var(--border-color);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all 0.2s;
                    flex: 1;
                    min-width: 100px;
                    justify-content: center;
                }
                .payment-method-option:hover {
                    border-color: var(--primary-400);
                }
                .payment-method-option.selected {
                    border-color: var(--primary-500);
                    background: rgba(var(--primary-rgb), 0.1);
                }
                .payment-method-option input {
                    accent-color: var(--primary-500);
                }
                .btn-success {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border: none;
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                }
                .btn-success:hover:not(:disabled) {
                    background: linear-gradient(135deg, #059669, #047857);
                }

                @media (max-width: 768px) {
                    .patient-details {
                        grid-template-columns: 1fr;
                    }
                    .diagnosis-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: var(--space-md);
                    }
                    .medicines-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* Payment Modal Styles */
                .payment-modal {
                    max-width: 600px !important;
                }
                .payment-content {
                    padding: var(--space-lg);
                }
                .payment-patient-info {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                    padding: var(--space-md);
                    background: rgba(114, 46, 209, 0.1);
                    border-radius: var(--radius-md);
                    margin-bottom: var(--space-lg);
                }
                .patient-avatar-sm {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #722ed1, #eb2f96);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: white;
                }
                .payment-items {
                    margin-bottom: var(--space-lg);
                }
                .payment-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .payment-table th,
                .payment-table td {
                    padding: var(--space-sm) var(--space-md);
                    text-align: left;
                    border-bottom: 1px solid var(--border-color);
                }
                .payment-table th {
                    background: var(--bg-card);
                    font-weight: 600;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                }
                .form-input-sm {
                    width: 100px;
                    padding: 6px 10px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-sm);
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }
                .payment-summary {
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                    padding: var(--space-md);
                    margin-bottom: var(--space-lg);
                }
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-sm) 0;
                }
                .summary-row.discount {
                    color: var(--success);
                }
                .summary-row.total {
                    border-top: 2px solid var(--border-color);
                    margin-top: var(--space-sm);
                    padding-top: var(--space-md);
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: var(--primary-500);
                }
                .payment-method {
                    margin-bottom: var(--space-lg);
                }
                .method-buttons {
                    display: flex;
                    gap: var(--space-md);
                }
                .method-btn {
                    flex: 1;
                    padding: var(--space-md);
                    background: var(--bg-card);
                    border: 2px solid var(--border-color);
                    border-radius: var(--radius-md);
                    color: var(--text-secondary);
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .method-btn:hover {
                    border-color: var(--primary-500);
                }
                .method-btn.active {
                    border-color: var(--primary-500);
                    background: rgba(114, 46, 209, 0.1);
                    color: var(--primary-500);
                }
                .payment-actions {
                    display: flex;
                    gap: var(--space-md);
                    justify-content: flex-end;
                }
            `}</style>

            {/* NATIJALAR KIRITISH MODALI - KO'P KATEGORIYALI EXCEL */}
            {showResultsEntryModal && categoryResults && Array.isArray(categoryResults) && categoryResults.length > 0 && (
                <div className="results-fullpage">
                    {/* Header */}
                    <div className="rfp-header">
                        <button className="rfp-back-btn" onClick={() => setShowResultsEntryModal(false)}>
                            <ArrowLeft size={20} /> Orqaga
                        </button>
                        <div className="rfp-title">
                            <ClipboardList size={22} />
                            <div>
                                <h1>Natijalar kiritish</h1>
                                <span>{selectedPatient?.fullName}</span>
                            </div>
                        </div>
                        <div className="rfp-header-actions">
                            <button className="rfp-btn rfp-btn-save" onClick={saveResults}>
                                <Save size={16} /> Saqlash
                            </button>
                            <button className="rfp-btn rfp-btn-print" onClick={handlePrintAndSaveResults}>
                                <Printer size={16} /> Chop etish
                            </button>
                        </div>
                    </div>

                    <div className="rfp-body">
                        {/* Sidebar — kategoriyalar */}
                        <aside className="rfp-sidebar">
                            <p className="rfp-sidebar-label">Analizlar</p>

                            {(() => {
                                const today = new Date(); today.setHours(0,0,0,0)
                                const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)

                                const dateLabel = (dateStr) => {
                                    if (!dateStr) return 'Noma\'lum'
                                    const d = new Date(dateStr); d.setHours(0,0,0,0)
                                    if (d.getTime() === today.getTime()) return 'Bugun'
                                    if (d.getTime() === yesterday.getTime()) return 'Kecha'
                                    return new Date(dateStr).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })
                                }

                                const toDay = (dateStr) => {
                                    if (!dateStr) return 'nodate'
                                    const d = new Date(dateStr)
                                    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
                                }

                                // Filtrlash
                                const filtered = categoryResults.map((cat, i) => ({ cat, i })).filter(({ cat }) => {
                                    if (!(sidebarDateFrom || sidebarDateTo)) return true
                                    if (!cat.createdAt) return false
                                    const d = new Date(cat.createdAt)
                                    if (sidebarDateFrom && d < new Date(sidebarDateFrom)) return false
                                    if (sidebarDateTo && d > new Date(sidebarDateTo + 'T23:59:59')) return false
                                    return true
                                })

                                // Sana bo'yicha guruhlash
                                const groups = []
                                const seen = {}
                                filtered.forEach(({ cat, i }) => {
                                    const key = toDay(cat.createdAt)
                                    if (!seen[key]) {
                                        seen[key] = true
                                        groups.push({ key, label: dateLabel(cat.createdAt), items: [] })
                                    }
                                    groups[groups.length - 1].items.push({ cat, i })
                                })

                                return groups.map((group, gi) => (
                                    <div key={group.key}>
                                        {/* Sana sarlavhasi */}
                                        <div className={`rfp-date-group ${gi === 0 ? 'first' : ''}`}>
                                            <span>{group.label}</span>
                                        </div>

                                        {/* Kartalar */}
                                        {group.items.map(({ cat, i }) => {
                                            const isDone = cat.rows.some(r => Object.values(r.values || {}).some(v => v))
                                            const tags = (cat.diagnosisName || 'Analiz').split(',').map(s => s.trim()).filter(Boolean)
                                            const isExpanded = !!expandedCats[cat.diagnosisId]
                                            const isActive = currentCategoryIndex === i
                                            return (
                                                <div
                                                    key={cat.diagnosisId}
                                                    className={`rfp-cat-btn ${isActive ? 'active' : ''}`}
                                                >
                                                    <div className="rfp-cat-row" onClick={() => setCurrentCategoryIndex(i)}>
                                                        <span className="rfp-cat-num">{i + 1}</span>
                                                        <div className="rfp-cat-name-wrap">
                                                            <span className="rfp-cat-first-tag">{tags[0]}</span>
                                                            {tags.length > 1 && (
                                                                <span className="rfp-cat-count">+{tags.length - 1} ta</span>
                                                            )}
                                                        </div>
                                                        {isDone && (
                                                            <span className="rfp-cat-check-badge">
                                                                <Check size={11} />
                                                            </span>
                                                        )}
                                                    </div>
                                                    {cat.createdAt && (
                                                        <div className="rfp-cat-date" onClick={() => setCurrentCategoryIndex(i)}>
                                                            <Calendar size={11} />
                                                            {new Date(cat.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))
                            })()}
                            {/* Sana filtri */}
                            <div className="rfp-date-filter">
                                <div className="rfp-date-field">
                                    <label>Dan</label>
                                    <input
                                        type="date"
                                        value={sidebarDateFrom}
                                        onChange={e => setSidebarDateFrom(e.target.value)}
                                    />
                                </div>
                                <div className="rfp-date-field">
                                    <label>Gacha</label>
                                    <input
                                        type="date"
                                        value={sidebarDateTo}
                                        onChange={e => setSidebarDateTo(e.target.value)}
                                    />
                                </div>
                                {(sidebarDateFrom || sidebarDateTo) && (
                                    <button className="rfp-date-clear" onClick={() => { setSidebarDateFrom(''); setSidebarDateTo('') }}>
                                        <X size={13} /> Tozalash
                                    </button>
                                )}
                            </div>
                        </aside>

                        {/* Main — jadval */}
                        <main className="rfp-main">
                            {categoryResults[currentCategoryIndex] && (() => {
                                const cat = categoryResults[currentCategoryIndex]
                                const catIndex = currentCategoryIndex
                                return (
                                    <div className="rfp-table-area">
                                        {/* Kategoriya sarlavhasi */}
                                        <div className="rfp-table-header">
                                            <input
                                                type="text"
                                                className="rfp-title-input"
                                                value={cat.title || ''}
                                                onChange={e => updateCategoryTitle(catIndex, e.target.value)}
                                                placeholder="Analiz nomi..."
                                            />
                                            <button className="rfp-add-col-btn" onClick={() => addResultColumn(catIndex)}>
                                                <Plus size={14} /> Ustun
                                            </button>
                                        </div>

                                        {/* Excel jadval */}
                                        <div className="rfp-table-wrap">
                                            <table className="rfp-table">
                                                <thead>
                                                    <tr>
                                                        <th className="rfp-th-num">№</th>
                                                        {(cat.columns || []).map((col, colIdx) => (
                                                            <th key={col.id} className={`rfp-th-col${colIdx === 1 ? ' rfp-th-result' : ''}`}>
                                                                <input
                                                                    type="text"
                                                                    className="rfp-col-name-input"
                                                                    value={col.name}
                                                                    placeholder="Ustun nomi..."
                                                                    onChange={e => updateColumnName(catIndex, col.id, e.target.value)}
                                                                    spellCheck={false}
                                                                />
                                                                {(cat.columns || []).length > 1 && (
                                                                    <button className="rfp-del-col" onClick={() => removeResultColumn(catIndex, col.id)}>
                                                                        ×
                                                                    </button>
                                                                )}
                                                            </th>
                                                        ))}
                                                        <th className="rfp-th-del"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(cat.rows || []).map((row, rowIdx) => (
                                                        <tr key={row.id} className={rowIdx % 2 === 0 ? 'rfp-row-even' : ''}>
                                                            <td className="rfp-td-num">{rowIdx + 1}</td>
                                                            {(cat.columns || []).map((col, colIdx) => {
                                                                const isResultCol = colIdx === 1
                                                                const isLastRow = rowIdx === cat.rows.length - 1
                                                                return (
                                                                    <td key={col.id} className={isResultCol ? 'rfp-td-result' : 'rfp-td-editable'}>
                                                                        <input
                                                                            type="text"
                                                                            className="rfp-cell-input"
                                                                            placeholder="—"
                                                                            value={row.values?.[col.id] || ''}
                                                                            onChange={e => updateResultRow(catIndex, row.id, col.id, e.target.value)}
                                                                            onKeyDown={e => {
                                                                                if (e.key === 'Enter' && isLastRow && isResultCol) {
                                                                                    e.preventDefault()
                                                                                    addResultRow(catIndex)
                                                                                    setTimeout(() => {
                                                                                        const inputs = document.querySelectorAll('.rfp-cell-input')
                                                                                        if (inputs.length) inputs[inputs.length - 1].focus()
                                                                                    }, 50)
                                                                                }
                                                                            }}
                                                                        />
                                                                    </td>
                                                                )
                                                            })}
                                                            <td className="rfp-td-del">
                                                                <button className="rfp-del-row" onClick={() => removeResultRow(catIndex, row.id)}>
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <button className="rfp-add-row-btn" onClick={() => addResultRow(catIndex)}>
                                            <Plus size={15} /> Qator qo'shish
                                        </button>

                                        {/* Pagination */}
                                        <div className="rfp-nav">
                                            <div className="rfp-nav-counter">
                                                <strong>{currentCategoryIndex + 1}</strong>
                                                <span>/</span>
                                                <strong>{categoryResults.length}</strong>
                                                <span>yo'nalish</span>
                                            </div>
                                            <div className="rfp-nav-btns">
                                                <button
                                                    className="rfp-nav-btn"
                                                    disabled={currentCategoryIndex === 0}
                                                    onClick={() => setCurrentCategoryIndex(i => i - 1)}
                                                >
                                                    ← Oldingi
                                                </button>
                                                <button
                                                    className="rfp-nav-btn"
                                                    disabled={currentCategoryIndex === categoryResults.length - 1}
                                                    onClick={() => setCurrentCategoryIndex(i => i + 1)}
                                                >
                                                    Keyingi →
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })()}
                        </main>
                    </div>
                </div>
            )}

            {/* Toast notification */}
            {toast && (
                <div className={`pm-toast ${toast.type}`}>
                    {toast.type === 'success' ? <Check size={18} /> : <X size={18} />}
                    {toast.msg}
                </div>
            )}
        </div>
    )
}

export default PatientManagement
