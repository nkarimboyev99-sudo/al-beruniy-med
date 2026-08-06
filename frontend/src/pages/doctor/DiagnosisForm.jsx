import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
    Stethoscope, Save, ArrowLeft, ArrowRight,
    Check, AlertCircle, Phone, Calendar,
    CreditCard, Banknote, Building2, ChevronRight,
    CheckSquare, Square, Layers, Search, X
} from 'lucide-react'
import './DiagnosisForm.css'
import logoSrc from '../../logo/logo.png'

const getEmptyFormData = () => ({ diagnoses: [], notes: '' })
const getEmptyPaymentData = () => ({ discount: 0, discountPercent: 0, paymentMethod: 'cash' })
const clampDiscountPercent = (value) => {
    const parsed = parseFloat(value)
    if (Number.isNaN(parsed)) return 0
    return Math.min(100, Math.max(0, parsed))
}
const calculateDiscountAmount = (subtotal, percent) => Math.round(Math.max(0, subtotal) * clampDiscountPercent(percent) / 100)
const sumMoney = (items = []) => items.reduce((sum, item) => sum + Number(item?.price || 0), 0)
const isInternalResultCategory = (category) => {
    const code = (category?.code || '').toString().trim().toLowerCase()
    const name = (category?.name || '').toString().trim().toLowerCase()
    return code === 'mom' || name === 'микроскопия осадка мочи'
}

function DiagnosisForm() {
    const { patientId } = useParams()
    const [searchParams] = useSearchParams()
    const [editDiagnosisId, setEditDiagnosisId] = useState(searchParams.get('edit') || null)
    const navigate = useNavigate()
    const getBasePath = () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        if (user?.role === 'admin') return '/admin'
        if (user?.role === 'registrator') return '/registrator'
        if (user?.role === 'doctor') return '/doctor'
        const path = window.location.pathname
        if (path.startsWith('/admin')) return '/admin'
        if (path.startsWith('/registrator')) return '/registrator'
        return '/doctor'
    }

    const [patient, setPatient] = useState(null)
    const [diagnosesList, setDiagnosesList] = useState([])
    const [categoriesList, setCategoriesList] = useState([])
    const [activeCategory, setActiveCategory] = useState(null)
    const [loading, setLoading] = useState(true)

    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState(getEmptyFormData)
    const [paymentData, setPaymentData] = useState(getEmptyPaymentData)
    const [hiddenCatSelections, setHiddenCatSelections] = useState({})
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        loadData()
    }, [patientId, searchParams.get('edit')])

    const loadData = async () => {
        setLoading(true)
        setError('')
        setSuccess('')
        setStep(1)
        setFormData(getEmptyFormData())
        setPaymentData(getEmptyPaymentData())
        setHiddenCatSelections({})

        const token = localStorage.getItem('token')
        const headers = { 'Authorization': `Bearer ${token}` }
        try {
            const isNewMode = searchParams.get('new') === '1'
            let activeEditId = editDiagnosisId;
            if (!activeEditId && !isNewMode) {
                const patDiagRes = await fetch(`/api/patient-diagnoses/patient/${patientId}`, { headers });
                if (patDiagRes.ok) {
                    const diags = await patDiagRes.json();
                    const activeDiag = diags.find(d => !(d.results?.isConfirmed === true || (d.results?.isConfirmed === undefined && !!d.results?.savedAt)));
                    if (activeDiag) {
                        activeEditId = activeDiag._id;
                        setEditDiagnosisId(activeEditId);
                    }
                }
            }

            const requests = [
                fetch(`/api/patients/${patientId}`, { headers }),
                fetch('/api/diagnoses', { headers }),
                fetch('/api/categories', { headers }),
            ]
            if (activeEditId) {
                requests.push(fetch(`/api/patient-diagnoses/${activeEditId}`, { headers }))
            }
            const results = await Promise.all(requests)
            const [patRes, diagRes, catRes, editRes] = results

            if (patRes.ok) setPatient(await patRes.json())
            let diagListData = []
            if (diagRes.ok) { diagListData = await diagRes.json(); setDiagnosesList(diagListData) }
            let catsData = []
            if (catRes.ok) {
                catsData = await catRes.json()
                setCategoriesList(catsData)
                const firstVisibleCategory = catsData.find(cat => !isInternalResultCategory(cat))
                if (firstVisibleCategory) setActiveCategory(firstVisibleCategory._id)
            }
            // Edit rejimi: mavjud diagnozni pre-fill qilish
            if (editRes && editRes.ok) {
                const existing = await editRes.json()
                let preSelected = []
                let hCats = {}
                
                if (existing.diagnosisPrices && existing.diagnosisPrices.length > 0 && existing.diagnosisPrices.some(dp => dp.diagnosisId)) {
                    // Yangi format (diagnosisId va isCategoryPrice mavjud)
                    const packageCategoryIds = new Set(
                        existing.diagnosisPrices
                            .filter(dp => dp.isCategoryPrice)
                            .map(dp => (dp.categoryId || dp.diagnosisId)?.toString())
                            .filter(Boolean)
                    )
                    existing.diagnosisPrices.forEach(dp => {
                        if (dp.isCategoryPrice) {
                            hCats[dp.diagnosisId] = dp.price || 0
                        } else if (packageCategoryIds.has((dp.categoryId || '')?.toString())) {
                            return
                        } else {
                            preSelected.push({
                                diagnosisId: dp.diagnosisId,
                                diagnosisName: dp.name,
                                price: dp.price || 0
                            })
                        }
                    })
                } else if (existing.diagnosisPrices && existing.diagnosisPrices.length > 0) {
                    // Eski format: Faqat name va price bor
                    existing.diagnosisPrices.forEach(dp => {
                        const matchedDiag = diagListData.find(d => d.name === dp.name)
                        if (matchedDiag) {
                            preSelected.push({
                                diagnosisId: matchedDiag._id,
                                diagnosisName: matchedDiag.name,
                                price: dp.price || matchedDiag.price || 0
                            })
                        } else {
                            const matchedCat = catsData.find(c => c.name === dp.name)
                            if (matchedCat) {
                                hCats[matchedCat._id] = dp.price || 0
                            }
                        }
                    })
                } else {
                    // Eng eski format: faqat diagnosisName (string)
                    const names = (existing.diagnosisName || '').split(',').map(s => s.trim()).filter(Boolean)
                    names.forEach(name => {
                        const matchedDiag = diagListData.find(d => d.name === name)
                        if (matchedDiag) {
                            preSelected.push({
                                diagnosisId: matchedDiag._id,
                                diagnosisName: matchedDiag.name,
                                price: matchedDiag.price || 0
                            })
                        }
                    })
                }
                
                setFormData({ diagnoses: preSelected, notes: existing.notes || '' })
                setHiddenCatSelections(hCats)
                setPaymentData({
                    discount: existing.discount || 0,
                    discountPercent: existing.discountPercent || 0,
                    paymentMethod: existing.paymentMethod || 'cash'
                })
            }
        } catch (e) {
            setError("Ma'lumotlarni yuklab bo'lmadi")
        } finally {
            setLoading(false)
        }
    }

    const calculateAge = (birthDate) => {
        if (!birthDate) return '-'
        const today = new Date()
        const birth = new Date(birthDate)
        let age = today.getFullYear() - birth.getFullYear()
        const m = today.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
        return age + ' yosh'
    }

    const getAgeNum = (birthDate) => {
        if (!birthDate) return 0
        const today = new Date(), birth = new Date(birthDate)
        let age = today.getFullYear() - birth.getFullYear()
        const m = today.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
        return age
    }

    const getPriceForPatient = (diagnosis) => {
        const categoryPrice = diagnosis?.category?.price || 0
        if (!diagnosis.normalRanges || !diagnosis.normalRanges.length) return diagnosis.price || categoryPrice
        const ageYears = getAgeNum(patient?.birthDate)
        const gender = patient?.gender
        const match = diagnosis.normalRanges.find(r => {
            const min = r.ageMin ?? 0
            const max = r.ageMax ?? 999
            const ageOk = ageYears >= min && ageYears <= max
            const genderOk = r.gender === 'both' || r.gender === gender
            return ageOk && genderOk
        })
        if (match?.price > 0) return match.price
        if (diagnosis.price > 0) return diagnosis.price
        return categoryPrice
    }

    const toggleDiagnosis = (d) => {
        setFormData(prev => {
            const exists = prev.diagnoses.find(x => x.diagnosisId === d._id)
            if (exists) {
                return { ...prev, diagnoses: prev.diagnoses.filter(x => x.diagnosisId !== d._id) }
            }
            return {
                ...prev,
                diagnoses: [...prev.diagnoses, {
                    diagnosisId: d._id,
                    diagnosisName: d.name,
                    price: getPriceForPatient(d)
                }]
            }
        })
    }

    const getDiagnosesByCategory = (categoryId) => {
        return diagnosesList
            .filter(d => {
                const catId = d.category?._id || d.category
                return catId?.toString() === categoryId?.toString()
            })
            .sort((a, b) => (a.order || 0) - (b.order || 0))
    }

    const getSelectedCountByCategory = (categoryId) => {
        const catDiags = getDiagnosesByCategory(categoryId)
        return catDiags.filter(d => selectedIds.has(d._id)).length
    }

    const toggleAllInCategory = (categoryId) => {
        const catDiags = getDiagnosesByCategory(categoryId)
        const allSelected = catDiags.every(d => selectedIds.has(d._id))

        setFormData(prev => {
            if (allSelected) {
                // Deselect all in this category
                const catIds = new Set(catDiags.map(d => d._id))
                return {
                    ...prev,
                    diagnoses: prev.diagnoses.filter(x => !catIds.has(x.diagnosisId))
                }
            } else {
                // Select all in this category
                const existing = new Set(prev.diagnoses.map(x => x.diagnosisId))
                const newDiags = catDiags
                    .filter(d => !existing.has(d._id))
                    .map(d => ({
                        diagnosisId: d._id,
                        diagnosisName: d.name,
                        price: getPriceForPatient(d)
                    }))
                return {
                    ...prev,
                    diagnoses: [...prev.diagnoses, ...newDiags]
                }
            }
        })
    }

    const toggleHiddenCategory = (cat) => {
        const catDiags = getDiagnosesByCategory(cat._id)
        const isSelected = cat._id in hiddenCatSelections
        setFormData(prev => {
            const catDiagIds = new Set(catDiags.map(d => d._id))
            const without = prev.diagnoses.filter(x => !catDiagIds.has(x.diagnosisId))
            if (isSelected) return { ...prev, diagnoses: without }
            const newDiags = catDiags.map(d => ({
                diagnosisId: d._id,
                diagnosisName: d.name,
                price: 0
            }))
            return { ...prev, diagnoses: [...without, ...newDiags] }
        })
        setHiddenCatSelections(prev => {
            if (isSelected) {
                const next = { ...prev }
                delete next[cat._id]
                return next
            }
            return { ...prev, [cat._id]: cat.price || 0 }
        })
    }

    const hiddenCatTotal = Object.values(hiddenCatSelections).reduce((s, p) => s + p, 0)
    const regularTotal = formData.diagnoses.filter(d => {
        const diagEntry = diagnosesList.find(x => x._id === d.diagnosisId)
        const catId = (diagEntry?.category?._id || diagEntry?.category)?.toString()
        return !catId || !(catId in hiddenCatSelections)
    }).reduce((s, d) => s + (d.price || 0), 0)
    const totalDiagnoses = regularTotal + hiddenCatTotal
    const grandTotal = Math.max(0, totalDiagnoses - (paymentData.discount || 0))

    useEffect(() => {
        const discountAmount = calculateDiscountAmount(totalDiagnoses, paymentData.discountPercent || 0)
        setPaymentData(prev => {
            if (prev.discount !== discountAmount || prev.discountPercent !== clampDiscountPercent(prev.discountPercent || 0)) {
                return {
                    ...prev,
                    discountPercent: clampDiscountPercent(prev.discountPercent || 0),
                    discount: discountAmount
                }
            }
            return prev
        })
    }, [totalDiagnoses, paymentData.discountPercent])

    const handleSubmit = async () => {
        if (formData.diagnoses.length === 0 && Object.keys(hiddenCatSelections).length === 0) {
            setError('Kamida bitta analiz tanlang'); return
        }
        setSaving(true); setError('')
        try {
            const token = localStorage.getItem('token')
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

            const diagnosisNames = formData.diagnoses.map(d => d.diagnosisName).join(', ')
            const hiddenCatEntries = Object.entries(hiddenCatSelections).map(([catId, price]) => {
                const cat = categoriesList.find(c => c._id === catId)
                return { diagnosisId: catId, categoryId: catId, name: cat?.name || catId, price, isCategoryPrice: true }
            })
            const body = {
                patient: patientId,
                diagnosis: formData.diagnoses[0]?.diagnosisId || null,
                diagnosisName: diagnosisNames,
                notes: formData.notes,
                diagnosisPrices: [
                    ...formData.diagnoses.map(d => {
                        const diagEntry = diagnosesList.find(x => x._id === d.diagnosisId)
                        const categoryId = (diagEntry?.category?._id || diagEntry?.category)?.toString() || null
                        return {
                            diagnosisId: d.diagnosisId,
                            name: d.diagnosisName,
                            price: d.price || 0,
                            categoryId,
                            categoryName: diagEntry?.category?.name || '',
                            code: diagEntry?.code || '',
                            order: Number.isFinite(diagEntry?.order) ? diagEntry.order : Number.MAX_SAFE_INTEGER
                        }
                    }),
                    ...hiddenCatEntries
                ],
                totalAmount: grandTotal,
                discount: paymentData.discount || 0,
                discountPercent: paymentData.discountPercent || 0,
                paymentMethod: paymentData.paymentMethod || 'cash',
            }
            const url = editDiagnosisId
                ? `/api/patient-diagnoses/${editDiagnosisId}`
                : '/api/patient-diagnoses'
            const method = editDiagnosisId ? 'PUT' : 'POST'
            const res = await fetch(url, { method, headers, body: JSON.stringify(body) })
            const data = await res.json()
            if (!res.ok) { setError(data.message || 'Xatolik'); return }

            setSuccess(editDiagnosisId ? 'Analiz yangilandi!' : 'Analiz saqlandi!')
            const basePath = getBasePath()
            printReceipt(data)
            setTimeout(() => navigate(`${basePath}/patients`), 1500)
        } catch (e) {
            setError("Server bilan aloqa yo'q")
        } finally {
            setSaving(false)
        }
    }

    const printReceipt = (diagData) => {
        const savedPrices = Array.isArray(diagData?.diagnosisPrices) ? diagData.diagnosisPrices : []

        const toId = (value) => {
            if (!value) return ''
            if (typeof value === 'string') return value
            if (value._id) return value._id.toString()
            return value.toString()
        }
        const findCategory = (categoryId) => categoriesList.find(c => toId(c._id) === toId(categoryId))
        const isReceiptInternalItem = (item) => {
            const category = findCategory(item.categoryId)
            const categoryCode = (category?.code || '').toString().trim().toLowerCase()
            const categoryName = (item.categoryName || category?.name || '').toString().trim().toLowerCase()
            return categoryCode === 'mom' || categoryName === 'микроскопия осадка мочи'
        }
        const findDiagnosis = (price) => {
            const id = toId(price?.diagnosisId)
            if (id) {
                const byId = diagnosesList.find(d => toId(d._id) === id)
                if (byId) return byId
            }
            const name = (price?.name || '').toString().trim().toLowerCase()
            const categoryId = toId(price?.categoryId)
            const matches = diagnosesList.filter(d => (d.name || '').trim().toLowerCase() === name)
            if (categoryId) {
                const byCategory = matches.find(d => toId(d.category?._id || d.category) === categoryId)
                if (byCategory) return byCategory
            }
            return matches[0] || null
        }

        const selectedPackageIds = new Set(Object.keys(hiddenCatSelections).map(toId).filter(Boolean))
        const savedPackageIds = new Set(
            savedPrices
                .filter(d => d.isCategoryPrice)
                .map(d => toId(d.categoryId || d.diagnosisId))
                .filter(Boolean)
        )
        const hiddenCatIds = new Set([...selectedPackageIds, ...savedPackageIds])

        const statePackageLines = Object.entries(hiddenCatSelections).map(([catId, price]) => {
            const cat = findCategory(catId)
            return { diagnosisName: cat?.name || 'Paket', price: Number(price || cat?.price || 0) }
        })
        const seenMicroscopyKeys = new Set()

        const items = savedPrices
            .map(price => {
                const match = findDiagnosis(price)
                const categoryId = toId(price.categoryId || match?.category?._id || match?.category)
                const category = findCategory(categoryId) || match?.category || {}
                return {
                    diagnosisName: price.name || match?.name || '',
                    price: Number(price.price || 0),
                    categoryId,
                    categoryName: price.categoryName || category.name || '',
                    categoryPrice: Number(category.price || 0),
                    categoryHideAnalyses: category.hideAnalyses === true,
                    isCategoryPrice: price.isCategoryPrice === true,
                    order: Number.isFinite(price.order) ? price.order : (match?.order ?? Number.MAX_SAFE_INTEGER)
                }
            })
            .filter(item => item.diagnosisName)

        let receiptLines = [
            ...statePackageLines,
            ...items
                .filter(item => {
                    if (item.isCategoryPrice && selectedPackageIds.has(item.categoryId)) return false
                    if (!item.isCategoryPrice && isReceiptInternalItem(item)) return false
                    if (!item.isCategoryPrice && Number(item.price || 0) <= 0 && Number(item.categoryPrice || 0) <= 0) return false
                    return item.isCategoryPrice || !item.categoryId || !hiddenCatIds.has(item.categoryId)
                })
                .filter(item => {
                    if (!item.isCategoryPrice && isReceiptInternalItem(item)) {
                        const microscopyKey = (item.code || item.diagnosisName || '').toString().trim().toLowerCase()
                        if (microscopyKey) {
                            if (seenMicroscopyKeys.has(microscopyKey)) return false
                            seenMicroscopyKeys.add(microscopyKey)
                        }
                    }
                    return true
                })
                .map(item => ({ diagnosisName: item.diagnosisName, price: item.price }))
        ]

        if (receiptLines.length === 0 && diagData?.diagnosisName) {
            receiptLines = diagData.diagnosisName
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
                .map(name => {
                    const matched = diagnosesList.find(d => d.name === name)
                    return { diagnosisName: name, price: matched ? getPriceForPatient(matched) : 0 }
                })
        }

        if (receiptLines.length === 0) {
            const hiddenCatIds = new Set(Object.keys(hiddenCatSelections))
            const regularReceiptDiags = formData.diagnoses.filter(d => {
                const diagEntry = diagnosesList.find(x => x._id === d.diagnosisId)
                const catId = (diagEntry?.category?._id || diagEntry?.category)?.toString()
                return !catId || !hiddenCatIds.has(catId)
            })
            const hiddenCatLines = Object.entries(hiddenCatSelections).map(([catId, price]) => {
                const cat = categoriesList.find(c => c._id === catId)
                return { diagnosisName: cat?.name || 'Kategoriya', price }
            })
            receiptLines = [...regularReceiptDiags, ...hiddenCatLines]
        }

        const receiptDiscount = Number(diagData?.discount ?? paymentData.discount ?? 0)
        const receiptDiscountPercent = Number(diagData?.discountPercent ?? paymentData.discountPercent ?? 0)
        const receiptTotal = Math.max(0, sumMoney(receiptLines) - receiptDiscount)
        const printedPatientId = typeof diagData?.patient === 'string'
            ? diagData.patient
            : (diagData?.patient?._id || patientId)

        const now = diagData?.createdAt ? new Date(diagData.createdAt) : new Date()
        const dateStr = `${now.getDate().toString().padStart(2,'0')}.${(now.getMonth()+1).toString().padStart(2,'0')}.${now.getFullYear()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
        const birthStr = patient?.birthDate ? new Date(patient.birthDate).toLocaleDateString('uz-UZ') : ''
        const registrator = JSON.parse(localStorage.getItem('user') || '{}')
        const clinic = JSON.parse(localStorage.getItem('clinicSettings') || '{}')
        const clinicName = clinic.clinicName || 'Al-Beruniy Med'
        const clinicAddress = clinic.address || ''
        const clinicPhone = clinic.phone || ''
        const logoUrl = logoSrc

        const barcodeVal = printedPatientId.slice(-8)

        const win = window.open('', '_blank')
        win.document.write(`<!DOCTYPE html>
<html><head><title>Chek - ${patient?.fullName}</title>
<meta charset="utf-8"/>
<style>
    @page { margin: 3mm 4mm; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; width: 74mm; font-size: 15px; color: #000; background: #fff; }
    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
    .logo-wrap img { max-width: 80px; max-height: 70px; object-fit: contain; }
    .clinic-name { font-size: 17px; font-weight: 900; margin-top: 4px; letter-spacing: 0.3px; }
    .clinic-info { font-size: 14px; line-height: 1.6; margin-top: 3px; }
    .receipt-title { font-size: 18px; font-weight: 900; text-transform: uppercase; margin: 8px 0 0; letter-spacing: 0.5px; }
    .patient-block { text-align: center; margin: 8px 0; font-size: 15px; line-height: 1.9; border-bottom: 1px dashed #000; padding-bottom: 8px; }
    .patient-block div { display: flex; justify-content: center; gap: 4px; }
    .patient-block b { font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 14px; }
    th { font-weight: 700; text-align: left; padding: 5px 4px; border: 1px solid #000; background: #fff; }
    td { padding: 5px 4px; border: 1px solid #000; vertical-align: top; word-break: break-word; }
    .total-section { border-top: 2px solid #000; margin-top: 0; padding: 7px 4px; text-align: center; font-size: 17px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3px; }
    .discount-row { text-align: center; font-size: 15px; padding: 3px 0; border-top: 1px dotted #000; }
    .barcode-wrap { text-align: center; margin: 10px 0 4px; }
    .barcode-wrap canvas { display: block; margin: 0 auto; max-width: 100%; }
    .footer { text-align: center; font-size: 14px; padding-top: 6px; border-top: 1px dashed #000; margin-top: 4px; }
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
        <div><b>Bemor:</b>&nbsp;${patient?.fullName || ''}</div>
        ${patient?.phone ? `<div><b>Telefon:</b>&nbsp;${patient.phone}</div>` : ''}
        ${birthStr ? `<div><b>Tug'ilgan sana:</b>&nbsp;${birthStr}</div>` : ''}
        <div><b>Registrator:</b>&nbsp;${registrator.fullName || registrator.username || ''}</div>
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
            ${receiptLines.map(d => `
            <tr>
                <td>${d.diagnosisName}</td>
                <td>Laboratoriya</td>
                <td>${(d.price||0).toLocaleString()}</td>
            </tr>`).join('')}
        </tbody>
    </table>

    ${receiptDiscount > 0 ? `<div class="discount-row">Chegirma ${receiptDiscountPercent > 0 ? `(${receiptDiscountPercent}%)` : ''}: − ${receiptDiscount.toLocaleString()} so'm</div>` : ''}
    <div class="total-section">Umumiy summa: ${receiptTotal.toLocaleString()} so'm</div>

    <div class="barcode-wrap">
        <canvas id="bc"></canvas>
    </div>
    <script>
    (function(){
        var val = "${barcodeVal}";
        // Code 128B - exact patterns from ISO/IEC 15417
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
        // START B = index 104, STOP = index 106
        var codes = [104];
        var check = 104;
        for(var i=0;i<val.length;i++){
            var v = val.charCodeAt(i)-32;
            codes.push(v);
            check += v*(i+1);
        }
        codes.push(check%103);
        codes.push(106);

        var bars=[], x=0, h=50, scale=2, quiet=20;
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
    </script>

    <div class="footer">Ma'lumotlarning to'g'riligini tekshiring!</div>
</body></html>`)
        win.document.close()
        setTimeout(() => { win.print(); win.close() }, 1200)
    }

    if (loading) return (
        <div className="df-loading">
            <div className="spinner"></div>
            <p>Yuklanmoqda...</p>
        </div>
    )

    const selectedIds = new Set(formData.diagnoses.map(d => d.diagnosisId))

    // Search: barcha kategoriyalardan qidirish
    const searchResults = searchQuery.trim().length > 0
        ? diagnosesList.filter(d =>
            !isInternalResultCategory(d.category) &&
            (
                d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.code?.toLowerCase().includes(searchQuery.toLowerCase())
            )
          ).map(d => ({
            ...d,
            categoryName: categoriesList.find(c =>
                (c._id === d.category?._id || c._id === d.category)
            )?.name || ''
          }))
        : []

    const steps = ['Analiz', "To'lov"]

    // Get diagnoses for active category
    const activeCategoryDiags = activeCategory ? getDiagnosesByCategory(activeCategory) : []
    const activeCategoryObj = categoriesList.find(c => c._id === activeCategory)
    const allSelectedInCategory = activeCategoryDiags.length > 0 && activeCategoryDiags.every(d => selectedIds.has(d._id))

    return (
        <div className="df-page">
            {/* Header */}
            <div className="df-header">
                <button className="df-back-btn" onClick={() => navigate(`${getBasePath()}/patients`)}>
                    <ArrowLeft size={20} />
                    Orqaga
                </button>
                <div className="df-header-title">
                    <Stethoscope size={24} />
                    <h1>{editDiagnosisId ? 'Analiz tahrirlash' : "analiz qo'shish"}</h1>
                </div>
                <div></div>
            </div>

            <div className="df-body">
                {/* Left: Sidebar */}
                <aside className="df-sidebar">
                    {/* Compact patient card */}
                    <div className="df-patient-compact">
                        <div className="df-patient-avatar-sm">
                            {patient?.fullName?.charAt(0) || 'B'}
                        </div>
                        <div className="df-patient-compact-info">
                            <span className="df-patient-compact-name">{patient?.fullName}</span>
                            <span className="df-patient-compact-age">
                                {calculateAge(patient?.birthDate)}
                                {patient?.gender && (
                                    <span className={`df-gender-dot ${patient.gender === 'male' ? 'male' : 'female'}`}>
                                        {patient.gender === 'male' ? '♂' : '♀'}
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="df-steps">
                        {steps.map((s, i) => (
                            <div key={i} className={`df-step ${step === i+1 ? 'active' : ''} ${step > i+1 ? 'done' : ''}`}>
                                <div className="df-step-circle">
                                    {step > i+1 ? <Check size={16} /> : i+1}
                                </div>
                                <span>{s}</span>
                                {i < steps.length - 1 && <div className="df-step-line"></div>}
                            </div>
                        ))}
                    </div>

                    {/* Categories list (only on step 1) */}
                    {step === 1 && (
                        <div className="df-cat-list">
                            {/* Qidiruv inputi (chap panelda) */}
                            <div style={{
                                padding: '0 0 12px 0',
                                position: 'sticky', top: 0, zIndex: 10,
                                background: 'var(--bg-card, #fff)',
                            }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    background: '#f1f5f9',
                                    border: `1.5px solid ${searchQuery ? '#6366f1' : '#cbd5e1'}`,
                                    borderRadius: '10px',
                                    padding: '8px 12px',
                                    boxShadow: searchQuery ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
                                    transition: 'all 0.2s'
                                }}>
                                    <Search size={16} style={{ color: searchQuery ? '#6366f1' : '#64748b', flexShrink: 0 }} />
                                    <input
                                        type="text"
                                        className="df-sidebar-search-input"
                                        placeholder="Izlash (F.I.O yoki kod)..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        autoComplete="off"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            style={{
                                                background: '#cbd5e1', border: 'none', borderRadius: '50%',
                                                width: 18, height: 18, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#475569', padding: 0, flexShrink: 0
                                            }}
                                        >
                                            <X size={11} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="df-cat-list-title" style={{ marginTop: '4px' }}>
                                <Layers size={15} />
                                KATEGORIYALAR
                            </div>
                            {categoriesList
                                .filter(cat => !isInternalResultCategory(cat))
                                .map((cat, index) => ({ cat, index }))
                                .sort((a, b) => {
                                    const aSelected = a.cat.hideAnalyses ? (a.cat._id in hiddenCatSelections) : getSelectedCountByCategory(a.cat._id) > 0;
                                    const bSelected = b.cat.hideAnalyses ? (b.cat._id in hiddenCatSelections) : getSelectedCountByCategory(b.cat._id) > 0;
                                    if (aSelected && !bSelected) return -1;
                                    if (!aSelected && bSelected) return 1;
                                    return a.index - b.index;
                                })
                                .map(({ cat }) => {
                                const catDiagCount = getDiagnosesByCategory(cat._id).length
                                const catSelectedCount = getSelectedCountByCategory(cat._id)
                                const isHiddenSelected = cat._id in hiddenCatSelections
                                return (
                                    <div
                                        key={cat._id}
                                        className={`df-cat-item ${activeCategory === cat._id ? 'active' : ''} ${(cat.hideAnalyses ? isHiddenSelected : catSelectedCount > 0) ? 'selected' : ''}`}
                                        onClick={() => {
                                            const newCatId = cat._id
                                            setActiveCategory(newCatId)
                                            if (cat.hideAnalyses) {
                                                toggleHiddenCategory(cat)
                                            }
                                        }}
                                    >
                                        <div className="df-cat-item-info">
                                            <span className="df-cat-item-name">{cat.name}</span>
                                            <span className="df-cat-badge">
                                                {cat.hideAnalyses ? 'paket' : catDiagCount}
                                            </span>
                                        </div>
                                        {cat.hideAnalyses ? (
                                            isHiddenSelected && (
                                                <span className="df-cat-selected-badge">tanlangan</span>
                                            )
                                        ) : (
                                            catSelectedCount > 0 && (
                                                <span className="df-cat-selected-badge">
                                                    {catSelectedCount} tanlangan
                                                </span>
                                            )
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Selected summary */}
                    {formData.diagnoses.length > 0 && (
                        <div className="df-summary-card">
                            <h4>Tanlangan ({formData.diagnoses.length})</h4>
                            {formData.diagnoses.map(d => (
                                <div key={d.diagnosisId} className="df-summary-row">
                                    <ChevronRight size={13} />
                                    <span>{d.diagnosisName}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </aside>

                {/* Right: Main content */}
                <main className="df-main">
                    {error && (
                        <div className="df-alert error">
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}
                    {success && (
                        <div className="df-alert success">
                            <Check size={18} /> {success}
                        </div>
                    )}

                    {/* STEP 1: Analiz */}
                    {step === 1 && (
                        <div className="df-section">
                            {/* Qidiruv natijalari */}
                            {searchQuery.trim().length > 0 ? (
                                <div>
                                    <div className="df-section-header-row">
                                        <div>
                                            <h2>Qidiruv natijalari</h2>
                                            <p>{searchResults.length} ta analiz topildi</p>
                                        </div>
                                    </div>
                                    {searchResults.length === 0 ? (
                                        <div className="df-empty-category">
                                            <Search size={36} style={{ opacity: 0.3 }} />
                                            <p>"{searchQuery}" bo'yicha analiz topilmadi</p>
                                        </div>
                                    ) : (
                                        <div className="df-diagnoses-grid">
                                            {searchResults.map(d => {
                                                const isSelected = selectedIds.has(d._id)
                                                return (
                                                    <div key={d._id} className={`df-diag-item ${isSelected ? 'selected' : ''}`} onClick={() => toggleDiagnosis(d)}>
                                                        <div className="df-diag-check">
                                                            {isSelected ? <Check size={16} /> : null}
                                                        </div>
                                                        <div className="df-diag-info">
                                                            <span className="df-diag-name">{d.name}</span>
                                                            {d.categoryName && (
                                                                <span className="df-diag-code" style={{ color: '#6366f1', fontStyle: 'normal', fontWeight: 500 }}>
                                                                    {d.categoryName}
                                                                </span>
                                                            )}
                                                            {d.code && <span className="df-diag-code">{d.code}</span>}
                                                        </div>
                                                        {d.price > 0 && (
                                                            <div className="df-diag-price">
                                                                <span className="df-price-label">{d.price.toLocaleString()} so'm</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                            <div>
                            <div className="df-section-header-row">
                                <div>
                                    <h2>{activeCategoryObj?.name || 'Analizlar'}</h2>
                                    <p>{activeCategoryDiags.length} ta analiz mavjud</p>
                                </div>
                                {activeCategoryDiags.length > 0 && !activeCategoryObj?.hideAnalyses && (
                                    <button
                                        className={`df-select-all-btn ${allSelectedInCategory ? 'active' : ''}`}
                                        onClick={() => toggleAllInCategory(activeCategory)}
                                    >
                                        {allSelectedInCategory ? <CheckSquare size={18} /> : <Square size={18} />}
                                        {allSelectedInCategory ? 'Barchasini bekor qilish' : 'Barchasini tanlash'}
                                    </button>
                                )}
                            </div>

                            <div className="df-diagnoses-grid">
                                {activeCategoryObj?.hideAnalyses ? (
                                    // Yashirin kategoriya — bitta toggle karta
                                    <div
                                        className={`df-diag-item ${activeCategory in hiddenCatSelections ? 'selected' : ''}`}
                                        onClick={() => activeCategoryObj && toggleHiddenCategory(activeCategoryObj)}
                                        style={{ gridColumn: '1/-1' }}
                                    >
                                        <div className="df-diag-check">
                                            {activeCategory in hiddenCatSelections ? <Check size={16} /> : null}
                                        </div>
                                        <div className="df-diag-info" style={{ flex: 1 }}>
                                            <span className="df-diag-name">{activeCategoryObj.name} — barcha {activeCategoryDiags.length} ta analiz</span>
                                            <span className="df-diag-code" style={{ marginTop: '4px', display: 'block', color: '#6b7280', fontStyle: 'italic' }}>
                                                Analizlar yashirin — bitta narx
                                            </span>
                                        </div>
                                        {activeCategoryObj.price > 0 && (
                                            <div className="df-diag-price">
                                                <span className="df-price-label">{activeCategoryObj.price.toLocaleString()} so'm</span>
                                            </div>
                                        )}
                                    </div>
                                ) : activeCategoryDiags.length > 0 ? (
                                    activeCategoryDiags.map(d => {
                                        const isSelected = selectedIds.has(d._id)
                                        return (
                                            <div key={d._id} className={`df-diag-item ${isSelected ? 'selected' : ''}`} onClick={() => toggleDiagnosis(d)}>
                                                <div className="df-diag-check">
                                                    {isSelected ? <Check size={16} /> : null}
                                                </div>
                                                <div className="df-diag-info">
                                                    <span className="df-diag-name">{d.name}</span>
                                                    {d.code && <span className="df-diag-code">{d.code}</span>}
                                                </div>
                                                {d.price > 0 && (
                                                    <div className="df-diag-price">
                                                        <span className="df-price-label">{d.price.toLocaleString()} so'm</span>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="df-empty-category">
                                        <Layers size={40} />
                                        <p>Bu kategoriyada analizlar topilmadi</p>
                                    </div>
                                )}
                            </div>
                            </div>
                            )} {/* end search else */}

                            {/* Bottom bar */}
                            <div className="df-bottom-bar">
                                <div className="df-bottom-info">
                                    <span><strong>{formData.diagnoses.length}</strong> ta analiz tanlandi</span>
                                    <span className="df-bottom-total">Jami: <strong>{totalDiagnoses.toLocaleString()} so'm</strong></span>
                                </div>
                                <div className="df-bottom-actions">
                                    <button className="df-btn secondary" onClick={() => navigate(`${getBasePath()}/patients`)}>
                                        Bekor qilish
                                    </button>
                                    <button
                                        className="df-btn primary"
                                        disabled={formData.diagnoses.length === 0}
                                        onClick={() => setStep(2)}
                                    >
                                        Keyingi <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: To'lov */}
                    {step === 2 && (
                        <div className="df-section">
                            <div className="df-section-header">
                                <h2>To'lov</h2>
                                <p>To'lov ma'lumotlarini tasdiqlang</p>
                            </div>

                            <div className="df-payment-box">
                                {(formData.diagnoses.length > 0 || Object.keys(hiddenCatSelections).length > 0) && (
                                    <div className="df-pay-section">
                                        <div className="df-pay-section-title">Yo'nalishlar</div>
                                        {/* Yashirin kategoriyalar */}
                                        {Object.entries(hiddenCatSelections).map(([catId, price]) => {
                                            const cat = categoriesList.find(c => c._id === catId)
                                            return (
                                                <div key={catId} className="df-pay-row">
                                                    <span>{cat?.name || catId}</span>
                                                    <strong>{(price || 0).toLocaleString()} so'm</strong>
                                                </div>
                                            )
                                        })}
                                        {/* Oddiy analizlar (yashirin kategoriyalarga tegishlilari chiqarilmaydi) */}
                                        {formData.diagnoses.filter(d => {
                                            const diagEntry = diagnosesList.find(x => x._id === d.diagnosisId)
                                            const catId = (diagEntry?.category?._id || diagEntry?.category)?.toString()
                                            return !catId || !(catId in hiddenCatSelections)
                                        }).map((d, i) => (
                                            <div key={i} className="df-pay-row">
                                                <span>{d.diagnosisName}</span>
                                                <strong>{(d.price || 0).toLocaleString()} so'm</strong>
                                            </div>
                                        ))}
                                        <div className="df-pay-subtotal">
                                            <span>Jami yo'nalishlar</span>
                                            <span>{totalDiagnoses.toLocaleString()} so'm</span>
                                        </div>
                                    </div>
                                )}

                                <div className="df-pay-row discount">
                                    <span>Chegirma</span>
                                    <div className="df-discount-input">
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            value={paymentData.discountPercent || ''}
                                            onChange={e => {
                                                const percent = clampDiscountPercent(e.target.value)
                                                setPaymentData({
                                                    ...paymentData,
                                                    discountPercent: percent,
                                                    discount: calculateDiscountAmount(totalDiagnoses, percent)
                                                })
                                            }}
                                            min="0"
                                            max="100"
                                            step="0.1"
                                        />
                                        <span>%</span>
                                        {paymentData.discount > 0 && (
                                            <span style={{ color: '#ef4444', fontWeight: '600', marginLeft: '10px' }}>
                                                (-{paymentData.discount.toLocaleString()} so'm)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="df-pay-total">
                                    <span>JAMI TO'LOV</span>
                                    <span>{grandTotal.toLocaleString()} so'm</span>
                                </div>
                            </div>

                            <div className="df-form-group">
                                <label>To'lov usuli</label>
                                <div className="df-payment-methods">
                                    {[
                                        { value: 'cash', label: "Naqd pul", icon: Banknote },
                                        { value: 'card', label: "Karta", icon: CreditCard },
                                        { value: 'transfer', label: "O'tkazma", icon: Building2 }
                                    ].map(({ value, label, icon: Icon }) => (
                                        <label key={value} className={`df-pay-method ${paymentData.paymentMethod === value ? 'selected' : ''}`}>
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value={value}
                                                checked={paymentData.paymentMethod === value}
                                                onChange={() => setPaymentData({ ...paymentData, paymentMethod: value })}
                                            />
                                            <Icon size={20} />
                                            <span>{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="df-actions">
                                <button className="df-btn secondary" onClick={() => setStep(1)}>
                                    <ArrowLeft size={18} /> Orqaga
                                </button>
                                <button className="df-btn success" onClick={handleSubmit} disabled={saving}>
                                    {saving ? (
                                        <><span className="spinner-sm"></span> Saqlanmoqda...</>
                                    ) : (
                                        <><Save size={18} /> {editDiagnosisId ? 'Yangilash' : 'Saqlash va Chop etish'}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}

export default DiagnosisForm
