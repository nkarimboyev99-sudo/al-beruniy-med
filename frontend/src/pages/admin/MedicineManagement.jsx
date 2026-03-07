import { useState, useEffect, useRef } from 'react'
import {
    Pill,
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Check,
    Save,
    AlertTriangle,
    Upload,
    Image
} from 'lucide-react'
import './DataManagement.css'

function MedicineManagement() {
    const [medicines, setMedicines] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletingMedicine, setDeletingMedicine] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [editingMedicine, setEditingMedicine] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [formData, setFormData] = useState({
        name: '',
        genericName: '',
        dosage: '',
        form: 'tablet',
        instructions: '',
        sideEffects: ''
    })
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const fileInputRef = useRef(null)

    useEffect(() => {
        fetchMedicines()
    }, [])

    const fetchMedicines = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/medicines', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                const data = await response.json()
                setMedicines(data)
            }
        } catch (error) {
            console.error('Error fetching medicines:', error)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            genericName: '',
            dosage: '',
            form: 'tablet',
            instructions: '',
            sideEffects: ''
        })
        setEditingMedicine(null)
        setImageFile(null)
        setImagePreview(null)
        setError('')
        setSuccess('')
    }

    const openAddModal = () => {
        resetForm()
        setShowModal(true)
    }

    const openEditModal = (medicine) => {
        setEditingMedicine(medicine)
        setFormData({
            name: medicine.name || '',
            genericName: medicine.genericName || '',
            dosage: medicine.dosage || '',
            form: medicine.form || 'tablet',
            instructions: medicine.instructions || '',
            sideEffects: medicine.sideEffects || ''
        })
        setImageFile(null)
        // Set existing image as preview
        if (medicine.image) {
            setImagePreview(medicine.image)
        } else {
            setImagePreview(null)
        }
        setError('')
        setSuccess('')
        setShowModal(true)
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
            if (!allowedTypes.includes(file.type)) {
                setError('Faqat rasm fayllari yuklash mumkin (jpeg, png, gif, webp)')
                return
            }
            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Rasm hajmi 5MB dan oshmasligi kerak')
                return
            }
            setImageFile(file)
            // Create preview
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result)
            }
            reader.readAsDataURL(file)
            setError('')
        }
    }

    const removeImage = () => {
        setImageFile(null)
        setImagePreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setSubmitting(true)

        try {
            const token = localStorage.getItem('token')
            const url = editingMedicine
                ? `/api/medicines/${editingMedicine._id}`
                : '/api/medicines'
            const method = editingMedicine ? 'PUT' : 'POST'

            // Use FormData for file upload
            const submitData = new FormData()
            submitData.append('name', formData.name)
            submitData.append('genericName', formData.genericName)
            submitData.append('dosage', formData.dosage)
            submitData.append('form', formData.form)
            submitData.append('instructions', formData.instructions)
            submitData.append('sideEffects', formData.sideEffects)

            if (imageFile) {
                submitData.append('image', imageFile)
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: submitData
            })

            const data = await response.json()

            if (response.ok) {
                setSuccess(editingMedicine
                    ? 'Dori muvaffaqiyatli yangilandi!'
                    : 'Dori muvaffaqiyatli qo\'shildi!')
                fetchMedicines()
                setTimeout(() => {
                    setShowModal(false)
                    resetForm()
                }, 1500)
            } else {
                setError(data.message || 'Xatolik yuz berdi')
            }
        } catch (error) {
            setError('Server bilan aloqa yo\'q')
        } finally {
            setSubmitting(false)
        }
    }

    const openDeleteModal = (medicine) => {
        setDeletingMedicine(medicine)
        setShowDeleteModal(true)
    }

    const closeDeleteModal = () => {
        setDeletingMedicine(null)
        setShowDeleteModal(false)
        setDeleteLoading(false)
    }

    const confirmDelete = async () => {
        if (!deletingMedicine) return

        setDeleteLoading(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/medicines/${deletingMedicine._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                fetchMedicines()
                closeDeleteModal()
            } else {
                const data = await response.json()
                setError(data.message || 'O\'chirishda xatolik yuz berdi')
                setDeleteLoading(false)
            }
        } catch (error) {
            console.error('Error deleting medicine:', error)
            setError('Server bilan aloqa yo\'q')
            setDeleteLoading(false)
        }
    }

    const filteredMedicines = medicines.filter(m =>
        m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.genericName?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getFormLabel = (form) => {
        const forms = {
            tablet: 'Tabletka',
            capsule: 'Kapsula',
            syrup: 'Sirop',
            injection: 'In\'ektsiya',
            cream: 'Krem',
            drops: 'Tomchi',
            other: 'Boshqa'
        }
        return forms[form] || form
    }

    return (
        <div className="data-management-page">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1>Dorilar</h1>
                    <p>Dorilar ro'yxatini boshqarish</p>
                </div>
                <button className="btn btn-primary" onClick={openAddModal}>
                    <Plus size={20} />
                    Yangi dori
                </button>
            </div>

            {/* Search and Filter */}
            <div className="toolbar glass-card">
                <div className="search-input">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Qidirish..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="toolbar-info">
                    <Pill size={18} />
                    <span>Jami: {medicines.length} ta</span>
                </div>
            </div>

            {/* Medicines Grid */}
            <div className="medicines-grid-container">
                {loading ? (
                    <div className="loading-state glass-card">
                        <div className="spinner"></div>
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : filteredMedicines.length === 0 ? (
                    <div className="empty-state glass-card">
                        <Pill size={48} />
                        <h3>Dorilar topilmadi</h3>
                        <p>Yangi dori qo'shish uchun "Yangi dori" tugmasini bosing</p>
                    </div>
                ) : (
                    <div className="medicines-grid">
                        {filteredMedicines.map((medicine) => (
                            <div key={medicine._id} className="medicine-card glass-card">
                                <div className="medicine-image">
                                    {medicine.image ? (
                                        <img src={medicine.image} alt={medicine.name} />
                                    ) : (
                                        <div className="medicine-placeholder">
                                            <Pill size={48} />
                                        </div>
                                    )}
                                    <span className="medicine-form-badge">
                                        {getFormLabel(medicine.form)}
                                    </span>
                                </div>
                                <div className="medicine-info">
                                    <h3>{medicine.name}</h3>
                                    {medicine.genericName && (
                                        <p className="medicine-generic">{medicine.genericName}</p>
                                    )}
                                    {medicine.dosage && (
                                        <span className="medicine-dosage">{medicine.dosage}</span>
                                    )}
                                    {medicine.instructions && (
                                        <p className="medicine-instructions">{medicine.instructions}</p>
                                    )}
                                </div>
                                <div className="medicine-actions">
                                    <button
                                        className="action-btn edit"
                                        title="Tahrirlash"
                                        onClick={() => openEditModal(medicine)}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className="action-btn delete"
                                        title="O'chirish"
                                        onClick={() => openDeleteModal(medicine)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Medicine Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingMedicine ? 'Dorini tahrirlash' : 'Yangi dori'}</h2>
                            <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-form">
                            {error && <div className="alert error">{error}</div>}
                            {success && <div className="alert success"><Check size={18} /> {success}</div>}

                            {/* Image Upload */}
                            <div className="form-group">
                                <label className="form-label">Dori rasmi</label>
                                <div className="image-upload-area">
                                    {imagePreview ? (
                                        <div className="image-preview">
                                            <img src={imagePreview} alt="Preview" />
                                            <button type="button" className="remove-image" onClick={removeImage}>
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="upload-placeholder" onClick={() => fileInputRef.current?.click()}>
                                            <Upload size={32} />
                                            <span>Rasm yuklash uchun bosing</span>
                                            <small>JPEG, PNG, GIF, WebP (max 5MB)</small>
                                        </div>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                        onChange={handleImageChange}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Dori nomi *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Dori nomini kiriting"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Umumiy nomi</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Generic name"
                                        value={formData.genericName}
                                        onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Dozasi</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="500mg"
                                        value={formData.dosage}
                                        onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Dori shakli *</label>
                                <select
                                    className="form-input"
                                    value={formData.form}
                                    onChange={(e) => setFormData({ ...formData, form: e.target.value })}
                                >
                                    <option value="tablet">Tabletka</option>
                                    <option value="capsule">Kapsula</option>
                                    <option value="syrup">Sirop</option>
                                    <option value="injection">In'ektsiya</option>
                                    <option value="cream">Krem</option>
                                    <option value="drops">Tomchi</option>
                                    <option value="other">Boshqa</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Qo'llash bo'yicha ko'rsatma</label>
                                <textarea
                                    className="form-input"
                                    placeholder="Qanday qo'llanilishi haqida"
                                    rows="2"
                                    value={formData.instructions}
                                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Yon ta'sirlari</label>
                                <textarea
                                    className="form-input"
                                    placeholder="Yon ta'sirlari (agar bo'lsa)"
                                    rows="2"
                                    value={formData.sideEffects}
                                    onChange={(e) => setFormData({ ...formData, sideEffects: e.target.value })}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                                    Bekor qilish
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <span className="spinner-sm"></span>
                                            Saqlanmoqda...
                                        </>
                                    ) : editingMedicine ? (
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
            {showDeleteModal && deletingMedicine && (
                <div className="modal-overlay" onClick={closeDeleteModal}>
                    <div className="modal glass-card delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-content">
                            <div className="delete-icon">
                                <AlertTriangle size={48} />
                            </div>
                            <h3>O'chirishni tasdiqlang</h3>
                            <p>
                                <strong>"{deletingMedicine.name}"</strong> dorini o'chirishni xohlaysizmi?
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

            <style>{`
                /* Medicines Grid Layout */
                .medicines-grid-container {
                    margin-top: var(--space-lg);
                }
                .medicines-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: var(--space-lg);
                }
                .medicine-card {
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .medicine-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
                }
                .medicine-image {
                    position: relative;
                    height: 180px;
                    background: linear-gradient(135deg, rgba(114, 46, 209, 0.1), rgba(24, 144, 255, 0.1));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }
                .medicine-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .medicine-placeholder {
                    color: var(--text-muted);
                    opacity: 0.5;
                }
                .medicine-form-badge {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    padding: 4px 10px;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(10px);
                    border-radius: var(--radius-full);
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: white;
                }
                .medicine-info {
                    padding: var(--space-md);
                    flex: 1;
                }
                .medicine-info h3 {
                    margin: 0 0 var(--space-xs) 0;
                    font-size: 1rem;
                    color: var(--text-primary);
                }
                .medicine-generic {
                    margin: 0 0 var(--space-sm) 0;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                }
                .medicine-dosage {
                    display: inline-block;
                    padding: 2px 8px;
                    background: rgba(24, 144, 255, 0.15);
                    color: var(--primary-400);
                    border-radius: var(--radius-sm);
                    font-size: 0.75rem;
                    font-weight: 600;
                    margin-bottom: var(--space-sm);
                }
                .medicine-instructions {
                    margin: var(--space-sm) 0 0 0;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .medicine-actions {
                    display: flex;
                    gap: var(--space-sm);
                    padding: var(--space-md);
                    border-top: 1px solid var(--border-color);
                }
                .medicine-actions .action-btn {
                    flex: 1;
                    justify-content: center;
                }

                /* Image Upload */
                .image-upload-area {
                    border: 2px dashed var(--border-color);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    transition: border-color 0.2s;
                }
                .image-upload-area:hover {
                    border-color: var(--primary-500);
                }
                .upload-placeholder {
                    padding: var(--space-xl);
                    text-align: center;
                    cursor: pointer;
                    color: var(--text-muted);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: var(--space-sm);
                    transition: color 0.2s;
                }
                .upload-placeholder:hover {
                    color: var(--primary-400);
                }
                .upload-placeholder svg {
                    opacity: 0.6;
                }
                .upload-placeholder small {
                    font-size: 0.75rem;
                    opacity: 0.7;
                }
                .image-preview {
                    position: relative;
                    height: 200px;
                }
                .image-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .remove-image {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    width: 32px;
                    height: 32px;
                    background: rgba(239, 68, 68, 0.9);
                    border: none;
                    border-radius: 50%;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .remove-image:hover {
                    background: #dc2626;
                    transform: scale(1.1);
                }

                /* Modal width */
                .modal {
                    max-width: 700px !important;
                    width: 90vw;
                    max-height: 90vh;
                    overflow-y: auto;
                }

                @media (max-width: 768px) {
                    .medicines-grid {
                        grid-template-columns: 1fr;
                    }
                    .modal {
                        max-width: 95vw !important;
                    }
                }

                /* Delete Modal Styles */
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

export default MedicineManagement
