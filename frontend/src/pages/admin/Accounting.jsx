import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import {
    Wallet, Plus, Search, TrendingUp, Calendar, X, Check,
    ArrowUpRight, ArrowDownRight, BarChart3, CreditCard,
    Banknote, ChevronLeft, ChevronRight, Download, Clock,
    Edit2, Trash2, AlertTriangle, Table2, BarChart2
} from 'lucide-react'
import './DataManagement.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

function Accounting() {
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [editingTransaction, setEditingTransaction] = useState(null)
    const [deletingTransaction, setDeletingTransaction] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState('all')
    const [activePeriod, setActivePeriod] = useState('daily')
    const [customDateRange, setCustomDateRange] = useState({ startDate: '', endDate: '' })
    const [viewMode, setViewMode] = useState('table') // 'chart' | 'table'
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15
    const [formData, setFormData] = useState({
        type: 'income', category: 'service', amount: '', description: '', paymentMethod: 'cash',
        date: new Date().toISOString().split('T')[0]
    })
    const [editFormData, setEditFormData] = useState({
        type: 'income', category: 'service', amount: '', description: '', paymentMethod: 'cash',
        date: new Date().toISOString().split('T')[0]
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [editError, setEditError] = useState('')
    const [editSuccess, setEditSuccess] = useState('')

    useEffect(() => { fetchTransactions() }, [])

    const fetchTransactions = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } })
            if (response.ok) {
                setTransactions(await response.json())
            } else {
                const data = await response.json().catch(() => ({}))
                setError(data.message || 'Hisob-kitob ma\'lumotlarini yuklab bo\'lmadi')
            }
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const handleSubmit = async (e) => {
        e.preventDefault(); setError(''); setSuccess('')
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...formData, amount: parseFloat(formData.amount) })
            })
            const data = await response.json()
            if (response.ok) {
                setSuccess('Tranzaksiya qo\'shildi!')
                setFormData({ type: 'income', category: 'service', amount: '', description: '', paymentMethod: 'cash', date: new Date().toISOString().split('T')[0] })
                fetchTransactions()
                setTimeout(() => { setShowModal(false); setSuccess('') }, 1500)
            } else setError(data.message || 'Xatolik')
        } catch (err) { setError('Server bilan aloqa yo\'q') }
    }

    const openEditModal = (transaction) => {
        setEditingTransaction(transaction)
        setEditFormData({
            type: transaction.type || 'income',
            category: transaction.category || 'service',
            amount: transaction.amount || '',
            description: transaction.description || '',
            paymentMethod: transaction.paymentMethod || 'cash',
            date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        })
        setEditError('')
        setEditSuccess('')
        setShowEditModal(true)
    }

    const handleUpdate = async (e) => {
        e.preventDefault(); setEditError(''); setEditSuccess('')
        if (!editingTransaction) return
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/transactions/${editingTransaction._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...editFormData, amount: parseFloat(editFormData.amount) })
            })
            const data = await response.json()
            if (response.ok) {
                setEditSuccess('Tranzaksiya yangilandi!')
                fetchTransactions()
                setTimeout(() => { setShowEditModal(false); setEditingTransaction(null) }, 1200)
            } else setEditError(data.message || 'Yangilashda xatolik')
        } catch (err) { setEditError('Server bilan aloqa yo\'q') }
    }

    const openDeleteModal = (transaction) => {
        setDeletingTransaction(transaction)
        setShowDeleteModal(true)
    }

    const handleDelete = async () => {
        if (!deletingTransaction) return
        setDeleteLoading(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/transactions/${deletingTransaction._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                fetchTransactions()
                setShowDeleteModal(false)
                setDeletingTransaction(null)
            } else {
                const data = await response.json().catch(() => ({}))
                alert(data.message || 'O\'chirishda xatolik')
            }
        } catch (err) {
            alert('Server bilan aloqa yo\'q')
        } finally {
            setDeleteLoading(false)
        }
    }

    // Period bo'yicha filtrlash (jadval va statistikalar uchun)
    const getDateOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const periodFilteredTransactions = useMemo(() => {
        const now = new Date()
        const todayStart = getDateOnly(now)
        return transactions.filter(t => {
            if (!t.date) return false
            const td = getDateOnly(new Date(t.date))
            if (activePeriod === 'daily') return td.getTime() === todayStart.getTime()
            if (activePeriod === 'weekly') {
                const weekAgo = new Date(todayStart); weekAgo.setDate(weekAgo.getDate() - 6)
                return td >= weekAgo && td <= todayStart
            }
            if (activePeriod === 'monthly') {
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                return td >= monthStart && td <= todayStart
            }
            if (activePeriod === 'yearly') {
                const yearStart = new Date(now.getFullYear(), 0, 1)
                return td >= yearStart && td <= todayStart
            }
            if (activePeriod === 'custom') {
                const fullDate = new Date(t.date)
                if (customDateRange.startDate && fullDate < new Date(customDateRange.startDate + 'T00:00:00')) return false
                if (customDateRange.endDate && fullDate > new Date(customDateRange.endDate + 'T23:59:59')) return false
                return true
            }
            return true
        })
    }, [transactions, activePeriod, customDateRange])

    const filteredTransactions = useMemo(() => {
        const term = searchTerm.toLowerCase()
        return periodFilteredTransactions.filter(t => {
            const matchesSearch = t.description?.toLowerCase().includes(term) ||
                t.patient?.fullName?.toLowerCase().includes(term)
            if (filterType === 'income') return matchesSearch && t.type === 'income'
            if (filterType === 'expense') return matchesSearch && t.type === 'expense'
            return matchesSearch
        })
    }, [periodFilteredTransactions, searchTerm, filterType])

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
    const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    const formatCurrency = (amount) => new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m'
    const formatShort = (amount) => amount >= 1e9 ? (amount / 1e9).toFixed(1) + ' mlrd' : amount >= 1e6 ? (amount / 1e6).toFixed(1) + ' mln' : amount >= 1e3 ? (amount / 1e3).toFixed(0) + 'K' : String(amount)
    const getCategoryLabel = (cat) => ({ medicine_sale: 'Dori savdosi', medicine_purchase: 'Dori xaridi', service: 'Xizmat', salary: 'Ish haqi', rent: 'Ijara', utilities: 'Kommunal', other: 'Boshqa' }[cat] || cat)
    const getPaymentLabel = (m) => ({ cash: 'Naqd', card: 'Karta', transfer: 'O\'tkazma', other: 'Boshqa' }[m] || m)

    // Period-based statistics
    const periodStats = useMemo(() => {
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const yearStart = new Date(now.getFullYear(), 0, 1)
        const calcStats = (filtered) => ({
            income: filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
            expense: filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
            count: filtered.length
        })
        const getTransactionDate = (t) => {
            if (!t.date) return null
            const d = new Date(t.date)
            return new Date(d.getFullYear(), d.getMonth(), d.getDate())
        }
        return {
            daily: calcStats(transactions.filter(t => { const td = getTransactionDate(t); return td && td.getTime() === todayStart.getTime() })),
            weekly: calcStats(transactions.filter(t => { const td = getTransactionDate(t); return td && td >= weekAgo })),
            monthly: calcStats(transactions.filter(t => { const td = getTransactionDate(t); return td && td >= monthStart })),
            yearly: calcStats(transactions.filter(t => { const td = getTransactionDate(t); return td && td >= yearStart }))
        }
    }, [transactions])

    // Real vaqt balansi
    const realBalance = useMemo(() => {
        const calc = (method) => {
            const income = transactions.filter(t => t.type === 'income' && t.paymentMethod === method).reduce((s, t) => s + t.amount, 0)
            const expense = transactions.filter(t => t.type === 'expense' && t.paymentMethod === method).reduce((s, t) => s + t.amount, 0)
            return income - expense
        }
        return {
            cash: calc('cash'),
            card: calc('card'),
            transfer: calc('transfer'),
            total: ['cash', 'card', 'transfer'].reduce((s, m) => {
                const inc = transactions.filter(t => t.type === 'income' && t.paymentMethod === m).reduce((a, t) => a + t.amount, 0)
                const exp = transactions.filter(t => t.type === 'expense' && t.paymentMethod === m).reduce((a, t) => a + t.amount, 0)
                return s + inc - exp
            }, 0)
        }
    }, [transactions])

    // Period bar chart
    const periodBarChartData = useMemo(() => {
        const now = new Date()
        const getDateOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
        const calcIncomeExpense = (list) => ({
            income: list.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
            expense: list.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        })
        if (activePeriod === 'daily') {
            const labels = [], incomes = [], expenses = []
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now); d.setDate(d.getDate() - i)
                const dayStart = getDateOnly(d)
                const dayEnd = new Date(dayStart.getTime() + 86400000)
                const filtered = transactions.filter(t => { if (!t.date) return false; const td = new Date(t.date); return td >= dayStart && td < dayEnd })
                const r = calcIncomeExpense(filtered)
                labels.push(d.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric' }))
                incomes.push(r.income); expenses.push(r.expense)
            }
            return { labels, incomes, expenses }
        }
        if (activePeriod === 'weekly') {
            const labels = [], incomes = [], expenses = []
            for (let i = 7; i >= 0; i--) {
                const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() - i * 7)
                const weekStart = new Date(weekEnd); weekStart.setDate(weekStart.getDate() - 6)
                const wsDate = getDateOnly(weekStart), weDate = getDateOnly(weekEnd)
                weDate.setDate(weDate.getDate() + 1)
                const filtered = transactions.filter(t => { if (!t.date) return false; const td = getDateOnly(new Date(t.date)); return td >= wsDate && td < weDate })
                const r = calcIncomeExpense(filtered)
                labels.push(weekStart.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }))
                incomes.push(r.income); expenses.push(r.expense)
            }
            return { labels, incomes, expenses }
        }
        if (activePeriod === 'monthly') {
            const labels = [], incomes = [], expenses = []
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
                const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
                const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1)
                const filtered = transactions.filter(t => { if (!t.date) return false; const td = new Date(t.date); return td >= monthStart && td < monthEnd })
                const r = calcIncomeExpense(filtered)
                labels.push(d.toLocaleDateString('uz-UZ', { month: 'short', year: '2-digit' }))
                incomes.push(r.income); expenses.push(r.expense)
            }
            return { labels, incomes, expenses }
        }
        const labels = [], incomes = [], expenses = []
        for (let i = 4; i >= 0; i--) {
            const year = now.getFullYear() - i
            const yearStart = new Date(year, 0, 1), yearEnd = new Date(year + 1, 0, 1)
            const filtered = transactions.filter(t => { if (!t.date) return false; const td = new Date(t.date); return td >= yearStart && td < yearEnd })
            const r = calcIncomeExpense(filtered)
            labels.push(`${year}`); incomes.push(r.income); expenses.push(r.expense)
        }
        return { labels, incomes, expenses }
    }, [transactions, activePeriod])

    // Excel yuklab olish
    const downloadExcel = useCallback(() => {
        const now = new Date()
        const getDateOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
        const todayStart = getDateOnly(now)
        const periodLabels = { daily: 'Kunlik', weekly: 'Haftalik', monthly: 'Oylik', yearly: 'Yillik' }
        const periodLabel = periodLabels[activePeriod]
        const filtered = transactions.filter(t => {
            if (!t.date) return false
            const td = getDateOnly(new Date(t.date))
            if (activePeriod === 'daily') return td.getTime() === todayStart.getTime()
            if (activePeriod === 'weekly') { const wa = new Date(todayStart); wa.setDate(wa.getDate() - 6); return td >= wa && td <= todayStart }
            if (activePeriod === 'monthly') { const ms = new Date(now.getFullYear(), now.getMonth(), 1); return td >= ms && td <= todayStart }
            const ys = new Date(now.getFullYear(), 0, 1); return td >= ys && td <= todayStart
        })
        if (filtered.length === 0) { alert('Bu davrda tranzaksiyalar topilmadi!'); return }
        const rows = filtered.map((t, i) => ({
            '#': i + 1,
            'Sana': new Date(t.date).toLocaleDateString('uz-UZ'),
            'Turi': t.type === 'income' ? 'Daromad' : 'Xarajat',
            'Kategoriya': getCategoryLabel(t.category),
            'Tavsif': t.description || '-',
            "To'lov": getPaymentLabel(t.paymentMethod),
            'Summa (so\'m)': t.type === 'income' ? t.amount : -t.amount,
        }))
        const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        rows.push({ '#': '', 'Sana': 'JAMI', 'Turi': '', 'Kategoriya': '', 'Tavsif': `Kirim: ${totalIncome.toLocaleString()} | Chiqim: ${totalExpense.toLocaleString()}`, "To'lov": '', 'Summa (so\'m)': totalIncome - totalExpense })
        const ws = XLSX.utils.json_to_sheet(rows)
        ws['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 50 }, { wch: 12 }, { wch: 18 }]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, periodLabel)
        XLSX.writeFile(wb, `${periodLabel}_tranzaksiyalar_${now.toLocaleDateString('uz-UZ').replace(/\./g, '-')}.xlsx`)
    }, [transactions, activePeriod])

    return (
        <div className="accounting-v2">
            {/* Header */}
            <div className="acc-header">
                <div>
                    <h1><Wallet className="h-icon" /> Hisob-kitob</h1>
                    <p>Moliyaviy operatsiyalar va tahlillar</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={downloadExcel}><Download size={18} /> Excel</button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={20} /> Yangi tranzaksiya</button>
                </div>
            </div>

            {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

            {/* Real vaqt balansi */}
            <div className="balance-row">
                <div className="balance-card balance-total">
                    <div className="balance-icon"><Wallet size={22} /></div>
                    <div className="balance-info">
                        <span className="balance-label">Umumiy balans</span>
                        <strong className={`balance-amount ${realBalance.total >= 0 ? 'pos' : 'neg'}`}>{formatCurrency(realBalance.total)}</strong>
                    </div>
                </div>
                <div className="balance-card balance-cash">
                    <div className="balance-icon"><Banknote size={22} /></div>
                    <div className="balance-info">
                        <span className="balance-label">Naqd pul</span>
                        <strong className={`balance-amount ${realBalance.cash >= 0 ? 'pos' : 'neg'}`}>{formatCurrency(realBalance.cash)}</strong>
                    </div>
                </div>
                <div className="balance-card balance-card-pay">
                    <div className="balance-icon"><CreditCard size={22} /></div>
                    <div className="balance-info">
                        <span className="balance-label">Karta</span>
                        <strong className={`balance-amount ${realBalance.card >= 0 ? 'pos' : 'neg'}`}>{formatCurrency(realBalance.card)}</strong>
                    </div>
                </div>
                <div className="balance-card balance-transfer">
                    <div className="balance-icon"><ArrowUpRight size={22} /></div>
                    <div className="balance-info">
                        <span className="balance-label">O'tkazma</span>
                        <strong className={`balance-amount ${realBalance.transfer >= 0 ? 'pos' : 'neg'}`}>{formatCurrency(realBalance.transfer)}</strong>
                    </div>
                </div>
            </div>

            {/* Period toggle + view mode */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                <div className="periods-toggle-row" style={{ marginBottom: 0 }}>
                    {[
                        { key: 'daily', label: 'Kunlik', Icon: Clock },
                        { key: 'weekly', label: 'Haftalik', Icon: Calendar },
                        { key: 'monthly', label: 'Oylik', Icon: BarChart3 },
                        { key: 'yearly', label: 'Yillik', Icon: TrendingUp },
                        { key: 'custom', label: 'Sana oralig\'i', Icon: Calendar },
                    ].map(({ key, label, Icon }) => (
                        <button key={key} className={`ptoggle-btn ${activePeriod === key ? 'active' : ''}`} onClick={() => setActivePeriod(key)}>
                            <Icon size={16} /> {label}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        className={`ptoggle-btn ${viewMode === 'chart' ? 'active' : ''}`}
                        onClick={() => setViewMode('chart')}
                        title="Grafik ko'rinish"
                    >
                        <BarChart2 size={16} /> Grafik
                    </button>
                    <button
                        className={`ptoggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                        onClick={() => setViewMode('table')}
                        title="Jadval ko'rinish"
                    >
                        <Table2 size={16} /> Jadval
                    </button>
                </div>
            </div>

            {/* Custom Date Range Filter Box when activePeriod === 'custom' */}
            {activePeriod === 'custom' && (
                <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: 24,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                            <Calendar size={18} color="#2563eb" />
                            <span>Sana oralig'i bo'yicha daromad va xarajatni hisoblash</span>
                        </div>
                        {(customDateRange.startDate || customDateRange.endDate) && (
                            <button
                                onClick={() => setCustomDateRange({ startDate: '', endDate: '' })}
                                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                            >
                                Tozalash (Barchasi)
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                                Boshlang'ich sana
                            </label>
                            <input
                                type="date"
                                value={customDateRange.startDate}
                                onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', background: '#fff', color: '#0f172a', boxSizing: 'border-box', fontWeight: 500 }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                                Tugash sanasi
                            </label>
                            <input
                                type="date"
                                value={customDateRange.endDate}
                                onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', background: '#fff', color: '#0f172a', boxSizing: 'border-box', fontWeight: 500 }}
                            />
                        </div>
                    </div>

                    {/* Summary Calculation Box */}
                    {(() => {
                        const inc = periodFilteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
                        const exp = periodFilteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
                        const profit = inc - exp
                        return (
                            <div style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '12px 16px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                gap: 12
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Tranzaksiyalar</div>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{periodFilteredTransactions.length} ta</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>Jami Kirim</div>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#16a34a', marginTop: 2 }}>{formatCurrency(inc)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase' }}>Jami Chiqim</div>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#dc2626', marginTop: 2 }}>{formatCurrency(exp)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: profit >= 0 ? '#15803d' : '#b91c1c', fontWeight: 700, textTransform: 'uppercase' }}>Sof Foyda</div>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: profit >= 0 ? '#15803d' : '#b91c1c', marginTop: 2 }}>{formatCurrency(profit)}</div>
                                </div>
                            </div>
                        )
                    })()}
                </div>
            )}

            {/* Grafik ko'rinish */}
            {viewMode === 'chart' && (
                <>
                    <div className="chart-box wide" style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <h3 style={{ margin: 0 }}>
                                {activePeriod === 'daily' && 'Kunlik kirim / chiqim (oxirgi 7 kun)'}
                                {activePeriod === 'weekly' && 'Haftalik kirim / chiqim (oxirgi 8 hafta)'}
                                {activePeriod === 'monthly' && 'Oylik kirim / chiqim (oxirgi 12 oy)'}
                                {activePeriod === 'yearly' && 'Yillik kirim / chiqim (oxirgi 5 yil)'}
                            </h3>
                            <button onClick={downloadExcel} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                                <Download size={15} /> Excel yuklab olish
                            </button>
                        </div>
                        <div className="chart-wrap">
                            <Bar
                                data={{
                                    labels: periodBarChartData.labels,
                                    datasets: [
                                        { label: 'Kirim', data: periodBarChartData.incomes, backgroundColor: 'rgba(34,197,94,0.75)', borderColor: 'rgba(34,197,94,1)', borderWidth: 1, borderRadius: 6 },
                                        { label: 'Chiqim', data: periodBarChartData.expenses, backgroundColor: 'rgba(239,68,68,0.75)', borderColor: 'rgba(239,68,68,1)', borderWidth: 1, borderRadius: 6 },
                                    ],
                                }}
                                options={{
                                    responsive: true, maintainAspectRatio: false,
                                    plugins: { legend: { position: 'top', labels: { color: '#64748b' } }, tooltip: { callbacks: { label: (ctx) => ` ${formatCurrency(ctx.parsed.y)}` } } },
                                    scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b22' } }, y: { ticks: { color: '#94a3b8', callback: v => formatShort(v) }, grid: { color: '#1e293b22' } } },
                                }}
                            />
                        </div>
                    </div>

                    {/* Period cards */}
                    <div className="periods-wrap">
                        {[
                            { key: 'daily', label: 'Kunlik', sub: 'Bugun', Icon: Clock, cls: 'daily' },
                            { key: 'weekly', label: 'Haftalik', sub: "So'nggi 7 kun", Icon: Calendar, cls: 'weekly' },
                            { key: 'monthly', label: 'Oylik', sub: 'Bu oy', Icon: BarChart3, cls: 'monthly' },
                            { key: 'yearly', label: 'Yillik', sub: `${new Date().getFullYear()}-yil`, Icon: TrendingUp, cls: 'yearly' },
                        ].map(({ key, label, sub, Icon, cls }) => {
                            const s = periodStats[key]
                            const profit = s.income - s.expense
                            const isPos = profit >= 0
                            return (
                                <div key={key} className={`pcard pcard--${cls}`}>
                                    <div className="pcard__accent" />
                                    <div className="pcard__head">
                                        <div className={`pcard__icon pcard__icon--${cls}`}><Icon size={20} /></div>
                                        <div>
                                            <div className="pcard__title">{label}</div>
                                            <div className="pcard__sub">{sub}</div>
                                        </div>
                                        <span className="pcard__count">{s.count} ta</span>
                                    </div>
                                    <div className={`pcard__profit ${isPos ? 'pos' : 'neg'}`}>
                                        {isPos ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                                        <span>{formatCurrency(Math.abs(profit))}</span>
                                        <em>sof foyda</em>
                                    </div>
                                    <div className="pcard__row">
                                        <div className="pcard__stat pcard__stat--in">
                                            <ArrowUpRight size={14} />
                                            <div><div className="pcard__stat-label">Daromad</div><div className="pcard__stat-val">{formatCurrency(s.income)}</div></div>
                                        </div>
                                        <div className="pcard__divider" />
                                        <div className="pcard__stat pcard__stat--out">
                                            <ArrowDownRight size={14} />
                                            <div><div className="pcard__stat-label">Xarajat</div><div className="pcard__stat-val">{formatCurrency(s.expense)}</div></div>
                                        </div>
                                    </div>
                                    {s.income + s.expense > 0 && (
                                        <div className="pcard__bar">
                                            <div className="pcard__bar-fill" style={{ width: `${Math.round((s.income / (s.income + s.expense)) * 100)}%` }} />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </>
            )}

            {/* Jadval ko'rinish */}
            {viewMode === 'table' && (
                <div className="trans-content">
                    {/* Toolbar */}
                    <div className="toolbar" style={{ marginBottom: 0 }}>
                        <div className="search-input">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Qidirish (tavsif, bemor...)..."
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px' }}>
                                    <X size={15} />
                                </button>
                            )}
                        </div>
                        <div className="filter-tabs">
                            <button className={`filter-tab ${filterType === 'all' ? 'active' : ''}`} onClick={() => { setFilterType('all'); setCurrentPage(1) }}>Barchasi</button>
                            <button className={`filter-tab income ${filterType === 'income' ? 'active' : ''}`} onClick={() => { setFilterType('income'); setCurrentPage(1) }}>
                                <ArrowUpRight size={14} /> Daromad
                            </button>
                            <button className={`filter-tab expense ${filterType === 'expense' ? 'active' : ''}`} onClick={() => { setFilterType('expense'); setCurrentPage(1) }}>
                                <ArrowDownRight size={14} /> Xarajat
                            </button>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 500 }}>
                            Jami: <b style={{ color: '#111827' }}>{filteredTransactions.length}</b> ta
                        </div>
                    </div>

                    {/* Summary row — period bo'yicha (periodFilteredTransactions asosida) */}
                    {(() => {
                        const periodLabels = { daily: 'Kunlik', weekly: 'Haftalik', monthly: 'Oylik', yearly: 'Yillik' }
                        const pLabel = periodLabels[activePeriod]
                        // search/type filtridan mustaqil — faqat period filtridan
                        const pIncome = periodFilteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
                        const pExpense = periodFilteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
                        const pProfit = pIncome - pExpense
                        return (
                            <div className="table-summary-row">
                                <div className="tsumm-card tsumm-income">
                                    <ArrowUpRight size={16} />
                                    <div>
                                        <div className="tsumm-label">{pLabel} daromad</div>
                                        <div className="tsumm-val">{formatCurrency(pIncome)}</div>
                                    </div>
                                </div>
                                <div className="tsumm-card tsumm-expense">
                                    <ArrowDownRight size={16} />
                                    <div>
                                        <div className="tsumm-label">{pLabel} xarajat</div>
                                        <div className="tsumm-val">{formatCurrency(pExpense)}</div>
                                    </div>
                                </div>
                                <div className="tsumm-card tsumm-profit">
                                    <Wallet size={16} />
                                    <div>
                                        <div className="tsumm-label">{pLabel} sof foyda</div>
                                        <div className={`tsumm-val ${pProfit >= 0 ? 'pos' : 'neg'}`}>
                                            {formatCurrency(pProfit)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })()}

                    {/* Table */}
                    {loading ? (
                        <div className="loading-state"><div className="spinner" /></div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="empty-state"><Wallet size={40} /><h3>Tranzaksiyalar topilmadi</h3></div>
                    ) : (
                        <div className="data-table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Sana</th>
                                        <th>Turi</th>
                                        <th>Kategoriya</th>
                                        <th>Tavsif</th>
                                        <th>To'lov</th>
                                        <th style={{ textAlign: 'right' }}>Summa</th>
                                        <th style={{ textAlign: 'center' }}>Amallar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedTransactions.map((t, idx) => (
                                        <tr key={t._id}>
                                            <td style={{ color: '#9ca3af', fontWeight: 500 }}>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                {new Date(t.date).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </td>
                                            <td>
                                                <span className={`type-badge ${t.type}`}>
                                                    {t.type === 'income' ? 'Daromad' : 'Xarajat'}
                                                </span>
                                            </td>
                                            <td>{getCategoryLabel(t.category)}</td>
                                            <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.description}>
                                                {t.description || <span style={{ color: '#9ca3af' }}>—</span>}
                                            </td>
                                            <td>
                                                <span className="payment-badge">
                                                    {t.paymentMethod === 'cash' && <Banknote size={13} />}
                                                    {t.paymentMethod === 'card' && <CreditCard size={13} />}
                                                    {t.paymentMethod === 'transfer' && <ArrowUpRight size={13} />}
                                                    {getPaymentLabel(t.paymentMethod)}
                                                </span>
                                            </td>
                                            <td className={t.type} style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount)}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                    <button
                                                        className="action-btn edit"
                                                        title="Tahrirlash"
                                                        onClick={() => openEditModal(t)}
                                                        style={{ padding: '5px 8px', borderRadius: 7 }}
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        className="action-btn delete"
                                                        title="O'chirish"
                                                        onClick={() => openDeleteModal(t)}
                                                        style={{ padding: '5px 8px', borderRadius: 7 }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span>{currentPage} / {totalPages}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* === YANGI TRANZAKSIYA MODAL === */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Yangi tranzaksiya</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            {error && <div className="alert error">{error}</div>}
                            {success && <div className="alert success"><Check size={18} /> {success}</div>}
                            <div className="type-selector">
                                <button type="button" className={`type-btn income ${formData.type === 'income' ? 'active' : ''}`} onClick={() => setFormData({ ...formData, type: 'income' })}><ArrowUpRight size={20} /> Daromad</button>
                                <button type="button" className={`type-btn expense ${formData.type === 'expense' ? 'active' : ''}`} onClick={() => setFormData({ ...formData, type: 'expense' })}><ArrowDownRight size={20} /> Xarajat</button>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Summa *</label><input type="number" className="form-input" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required min="0" /></div>
                                <div className="form-group"><label>Sana</label><input type="date" className="form-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Kategoriya</label>
                                    <select className="form-input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                        {formData.type === 'income'
                                            ? <><option value="medicine_sale">Dori savdosi</option><option value="service">Xizmat</option><option value="other">Boshqa</option></>
                                            : <><option value="medicine_purchase">Dori xaridi</option><option value="salary">Ish haqi</option><option value="rent">Ijara</option><option value="utilities">Kommunal</option><option value="other">Boshqa</option></>
                                        }
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>To'lov usuli</label>
                                    <select className="form-input" value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}>
                                        <option value="cash">Naqd</option><option value="card">Karta</option><option value="transfer">O'tkazma</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group"><label>Tavsif</label><textarea className="form-input" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows="2" /></div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Bekor</button>
                                <button type="submit" className="btn btn-primary"><Plus size={20} /> Qo'shish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* === TAHRIRLASH MODAL === */}
            {showEditModal && editingTransaction && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><Edit2 size={20} style={{ marginRight: 8 }} />Tranzaksiyani tahrirlash</h2>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleUpdate} className="modal-form">
                            {editError && <div className="alert error">{editError}</div>}
                            {editSuccess && <div className="alert success"><Check size={18} /> {editSuccess}</div>}
                            <div className="type-selector">
                                <button type="button" className={`type-btn income ${editFormData.type === 'income' ? 'active' : ''}`} onClick={() => setEditFormData({ ...editFormData, type: 'income' })}><ArrowUpRight size={20} /> Daromad</button>
                                <button type="button" className={`type-btn expense ${editFormData.type === 'expense' ? 'active' : ''}`} onClick={() => setEditFormData({ ...editFormData, type: 'expense' })}><ArrowDownRight size={20} /> Xarajat</button>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Summa *</label><input type="number" className="form-input" value={editFormData.amount} onChange={e => setEditFormData({ ...editFormData, amount: e.target.value })} required min="0" /></div>
                                <div className="form-group"><label>Sana</label><input type="date" className="form-input" value={editFormData.date} onChange={e => setEditFormData({ ...editFormData, date: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Kategoriya</label>
                                    <select className="form-input" value={editFormData.category} onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}>
                                        {editFormData.type === 'income'
                                            ? <><option value="medicine_sale">Dori savdosi</option><option value="service">Xizmat</option><option value="other">Boshqa</option></>
                                            : <><option value="medicine_purchase">Dori xaridi</option><option value="salary">Ish haqi</option><option value="rent">Ijara</option><option value="utilities">Kommunal</option><option value="other">Boshqa</option></>
                                        }
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>To'lov usuli</label>
                                    <select className="form-input" value={editFormData.paymentMethod} onChange={e => setEditFormData({ ...editFormData, paymentMethod: e.target.value })}>
                                        <option value="cash">Naqd</option><option value="card">Karta</option><option value="transfer">O'tkazma</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group"><label>Tavsif</label><textarea className="form-input" value={editFormData.description} onChange={e => setEditFormData({ ...editFormData, description: e.target.value })} rows="2" /></div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Bekor</button>
                                <button type="submit" className="btn btn-primary"><Check size={18} /> Saqlash</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* === O'CHIRISH TASDIQLASH MODAL === */}
            {showDeleteModal && deletingTransaction && (
                <div className="modal-overlay" onClick={() => { setShowDeleteModal(false); setDeletingTransaction(null) }}>
                    <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <AlertTriangle size={22} /> O'chirishni tasdiqlang
                            </h2>
                            <button className="modal-close" onClick={() => { setShowDeleteModal(false); setDeletingTransaction(null) }}><X size={24} /></button>
                        </div>
                        <div style={{ marginBottom: 20, color: '#374151', fontSize: '0.95rem' }}>
                            <p style={{ margin: '0 0 12px' }}>Quyidagi tranzaksiyani o'chirmoqchimisiz?</p>
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px' }}>
                                <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '1.1rem', marginBottom: 4 }}>
                                    {deletingTransaction.type === 'income' ? '+' : '−'}{formatCurrency(deletingTransaction.amount)}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{deletingTransaction.description || getCategoryLabel(deletingTransaction.category)}</div>
                                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 4 }}>{new Date(deletingTransaction.date).toLocaleDateString('uz-UZ')}</div>
                            </div>
                            <p style={{ margin: '12px 0 0', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>
                                ⚠️ Bu amal kassadagi summaga ta'sir qiladi va qaytarib bo'lmaydi!
                            </p>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => { setShowDeleteModal(false); setDeletingTransaction(null) }}>Bekor</button>
                            <button
                                className="btn"
                                style={{ background: '#dc2626', color: '#fff' }}
                                onClick={handleDelete}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? 'O\'chirilmoqda...' : <><Trash2 size={16} /> Ha, o'chirish</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                /* === BALANCE ROW === */
                .balance-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
                .balance-card { display: flex; align-items: center; gap: 14px; padding: 18px 20px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,.05); transition: box-shadow .15s; }
                .balance-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); }
                .balance-icon { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0; }
                .balance-total .balance-icon  { background: #eff6ff; color: #2563eb; }
                .balance-cash .balance-icon   { background: #f0fdf4; color: #16a34a; }
                .balance-card-pay .balance-icon { background: #faf5ff; color: #7c3aed; }
                .balance-transfer .balance-icon { background: #fff7ed; color: #ea580c; }
                .balance-info { display: flex; flex-direction: column; gap: 2px; }
                .balance-label { font-size: 0.78rem; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: .04em; }
                .balance-amount { font-size: 1.1rem; font-weight: 700; }
                .balance-amount.pos { color: #111827; }
                .balance-amount.neg { color: #ef4444; }
                @media (max-width: 900px) { .balance-row { grid-template-columns: repeat(2,1fr); } }
                @media (max-width: 500px) { .balance-row { grid-template-columns: 1fr; } }

                /* === ACCOUNTING === */
                .accounting-v2 { padding: 0; color: #111827; }
                .acc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0; }
                .acc-header h1 { display: flex; align-items: center; gap: 10px; font-size: 1.75rem; font-weight: 700; color: #111827; margin-bottom: 4px; }
                .h-icon { color: #2563eb; }
                .acc-header p { color: #6b7280; font-size: 0.9rem; }
                .header-actions { display: flex; gap: 10px; }

                /* === PERIODS TOGGLE === */
                .periods-toggle-row { display:flex; gap:6px; margin-bottom:18px; flex-wrap:wrap; }
                .ptoggle-btn { display:flex; align-items:center; gap:7px; padding:9px 18px; border:1px solid #e2e8f0; border-radius:10px; background:#fff; color:#6b7280; font-size:.875rem; font-weight:600; cursor:pointer; transition:all .15s; }
                .ptoggle-btn:hover { background:#f1f5f9; color:#111827; border-color:#cbd5e1; }
                .ptoggle-btn.active { background:#2563eb; color:#fff; border-color:#2563eb; box-shadow:0 2px 8px rgba(37,99,235,.3); }

                /* === CHART === */
                .chart-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
                .chart-box h3 { margin: 0 0 20px; font-size: 1rem; font-weight: 600; color: #111827; }
                .chart-wrap { height: 280px; }

                /* === PERIODS CARDS === */
                .periods-wrap { display: grid; grid-template-columns: repeat(4,1fr); gap: 18px; margin-top: 20px; }
                .pcard { background:#fff; border:1px solid #e2e8f0; border-radius:18px; padding:22px 20px 18px; position:relative; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.05); display:flex; flex-direction:column; gap:16px; }
                .pcard__accent { position:absolute; top:0; left:0; right:0; height:4px; border-radius:18px 18px 0 0; }
                .pcard--daily   .pcard__accent { background:linear-gradient(90deg,#2563eb,#60a5fa); }
                .pcard--weekly  .pcard__accent { background:linear-gradient(90deg,#16a34a,#4ade80); }
                .pcard--monthly .pcard__accent { background:linear-gradient(90deg,#7c3aed,#a78bfa); }
                .pcard--yearly  .pcard__accent { background:linear-gradient(90deg,#ea580c,#fb923c); }
                .pcard__head { display:flex; align-items:center; gap:12px; }
                .pcard__icon { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
                .pcard__icon--daily   { background:#eff6ff; color:#2563eb; }
                .pcard__icon--weekly  { background:#f0fdf4; color:#16a34a; }
                .pcard__icon--monthly { background:#f5f3ff; color:#7c3aed; }
                .pcard__icon--yearly  { background:#fff7ed; color:#ea580c; }
                .pcard__title { font-size:.95rem; font-weight:700; color:#111827; }
                .pcard__sub { font-size:.75rem; color:#9ca3af; }
                .pcard__count { margin-left:auto; background:#f1f5f9; color:#6b7280; font-size:.72rem; font-weight:600; padding:3px 9px; border-radius:999px; }
                .pcard__profit { display:flex; align-items:center; gap:6px; padding:14px 16px; border-radius:12px; }
                .pcard__profit.pos { background:#f0fdf4; color:#16a34a; }
                .pcard__profit.neg { background:#fef2f2; color:#dc2626; }
                .pcard__profit span { font-size:1.2rem; font-weight:800; }
                .pcard__profit em { font-style:normal; font-size:.72rem; opacity:.75; margin-left:2px; }
                .pcard__row { display:flex; align-items:stretch; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; }
                .pcard__stat { flex:1; display:flex; align-items:center; gap:8px; padding:12px 14px; }
                .pcard__stat--in  svg { color:#16a34a; flex-shrink:0; }
                .pcard__stat--out svg { color:#dc2626; flex-shrink:0; }
                .pcard__stat-label { font-size:.7rem; color:#9ca3af; font-weight:500; }
                .pcard__stat-val { font-size:.82rem; font-weight:700; color:#111827; margin-top:1px; }
                .pcard__divider { width:1px; background:#e2e8f0; }
                .pcard__bar { height:6px; background:#e2e8f0; border-radius:999px; overflow:hidden; }
                .pcard__bar-fill { height:100%; background:linear-gradient(90deg,#16a34a,#4ade80); border-radius:999px; transition:width .4s; }

                /* === TABLE SUMMARY === */
                .table-summary-row { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
                .tsumm-card { display:flex; align-items:center; gap:12px; padding:14px 18px; border-radius:12px; border:1px solid #e2e8f0; background:#fff; }
                .tsumm-income { border-color:#bbf7d0; background:#f0fdf4; color:#16a34a; }
                .tsumm-expense { border-color:#fecaca; background:#fef2f2; color:#dc2626; }
                .tsumm-profit { border-color:#bfdbfe; background:#eff6ff; color:#2563eb; }
                .tsumm-label { font-size:.75rem; font-weight:500; opacity:.75; }
                .tsumm-val { font-size:1rem; font-weight:800; }
                .tsumm-val.pos { color:#16a34a; }
                .tsumm-val.neg { color:#dc2626; }

                /* === TOOLBAR === */
                .trans-content { display:flex; flex-direction:column; gap:14px; }
                .toolbar { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; background:#fff; border:1px solid #e2e8f0; border-radius:14px; box-shadow:0 1px 4px rgba(0,0,0,.04); flex-wrap:wrap; gap:10px; }
                .search-input { display:flex; align-items:center; gap:10px; background:#f8fafc; padding:8px 14px; border-radius:10px; border:1px solid #e2e8f0; width:280px; }
                .search-input svg { color:#9ca3af; flex-shrink:0; }
                .search-input input { background:none; border:none; color:#111827; width:100%; font-size:.9rem; outline:none; }
                .search-input input::placeholder { color:#9ca3af; }
                .filter-tabs { display:flex; gap:6px; }
                .filter-tab { display:flex; align-items:center; gap:6px; padding:7px 14px; border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc; color:#6b7280; font-size:.85rem; font-weight:500; cursor:pointer; transition:all .15s; }
                .filter-tab:hover { background:#f1f5f9; color:#111827; }
                .filter-tab.active { background:#2563eb; color:#fff; border-color:#2563eb; }
                .filter-tab.income.active { background:#16a34a; border-color:#16a34a; }
                .filter-tab.expense.active { background:#dc2626; border-color:#dc2626; }

                /* === DATA TABLE === */
                .data-table-container { background:#fff; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.04); }
                .data-table { width:100%; border-collapse:collapse; }
                .data-table thead tr { background:#f8fafc; border-bottom:2px solid #e2e8f0; }
                .data-table th { padding:12px 16px; text-align:left; font-size:.78rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; white-space:nowrap; }
                .data-table td { padding:12px 16px; font-size:.88rem; color:#374151; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
                .data-table tbody tr:last-child td { border-bottom:none; }
                .data-table tbody tr:hover { background:#f8fafc; transition:background .1s; }

                .type-badge { padding:3px 10px; border-radius:999px; font-size:.73rem; font-weight:700; }
                .type-badge.income { background:#dcfce7; color:#16a34a; }
                .type-badge.expense { background:#fee2e2; color:#dc2626; }
                td.income { color:#16a34a; font-weight:700; }
                td.expense { color:#dc2626; font-weight:700; }

                .payment-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:8px; background:#f1f5f9; color:#374151; font-size:.78rem; font-weight:600; }

                /* === ACTIONS === */
                .action-btn { border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all .15s; }
                .action-btn.edit { background:#eff6ff; color:#2563eb; }
                .action-btn.edit:hover { background:#dbeafe; }
                .action-btn.delete { background:#fef2f2; color:#dc2626; }
                .action-btn.delete:hover { background:#fee2e2; }

                /* === PAGINATION === */
                .pagination { display:flex; align-items:center; justify-content:center; gap:12px; padding:16px; }
                .pagination button { width:36px; height:36px; border:1px solid #e2e8f0; background:#fff; color:#374151; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
                .pagination button:hover:not(:disabled) { background:#2563eb; color:#fff; border-color:#2563eb; }
                .pagination button:disabled { opacity:.4; cursor:not-allowed; }
                .pagination span { color:#6b7280; font-size:.9rem; }

                /* === MODAL === */
                .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
                .modal { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:28px; width:100%; max-width:520px; box-shadow:0 20px 60px rgba(0,0,0,.15); }
                .modal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
                .modal-header h2 { font-size:1.2rem; font-weight:700; color:#111827; margin:0; display:flex; align-items:center; }
                .modal-close { background:#f1f5f9; border:none; color:#6b7280; border-radius:8px; width:36px; height:36px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; }
                .modal-close:hover { background:#e2e8f0; color:#111827; }
                .modal-form { display:flex; flex-direction:column; gap:16px; }
                .type-selector { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
                .type-btn { display:flex; align-items:center; justify-content:center; gap:8px; padding:14px; background:#f8fafc; border:2px solid #e2e8f0; border-radius:10px; color:#6b7280; font-weight:600; cursor:pointer; transition:all .15s; font-size:.95rem; }
                .type-btn.income.active { background:#dcfce7; border-color:#16a34a; color:#16a34a; }
                .type-btn.expense.active { background:#fee2e2; border-color:#dc2626; color:#dc2626; }
                .form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
                .form-group { display:flex; flex-direction:column; gap:6px; }
                .form-group label { font-size:.85rem; font-weight:600; color:#374151; }
                .form-input { padding:10px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; color:#111827; font-size:.9rem; transition:border-color .15s; outline:none; width:100%; box-sizing:border-box; }
                .form-input:focus { border-color:#2563eb; background:#fff; box-shadow:0 0 0 3px rgba(37,99,235,.1); }
                .modal-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:8px; }
                .alert { padding:12px 16px; border-radius:10px; font-size:.9rem; display:flex; align-items:center; gap:8px; }
                .alert.error { background:#fee2e2; color:#dc2626; border:1px solid #fecaca; }
                .alert.success { background:#dcfce7; color:#16a34a; border:1px solid #bbf7d0; }

                /* === BUTTONS === */
                .btn { display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border-radius:10px; font-weight:600; font-size:.9rem; cursor:pointer; border:none; transition:all .15s; }
                .btn-primary { background:#2563eb; color:#fff; }
                .btn-primary:hover { background:#1d4ed8; box-shadow:0 4px 12px rgba(37,99,235,.3); }
                .btn-secondary { background:#fff; color:#374151; border:1px solid #e2e8f0; }
                .btn-secondary:hover { background:#f1f5f9; border-color:#cbd5e1; }

                /* === LOADING / EMPTY === */
                .loading-state { display:flex; justify-content:center; align-items:center; height:200px; }
                .spinner { width:36px; height:36px; border:3px solid #e2e8f0; border-top-color:#2563eb; border-radius:50%; animation:spin .7s linear infinite; }
                @keyframes spin { to { transform:rotate(360deg); } }
                .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; height:200px; color:#9ca3af; }
                .empty-state h3 { margin:0; color:#6b7280; }

                /* === RESPONSIVE === */
                @media (max-width:1200px) { .periods-wrap { grid-template-columns:repeat(2,1fr); } }
                @media (max-width:900px) { .table-summary-row { grid-template-columns:1fr; } }
                @media (max-width:768px) {
                    .acc-header { flex-direction:column; gap:14px; }
                    .periods-wrap { grid-template-columns:1fr; }
                    .toolbar { flex-direction:column; align-items:stretch; }
                    .search-input { width:100%; }
                    .form-row { grid-template-columns:1fr; }
                    .data-table th, .data-table td { padding:10px 12px; }
                }
            `}</style>
        </div>
    )
}

export default Accounting
