import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    UserPlus, Plus, Search, Edit2, Eye,
    Phone, Calendar, User, FileText,
    Save, Check, X, Stethoscope, ClipboardList, Printer, AlertTriangle, AlertCircle, Pencil
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
    const [statusFilter, setStatusFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)

    const [showModal, setShowModal] = useState(false)
    const [showViewModal, setShowViewModal] = useState(false)
    const [editingPatient, setEditingPatient] = useState(null)
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [showPrintModal, setShowPrintModal] = useState(false)
    const [printModalDiagnoses, setPrintModalDiagnoses] = useState([])
    const [printModalLoading, setPrintModalLoading] = useState(false)
    const [printModalError, setPrintModalError] = useState('')
    const [printModalPatient, setPrintModalPatient] = useState(null)
    const [patientDiagnoses, setPatientDiagnoses] = useState([])
    const [diagnosesLoading, setDiagnosesLoading] = useState(false)
    const [diagnosesList, setDiagnosesList] = useState([])
    const [categoriesList, setCategoriesList] = useState([])

    // Analiz tahrirlash (edit modal ichida)
    const [editAnalysisList, setEditAnalysisList] = useState([])
    const [editAnalysisLoading, setEditAnalysisLoading] = useState(false)

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
        fetchCategoriesList()
    }, [])

    const fetchDiagnosesList = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/diagnoses', { headers: { 'Authorization': `Bearer ${token}` } })
            if (res.ok) setDiagnosesList(await res.json())
        } catch (e) { console.error(e) }
    }

    const fetchCategoriesList = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/categories', { headers: { 'Authorization': `Bearer ${token}` } })
            if (res.ok) setCategoriesList(await res.json())
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
        const payMethod = d.paymentMethod === 'card' ? 'Karta' : d.paymentMethod === 'transfer' ? "O'tkazma" : 'Naqd'

        const receiptItems = getReceiptItems(d)
        const subtotal = receiptItems.reduce((sum, item) => sum + Number(item.price || 0), 0)
        const discount = Number(d.discount || 0)
        const total = Math.max(0, subtotal - discount)

        const rows = receiptItems.map(item => `
            <tr><td>${item.name}</td><td>Laboratoriya</td><td>${(item.price || 0).toLocaleString()}</td></tr>
        `).join('')

        const win = window.open('', '_blank')
        if (!win) { alert("Popup bloklandi! Ruxsat bering."); return }
        win.document.write(`<!DOCTYPE html><html><head><title>Chek</title><meta charset="utf-8"/>
<style>
    @page { margin: 3mm 4mm; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; width: 74mm; font-size: 15px; color: #000; background: #fff; }
    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
    .clinic-name { font-size: 17px; font-weight: 900; margin-top: 4px; }
    .clinic-info { font-size: 14px; line-height: 1.6; margin-top: 3px; }
    .receipt-title { font-size: 18px; font-weight: 900; text-transform: uppercase; margin: 8px 0 0; }
    .patient-block { text-align: center; margin: 8px 0; font-size: 15px; line-height: 1.9; border-bottom: 1px dashed #000; padding-bottom: 8px; }
    .patient-block div { display: flex; justify-content: center; gap: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { font-weight: 700; text-align: left; padding: 5px 4px; border: 1px solid #000; }
    td { padding: 5px 4px; border: 1px solid #000; vertical-align: top; word-break: break-word; }
    .total-section { border-top: 2px solid #000; margin-top: 0; padding: 7px 4px; text-align: center; font-size: 17px; font-weight: 900; text-transform: uppercase; }
    .discount-row { text-align: center; font-size: 15px; padding: 3px 0; border-top: 1px dotted #000; }
    .footer { text-align: center; font-size: 14px; padding-top: 6px; border-top: 1px dashed #000; margin-top: 4px; }
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

    const toId = (value) => {
        if (!value) return ''
        if (typeof value === 'string') return value
        if (value._id) return value._id.toString()
        return value.toString()
    }

    const normalizeName = (value) => (value || '').toString().trim().toLowerCase()

    const urineOrder = {
        'URINE-VOL': 20.0,
        'URINE-COL': 20.1,
        'URINE-TRN': 20.2,
        'UBG': 20.3,
        'BIL': 20.4,
        'KET': 20.5,
        'CRE': 20.6,
        'PRO': 20.7,
        'NIT': 20.8,
        'LEU': 20.9,
        'GLU': 21.0,
        'MALB': 21.1,
        'URINE-CA': 21.2,
        'SG': 21.3,
        'PH': 21.4
    }

    const getCanonicalOrder = (code, fallback) => {
        return fallback ?? Number.MAX_SAFE_INTEGER
    }

    const getCodeByKnownName = (name) => {
        const norm = normalizeName(name)
        if (norm === normalizeName('Лейкоцит (LEU)')) return 'LEU'
        return ''
    }

    const looksCorruptedText = (value) => /Ã|Â|Ð|Ñ|�/.test((value ?? '').toString())

    const escapeHtml = (value) => (value ?? '').toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

    const formatPrintCell = (value) => escapeHtml(value).replace(/\r?\n/g, '<br/>')

    const normalizeSavedResultRows = (rows, cols, diagnosis = null) => {
        const idName = cols[0]?.id || 'col_1'
        const idResult = cols[1]?.id || 'col_2'

        const visibleRows = (rows || []).filter(row =>
            Object.values(row.values || {}).some(v => v && v.toString().trim())
        )

        const byKey = new Map()
        const seenNames = new Set()
        const momCategory = categoriesList.find(c => normalizeName(c.code) === 'mom' || normalizeName(c.name) === 'микроскопия осадка мочи')
        const momCatId = toId(momCategory?._id)
        const isMomSelected = diagnosis?.diagnosisPrices?.some(dp => toId(dp.categoryId) === momCatId) ||
            normalizeName(diagnosis?.diagnosisName || '').includes('моч')

        visibleRows.forEach((row, idx) => {
            const values = { ...(row.values || {}) }
            if (looksCorruptedText(values[idResult])) values[idResult] = ''
            const rowId = toId(values._diagnosisId)
            const rowName = normalizeName(values[idName])
            const rowCategory = toId(values._categoryId) || normalizeName(values._categoryName)

            // Filter out MOM items if MOM/urine test was not selected
            if (!isMomSelected && (toId(values._categoryId) === momCatId || normalizeName(values._categoryName) === 'микроскопия осадка мочи')) return

            const key = (rowCategory && rowName ? `${rowCategory}:${rowName}` : null) || rowId || rowName || `row-${idx}`
            if (!byKey.has(key)) {
                // Global name dedup: if same name already seen in ANY category, skip duplicate
                if (rowName && seenNames.has(rowName)) return
                if (rowName) seenNames.add(rowName)
                byKey.set(key, { ...row, values })
            }
        })

        return Array.from(byKey.values()).sort((a, b) => {
            const aVals = a.values || {}
            const bVals = b.values || {}
            const aMatch = findDiagnosisByRef(aVals._diagnosisId, aVals[idName], aVals._categoryId)
            const bMatch = findDiagnosisByRef(bVals._diagnosisId, bVals[idName], bVals._categoryId)
            const aCode = aMatch?.code || getCodeByKnownName(aVals[idName])
            const bCode = bMatch?.code || getCodeByKnownName(bVals[idName])
            const aOrder = getCanonicalOrder(aCode, aMatch?.order)
            const bOrder = getCanonicalOrder(bCode, bMatch?.order)
            if (aOrder !== bOrder) return aOrder - bOrder
            return normalizeName(aVals[idName]).localeCompare(normalizeName(bVals[idName]))
        })
    }
    const isOutOfRange = (result, norma) => {
        if (!result || !norma) return false
        const rStr = result.toString().trim()
        const nStr = norma.toString().trim()
        if (rStr === nStr || normalizeName(rStr) === normalizeName(nStr)) return false

        const rVal = parseFloat(rStr.replace(/,/g, '.').replace(/\s+/g, ''))
        if (Number.isNaN(rVal)) {
            return normalizeName(rStr) !== normalizeName(nStr)
        }

        const normStr = nStr.replace(/\s+/g, '').replace(/,/g, '.').trim()
        const rangeMatch = normStr.match(/^([0-9.]+)[^0-9.]{1,3}([0-9.]+)$/)
        if (rangeMatch) {
            const min = parseFloat(rangeMatch[1])
            const max = parseFloat(rangeMatch[2])
            if (!Number.isNaN(min) && !Number.isNaN(max)) return rVal < min || rVal > max
        }

        const compMatch = normStr.match(/^([<>]=?)([0-9.]+)$/)
        if (compMatch) {
            const op = compMatch[1]
            const val = parseFloat(compMatch[2])
            if (!Number.isNaN(val)) {
                if (op === '<') return rVal >= val
                if (op === '<=') return rVal > val
                if (op === '>') return rVal <= val
                if (op === '>=') return rVal < val
            }
        }

        return false
    }

    const isDiagnosisResultConfirmed = (diagnosis) => {
        const results = diagnosis?.results
        return results?.isConfirmed === true || (results?.isConfirmed === undefined && !!results?.savedAt)
    }

    const getResultReadyDate = (diagnosis) => {
        const results = diagnosis?.results || {}
        return results.confirmedAt || results.savedAt || 0
    }

    const getReceiptItems = (diagnosis) => {
        const prices = diagnosis?.diagnosisPrices || []
        const names = (diagnosis?.diagnosisName || '').split(',').map(s => s.trim()).filter(Boolean)
        const isReceiptInternalItem = (item) => {
            const meta = getCategoryMetaById(item.categoryId)
            const categoryCode = (meta.categoryCode || '').toString().trim().toLowerCase()
            const categoryName = (item.categoryName || meta.categoryName || '').toString().trim().toLowerCase()
            return categoryCode === 'mom' || categoryName === 'микроскопия осадка мочи'
        }
        if (prices.length === 0) return names.map(name => ({ name, price: 0 }))

        const hiddenCategoryIds = new Set(
            prices
                .filter(p => p?.isCategoryPrice)
                .map(p => toId(p.categoryId || p.diagnosisId))
                .filter(Boolean)
        )

        const items = prices
            .map(p => {
                const match = findDiagnosisByRef(p.diagnosisId, p.name, p.categoryId)
                const displayName = match?.name || p.name || ''
                const code = match?.code || p.code || getCodeByKnownName(displayName)
                const categoryId = toId(p.categoryId) || getDiagnosisCategoryId(match)
                const categoryMeta = getCategoryMetaById(categoryId)
                const category = match?.category || {}
                return {
                    diagnosisId: toId(p.diagnosisId || match?._id),
                    categoryId,
                    categoryName: p.categoryName || getDiagnosisCategoryName(match) || categoryMeta.categoryName,
                    categoryPrice: Number(category.price || categoryMeta.categoryPrice || 0),
                    categoryHideAnalyses: category.hideAnalyses === true || categoryMeta.categoryHideAnalyses,
                    code,
                    name: displayName,
                    price: Number(p.price || 0),
                    order: getCanonicalOrder(code, match?.order ?? p.order),
                    isCategoryPrice: p.isCategoryPrice === true
                }
            })
            .filter(item => item.name)

        const isOam = normalizeName(diagnosis?.diagnosis?.category?.name || diagnosis?.diagnosisName || '') === normalizeName('Общий анализ мочи')
        if (isOam) {
            const fallbackCategoryId = toId(diagnosis?.diagnosis?.category?._id || diagnosis?.diagnosis?.category)
            const fallbackCategoryMeta = getCategoryMetaById(fallbackCategoryId)
            const fallbackItems = [
                { code: 'LEU', name: 'Лейкоцит (LEU)', order: 20.9 }
            ].map(fallback => {
                const match = findDiagnosisByCode(fallback.code, fallbackCategoryId)
                return {
                    diagnosisId: toId(match?._id),
                    categoryId: toId(match?.category) || fallbackCategoryId,
                    categoryName: getDiagnosisCategoryName(match, diagnosis?.diagnosis?.category?.name || ''),
                    categoryPrice: Number(match?.category?.price || fallbackCategoryMeta.categoryPrice || 0),
                    categoryHideAnalyses: match?.category?.hideAnalyses === true || fallbackCategoryMeta.categoryHideAnalyses,
                    code: match?.code || fallback.code,
                    name: match?.name || fallback.name,
                    price: Number(match?.price || 0),
                    order: getCanonicalOrder(match?.code || fallback.code, match?.order ?? fallback.order),
                    isCategoryPrice: false
                }
            })

            fallbackItems.forEach(item => {
                const exists = items.some(existing => existing.code === item.code || normalizeName(existing.name) === normalizeName(item.name))
                if (!exists) items.push(item)
            })
        }

        const inferredCategoryItems = []
        const groups = new Map()
        items.forEach(item => {
            const categoryId = toId(item.categoryId)
            if (!categoryId || item.isCategoryPrice || !item.categoryHideAnalyses) return
            if (!groups.has(categoryId)) {
                groups.set(categoryId, {
                    categoryId,
                    categoryName: item.categoryName || item.name,
                    categoryPrice: item.categoryPrice || 0,
                    order: Number.isFinite(item.order) ? item.order : Number.MAX_SAFE_INTEGER,
                    items: []
                })
            }
            const group = groups.get(categoryId)
            group.items.push(item)
            if (!group.categoryPrice && item.categoryPrice) group.categoryPrice = item.categoryPrice
            if (Number.isFinite(item.order) && item.order < group.order) group.order = item.order
        })

        groups.forEach(group => {
            if (hiddenCategoryIds.has(group.categoryId)) return
            hiddenCategoryIds.add(group.categoryId)
            inferredCategoryItems.push({
                diagnosisId: group.categoryId,
                categoryId: group.categoryId,
                categoryName: group.categoryName,
                code: '',
                name: group.categoryName,
                price: group.categoryPrice || group.items.reduce((sum, item) => sum + (item.price || 0), 0),
                order: group.order,
                isCategoryPrice: true
            })
        })

        const byKey = new Set()
        const seenMicroscopyKeys = new Set()
        return [...items, ...inferredCategoryItems]
            .filter(item => {
                const categoryId = toId(item.categoryId)
                if (!item.isCategoryPrice && isReceiptInternalItem(item)) return false
                if (!item.isCategoryPrice && Number(item.price || 0) <= 0 && Number(item.categoryPrice || 0) <= 0) return false
                return item.isCategoryPrice || !categoryId || !hiddenCategoryIds.has(categoryId)
            })
            .sort((a, b) => {
                const orderA = Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER
                const orderB = Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER
                if (orderA !== orderB) return orderA - orderB
                if (a.isCategoryPrice && !b.isCategoryPrice) return -1
                if (!a.isCategoryPrice && b.isCategoryPrice) return 1
                return (a.name || '').localeCompare(b.name || '', 'ru')
            })
            .filter(item => {
                if (!item.isCategoryPrice && isReceiptInternalItem(item)) {
                    const microscopyKey = normalizeName(item.code || item.name || '')
                    if (microscopyKey) {
                        if (seenMicroscopyKeys.has(microscopyKey)) return false
                        seenMicroscopyKeys.add(microscopyKey)
                    }
                }
                const key = `${normalizeName(item.code || '')}:${normalizeName(item.name || '')}`
                if (!key || byKey.has(key)) return false
                byKey.add(key)
                return true
            })
    }

    const getReceiptItemsTotal = (diagnosis) => getReceiptItems(diagnosis).reduce((sum, item) => sum + Number(item.price || 0), 0)

    const getDiagnosisCategoryId = (diagnosis) => toId(diagnosis?.category)

    const getDiagnosisCategoryName = (diagnosis, fallback = null) => (
        diagnosis?.category?.name || fallback
    )

    const getCategoryMetaById = (categoryId) => {
        const id = toId(categoryId)
        if (!id) return {}
        const diagnosis = diagnosesList.find(d => getDiagnosisCategoryId(d) === id)
        const category = diagnosis?.category
        return {
            categoryId: id,
            categoryCode: category?.code || '',
            categoryName: category?.name || '',
            categoryPrice: Number(category?.price || 0),
            categoryHideAnalyses: category?.hideAnalyses === true
        }
    }

    const findDiagnosisByRef = (diagnosisId, name, categoryId = null) => {
        const id = toId(diagnosisId)
        if (id) {
            const byId = diagnosesList.find(d => d._id === id)
            if (byId) return byId
        }

        const norm = normalizeName(name)
        if (!norm) return null
        const matches = diagnosesList.filter(d => normalizeName(d.name) === norm)
        const catId = toId(categoryId)
        if (catId) {
            const byCategory = matches.find(d => getDiagnosisCategoryId(d) === catId)
            if (byCategory) return byCategory
        }
        return matches[0] || null
    }

    const findDiagnosisByCode = (code, categoryId = null) => {
        const normCode = normalizeName(code)
        if (!normCode) return null
        const matches = diagnosesList.filter(d => normalizeName(d.code) === normCode)
        const catId = toId(categoryId)
        if (catId) {
            const byCategory = matches.find(d => getDiagnosisCategoryId(d) === catId)
            if (byCategory) return byCategory
        }
        return matches[0] || null
    }

    const getPrintableResultRows = (diagnosis, cols) => {
        const idName = cols[0]?.id || 'col_1'
        const visibleColIds = cols.map(c => c.id)
        const rows = (diagnosis.results?.rows || []).filter(row =>
            visibleColIds.some(colId => {
                const value = row.values?.[colId]
                return value !== undefined && value !== null && value.toString().trim() !== ''
            })
        )

        const purchased = (diagnosis.diagnosisPrices || [])
            .filter(dp => !dp.isCategoryPrice)
            .map(dp => {
                const match = findDiagnosisByRef(dp.diagnosisId, dp.name, dp.categoryId)
                return {
                    id: toId(dp.diagnosisId || match?._id),
                    name: normalizeName(match?.name || dp.name),
                    categoryId: toId(dp.categoryId) || getDiagnosisCategoryId(match),
                    code: match?.code || dp.code || '',
                    order: match?.order ?? dp.order ?? Number.MAX_SAFE_INTEGER
                }
            })

        const sourceItemsRaw = purchased.length > 0
            ? purchased
            : (diagnosis.diagnosisName || '')
                .split(',')
                .map(name => {
                    const match = findDiagnosisByRef(null, name.trim(), diagnosis.diagnosis?.category?._id || diagnosis.diagnosis?.category)
                    return {
                        id: toId(match?._id),
                        name: normalizeName(match?.name || name),
                        categoryId: getDiagnosisCategoryId(match),
                        code: match?.code || '',
                        order: match?.order ?? Number.MAX_SAFE_INTEGER
                    }
                })
                .filter(item => item.name)

        const isOam = normalizeName(diagnosis?.diagnosis?.category?.name || diagnosis?.diagnosisName || '') === normalizeName('Общий анализ мочи')
        if (isOam) {
            const fallbackCategoryId = toId(diagnosis?.diagnosis?.category?._id || diagnosis?.diagnosis?.category)
            const fallbackItems = [
                { code: 'LEU', name: 'Лейкоцит (LEU)', order: 20.9 }
            ].map(fallback => {
                const match = findDiagnosisByCode(fallback.code, fallbackCategoryId)
                return {
                    id: toId(match?._id),
                    name: normalizeName(match?.name || fallback.name),
                    categoryId: getDiagnosisCategoryId(match) || fallbackCategoryId,
                    code: match?.code || fallback.code,
                    order: match?.order ?? fallback.order
                }
            })

            fallbackItems.forEach(item => {
                const exists = sourceItemsRaw.some(existing => existing.code === item.code || existing.name === item.name)
                if (!exists) sourceItemsRaw.push(item)
            })
        }

        const sourceItems = sourceItemsRaw
        sourceItems.sort((a, b) => (a.order || 0) - (b.order || 0))

        const allowedIds = new Set(sourceItems.map(item => item.id).filter(Boolean))
        const sourceNameCounts = sourceItems.reduce((acc, item) => {
            if (item.name) acc[item.name] = (acc[item.name] || 0) + 1
            return acc
        }, {})
        const allowedNames = new Set(
            sourceItems
                .map(item => item.name)
                .filter(name => name && sourceNameCounts[name] === 1)
        )
        const allowedCategoryNames = new Set(
            sourceItems
                .map(item => `${toId(item.categoryId)}:${item.name}`)
                .filter(key => !key.startsWith(':') && !key.endsWith(':'))
        )
        const hasAllowedItems = allowedIds.size > 0 || allowedNames.size > 0
        const selectedRows = !hasAllowedItems
            ? rows
            : rows.filter(row => {
                const values = row.values || {}
                const rowId = toId(values._diagnosisId)
                const rowName = normalizeName(values[idName])
                const rowCategory = toId(values._categoryId)
                const categoryNameKey = `${rowCategory}:${rowName}`
                return (rowId && allowedIds.has(rowId)) ||
                    (rowCategory && rowName && allowedCategoryNames.has(categoryNameKey)) ||
                    (!rowCategory && rowName && allowedNames.has(rowName))
            })
            .sort((a, b) => {
                const aVals = a.values || {}
                const bVals = b.values || {}
                const aMatch = findDiagnosisByRef(aVals._diagnosisId, aVals[idName], aVals._categoryId)
                const bMatch = findDiagnosisByRef(bVals._diagnosisId, bVals[idName], bVals._categoryId)
                const aOrder = getCanonicalOrder(aMatch?.code || getCodeByKnownName(aVals[idName]), aMatch?.order)
                const bOrder = getCanonicalOrder(bMatch?.code || getCodeByKnownName(bVals[idName]), bMatch?.order)
                if (aOrder !== bOrder) return aOrder - bOrder
                const aName = normalizeName(aVals[idName])
                const bName = normalizeName(bVals[idName])
                return aName.localeCompare(bName)
            })

        const byKey = new Map()
        const seenNames = new Set()
        selectedRows.forEach((row, idx) => {
            const values = row.values || {}
            const rowId = toId(values._diagnosisId)
            const rowName = normalizeName(values[idName])
            const rowCategory = toId(values._categoryId) || normalizeName(values._categoryName)
            const key = (rowCategory && rowName ? `${rowCategory}:${rowName}` : null) || rowId || rowName || `row-${idx}`
            if (!byKey.has(key)) {
                // Global name dedup: skip if same name already seen
                if (rowName && seenNames.has(rowName)) return
                if (rowName) seenNames.add(rowName)
                byKey.set(key, row)
            }
        })

        return Array.from(byKey.values())
    }

    const getResultRowCategoryName = (row, idName, fallback) => {
        const values = row.values || {}
        if (values._categoryName) return values._categoryName

        const match = findDiagnosisByRef(values._diagnosisId, values[idName], values._categoryId)
        return getDiagnosisCategoryName(match, fallback)
    }

    const formatPrintDate = (date) => {
        if (!date) return '-'
        const parsedDate = new Date(date)
        if (Number.isNaN(parsedDate.getTime())) return '-'
        return `${parsedDate.toLocaleDateString('ru-RU')} ${parsedDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
    }

    const printLabResult = (diagnosis, patient) => {
        try {
            if (!diagnosis.results || !diagnosis.results.rows || diagnosis.results.rows.length === 0) {
                alert('Bu analiz uchun hali natijalar kiritilmagan!')
                return
            }

            const now = new Date()
            const doctorName = diagnosis.doctor?.fullName || diagnosis.doctorName || diagnosis.results.savedBy?.fullName || ''
            const cols = diagnosis.results.columns || [
                { id: 'col_1', name: 'Название' }, { id: 'col_2', name: 'Результат' }, { id: 'col_3', name: 'Норма' }, { id: 'col_4', name: 'Ед.' }
            ]
            const idName = cols[0]?.id || 'col_1'
            const logoUrl = `${window.location.origin}/logo.png`
            
            const groupMap = {}
            const groupOrder = []
            const filteredRows = normalizeSavedResultRows(diagnosis.results?.rows || [], cols, diagnosis)

            // Admin paneldagi kabi categoriesList bo'yicha saralash
            const sortedRows = [...filteredRows].sort((a, b) => {
                const catA = getResultRowCategoryName(a, idName, '')
                const catB = getResultRowCategoryName(b, idName, '')
                const idxA = categoriesList.findIndex(c => c.name === catA)
                const idxB = categoriesList.findIndex(c => c.name === catB)
                if (idxA !== -1 && idxB !== -1) return idxA - idxB
                if (idxA !== -1) return -1
                if (idxB !== -1) return 1
                return catA.localeCompare(catB)
            })

            sortedRows.forEach(row => {
                const testName = row.values?.[idName] || ''
                const catName = getResultRowCategoryName(row, idName, diagnosis.results?.title || diagnosis.diagnosis?.category?.name || 'Laboratoriya tahlili')
                if (!groupMap[catName]) {
                    groupMap[catName] = { rows: [], cols }
                    groupOrder.push(catName)
                }
                groupMap[catName].rows.push(row)
            })

            if (groupOrder.length === 0) { alert('Natijalar topilmadi!'); return }

            const dailyNum = diagnosis?.dailyNumber || patient?.dailyNumber || 1
            const numStr = (typeof dailyNum === 'number' || !dailyNum.toString().startsWith('№')) ? `№${dailyNum}` : dailyNum
            const buildPatientBlock = () => `
                <div class="print-patient">
                    <div class="print-patient-col">
                        <span><b>Ф.И.О.:</b> ${patient.fullName}</span>
                        <span><b>Дата рож.:</b> ${patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('ru-RU') : '-'}</span>
                        <span><b>Тел:</b> ${patient.phone || '-'}</span>
                        <span><b>Врач:</b> ${patient.referredBy || '-'}</span>
                    </div>
                    <div class="print-patient-center">
                        <div class="print-patient-num">${numStr}</div>
                    </div>
                    <div class="print-patient-col">
                        <span><b>Дата рег.:</b> ${formatPrintDate(diagnosis.createdAt)}</span>
                        <span><b>Дата гот.:</b> ${formatPrintDate(diagnosis.results?.savedAt || diagnosis.updatedAt || diagnosis.createdAt)}</span>
                        <span><b>Пол:</b> ${patient.gender === 'male' ? 'Erkak' : 'Ayol'}</span>
                    </div>
                </div>
            `
            const pages = groupOrder.map((catName, pageIdx) => {
                const { rows, cols: pageCols } = groupMap[catName]
                const isLast = pageIdx === groupOrder.length - 1
                let conclusionHtml = ''
                if (isLast && diagnosis.results.conclusion) {
                    conclusionHtml = `<div class="print-conclusion"><b>Xulosa:</b>${diagnosis.results.conclusion}</div>`
                }

                return `
                    <div class="result-section">
                        <div class="print-title-row">
                            <div class="print-title">${catName}</div>
                            ${dailyNum ? `<div class="print-daily-num">№ ${dailyNum}</div>` : ''}
                        </div>
                        <table class="results-table">
                            <thead><tr>${pageCols.map(c => `<th style="width:${c.width}">${formatPrintCell(c.name)}</th>`).join('')}</tr></thead>
                            <tbody>
                                ${rows.map(r => {
                                    const resultVal = r.values?.[pageCols[1]?.id] || ''
                                    const normaVal = pageCols[2]?.id ? (r.values?.[pageCols[2].id] || '') : ''
                                    const isOut = r.values?.isAbnormal === true || isOutOfRange(resultVal, normaVal)
                                    return `
                                    <tr class="${isOut ? 'out-of-range' : ''}">
                                        ${pageCols.map((c, i) => `<td class="${i===1 ? 'result-val' : ''}">${formatPrintCell(r.values[c.id])}</td>`).join('')}
                                    </tr>
                                `}).join('')}
                            </tbody>
                        </table>
                        ${conclusionHtml}
                        <div class="print-footer">
                            <div class="pf-top">
                                <span class="doctor-label">Анализ проводил(а) :</span>
                                <span class="pf-line"></span>
                                <span class="doctor-name">${doctorName}</span>
                            </div>
                            <div class="pf-disclaimer">
                                Лаборатор тахлил натижалари бу ТАШХИС ЭМАС.<br/>
                                Ташхис, бемор хакидаги барча маълумотлар йигиндиси асосида даволовчи шифокор томонидан куйилади.
                            </div>
                            <div class="pf-contact">Тахлил натижалари бўйича саволлар учун Врач лаборант: +998-93-777-31-61</div>
                        </div>
                    </div>
                `
            }).join('')

            const printWindow = window.open('', '_blank')
            if (!printWindow) { alert('Popup bloklandi! Brauzer sozlamalarida popup oynalarga ruxsat bering.'); return }
            printWindow.document.write(`<!DOCTYPE html><html><head>
                <meta charset="utf-8"/>
                <title>${patient.fullName} — natijalar</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    @page { size: A4; margin: 12mm 15mm; }
                    body { font-family: Arial, sans-serif; font-size: 13pt; color: #111; background: #fff; }
                    .print-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 10px; border-bottom: 2px solid #555; margin-bottom: 12px; }
                    .ph-left { display: flex; align-items: center; gap: 16px; }
                    .ph-logo { width: 72px; height: 72px; object-fit: contain; }
                    .ph-clinic-name { font-size: 22pt; font-weight: 900; line-height: 1.1; color: #111; }
                    .ph-clinic-name span { color: #d63031; }
                    .ph-clinic-sub { font-size: 11pt; color: #555; margin-top: 2px; }
                    .ph-address { text-align: right; font-size: 10.5pt; color: #444; line-height: 1.5; max-width: 220px; }
                    .print-patient { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 13pt; }
                    .print-patient-col { display: flex; flex-direction: column; gap: 3px; }
                    .print-patient span { display: block; }
                    .print-patient b { font-weight: 600; }
                    .print-patient-center { display: flex; justify-content: center; align-items: center; padding: 0 15px; }
                    .print-patient-num { font-size: 24pt; font-weight: 900; }
                    .print-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; position: relative; }
                    .print-title { font-size: 13pt; font-weight: 700; text-align: left; }
                    .print-daily-num { font-size: 16pt; font-weight: 900; color: #d63031; border: 2px solid #d63031; border-radius: 6px; padding: 1px 10px; margin-left: auto; }
                    .results-table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 10px; font-size: 12pt; }
                    .results-table th { border: 1px solid #333; padding: 5px 7px; background: #f0f0f0; font-weight: 700; text-align: left; word-wrap: break-word; }
                    .results-table td { border: 1px solid #aaa; padding: 4px 7px; text-align: left; word-wrap: break-word; white-space: pre-wrap; line-height: 1.35; }
                    .results-table td.result-val { font-weight: 700; }
                    .results-table tr.out-of-range td.result-val { color: #dc2626 !important; font-weight: 900 !important; }
                    .print-conclusion { margin: 10px 0; padding: 8px 12px; border-left: 3px solid #555; font-size: 12pt; color: #222; }
                    .print-conclusion b { display: block; margin-bottom: 4px; }
                    .print-footer { margin-top: 18px; font-size: 13pt; }
                    .pf-top { display: flex; align-items: flex-end; justify-content: center; margin-bottom: 8px; }
                    .pf-line { flex: 1; border-bottom: 1px solid #000; margin: 0 10px; max-width: 250px; }
                    .print-footer .doctor-label { font-weight: 700; }
                    .print-footer .doctor-name { font-weight: 700; }
                    .pf-disclaimer { text-align: center; border-top: 1px solid #aaa; padding-top: 6px; font-size: 10.5pt; line-height: 1.4; }
                    .pf-contact { text-align: center; font-size: 10.5pt; font-weight: 600; margin-top: 4px; }
                    .print-page { width: 100%; }
                    .result-section { margin-top: 12px; break-inside: auto; page-break-inside: auto; }
                    .result-section + .result-section { margin-top: 16px; padding-top: 10px; border-top: 1px solid #cbd5e1; }
                    .result-section:not(:last-of-type) .print-footer { display: none; }
                    @media print { body { padding: 0; } }
                </style>
            </head><body>
                <div class="print-page">
                    <div class="print-header">
                        <div class="ph-left">
                            <img src="${logoUrl}" alt="Logo" class="ph-logo"/>
                            <div class="ph-clinic">
                                <div class="ph-clinic-name">Al-Beruniy <span>Med</span></div>
                                <div class="ph-clinic-sub">Tibbiy laboratoriya markazi</div>
                            </div>
                        </div>
                        <div class="ph-address">
                            Qoraqalpog&#x2019;iston Respublikasi<br/>
                            Beruniy tumani, Amir Temur MFY<br/>
                            Navbahor ko&#x2019;chasi 2/4-uy
                        </div>
                    </div>
                    ${buildPatientBlock()}
                    ${pages}
                </div>
            </body></html>`)
            printWindow.document.close()
            printWindow.focus()
            setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
        } catch (e) {
            console.error('printLabResult xatosi:', e)
            alert('Natijani chop etishda xatolik yuz berdi!')
        }
    }

    const handlePrintLastResult = async (patient) => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/patient-diagnoses/patient/${patient._id}`, { headers: { 'Authorization': `Bearer ${token}` } })
            if (res.ok) {
                const diagnoses = await res.json()
                const savedDiags = diagnoses.filter(isDiagnosisResultConfirmed).sort((a, b) => {
                    const createdDiff = new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
                    if (createdDiff !== 0) return createdDiff
                    return new Date(getResultReadyDate(b)) - new Date(getResultReadyDate(a))
                })
                if (savedDiags.length === 0) {
                    alert("Bu bemorda tayyor natijalar yo'q!")
                    return
                }
                printLabResult(savedDiags[0], patient)
            }
        } catch (e) {
            console.error(e)
            alert("Natijani yuklashda xatolik!")
        }
    }

    const handleOpenPrintModal = async (patient) => {
        setPrintModalPatient(patient)
        setPrintModalDiagnoses([])
        setPrintModalError('')
        setPrintModalLoading(true)
        setShowPrintModal(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/patient-diagnoses/patient/${patient._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const diagnoses = await res.json()
                diagnoses.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                setPrintModalDiagnoses(diagnoses)
            } else if (res.status === 401) {
                setPrintModalError("Seans muddati tugagan. Iltimos, tizimdan chiqib (Logout) qayta kiring (Login).")
            } else {
                setPrintModalError("Ma'lumotlarni yuklashda xatolik yuz berdi. Iltimos, qayta urining.")
            }
        } catch (e) {
            console.error(e)
            setPrintModalError("Server bilan aloqa uzildi. Server qayta yuklanayotgan bo'lishi mumkin, iltimos 1-2 daqiqadan keyin qayta urining.")
        } finally {
            setPrintModalLoading(false)
        }
    }

    // Test nomidan kategoriya nomini olish
    const getCategoryForTest = (testName, categoryId = null) => {
        const match = findDiagnosisByRef(null, testName, categoryId)
        return getDiagnosisCategoryName(match, null)
    }

    // diagnosisName stringini kategoriyalarga guruhlash
    const groupByCategory = (diagnosisOrName) => {
        const diagnosis = typeof diagnosisOrName === 'object' ? diagnosisOrName : null
        let tags = diagnosis
            ? (diagnosis.diagnosisPrices || [])
                .filter(dp => !dp.isCategoryPrice)
                .sort((a, b) => {
                    const orderA = Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER
                    const orderB = Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER
                    if (orderA !== orderB) return orderA - orderB
                    return (a.name || '').localeCompare(b.name || '', 'ru')
                })
                .map(dp => ({
                    name: dp.name,
                    categoryId: dp.categoryId,
                    categoryName: dp.categoryName
                }))
            : (diagnosisOrName || '').split(',').map(s => ({ name: s.trim() })).filter(item => item.name)

        if (diagnosis && tags.length === 0) {
            const preferredCategoryId = diagnosis.diagnosis?.category?._id || diagnosis.diagnosis?.category
            tags = (diagnosis.diagnosisName || '')
                .split(',')
                .map(s => ({ name: s.trim(), categoryId: preferredCategoryId }))
                .filter(item => item.name)
        }

        const groups = {}
        const order = []
        tags.forEach(item => {
            const tag = item.name
            const cat = item.categoryName || getCategoryForTest(tag, item.categoryId) || 'Boshqa'
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
        // Analiz tahrirlash uchun bemorning analizlarini yuklash
        setEditAnalysisList([])
        setEditAnalysisLoading(true)
        const token = localStorage.getItem('token')
        fetch(`/api/patient-diagnoses/patient/${patient._id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : [])
            .then(data => setEditAnalysisList(data))
            .catch(() => setEditAnalysisList([]))
            .finally(() => setEditAnalysisLoading(false))
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
    const isActiveToday = (p) => isToday(p.createdAt || p.registeredAt) || isToday(p.lastDiagnosisDate) || isToday(p.latestDiagnosisDate)

    const filteredPatients = patients.filter(p => {
        const matchesSearch =
            p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.phone?.includes(searchTerm) ||
            p.passportNumber?.toLowerCase().includes(searchTerm.toLowerCase())
        let matchesFilter = true
        if (dateFilter === 'today') matchesFilter = isActiveToday(p)
            
        let matchesStatus = true
        if (statusFilter === 'done') matchesStatus = p.allResultsSaved === true
        else if (statusFilter === 'pending') {
            matchesStatus = p.hasUnsavedResults === true
        }

        return matchesSearch && matchesFilter && matchesStatus
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
                    <div className="pm-filters" style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                        <button className={`pm-filter-btn ${dateFilter === 'all' ? 'active' : ''}`} onClick={() => handleDateFilter('all')}>
                            Barchasi
                        </button>
                        <button className={`pm-filter-btn ${dateFilter === 'today' ? 'active' : ''}`} onClick={() => handleDateFilter('today')}>
                            <Calendar size={14} /> Bugungi ({todayCount})
                        </button>
                        <div style={{width: '2px', height: '20px', background: '#e2e8f0', margin: '0 4px'}}></div>
                        <button className={`pm-filter-btn ${statusFilter === 'done' ? 'active' : ''}`} style={statusFilter === 'done' ? {background: '#f0fdf4', borderColor: '#86efac', color: '#16a34a'} : {}} onClick={() => {setStatusFilter(statusFilter === 'done' ? 'all' : 'done'); setCurrentPage(1)}}>
                            <Check size={14} /> Bajarilgan
                        </button>
                        <button className={`pm-filter-btn ${statusFilter === 'pending' ? 'active' : ''}`} style={statusFilter === 'pending' ? {background: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626'} : {}} onClick={() => {setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending'); setCurrentPage(1)}}>
                            <AlertTriangle size={14} /> Bajarilmagan
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
                                        <div className="pm-user-cell" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px'}}>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                                <div className="pm-avatar" style={{width: 32, height: 32, fontSize: '0.9rem'}}>{patient.fullName?.charAt(0) || 'B'}</div>
                                                <span className="pm-user-name" style={{lineHeight: 1}}>{patient.fullName}</span>
                                                {patient.dailyNumber && (
                                                     <span style={{ marginLeft: 6, background: '#fee2e2', color: '#dc2626', fontWeight: 800, fontSize: '0.78rem', padding: '1px 7px', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                                                         № {patient.dailyNumber}
                                                     </span>
                                                 )}
                                            </div>
                                            <div style={{marginLeft: '42px'}}>
                                                {patient.allResultsSaved === true ? (
                                                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#16a34a', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Bajarilgan</span>
                                                ) : patient.hasUnsavedResults === true ? (
                                                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#dc2626', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Bajarilmagan</span>
                                                ) : null}
                                            </div>
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
                                            <button className="pm-act-btn pm-act-edit" title="Bemor tahrirlash" onClick={() => handleEdit(patient)}>
                                                <Edit2 size={15} />
                                            </button>
                                            <button className="pm-act-btn" title="Analiz qo'shish" style={{ color: '#7c3aed', background: '#f5f3ff', borderColor: '#c4b5fd' }} onClick={() => navigate(`/registrator/patients/diagnosis/${patient._id}?new=1`)}>
                                                <Stethoscope size={15} />
                                            </button>

                                            {(patient.lastDiagnosisDate || patient.allResultsSaved !== undefined) && (
                                                <button className="pm-act-btn pm-act-view" title="Chop etish" style={{ color: '#2563eb', background: '#eff6ff', borderColor: '#bfdbfe' }} onClick={() => handleOpenPrintModal(patient)}>
                                                    <Printer size={15} />
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

                                {/* Analiz tahrirlash bo'limi — faqat tahrirlash rejimida */}
                                {editingPatient && (
                                    <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                            <Pencil size={16} style={{ color: '#d97706' }} />
                                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#92400e' }}>Analiz tahrirlash</span>
                                        </div>

                                        {editAnalysisLoading ? (
                                            <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                                                <div className="spinner-sm" style={{ display: 'inline-block', marginRight: 8 }}></div>
                                                Yuklanmoqda...
                                            </div>
                                        ) : editAnalysisList.length === 0 ? (
                                            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                                <ClipboardList size={24} style={{ marginBottom: 6, opacity: 0.5 }} />
                                                <p>Analizlar topilmadi</p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                                                {editAnalysisList.map((d) => {
                                                    const catGroups = groupByCategory(d)
                                                    const hasResults = d.results && d.results.rows && d.results.rows.length > 0
                                                    const receiptTotal = getReceiptItemsTotal(d)
                                                    return (
                                                        <div
                                                            key={d._id}
                                                            onClick={() => {
                                                                setShowModal(false)
                                                                resetForm()
                                                                navigate(`/registrator/patients/diagnosis/${editingPatient._id}?edit=${d._id}`)
                                                            }}
                                                            style={{
                                                                borderRadius: '8px', padding: '10px 12px',
                                                                background: '#fffbeb',
                                                                border: '1px solid #fde68a',
                                                                borderLeft: '3px solid #f59e0b',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = '#fef3c7'
                                                                e.currentTarget.style.borderColor = '#fcd34d'
                                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(245,158,11,0.15)'
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = '#fffbeb'
                                                                e.currentTarget.style.borderColor = '#fde68a'
                                                                e.currentTarget.style.boxShadow = 'none'
                                                            }}
                                                        >
                                                            {/* Analiz nomlari */}
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '6px' }}>
                                                                {(() => {
                                                                    const receiptItems = getReceiptItems(d)
                                                                    return receiptItems.length > 0 ? (
                                                                        receiptItems.map((dp, i) => (
                                                                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', padding: '1px 0' }}>
                                                                            <span style={{ fontWeight: 500, color: '#1e293b' }}>{dp.name}</span>
                                                                            <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.75rem' }}>{dp.price > 0 ? dp.price.toLocaleString() + " so'm" : ''}</span>
                                                                        </div>
                                                                        ))
                                                                    ) : (
                                                                        catGroups.map(({ cat, tests }) => (
                                                                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{cat}</span>
                                                                            <span style={{ fontSize: '0.7rem', color: '#fff', background: '#f59e0b', borderRadius: '20px', padding: '1px 6px', fontWeight: 500 }}>{tests.length} ta</span>
                                                                        </div>
                                                                        ))
                                                                    )
                                                                })()}
                                                            </div>
                                                            {/* Meta */}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.72rem', color: '#94a3b8' }}>
                                                                    <span><Calendar size={10} style={{ verticalAlign: 'middle', marginRight: 2 }} />{formatDateTime(d.createdAt)}</span>
                                                                    {receiptTotal > 0 && <span style={{ fontWeight: 600, color: '#059669' }}>{receiptTotal.toLocaleString()} so'm</span>}
                                                                    {hasResults && <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px', background: '#dcfce7', color: '#16a34a', fontWeight: 600 }}>Natija bor</span>}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#d97706', fontSize: '0.75rem', fontWeight: 600 }}>
                                                                    <Edit2 size={12} /> Tahrirlash
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
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
                                                const catGroups = groupByCategory(d)
                                                const receiptTotal = getReceiptItemsTotal(d)
                                                return (
                                                    <div key={d._id} style={{
                                                        borderRadius: '10px', padding: '10px 14px',
                                                        background: '#fff',
                                                        border: '1px solid #e2e8f0',
                                                        borderLeft: '3px solid #3b82f6'
                                                    }}>
                                                        {/* Sotib olingan paket/analizlar ro'yxati (chek bilan bir xil) */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                                                            {(() => {
                                                                const receiptItems = getReceiptItems(d)
                                                                return receiptItems.length > 0 ? (
                                                                    receiptItems.map((dp, i) => (
                                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', padding: '2px 0' }}>
                                                                        <span style={{ fontWeight: 500, color: '#1e293b' }}>{dp.name}</span>
                                                                        <span style={{ color: '#64748b', fontWeight: 600 }}>{dp.price > 0 ? dp.price.toLocaleString() : '0'}</span>
                                                                    </div>
                                                                    ))
                                                                ) : (
                                                                    catGroups.map(({ cat, tests }) => (
                                                                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <span style={{ fontSize: '0.83rem', fontWeight: 600, color: '#1e293b' }}>{cat}</span>
                                                                        <span style={{ fontSize: '0.75rem', color: '#fff', background: '#3b82f6', borderRadius: '20px', padding: '1px 7px', fontWeight: 500 }}>{tests.length} ta</span>
                                                                    </div>
                                                                    ))
                                                                )
                                                            })()}
                                                        </div>
                                                        {/* Meta + tugmalar */}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.77rem', color: '#64748b' }}>
                                                                <span><Calendar size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />{formatDateTime(d.createdAt)}</span>
                                                                {receiptTotal > 0 && <span style={{ fontWeight: 600, color: '#059669' }}>{receiptTotal.toLocaleString()} so'm</span>}
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
                                                                    className="pm-act-btn pm-act-view"
                                                                    title="Natijani chop etish"
                                                                    style={{ background: '#dbeafe', color: '#2563eb' }}
                                                                    onClick={() => printLabResult(d, selectedPatient)}
                                                                >
                                                                    <FileText size={14} />
                                                                </button>
                                                                <button
                                                                    className="pm-act-btn pm-act-edit"
                                                                    title="Analizni tahrirlash"
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
                            <button className="pe-btn" style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.9rem' }} onClick={() => { setShowViewModal(false); navigate(`/registrator/patients/diagnosis/${selectedPatient._id}?new=1`) }}>
                                <Stethoscope size={16} /> Analiz qo'shish
                            </button>
                            <button className="pe-btn pe-btn-save" onClick={() => { setShowViewModal(false); handleEdit(selectedPatient) }}>
                                <Edit2 size={16} /> Tahrirlash
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PRINT SELECTION MODAL */}
            {showPrintModal && printModalPatient && (
                <div className="modal-overlay" onClick={() => setShowPrintModal(false)}>
                    <div className="modal glass-card" style={{
                        background: 'var(--bg-card,#fff)', borderRadius: '16px',
                        width: '100%', maxWidth: '580px', maxHeight: '88vh',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.18)'
                    }} onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="pe-header" style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', borderRadius: '16px 16px 0 0' }}>
                            <div className="pe-title">
                                <div className="pe-title-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Printer size={18} /></div>
                                <h2>Natijalarni chop etish</h2>
                            </div>
                            <button className="pe-close" onClick={() => setShowPrintModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ overflowY: 'auto', flex: 1, background: '#fff', padding: '20px' }} className="rp-view-body">
                            <div style={{ marginBottom: '16px' }}>
                                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Bemor:</span>
                                <h3 style={{ fontSize: '1.25rem', color: '#1e293b', fontWeight: 700, marginTop: '2px' }}>{printModalPatient.fullName}</h3>
                            </div>

                            <h4 style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ClipboardList size={16} />
                                Topshirilgan analizlar ro'yxati
                            </h4>

                            {printModalLoading ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                                    <div className="spinner-sm" style={{ display: 'inline-block', marginRight: 8 }}></div>
                                    Yuklanmoqda...
                                </div>
                            ) : printModalError ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: '#dc2626', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
                                    <AlertCircle size={24} style={{ marginBottom: '8px' }} />
                                    <p style={{ fontSize: '0.88rem', fontWeight: 500, margin: '0 0 12px 0' }}>{printModalError}</p>
                                    <button className="pe-btn" style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontWeight: 600 }} onClick={() => handleOpenPrintModal(printModalPatient)}>
                                        Qayta urinish
                                    </button>
                                </div>
                            ) : printModalDiagnoses.length === 0 ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', border: '1px dashed #e2e8f0', borderRadius: '10px' }}>
                                    <ClipboardList size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                                    <p>Bu bemorda analizlar topilmadi</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {printModalDiagnoses.map((d) => {
                                        const catGroups = groupByCategory(d)
                                        const receiptTotal = getReceiptItemsTotal(d)
                                        const hasResults = d.results && d.results.rows && d.results.rows.length > 0
                                        return (
                                            <div key={d._id} style={{
                                                borderRadius: '10px', padding: '12px 16px',
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderLeft: '4px solid #2563eb'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                                                        Sana: {formatDateTime(d.createdAt)}
                                                    </span>
                                                    {receiptTotal > 0 && (
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '12px' }}>
                                                            {receiptTotal.toLocaleString()} so'm
                                                        </span>
                                                    )}
                                                </div>

                                                <div style={{ marginBottom: '12px' }}>
                                                    {(() => {
                                                        const receiptItems = getReceiptItems(d)
                                                        return receiptItems.length > 0 ? (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                {receiptItems.map((item, i) => (
                                                                    <span key={i} style={{ fontSize: '0.78rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 6px', fontWeight: 500, color: '#1e293b' }}>
                                                                        {item.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                {catGroups.map(({ cat }) => (
                                                                    <span key={cat} style={{ fontSize: '0.78rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 6px', fontWeight: 500, color: '#1e293b' }}>
                                                                        {cat}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )
                                                    })()}
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <button
                                                        className="pe-btn"
                                                        style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}
                                                        onClick={() => printReceipt(d, printModalPatient)}
                                                    >
                                                        <Printer size={13} /> Chek chiqarish
                                                    </button>
                                                    <button
                                                        className="pe-btn"
                                                        style={{ background: hasResults ? '#2563eb' : '#94a3b8', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: hasResults ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}
                                                        disabled={!hasResults}
                                                        onClick={() => printLabResult(d, printModalPatient)}
                                                        title={hasResults ? "Natijalarni chop etish" : "Natijalar hali kiritilmagan"}
                                                    >
                                                        <FileText size={13} /> Natijani chop etish
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 16px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="pe-btn pe-btn-cancel" onClick={() => setShowPrintModal(false)}>
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

export default RegistratorPatients
