import { useState, useEffect } from 'react'
import {
    Pill,
    Search,
    Info,
    AlertTriangle,
    X
} from 'lucide-react'
import './DoctorPages.css'

function MedicineCatalog() {
    const [medicines, setMedicines] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedMedicine, setSelectedMedicine] = useState(null)
    const [filterForm, setFilterForm] = useState('all')

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

    const filteredMedicines = medicines.filter(m => {
        const matchesSearch = m.name?.toLowerCase().includes(searchTerm.toLowerCase())
        if (filterForm === 'all') return matchesSearch
        return matchesSearch && m.form === filterForm
    })

    const forms = [...new Set(medicines.map(m => m.form).filter(Boolean))]

    const getFormLabel = (form) => {
        const labels = {
            tablet: 'Tabletka',
            capsule: 'Kapsula',
            syrup: 'Sirop',
            injection: 'Ukol',
            drops: 'Tomchi',
            cream: 'Krem',
            other: 'Boshqa'
        }
        return labels[form] || form
    }

    return (
        <div className="medicine-catalog-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>Dorilar katalogi</h1>
                    <p>Barcha mavjud dori-darmonlar ro'yxati</p>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="toolbar glass-card">
                <div className="search-input">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Dori nomini qidirish..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filterForm === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterForm('all')}
                    >
                        Barchasi
                    </button>
                    {forms.slice(0, 4).map(form => (
                        <button
                            key={form}
                            className={`filter-tab ${filterForm === form ? 'active' : ''}`}
                            onClick={() => setFilterForm(form)}
                        >
                            {getFormLabel(form)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Medicines Grid */}
            <div className="medicines-catalog-grid">
                {loading ? (
                    <div className="loading-state glass-card">
                        <div className="spinner"></div>
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : filteredMedicines.length === 0 ? (
                    <div className="empty-state glass-card">
                        <Pill size={48} />
                        <h3>Dorilar topilmadi</h3>
                        <p>Qidiruv so'zini o'zgartiring</p>
                    </div>
                ) : (
                    filteredMedicines.map(medicine => (
                        <div key={medicine._id} className="medicine-catalog-card glass-card">
                            <div className="medicine-card-header">
                                <div className="medicine-icon">
                                    <Pill size={24} />
                                </div>
                                <div className="medicine-main">
                                    <h3>{medicine.name}</h3>
                                    <span className="medicine-form">{getFormLabel(medicine.form)}</span>
                                </div>
                            </div>

                            <div className="medicine-card-body">
                                <div className="medicine-detail">
                                    <span className="detail-label">Dozasi:</span>
                                    <span className="detail-value">{medicine.dosage || '-'}</span>
                                </div>
                                <div className="medicine-detail">
                                    <span className="detail-label">Yo'riqnoma:</span>
                                    <span className="detail-value">{medicine.instructions || 'Ko\'rsatilmagan'}</span>
                                </div>
                            </div>

                            <div className="medicine-card-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setSelectedMedicine(medicine)}
                                >
                                    <Info size={18} />
                                    Batafsil
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Medicine Detail Modal */}
            {selectedMedicine && (
                <div className="modal-overlay" onClick={() => setSelectedMedicine(null)}>
                    <div className="modal glass-card medicine-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedMedicine.name}</h2>
                            <button className="modal-close" onClick={() => setSelectedMedicine(null)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="medicine-detail-content">
                            <div className="detail-row">
                                <span className="label">Shakli:</span>
                                <span className="value">{getFormLabel(selectedMedicine.form)}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Dozasi:</span>
                                <span className="value">{selectedMedicine.dosage || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Qo'llash usuli:</span>
                                <span className="value">{selectedMedicine.instructions || '-'}</span>
                            </div>

                            {selectedMedicine.sideEffects && (
                                <div className="side-effects">
                                    <div className="side-effects-header">
                                        <AlertTriangle size={18} />
                                        Yon ta'sirlari
                                    </div>
                                    <p>{selectedMedicine.sideEffects}</p>
                                </div>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setSelectedMedicine(null)}>
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MedicineCatalog
