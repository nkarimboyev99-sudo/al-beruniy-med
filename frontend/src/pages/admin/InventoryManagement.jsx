import { useState, useEffect } from 'react'
import {
    Package,
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Check,
    AlertTriangle,
    TrendingDown,
    Pill,
    Save,
    Eye,
    Calendar,
    DollarSign
} from 'lucide-react'
import './DataManagement.css'

function InventoryManagement() {
    const [inventory, setInventory] = useState([])
    const [medicines, setMedicines] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showViewModal, setShowViewModal] = useState(false)
    const [viewingItem, setViewingItem] = useState(null)
    const [deletingItem, setDeletingItem] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filter, setFilter] = useState('all') // all, low, normal
    const [formData, setFormData] = useState({
        medicine: '',
        quantity: '',
        minQuantity: '10',
        unitPrice: '',
        sellPrice: '',
        expiryDate: '',
        batchNumber: '',
        supplier: ''
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchInventory()
        fetchMedicines()
    }, [])

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
        } finally {
            setLoading(false)
        }
    }

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
        }
    }

    const resetForm = () => {
        setFormData({
            medicine: '',
            quantity: '',
            minQuantity: '10',
            unitPrice: '',
            sellPrice: '',
            expiryDate: '',
            batchNumber: '',
            supplier: ''
        })
        setEditingItem(null)
        setError('')
        setSuccess('')
    }

    const openAddModal = () => {
        resetForm()
        setShowModal(true)
    }

    const openEditModal = (item) => {
        setEditingItem(item)
        setFormData({
            medicine: item.medicine?._id || '',
            quantity: item.quantity?.toString() || '',
            minQuantity: item.minQuantity?.toString() || '10',
            unitPrice: item.unitPrice?.toString() || '',
            sellPrice: item.sellPrice?.toString() || '',
            expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
            batchNumber: item.batchNumber || '',
            supplier: item.supplier || ''
        })
        setError('')
        setSuccess('')
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setSubmitting(true)

        try {
            const token = localStorage.getItem('token')
            const url = editingItem
                ? `/api/inventory/${editingItem._id}`
                : '/api/inventory'
            const method = editingItem ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    quantity: parseInt(formData.quantity),
                    minQuantity: parseInt(formData.minQuantity),
                    unitPrice: parseFloat(formData.unitPrice) || 0,
                    sellPrice: parseFloat(formData.sellPrice) || 0
                })
            })

            const data = await response.json()

            if (response.ok) {
                setSuccess(editingItem
                    ? 'Muvaffaqiyatli yangilandi!'
                    : 'Mahsulot muvaffaqiyatli qo\'shildi!')
                fetchInventory()
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

    const openDeleteModal = (item) => {
        setDeletingItem(item)
        setShowDeleteModal(true)
    }

    const closeDeleteModal = () => {
        setDeletingItem(null)
        setShowDeleteModal(false)
        setDeleteLoading(false)
    }

    const confirmDelete = async () => {
        if (!deletingItem) return

        setDeleteLoading(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/inventory/${deletingItem._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                fetchInventory()
                closeDeleteModal()
            } else {
                const data = await response.json()
                setError(data.message || 'O\'chirishda xatolik yuz berdi')
                setDeleteLoading(false)
            }
        } catch (error) {
            console.error('Error deleting:', error)
            setDeleteLoading(false)
        }
    }

    const filteredInventory = inventory.filter(item => {
        const matchesSearch = item.medicine?.name?.toLowerCase().includes(searchTerm.toLowerCase())

        if (filter === 'low') {
            return matchesSearch && item.quantity <= item.minQuantity
        } else if (filter === 'normal') {
            return matchesSearch && item.quantity > item.minQuantity
        }
        return matchesSearch
    })

    const lowStockCount = inventory.filter(i => i.quantity <= i.minQuantity).length

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m'
    }

    const isExpired = (date) => {
        if (!date) return false
        return new Date(date) < new Date()
    }

    const isExpiringSoon = (date) => {
        if (!date) return false
        const expiryDate = new Date(date)
        const today = new Date()
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
        return expiryDate > today && expiryDate <= thirtyDaysFromNow
    }

    return (
        <div className="data-management-page">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1>Omborxona</h1>
                    <p>Dori-darmonlar zaxirasini boshqarish</p>
                </div>
                <button className="btn btn-primary" onClick={openAddModal}>
                    <Plus size={20} />
                    Tovar kiritish
                </button>
            </div>

            {/* Low Stock Alert */}
            {lowStockCount > 0 && (
                <div className="alert-banner warning">
                    <AlertTriangle size={20} />
                    <span><strong>{lowStockCount} ta</strong> dori kam qolgan! Zaxirani to'ldiring.</span>
                    <button onClick={() => setFilter('low')}>Ko'rish</button>
                </div>
            )}

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
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Barchasi ({inventory.length})
                    </button>
                    <button
                        className={`filter-tab danger ${filter === 'low' ? 'active' : ''}`}
                        onClick={() => setFilter('low')}
                    >
                        <TrendingDown size={16} />
                        Kam ({lowStockCount})
                    </button>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="data-table-container glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : filteredInventory.length === 0 ? (
                    <div className="empty-state">
                        <Package size={48} />
                        <h3>Omborxona bo'sh</h3>
                        <p>Tovar kiritish uchun "Tovar kiritish" tugmasini bosing</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Rasm</th>
                                <th>Dori nomi</th>
                                <th>Miqdori</th>
                                <th>Min. zaxira</th>
                                <th>Kelish narxi</th>
                                <th>Sotish narxi</th>
                                <th>Yaroqlilik</th>
                                <th>Holat</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventory.map((item, index) => (
                                <tr key={item._id} className={item.quantity <= item.minQuantity ? 'low-stock-row' : ''}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <div className="medicine-image-cell">
                                            {item.medicine?.image ? (
                                                <img src={item.medicine.image} alt={item.medicine?.name} />
                                            ) : (
                                                <div className="medicine-placeholder">
                                                    <Pill size={20} />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <strong>{item.medicine?.name || 'Noma\'lum'}</strong>
                                            {item.batchNumber && (
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                                                    Partiya: {item.batchNumber}
                                                </p>
                                            )}
                                            {item.supplier && (
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                                                    📦 {item.supplier}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`qty-badge ${item.quantity <= item.minQuantity ? 'danger' : ''}`}>
                                            {item.quantity} ta
                                        </span>
                                    </td>
                                    <td>{item.minQuantity} ta</td>
                                    <td>{formatCurrency(item.unitPrice)}</td>
                                    <td>
                                        <span style={{ color: 'var(--success)', fontWeight: '600' }}>
                                            {formatCurrency(item.sellPrice)}
                                        </span>
                                    </td>
                                    <td>
                                        {item.expiryDate ? (
                                            <span className={`expiry-badge ${isExpired(item.expiryDate) ? 'expired' : isExpiringSoon(item.expiryDate) ? 'warning' : ''}`}>
                                                {new Date(item.expiryDate).toLocaleDateString('uz-UZ')}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        {isExpired(item.expiryDate) ? (
                                            <span className="status-badge inactive">
                                                <AlertTriangle size={14} /> Muddati o'tgan
                                            </span>
                                        ) : item.quantity <= item.minQuantity ? (
                                            <span className="status-badge inactive">
                                                <AlertTriangle size={14} /> Kam
                                            </span>
                                        ) : isExpiringSoon(item.expiryDate) ? (
                                            <span className="status-badge warning-badge">
                                                Tez tugaydi
                                            </span>
                                        ) : (
                                            <span className="status-badge active">Yetarli</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="action-btn view"
                                                title="Ko'rish"
                                                onClick={() => { setViewingItem(item); setShowViewModal(true); }}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                className="action-btn edit"
                                                title="Tahrirlash"
                                                onClick={() => openEditModal(item)}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="action-btn delete"
                                                title="O'chirish"
                                                onClick={() => openDeleteModal(item)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* View Inventory Modal */}
            {showViewModal && viewingItem && (
                <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
                        <div className="modal-header">
                            <h2>Tovar ma'lumotlari</h2>
                            <button className="modal-close" onClick={() => setShowViewModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="inventory-view-content">
                            <div className="inventory-view-header">
                                <div className="inventory-view-image">
                                    {viewingItem.medicine?.image ? (
                                        <img src={viewingItem.medicine.image} alt={viewingItem.medicine?.name} />
                                    ) : (
                                        <Pill size={32} />
                                    )}
                                </div>
                                <div className="inventory-view-name">
                                    <h3>{viewingItem.medicine?.name || 'Noma\'lum'}</h3>
                                    <span className={`status-badge ${viewingItem.quantity <= viewingItem.minQuantity ? 'inactive' : 'active'}`}>
                                        {viewingItem.quantity <= viewingItem.minQuantity ? 'Kam qolgan' : 'Yetarli'}
                                    </span>
                                </div>
                            </div>

                            <div className="inventory-view-details">
                                <div className="inventory-detail-row">
                                    <div className="inventory-detail-item">
                                        <span className="detail-label">Miqdori</span>
                                        <span className={`detail-value ${viewingItem.quantity <= viewingItem.minQuantity ? 'danger' : 'success'}`}>
                                            {viewingItem.quantity} ta
                                        </span>
                                    </div>
                                    <div className="inventory-detail-item">
                                        <span className="detail-label">Min. zaxira</span>
                                        <span className="detail-value">{viewingItem.minQuantity} ta</span>
                                    </div>
                                </div>

                                <div className="inventory-detail-row">
                                    <div className="inventory-detail-item">
                                        <span className="detail-label">Kelish narxi</span>
                                        <span className="detail-value">{formatCurrency(viewingItem.unitPrice)}</span>
                                    </div>
                                    <div className="inventory-detail-item">
                                        <span className="detail-label">Sotish narxi</span>
                                        <span className="detail-value success">{formatCurrency(viewingItem.sellPrice)}</span>
                                    </div>
                                </div>

                                <div className="inventory-single-detail">
                                    <Calendar size={16} />
                                    <span className="detail-label">Yaroqlilik:</span>
                                    {viewingItem.expiryDate ? (
                                        <span className={isExpired(viewingItem.expiryDate) ? 'danger' : isExpiringSoon(viewingItem.expiryDate) ? 'warning' : ''}>
                                            {new Date(viewingItem.expiryDate).toLocaleDateString('uz-UZ')}
                                        </span>
                                    ) : (
                                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                                    )}
                                </div>

                                {viewingItem.batchNumber && (
                                    <div className="inventory-single-detail">
                                        <Package size={16} />
                                        <span className="detail-label">Partiya:</span>
                                        <code>{viewingItem.batchNumber}</code>
                                    </div>
                                )}

                                {viewingItem.supplier && (
                                    <div className="inventory-single-detail">
                                        <span className="detail-label">📦 Yetkazuvchi:</span>
                                        <span>{viewingItem.supplier}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                                Yopish
                            </button>
                            <button className="btn btn-primary" onClick={() => { setShowViewModal(false); openEditModal(viewingItem); }}>
                                <Edit2 size={18} />
                                Tahrirlash
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Inventory Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingItem ? 'Zaxirani tahrirlash' : 'Tovar kiritish'}</h2>
                            <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-form">
                            {error && <div className="alert error">{error}</div>}
                            {success && <div className="alert success"><Check size={18} /> {success}</div>}

                            <div className="form-group">
                                <label className="form-label">Dori *</label>
                                <select
                                    className="form-input"
                                    value={formData.medicine}
                                    onChange={(e) => setFormData({ ...formData, medicine: e.target.value })}
                                    required
                                    disabled={!!editingItem}
                                >
                                    <option value="">Dorini tanlang</option>
                                    {medicines.map(med => (
                                        <option key={med._id} value={med._id}>{med.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Miqdori *</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="100"
                                        min="1"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Min. zaxira</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="10"
                                        min="0"
                                        value={formData.minQuantity}
                                        onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Kelish narxi</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="10000"
                                        min="0"
                                        value={formData.unitPrice}
                                        onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Sotish narxi</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="15000"
                                        min="0"
                                        value={formData.sellPrice}
                                        onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Yaroqlilik muddati</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.expiryDate}
                                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Partiya raqami</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="LOT-2024-001"
                                        value={formData.batchNumber}
                                        onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Yetkazib beruvchi</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Yetkazib beruvchi nomi"
                                    value={formData.supplier}
                                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
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
                                    ) : editingItem ? (
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
            {showDeleteModal && deletingItem && (
                <div className="modal-overlay" onClick={closeDeleteModal}>
                    <div className="modal glass-card delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-content">
                            <div className="delete-icon">
                                <AlertTriangle size={48} />
                            </div>
                            <h3>O'chirishni tasdiqlang</h3>
                            <p>
                                <strong>"{deletingItem.medicine?.name}"</strong> zaxirasini o'chirishni xohlaysizmi?
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
                .alert-banner {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                    padding: var(--space-md) var(--space-lg);
                    border-radius: var(--radius-md);
                    margin-bottom: var(--space-lg);
                }
                .alert-banner.warning {
                    background: rgba(250, 173, 20, 0.15);
                    border: 1px solid rgba(250, 173, 20, 0.3);
                    color: var(--warning);
                }
                .alert-banner button {
                    margin-left: auto;
                    background: rgba(250, 173, 20, 0.2);
                    color: var(--warning);
                    padding: var(--space-sm) var(--space-md);
                    border-radius: var(--radius-sm);
                    font-size: 0.85rem;
                }
                .filter-tabs {
                    display: flex;
                    gap: var(--space-sm);
                }
                .filter-tab {
                    padding: var(--space-sm) var(--space-md);
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: var(--space-xs);
                }
                .filter-tab.active {
                    background: var(--primary-500);
                    border-color: var(--primary-500);
                    color: white;
                }
                .filter-tab.danger.active {
                    background: var(--error);
                    border-color: var(--error);
                }

                /* Medicine Image Cell */
                .medicine-image-cell {
                    width: 48px;
                    height: 48px;
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    flex-shrink: 0;
                }
                .medicine-image-cell img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .medicine-placeholder {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, rgba(114, 46, 209, 0.1), rgba(24, 144, 255, 0.1));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                }

                /* Quantity Badge */
                .qty-badge {
                    padding: 4px 10px;
                    border-radius: var(--radius-sm);
                    font-weight: 600;
                    font-size: 0.85rem;
                    background: rgba(82, 196, 26, 0.15);
                    color: var(--success);
                }
                .qty-badge.danger {
                    background: rgba(255, 77, 79, 0.15);
                    color: var(--error);
                }

                /* Expiry Badge */
                .expiry-badge {
                    padding: 4px 8px;
                    border-radius: var(--radius-sm);
                    font-size: 0.8rem;
                    background: var(--bg-card);
                }
                .expiry-badge.expired {
                    background: rgba(255, 77, 79, 0.15);
                    color: var(--error);
                }
                .expiry-badge.warning {
                    background: rgba(250, 173, 20, 0.15);
                    color: var(--warning);
                }

                /* Warning badge status */
                .status-badge.warning-badge {
                    background: rgba(250, 173, 20, 0.15);
                    color: var(--warning);
                }

                /* Low stock row highlight */
                .low-stock-row {
                    background: rgba(255, 77, 79, 0.05) !important;
                }
                .low-stock-row:hover {
                    background: rgba(255, 77, 79, 0.1) !important;
                }

                /* Inventory Card - legacy, keep for fallback */
                .inventory-card {
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .inventory-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
                }
                .inventory-card.low-stock {
                    border: 1px solid rgba(255, 77, 79, 0.3);
                }
                .inventory-image {
                    position: relative;
                    height: 160px;
                    background: linear-gradient(135deg, rgba(114, 46, 209, 0.1), rgba(24, 144, 255, 0.1));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }
                .inventory-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .inventory-placeholder {
                    color: var(--text-muted);
                    opacity: 0.5;
                }
                .inventory-status-badge {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    padding: 4px 10px;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(10px);
                    border-radius: var(--radius-full);
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .inventory-status-badge.danger {
                    background: rgba(255, 77, 79, 0.9);
                }
                .inventory-status-badge.warning {
                    background: rgba(250, 173, 20, 0.9);
                    color: #1a1d29;
                }
                .inventory-status-badge.expired {
                    background: rgba(220, 38, 38, 0.9);
                }
                .inventory-info {
                    padding: var(--space-md);
                    flex: 1;
                }
                .inventory-info h3 {
                    margin: 0 0 var(--space-xs) 0;
                    font-size: 1.1rem;
                    color: var(--text-primary);
                }
                .inventory-batch {
                    margin: 0 0 var(--space-md) 0;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }
                .inventory-stats {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-md);
                    margin-bottom: var(--space-md);
                }
                .stat {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .stat-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .stat-value {
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .stat-value.danger {
                    color: var(--error);
                }
                .stat-value.price {
                    color: var(--success);
                }
                .inventory-expiry {
                    margin-bottom: var(--space-sm);
                }
                .expiry-date {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    padding: 2px 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: var(--radius-sm);
                }
                .expiry-date.expired {
                    background: rgba(239, 68, 68, 0.15);
                    color: var(--error);
                }
                .expiry-date.warning {
                    background: rgba(250, 173, 20, 0.15);
                    color: var(--warning);
                }
                .inventory-supplier {
                    margin: 0;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }
                .inventory-actions {
                    display: flex;
                    gap: var(--space-sm);
                    padding: var(--space-md);
                    border-top: 1px solid var(--border-color);
                }
                .inventory-actions .action-btn {
                    flex: 1;
                    justify-content: center;
                }

                /* Modal */
                .modal {
                    max-width: 700px !important;
                    width: 90vw;
                    max-height: 90vh;
                    overflow-y: auto;
                }

                @media (max-width: 768px) {
                    .inventory-grid {
                        grid-template-columns: 1fr;
                    }
                    .modal {
                        max-width: 95vw !important;
                    }
                    .filter-tabs {
                        flex-wrap: wrap;
                    }
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
            `}</style>
        </div>
    )
}

export default InventoryManagement
