import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
    Stethoscope, Save, ArrowLeft, ArrowRight,
    Check, AlertCircle, Phone, Calendar,
    CreditCard, Banknote, Building2, ChevronRight,
    CheckSquare, Square, Layers
} from 'lucide-react'
import './DiagnosisForm.css'
import logoSrc from '../../logo/logo.png'

function DiagnosisForm() {
    const { patientId } = useParams()
    const [searchParams] = useSearchParams()
    const editDiagnosisId = searchParams.get('edit') || null
    const navigate = useNavigate()
    const basePath = window.location.pathname.startsWith('/admin')
        ? '/admin'
        : window.location.pathname.startsWith('/registrator')
            ? '/registrator'
            : '/doctor'

    const [patient, setPatient] = useState(null)
    const [diagnosesList, setDiagnosesList] = useState([])
    const [categoriesList, setCategoriesList] = useState([])
    const [activeCategory, setActiveCategory] = useState(null)
    const [loading, setLoading] = useState(true)

    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({ diagnoses: [], notes: '' })
    const [paymentData, setPaymentData] = useState({ discount: 0, paymentMethod: 'cash' })
    const [hiddenCatSelections, setHiddenCatSelections] = useState({})
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        loadData()
    }, [patientId])

    const loadData = async () => {
        const token = localStorage.getItem('token')
        const headers = { 'Authorization': `Bearer ${token}` }
        try {
            const requests = [
                fetch(`/api/patients/${patientId}`, { headers }),
                fetch('/api/diagnoses', { headers }),
                fetch('/api/categories', { headers }),
            ]
            if (editDiagnosisId) {
                requests.push(fetch(`/api/patient-diagnoses/${editDiagnosisId}`, { headers }))
            }
            const results = await Promise.all(requests)
            const [patRes, diagRes, catRes, editRes] = results

            if (patRes.ok) setPatient(await patRes.json())
            let diagListData = []
            if (diagRes.ok) { diagListData = await diagRes.json(); setDiagnosesList(diagListData) }
            if (catRes.ok) {
                const cats = await catRes.json()
                setCategoriesList(cats)
                if (cats.length > 0) setActiveCategory(cats[0]._id)
            }
            // Edit rejimi: mavjud diagnozni pre-fill qilish
            if (editRes && editRes.ok) {
                const existing = await editRes.json()
                const names = (existing.diagnosisName || '').split(',').map(s => s.trim()).filter(Boolean)
                const preSelected = names.map(name => {
                    const found = diagListData.find(d => d.name === name)
                    const price = existing.diagnosisPrices?.find(p => p.name === name)?.price
                        || found?.price || 0
                    return { diagnosisId: found?._id || name, diagnosisName: name, price }
                })
                setFormData({ diagnoses: preSelected, notes: existing.notes || '' })
                setPaymentData({
                    discount: existing.discount || 0,
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
    const grandTotal = totalDiagnoses - (paymentData.discount || 0)

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
                return { diagnosisId: catId, name: cat?.name || catId, price, isCategoryPrice: true }
            })
            const body = {
                patient: patientId,
                diagnosis: formData.diagnoses[0]?.diagnosisId || null,
                diagnosisName: diagnosisNames,
                notes: formData.notes,
                diagnosisPrices: [
                    ...formData.diagnoses.map(d => ({ diagnosisId: d.diagnosisId, name: d.diagnosisName, price: d.price || 0 })),
                    ...hiddenCatEntries
                ],
                totalAmount: grandTotal,
                discount: paymentData.discount || 0,
                paymentMethod: paymentData.paymentMethod || 'cash',
            }
            const url = editDiagnosisId
                ? `/api/patient-diagnoses/${editDiagnosisId}`
                : '/api/patient-diagnoses'
            const method = editDiagnosisId ? 'PUT' : 'POST'
            const res = await fetch(url, { method, headers, body: JSON.stringify(body) })
            const data = await res.json()
            if (!res.ok) { setError(data.message || 'Xatolik'); return }

            // Yangi yaratilganda tranzaksiya saqlash
            if (!editDiagnosisId) {
                await fetch('/api/transactions', {
                    method: 'POST', headers,
                    body: JSON.stringify({
                        type: 'income', category: 'medicine_sale',
                        amount: grandTotal,
                        description: `Analiz: ${patient?.fullName} - ${diagnosisNames}`,
                        patient: patientId,
                        paymentMethod: paymentData.paymentMethod
                    })
                })
            }

            setSuccess(editDiagnosisId ? 'Analiz yangilandi!' : 'Analiz saqlandi!')
            if (!editDiagnosisId && basePath !== '/doctor') printReceipt(data)
            setTimeout(() => navigate(`${basePath}/patients`), 1500)
        } catch (e) {
            setError("Server bilan aloqa yo'q")
        } finally {
            setSaving(false)
        }
    }

    const printReceipt = (diagData) => {
        // Receipt uchun: yashirin kategoriyalar bitta qatorda, oddiy analizlar alohida
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
        const receiptLines = [...regularReceiptDiags, ...hiddenCatLines]

        const now = new Date()
        const dateStr = `${now.getDate().toString().padStart(2,'0')}.${(now.getMonth()+1).toString().padStart(2,'0')}.${now.getFullYear()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
        const birthStr = patient?.birthDate ? new Date(patient.birthDate).toLocaleDateString('uz-UZ') : ''
        const registrator = JSON.parse(localStorage.getItem('user') || '{}')
        const clinic = JSON.parse(localStorage.getItem('clinicSettings') || '{}')
        const clinicName = clinic.clinicName || 'Al-Beruniy Med'
        const clinicAddress = clinic.address || ''
        const clinicPhone = clinic.phone || ''
        const logoUrl = logoSrc

        const barcodeVal = patientId.slice(-8)

        const win = window.open('', '_blank')
        win.document.write(`<!DOCTYPE html>
<html><head><title>Chek - ${patient?.fullName}</title>
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

    ${paymentData.discount > 0 ? `<div class="discount-row">Chegirma: − ${paymentData.discount.toLocaleString()} so'm</div>` : ''}
    <div class="total-section">Umumiy summa: ${grandTotal.toLocaleString()} so'm</div>

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

    const steps = ['Analiz', "To'lov"]

    // Get diagnoses for active category
    const activeCategoryDiags = activeCategory ? getDiagnosesByCategory(activeCategory) : []
    const activeCategoryObj = categoriesList.find(c => c._id === activeCategory)
    const allSelectedInCategory = activeCategoryDiags.length > 0 && activeCategoryDiags.every(d => selectedIds.has(d._id))

    return (
        <div className="df-page">
            {/* Header */}
            <div className="df-header">
                <button className="df-back-btn" onClick={() => navigate(`${basePath}/patients`)}>
                    <ArrowLeft size={20} />
                    Orqaga
                </button>
                <div className="df-header-title">
                    <Stethoscope size={24} />
                    <h1>analiz qo'shish</h1>
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
                            <div className="df-cat-list-title">
                                <Layers size={15} />
                                Kategoriyalar
                            </div>
                            {categoriesList
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
                                            setActiveCategory(cat._id)
                                            if (cat.hideAnalyses) toggleHiddenCategory(cat)
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

                            {/* Bottom bar */}
                            <div className="df-bottom-bar">
                                <div className="df-bottom-info">
                                    <span><strong>{formData.diagnoses.length}</strong> ta analiz tanlandi</span>
                                    <span className="df-bottom-total">Jami: <strong>{totalDiagnoses.toLocaleString()} so'm</strong></span>
                                </div>
                                <div className="df-bottom-actions">
                                    <button className="df-btn secondary" onClick={() => navigate(`${basePath}/patients`)}>
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
                                            value={paymentData.discount}
                                            onChange={e => setPaymentData({ ...paymentData, discount: parseInt(e.target.value) || 0 })}
                                            min="0"
                                        />
                                        <span>so'm</span>
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
                                        <><Save size={18} /> Saqlash va Chop etish</>
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
