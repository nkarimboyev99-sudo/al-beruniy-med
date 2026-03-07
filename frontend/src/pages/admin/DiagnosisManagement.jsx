import { useState, useEffect } from 'react'
import {
    Stethoscope,
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Check,
    Save,
    AlertTriangle,
    Tag,
    Eye,
    ChevronRight,
    ArrowLeft,
    FlaskConical,
    DollarSign
} from 'lucide-react'
import './DataManagement.css'

function DiagnosisManagement() {
    const [diagnoses, setDiagnoses] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [showViewModal, setShowViewModal] = useState(false)
    const [viewingDiagnosis, setViewingDiagnosis] = useState(null)
    const [deletingDiagnosis, setDeletingDiagnosis] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [editingDiagnosis, setEditingDiagnosis] = useState(null)
    const [editingCategory, setEditingCategory] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        category: '',
        normalRanges: [],
        price: 0
    })
    const [categoryFormData, setCategoryFormData] = useState({
        name: '',
        code: '',
        description: ''
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [categoryError, setCategoryError] = useState('')
    const [categorySuccess, setCategorySuccess] = useState('')

    useEffect(() => {
        fetchDiagnoses()
        fetchCategories()
    }, [])

    const fetchDiagnoses = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/diagnoses', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                const data = await response.json()
                setDiagnoses(data)
            }
        } catch (error) {
            console.error('Error fetching diagnoses:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/categories', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                const data = await response.json()
                setCategories(data)
            }
        } catch (error) {
            console.error('Error fetching categories:', error)
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            description: '',
            category: categories[0]?._id || '',
            normalRanges: [],
            price: 0
        })
        setEditingDiagnosis(null)
        setError('')
        setSuccess('')
    }

    const resetCategoryForm = () => {
        setCategoryFormData({
            name: '',
            code: '',
            description: ''
        })
        setEditingCategory(null)
        setCategoryError('')
        setCategorySuccess('')
    }

    const openCategoryModal = (category = null) => {
        if (category) {
            setEditingCategory(category)
            setCategoryFormData({
                name: category.name,
                code: category.code || '',
                description: category.description || ''
            })
        } else {
            resetCategoryForm()
        }
        setShowCategoryModal(true)
    }

    const handleCategorySubmit = async (e) => {
        e.preventDefault()
        setCategoryError('')
        setCategorySuccess('')

        try {
            const token = localStorage.getItem('token')
            const url = editingCategory
                ? `/api/categories/${editingCategory._id}`
                : '/api/categories'
            const method = editingCategory ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(categoryFormData)
            })

            const data = await response.json()

            if (response.ok) {
                setCategorySuccess(editingCategory
                    ? 'Kategoriya yangilandi!'
                    : 'Kategoriya qo\'shildi!')
                fetchCategories()
                setTimeout(() => {
                    setShowCategoryModal(false)
                    resetCategoryForm()
                }, 1000)
            } else {
                setCategoryError(data.message || 'Xatolik yuz berdi')
            }
        } catch (error) {
            setCategoryError('Server bilan aloqa yo\'q')
        }
    }

    const handleDeleteCategory = async (categoryId) => {
        if (!confirm('Bu kategoriyani o\'chirmoqchimisiz?')) return

        try {
            const token = localStorage.getItem('token')
            await fetch(`/api/categories/${categoryId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            fetchCategories()
        } catch (error) {
            console.error('Delete category error:', error)
        }
    }

    const openAddModal = () => {
        resetForm()
        setShowModal(true)
    }

    const openEditModal = (diagnosis) => {
        setEditingDiagnosis(diagnosis)
        setFormData({
            name: diagnosis.name || '',
            code: diagnosis.code || '',
            description: diagnosis.description || '',
            category: diagnosis.category || 'blood',
            normalRanges: diagnosis.normalRanges || [],
            price: diagnosis.price || 0
        })
        setError('')
        setSuccess('')
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        try {
            const token = localStorage.getItem('token')
            const url = editingDiagnosis
                ? `/api/diagnoses/${editingDiagnosis._id}`
                : '/api/diagnoses'
            const method = editingDiagnosis ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    normalRanges: formData.normalRanges.map(r => ({
                        ...r,
                        ageMin: r.ageMin === '' || r.ageMin === null || r.ageMin === undefined ? 0 : Number(r.ageMin),
                        ageMax: r.ageMax === '' || r.ageMax === null || r.ageMax === undefined ? 999 : Number(r.ageMax)
                    }))
                })
            })

            const data = await response.json()

            if (response.ok) {
                setSuccess(editingDiagnosis
                    ? 'Analiz muvaffaqiyatli yangilandi!'
                    : 'Analiz muvaffaqiyatli qo\'shildi!')
                fetchDiagnoses()
                setTimeout(() => {
                    setShowModal(false)
                    resetForm()
                }, 1500)
            } else {
                setError(data.message || 'Xatolik yuz berdi')
            }
        } catch (error) {
            setError('Server bilan aloqa yo\'q')
        }
    }

    const openDeleteModal = (diagnosis) => {
        setDeletingDiagnosis(diagnosis)
        setShowDeleteModal(true)
    }

    const closeDeleteModal = () => {
        setDeletingDiagnosis(null)
        setShowDeleteModal(false)
        setDeleteLoading(false)
    }

    const confirmDelete = async () => {
        if (!deletingDiagnosis) return

        setDeleteLoading(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/diagnoses/${deletingDiagnosis._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                fetchDiagnoses()
                closeDeleteModal()
            } else {
                const data = await response.json()
                setError(data.message || 'O\'chirishda xatolik yuz berdi')
                setDeleteLoading(false)
            }
        } catch (error) {
            console.error('Error deleting diagnosis:', error)
            setError('Server bilan aloqa yo\'q')
            setDeleteLoading(false)
        }
    }

    const getCategoryLabel = (categoryId) => {
        const cat = categories.find(c => c._id === categoryId)
        return cat?.name || categoryId || '-'
    }

    const getCategoryCount = (categoryId) => {
        return diagnoses.filter(d => d.category === categoryId).length
    }

    const catColors = [
        { bg: '#eff6ff', border: '#bfdbfe', icon: '#2563eb', badge: '#dbeafe', text: '#1d4ed8' },
        { bg: '#f0fdf4', border: '#bbf7d0', icon: '#16a34a', badge: '#dcfce7', text: '#15803d' },
        { bg: '#fdf4ff', border: '#e9d5ff', icon: '#9333ea', badge: '#f3e8ff', text: '#7e22ce' },
        { bg: '#fff7ed', border: '#fed7aa', icon: '#ea580c', badge: '#ffedd5', text: '#c2410c' },
        { bg: '#f0f9ff', border: '#bae6fd', icon: '#0284c7', badge: '#e0f2fe', text: '#0369a1' },
        { bg: '#fff1f2', border: '#fecdd3', icon: '#e11d48', badge: '#ffe4e6', text: '#be123c' },
        { bg: '#fffbeb', border: '#fde68a', icon: '#d97706', badge: '#fef3c7', text: '#b45309' },
        { bg: '#ecfdf5', border: '#a7f3d0', icon: '#059669', badge: '#d1fae5', text: '#047857' },
    ]

    const filteredDiagnoses = diagnoses.filter(d => {
        const matchSearch = d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.code?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchCat = selectedCategory ? d.category === selectedCategory._id : true
        return matchSearch && matchCat
    })

    const formatPrice = (price) => price ? new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m' : '-'

    // Yosh-norma helpers
    const addNormaRow = () => {
        setFormData(prev => {
            const last = prev.normalRanges[prev.normalRanges.length - 1]
            const nextMin = last && last.ageMax !== '' && last.ageMax !== undefined
                ? String(parseInt(last.ageMax) + 1)
                : ''
            return {
                ...prev,
                normalRanges: [...prev.normalRanges, { ageMin: nextMin, ageMax: '', gender: 'both', range: '', unit: '', price: 0 }]
            }
        })
    }
    const removeNormaRow = (idx) => {
        setFormData(prev => ({
            ...prev,
            normalRanges: prev.normalRanges.filter((_, i) => i !== idx)
        }))
    }
    const updateNormaRow = (idx, field, value) => {
        setFormData(prev => {
            const updated = prev.normalRanges.map((r, i) => i === idx ? { ...r, [field]: value } : r)
            if (field === 'ageMax' && updated[idx + 1] !== undefined) {
                const nextMin = value !== '' ? parseInt(value) + 1 : ''
                updated[idx + 1] = { ...updated[idx + 1], ageMin: nextMin === '' ? '' : String(nextMin) }
            }
            return { ...prev, normalRanges: updated }
        })
    }
    const getNormaForAge = (normalRanges, ageYears) => {
        if (!normalRanges || !normalRanges.length || ageYears === null) return ''
        const match = normalRanges.find(r => {
            const min = r.ageMin !== '' && r.ageMin !== null && r.ageMin !== undefined ? Number(r.ageMin) : 0
            const max = r.ageMax !== '' && r.ageMax !== null && r.ageMax !== undefined ? Number(r.ageMax) : Infinity
            return ageYears >= min && ageYears <= max
        })
        if (!match) return ''
        return match.unit ? `${match.range} ${match.unit}` : match.range
    }

    return (
        <div className="data-management-page">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    {selectedCategory ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <button
                                    onClick={() => { setSelectedCategory(null); setSearchTerm('') }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.88rem', padding: 0 }}
                                >
                                    <ArrowLeft size={16} /> Analizlar
                                </button>
                                <ChevronRight size={14} style={{ color: '#d1d5db' }} />
                                <span style={{ fontSize: '0.88rem', color: '#374151', fontWeight: 600 }}>{selectedCategory.name}</span>
                            </div>
                            <h1>{selectedCategory.name}</h1>
                            <p>{getCategoryCount(selectedCategory._id)} ta analiz</p>
                        </>
                    ) : (
                        <>
                            <h1>Analizlar</h1>
                            <p>Kategoriya tanlang yoki qidiring</p>
                        </>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary" onClick={() => openCategoryModal()}>
                        <Tag size={18} />
                        Kategoriyalar
                    </button>
                    <button className="btn btn-primary" onClick={openAddModal}>
                        <Plus size={18} />
                        Yangi analiz
                    </button>
                </div>
            </div>

            {/* Category Grid — only when no category selected and no search */}
            {!selectedCategory && !searchTerm && (
                <div className="dm-category-grid">
                    {loading ? (
                        <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'center', padding: '60px' }}>
                            <div className="spinner"></div>
                        </div>
                    ) : categories.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                            <Tag size={40} style={{ marginBottom: '12px' }} />
                            <p>Hali kategoriyalar yo'q. "Kategoriyalar" tugmasi orqali qo'shing.</p>
                        </div>
                    ) : (
                        categories.map((cat, i) => {
                            const color = catColors[i % catColors.length]
                            const count = getCategoryCount(cat._id)
                            return (
                                <div
                                    key={cat._id}
                                    className="dm-cat-card"
                                    style={{ '--cat-bg': color.bg, '--cat-border': color.border, '--cat-icon': color.icon, '--cat-badge': color.badge, '--cat-text': color.text }}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    <div className="dm-cat-icon">
                                        <FlaskConical size={26} />
                                    </div>
                                    <div className="dm-cat-info">
                                        <h3>{cat.name}</h3>
                                        {cat.code && <code>{cat.code}</code>}
                                        {cat.description && <p>{cat.description}</p>}
                                    </div>
                                    <div className="dm-cat-footer">
                                        <span className="dm-cat-count">{count} ta analiz</span>
                                        <ChevronRight size={16} className="dm-cat-arrow" />
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {/* Search bar — always visible */}
            <div className="toolbar glass-card" style={{ marginBottom: '20px' }}>
                <div className="search-input">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder={selectedCategory ? `${selectedCategory.name} ichida qidirish...` : 'Barcha analizlardan qidirish...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}>
                            <X size={16} />
                        </button>
                    )}
                </div>
                <div className="toolbar-info">
                    <Stethoscope size={16} />
                    <span>{(selectedCategory || searchTerm) ? `${filteredDiagnoses.length} ta` : `Jami: ${diagnoses.length} ta`}</span>
                </div>
            </div>

            {/* Diagnoses Cards — shown when category selected or searching */}
            {(selectedCategory || searchTerm) && (
                <div className="dm-diagnosis-grid">
                    {loading ? (
                        <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'center', padding: '60px' }}>
                            <div className="spinner"></div>
                        </div>
                    ) : filteredDiagnoses.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                            <Stethoscope size={40} style={{ marginBottom: '12px' }} />
                            <p>Analizlar topilmadi</p>
                        </div>
                    ) : (
                        filteredDiagnoses.map((diagnosis, index) => {
                            const catIdx = categories.findIndex(c => c._id === diagnosis.category)
                            const color = catColors[(catIdx >= 0 ? catIdx : index) % catColors.length]
                            return (
                                <div key={diagnosis._id} className="dm-diagnosis-card">
                                    <div className="dm-dx-header">
                                        <div className="dm-dx-num" style={{ background: color.badge, color: color.text }}>
                                            {index + 1}
                                        </div>
                                        {diagnosis.code && (
                                            <code className="dm-dx-code" style={{ background: color.badge, color: color.text }}>
                                                {diagnosis.code}
                                            </code>
                                        )}
                                        <div className="dm-dx-actions">
                                            <button className="action-btn view" title="Ko'rish" onClick={() => { setViewingDiagnosis(diagnosis); setShowViewModal(true) }}>
                                                <Eye size={14} />
                                            </button>
                                            <button className="action-btn edit" title="Tahrirlash" onClick={() => openEditModal(diagnosis)}>
                                                <Edit2 size={14} />
                                            </button>
                                            <button className="action-btn delete" title="O'chirish" onClick={() => openDeleteModal(diagnosis)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="dm-dx-body">
                                        <h4>{diagnosis.name}</h4>
                                        {diagnosis.description && <p>{diagnosis.description}</p>}
                                    </div>
                                    <div className="dm-dx-footer">
                                        {!selectedCategory && (
                                            <span className="dm-dx-cat" style={{ background: color.badge, color: color.text }}>
                                                {getCategoryLabel(diagnosis.category)}
                                            </span>
                                        )}
                                        {diagnosis.normalRanges && diagnosis.normalRanges.length > 0 && (
                                            <span className="dm-dx-norma" title="Yoshga qarab normalar mavjud">
                                                {diagnosis.normalRanges.length} ta norma
                                            </span>
                                        )}
                                        {diagnosis.price > 0 && (
                                            <span className="dm-dx-price">
                                                <DollarSign size={13} />
                                                {formatPrice(diagnosis.price)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {/* View Diagnosis Modal */}
            {showViewModal && viewingDiagnosis && (
                <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
                        <div className="modal-header">
                            <h2>Analiz ma'lumotlari</h2>
                            <button className="modal-close" onClick={() => setShowViewModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="diagnosis-view-content">
                            <div className="diagnosis-view-header">
                                <div className="diagnosis-icon">
                                    <Stethoscope size={32} />
                                </div>
                                <div className="diagnosis-view-name">
                                    <h3>{viewingDiagnosis.name}</h3>
                                    <code>{viewingDiagnosis.code || '-'}</code>
                                </div>
                            </div>

                            <div className="diagnosis-view-details">
                                <div className="diagnosis-detail-item">
                                    <span className="detail-label">Kategoriya:</span>
                                    <span className={`category-badge ${viewingDiagnosis.category}`}>
                                        {getCategoryLabel(viewingDiagnosis.category)}
                                    </span>
                                </div>
                                {viewingDiagnosis.price > 0 && (
                                    <div className="diagnosis-detail-item">
                                        <span className="detail-label">Narxi:</span>
                                        <span style={{ color: '#059669', fontWeight: 600 }}>{formatPrice(viewingDiagnosis.price)}</span>
                                    </div>
                                )}
                                {viewingDiagnosis.normalRanges && viewingDiagnosis.normalRanges.length > 0 && (
                                    <div className="diagnosis-detail-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                                        <span className="detail-label">Yoshga qarab normalar:</span>
                                        <table className="norma-view-table">
                                            <thead>
                                                <tr>
                                                    <th>Yosh</th>
                                                    <th>Jins</th>
                                                    <th>Norma</th>
                                                    <th>Birlik</th>
                                                    <th>Narx</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {viewingDiagnosis.normalRanges.map((r, i) => (
                                                    <tr key={i}>
                                                        <td>{r.ageMin ?? 0} – {r.ageMax != null && r.ageMax !== '' ? r.ageMax : '∞'} yosh</td>
                                                        <td>{r.gender === 'male' ? 'Erkak' : r.gender === 'female' ? 'Ayol' : 'Ikkalasi'}</td>
                                                        <td><strong>{r.range}</strong></td>
                                                        <td>{r.unit || '—'}</td>
                                                        <td>{r.price > 0 ? new Intl.NumberFormat('uz-UZ').format(r.price) + ' so\'m' : '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {viewingDiagnosis.description && (
                                    <div className="diagnosis-detail-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                                        <span className="detail-label">Tavsif:</span>
                                        <span style={{ color: '#6b7280' }}>{viewingDiagnosis.description}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                                Yopish
                            </button>
                            <button className="btn btn-primary" onClick={() => { setShowViewModal(false); openEditModal(viewingDiagnosis); }}>
                                <Edit2 size={18} />
                                Tahrirlash
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Diagnosis Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingDiagnosis ? 'Analizni tahrirlash' : 'Yangi analiz'}</h2>
                            <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-form">
                            {error && <div className="alert error">{error}</div>}
                            {success && <div className="alert success"><Check size={18} /> {success}</div>}

                            <div className="form-group">
                                <label className="form-label">Analiz nomi *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Analiz nomini kiriting"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Kod</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="ICD kodi"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Kategoriya *</label>
                                    <select
                                        className="form-input"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        required
                                    >
                                        <option value="">Kategoriya tanlang</option>
                                        {categories.map(cat => (
                                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Narxi (so'm)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="0"
                                    min="0"
                                    step="1000"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="form-group">
                                <div className="norma-label-row">
                                    <label className="form-label" style={{ margin: 0 }}>Yoshga qarab normalar</label>
                                    <button type="button" className="norma-add-btn" onClick={addNormaRow}>
                                        <Plus size={14} /> Qo'shish
                                    </button>
                                </div>

                                {formData.normalRanges.length === 0 ? (
                                    <div className="norma-empty" onClick={addNormaRow}>
                                        + Yosh oralig'i va norma qo'shing
                                    </div>
                                ) : (
                                    <div className="norma-table-wrap">
                                        <table className="norma-table">
                                            <thead>
                                                <tr>
                                                    <th>Min yosh</th>
                                                    <th>Max yosh</th>
                                                    <th>Jins</th>
                                                    <th>Norma qiymat</th>
                                                    <th>Birlik</th>
                                                    <th>Narx (so'm)</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.normalRanges.map((row, idx) => (
                                                    <tr key={idx}>
                                                        <td>
                                                            {(() => {
                                                                const prevRow = formData.normalRanges[idx - 1]
                                                                const isLocked = idx > 0 && prevRow && prevRow.gender === 'both'
                                                                return (
                                                                    <input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        className="norma-cell-input"
                                                                        placeholder="0"
                                                                        maxLength={3}
                                                                        value={row.ageMin}
                                                                        readOnly={isLocked}
                                                                        style={isLocked ? { background: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' } : {}}
                                                                        onChange={isLocked ? undefined : e => {
                                                                            const val = e.target.value.replace(/\D/g, '').slice(0, 3)
                                                                            updateNormaRow(idx, 'ageMin', val)
                                                                        }}
                                                                    />
                                                                )
                                                            })()}
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                className="norma-cell-input"
                                                                placeholder="∞"
                                                                maxLength={3}
                                                                value={row.ageMax}
                                                                onChange={e => {
                                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 3)
                                                                    updateNormaRow(idx, 'ageMax', val)
                                                                }}
                                                            />
                                                        </td>
                                                        <td>
                                                            <select
                                                                className="norma-cell-input norma-gender-select"
                                                                value={row.gender || 'both'}
                                                                onChange={e => updateNormaRow(idx, 'gender', e.target.value)}
                                                            >
                                                                <option value="both">Ikkalasi</option>
                                                                <option value="male">Erkak</option>
                                                                <option value="female">Ayol</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                className="norma-cell-input wide"
                                                                placeholder="3.5–5.0"
                                                                value={row.range}
                                                                onChange={e => updateNormaRow(idx, 'range', e.target.value)}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                className="norma-cell-input"
                                                                placeholder="mmol/L"
                                                                value={row.unit}
                                                                onChange={e => updateNormaRow(idx, 'unit', e.target.value)}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                className="norma-cell-input"
                                                                placeholder="0"
                                                                value={row.price || 0}
                                                                onChange={e => {
                                                                    const val = e.target.value.replace(/\D/g, '')
                                                                    updateNormaRow(idx, 'price', parseInt(val) || 0)
                                                                }}
                                                            />
                                                        </td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="norma-del-btn"
                                                                onClick={() => removeNormaRow(idx)}
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Tavsif</label>
                                <textarea
                                    className="form-input"
                                    placeholder="Analiz tavsifi"
                                    rows="3"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                                    Bekor qilish
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingDiagnosis ? (
                                        <>
                                            <Save size={20} />
                                            Saqlash
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={20} />
                                            Qo'shish
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && deletingDiagnosis && (
                <div className="modal-overlay" onClick={closeDeleteModal}>
                    <div className="modal glass-card delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-content">
                            <div className="delete-icon">
                                <AlertTriangle size={48} />
                            </div>
                            <h3>O'chirishni tasdiqlang</h3>
                            <p>
                                <strong>"{deletingDiagnosis.name}"</strong> analizini o'chirishni xohlaysizmi?
                            </p>
                            <p className="delete-warning">
                                Bu amalni ortga qaytarib bo'lmaydi!
                            </p>
                            <div className="delete-modal-actions">
                                <button
                                    className="btn btn-secondary"
                                    onClick={closeDeleteModal}
                                    disabled={deleteLoading}
                                >
                                    Bekor qilish
                                </button>
                                <button
                                    className="btn btn-danger"
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
                                            <Trash2 size={18} />
                                            Ha, o'chirish
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Management Modal */}
            {showCategoryModal && (
                <div className="modal-overlay" onClick={() => { setShowCategoryModal(false); resetCategoryForm(); }}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>Kategoriyalarni boshqarish</h2>
                            <button className="modal-close" onClick={() => { setShowCategoryModal(false); resetCategoryForm(); }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ padding: '20px' }}>
                            {/* Category List */}
                            <div style={{ marginBottom: '20px' }}>
                                <h3 style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                                    Mavjud kategoriyalar ({categories.length})
                                </h3>
                                {categories.length === 0 ? (
                                    <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>
                                        Hali kategoriya yo'q
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {categories.map(cat => (
                                            <div key={cat._id} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 12px',
                                                background: '#f1f5f9',
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0',
                                                color: '#374151'
                                            }}>
                                                <span>{cat.name}</span>
                                                <button
                                                    onClick={() => openCategoryModal(cat)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-500)', padding: '4px' }}
                                                    title="Tahrirlash"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCategory(cat._id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                                                    title="O'chirish"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Add/Edit Category Form */}
                            <form onSubmit={handleCategorySubmit} style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                                <h3 style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                                    {editingCategory ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya qo\'shish'}
                                </h3>

                                {categoryError && <div className="alert error">{categoryError}</div>}
                                {categorySuccess && <div className="alert success"><Check size={18} /> {categorySuccess}</div>}

                                <div className="form-group">
                                    <label className="form-label">Kategoriya nomi *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Masalan: Qon tahlili"
                                        value={categoryFormData.name}
                                        onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Kod</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Masalan: BLOOD"
                                            value={categoryFormData.code}
                                            onChange={(e) => setCategoryFormData({ ...categoryFormData, code: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tavsif</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Qisqa tavsif"
                                            value={categoryFormData.description}
                                            onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                    {editingCategory && (
                                        <button type="button" className="btn btn-secondary" onClick={resetCategoryForm}>
                                            Bekor qilish
                                        </button>
                                    )}
                                    <button type="submit" className="btn btn-primary">
                                        {editingCategory ? (
                                            <>
                                                <Save size={18} />
                                                Saqlash
                                            </>
                                        ) : (
                                            <>
                                                <Plus size={18} />
                                                Qo'shish
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                /* Wider Modal for Desktop */
                .modal {
                    max-width: 700px !important;
                    width: 90vw;
                }
                
                @media (max-width: 768px) {
                    .modal {
                        max-width: 95vw !important;
                    }
                }

                /* Delete Modal Styles */
                .delete-modal {
                    max-width: 420px;
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
                    color: #111827;
                }
                .delete-modal p {
                    margin: 0 0 var(--space-sm) 0;
                    color: #6b7280;
                }
                .delete-modal p strong {
                    color: #111827;
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
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
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
            `}</style>
        </div>
    )
}

export default DiagnosisManagement
