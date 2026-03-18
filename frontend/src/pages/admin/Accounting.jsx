import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import * as THREE from 'three'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
    Wallet, Plus, Search, TrendingUp, TrendingDown, Calendar, X, Check,
    ArrowUpRight, ArrowDownRight, BarChart3, PieChart, Activity, CreditCard,
    Banknote, Receipt, ChevronLeft, ChevronRight, Download, Clock
} from 'lucide-react'
import './DataManagement.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

// ── Three.js 3D Bar Chart ──────────────────────────────────────────────────
function PeriodThreeChart({ periodStats, formatCurrency }) {
    const mountRef = useRef(null)
    const animRef = useRef(null)
    const sceneRef = useRef(null)

    const periods = useMemo(() => [
        { label: 'Kunlik',   income: periodStats.daily.income,   expense: periodStats.daily.expense,   color: 0x2563eb },
        { label: 'Haftalik', income: periodStats.weekly.income,  expense: periodStats.weekly.expense,  color: 0x16a34a },
        { label: 'Oylik',    income: periodStats.monthly.income, expense: periodStats.monthly.expense, color: 0x7c3aed },
        { label: 'Yillik',   income: periodStats.yearly.income,  expense: periodStats.yearly.expense,  color: 0xea580c },
    ], [periodStats])

    useEffect(() => {
        const el = mountRef.current
        if (!el) return
        const W = el.clientWidth, H = el.clientHeight || 420

        // Scene
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf8fafc)
        sceneRef.current = scene

        // Camera
        const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000)
        camera.position.set(0, 12, 22)
        camera.lookAt(0, 0, 0)

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(W, H)
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        el.appendChild(renderer.domElement)

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambient)
        const dir = new THREE.DirectionalLight(0xffffff, 0.9)
        dir.position.set(10, 20, 10)
        dir.castShadow = true
        scene.add(dir)
        const fill = new THREE.DirectionalLight(0xffffff, 0.3)
        fill.position.set(-10, 5, -5)
        scene.add(fill)

        // Ground grid
        const grid = new THREE.GridHelper(24, 12, 0xdde1e7, 0xe8ecf0)
        grid.position.y = -0.02
        scene.add(grid)

        // Ground plane
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(28, 20),
            new THREE.MeshLambertMaterial({ color: 0xf1f5f9 })
        )
        ground.rotation.x = -Math.PI / 2
        ground.receiveShadow = true
        scene.add(ground)

        // Max value for normalization
        const maxVal = Math.max(...periods.map(p => Math.max(p.income, p.expense, 1)))

        const barW = 1.0, barGap = 4.0
        const startX = -(periods.length - 1) * barGap / 2
        const bars = []
        const targets = []

        periods.forEach((p, i) => {
            const x = startX + i * barGap
            const incH = Math.max((p.income / maxVal) * 10, 0.15)
            const expH = Math.max((p.expense / maxVal) * 10, 0.15)

            // Income bar
            const incGeo = new THREE.BoxGeometry(barW, 0.01, barW)
            const incMat = new THREE.MeshPhongMaterial({ color: p.color, shininess: 60 })
            const incBar = new THREE.Mesh(incGeo, incMat)
            incBar.position.set(x - 0.6, 0.005, 0)
            incBar.castShadow = true
            scene.add(incBar)
            bars.push(incBar)
            targets.push({ bar: incBar, targetH: incH, targetY: incH / 2 })

            // Expense bar
            const expGeo = new THREE.BoxGeometry(barW, 0.01, barW)
            const expMat = new THREE.MeshPhongMaterial({ color: 0xdc2626, shininess: 60 })
            const expBar = new THREE.Mesh(expGeo, expMat)
            expBar.position.set(x + 0.6, 0.005, 0)
            expBar.castShadow = true
            scene.add(expBar)
            bars.push(expBar)
            targets.push({ bar: expBar, targetH: expH, targetY: expH / 2 })

            // Label canvas
            const canvas = document.createElement('canvas')
            canvas.width = 256; canvas.height = 64
            const ctx = canvas.getContext('2d')
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, 256, 64)
            ctx.fillStyle = '#374151'
            ctx.font = 'bold 28px Arial'
            ctx.textAlign = 'center'
            ctx.fillText(p.label, 128, 42)
            const tex = new THREE.CanvasTexture(canvas)
            const labelMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(2.8, 0.7),
                new THREE.MeshBasicMaterial({ map: tex, transparent: true })
            )
            labelMesh.rotation.x = -Math.PI / 2
            labelMesh.position.set(x, 0.01, 2.2)
            scene.add(labelMesh)
        })

        // Animate bars growing up
        let t = 0
        const animate = () => {
            animRef.current = requestAnimationFrame(animate)
            t += 0.03
            targets.forEach(({ bar, targetH, targetY }) => {
                const progress = Math.min(t, 1)
                const eased = 1 - Math.pow(1 - progress, 3)
                const curH = 0.01 + (targetH - 0.01) * eased
                bar.scale.y = curH / 0.01
                bar.position.y = targetY * eased
            })
            // Slow rotation
            scene.rotation.y = Math.sin(Date.now() * 0.0003) * 0.25
            renderer.render(scene, camera)
        }
        animate()

        // Resize
        const onResize = () => {
            const nW = el.clientWidth, nH = el.clientHeight || 420
            camera.aspect = nW / nH
            camera.updateProjectionMatrix()
            renderer.setSize(nW, nH)
        }
        window.addEventListener('resize', onResize)

        return () => {
            cancelAnimationFrame(animRef.current)
            window.removeEventListener('resize', onResize)
            renderer.dispose()
            if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
        }
    }, [periods])

    return (
        <div style={{ position: 'relative', width: '100%', height: 420, borderRadius: 18, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
            {/* Legend */}
            <div style={{ position: 'absolute', bottom: 16, right: 20, display: 'flex', gap: 16, background: 'rgba(255,255,255,.9)', padding: '8px 14px', borderRadius: 10, fontSize: '.78rem', fontWeight: 600 }}>
                {periods.map((p, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: `#${p.color.toString(16).padStart(6,'0')}`, display: 'inline-block' }}/>
                        {p.label}
                    </span>
                ))}
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#dc2626', display: 'inline-block' }}/>
                    Xarajat
                </span>
            </div>
        </div>
    )
}
// ──────────────────────────────────────────────────────────────────────────────

function Accounting() {
    const [transactions, setTransactions] = useState([])
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netProfit: 0 })
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState('all')
    const [periodsView, setPeriodsView] = useState('cards') // unused but kept for safety
    const [activePeriod, setActivePeriod] = useState('daily') // 'daily'|'weekly'|'monthly'|'yearly'
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10
    const [formData, setFormData] = useState({
        type: 'income', category: 'service', amount: '', description: '', paymentMethod: 'cash',
        date: new Date().toISOString().split('T')[0]
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => { fetchTransactions(); fetchSummary() }, [])

    const fetchTransactions = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } })
            if (response.ok) setTransactions(await response.json())
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const fetchSummary = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/transactions/summary', { headers: { 'Authorization': `Bearer ${token}` } })
            if (response.ok) setSummary(await response.json())
        } catch (err) { console.error(err) }
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
                fetchTransactions(); fetchSummary()
                setTimeout(() => { setShowModal(false); setSuccess('') }, 1500)
            } else setError(data.message || 'Xatolik')
        } catch (err) { setError('Server bilan aloqa yo\'q') }
    }

    // Export to CSV
    const exportToCSV = () => {
        if (transactions.length === 0) {
            alert('Eksport qilish uchun tranzaksiyalar yo\'q')
            return
        }

        const headers = ['#', 'Sana', 'Turi', 'Kategoriya', 'Tavsif', 'To\'lov usuli', 'Summa']
        const rows = transactions.map((t, i) => [
            i + 1,
            new Date(t.date).toLocaleDateString('uz-UZ'),
            t.type === 'income' ? 'Daromad' : 'Xarajat',
            getCategoryLabel(t.category),
            t.description || '-',
            getPaymentLabel(t.paymentMethod),
            (t.type === 'income' ? '+' : '-') + t.amount
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        // Add BOM for Excel UTF-8 support
        const BOM = '\uFEFF'
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `hisob-kitob_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase())
        if (filterType === 'income') return matchesSearch && t.type === 'income'
        if (filterType === 'expense') return matchesSearch && t.type === 'expense'
        return matchesSearch
    })

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
    const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    const formatCurrency = (amount) => new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m'
    const formatShort = (amount) => amount >= 1e9 ? (amount / 1e9).toFixed(1) + ' mlrd' : amount >= 1e6 ? (amount / 1e6).toFixed(1) + ' mln' : amount >= 1e3 ? (amount / 1e3).toFixed(0) + 'K' : amount.toString()
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

        // Parse transaction date properly
        const getTransactionDate = (t) => {
            if (!t.date) return null
            const d = new Date(t.date)
            return new Date(d.getFullYear(), d.getMonth(), d.getDate())
        }

        const daily = calcStats(transactions.filter(t => {
            const tDate = getTransactionDate(t)
            return tDate && tDate.getTime() === todayStart.getTime()
        }))

        const weekly = calcStats(transactions.filter(t => {
            const tDate = getTransactionDate(t)
            return tDate && tDate >= weekAgo
        }))

        const monthly = calcStats(transactions.filter(t => {
            const tDate = getTransactionDate(t)
            return tDate && tDate >= monthStart
        }))

        const yearly = calcStats(transactions.filter(t => {
            const tDate = getTransactionDate(t)
            return tDate && tDate >= yearStart
        }))

        return { daily, weekly, monthly, yearly }
    }, [transactions])

    // Real vaqt balansi — to'lov turi bo'yicha barcha kirim-chiqimlar
    const realBalance = useMemo(() => {
        const calc = (method) => {
            const income  = transactions.filter(t => t.type === 'income'  && t.paymentMethod === method).reduce((s, t) => s + t.amount, 0)
            const expense = transactions.filter(t => t.type === 'expense' && t.paymentMethod === method).reduce((s, t) => s + t.amount, 0)
            return income - expense
        }
        return {
            cash:     calc('cash'),
            card:     calc('card'),
            transfer: calc('transfer'),
            total:    ['cash','card','transfer'].reduce((s, m) => {
                const inc = transactions.filter(t => t.type === 'income'  && t.paymentMethod === m).reduce((a, t) => a + t.amount, 0)
                const exp = transactions.filter(t => t.type === 'expense' && t.paymentMethod === m).reduce((a, t) => a + t.amount, 0)
                return s + inc - exp
            }, 0)
        }
    }, [transactions])

    // Period bar chart data (Kunlik/Haftalik/Oylik/Yillik grafigi uchun)
    const periodBarChartData = useMemo(() => {
        const now = new Date()

        const getDateOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

        const calcIncomeExpense = (list) => ({
            income: list.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
            expense: list.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        })

        // Kunlik: oxirgi 7 kun
        if (activePeriod === 'daily') {
            const labels = [], incomes = [], expenses = []
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now); d.setDate(d.getDate() - i)
                const dayStart = getDateOnly(d)
                const dayEnd = new Date(dayStart.getTime() + 86400000)
                const filtered = transactions.filter(t => {
                    if (!t.date) return false
                    const td = new Date(t.date)
                    return td >= dayStart && td < dayEnd
                })
                const r = calcIncomeExpense(filtered)
                labels.push(d.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric' }))
                incomes.push(r.income)
                expenses.push(r.expense)
            }
            return { labels, incomes, expenses }
        }

        // Haftalik: oxirgi 8 hafta
        if (activePeriod === 'weekly') {
            const labels = [], incomes = [], expenses = []
            for (let i = 7; i >= 0; i--) {
                const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() - i * 7)
                const weekStart = new Date(weekEnd); weekStart.setDate(weekStart.getDate() - 6)
                const wsDate = getDateOnly(weekStart), weDate = getDateOnly(weekEnd)
                weDate.setDate(weDate.getDate() + 1)
                const filtered = transactions.filter(t => {
                    if (!t.date) return false
                    const td = getDateOnly(new Date(t.date))
                    return td >= wsDate && td < weDate
                })
                const r = calcIncomeExpense(filtered)
                labels.push(weekStart.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }))
                incomes.push(r.income)
                expenses.push(r.expense)
            }
            return { labels, incomes, expenses }
        }

        // Oylik: oxirgi 12 oy
        if (activePeriod === 'monthly') {
            const labels = [], incomes = [], expenses = []
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
                const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
                const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1)
                const filtered = transactions.filter(t => {
                    if (!t.date) return false
                    const td = new Date(t.date)
                    return td >= monthStart && td < monthEnd
                })
                const r = calcIncomeExpense(filtered)
                labels.push(d.toLocaleDateString('uz-UZ', { month: 'short', year: '2-digit' }))
                incomes.push(r.income)
                expenses.push(r.expense)
            }
            return { labels, incomes, expenses }
        }

        // Yillik: oxirgi 5 yil
        const labels = [], incomes = [], expenses = []
        for (let i = 4; i >= 0; i--) {
            const year = now.getFullYear() - i
            const yearStart = new Date(year, 0, 1)
            const yearEnd = new Date(year + 1, 0, 1)
            const filtered = transactions.filter(t => {
                if (!t.date) return false
                const td = new Date(t.date)
                return td >= yearStart && td < yearEnd
            })
            const r = calcIncomeExpense(filtered)
            labels.push(`${year}`)
            incomes.push(r.income)
            expenses.push(r.expense)
        }
        return { labels, incomes, expenses }
    }, [transactions, activePeriod])

    // Excel yuklab olish — tanlangan davrga mos tranzaksiyalarni to'liq chiqarish
    const downloadExcel = useCallback(() => {
        const now = new Date()
        const getDateOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
        const todayStart = getDateOnly(now)

        const periodLabels = { daily: 'Kunlik', weekly: 'Haftalik', monthly: 'Oylik', yearly: 'Yillik' }
        const periodLabel = periodLabels[activePeriod]

        // Davrga qarab tranzaksiyalarni filtrlash
        const filtered = transactions.filter(t => {
            if (!t.date) return false
            const td = getDateOnly(new Date(t.date))
            if (activePeriod === 'daily') {
                return td.getTime() === todayStart.getTime()
            }
            if (activePeriod === 'weekly') {
                const weekAgo = new Date(todayStart); weekAgo.setDate(weekAgo.getDate() - 6)
                return td >= weekAgo && td <= todayStart
            }
            if (activePeriod === 'monthly') {
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                return td >= monthStart && td <= todayStart
            }
            // yearly
            const yearStart = new Date(now.getFullYear(), 0, 1)
            return td >= yearStart && td <= todayStart
        })

        if (filtered.length === 0) {
            alert('Bu davrda tranzaksiyalar topilmadi!')
            return
        }

        // Jadval qatorlari
        const rows = filtered.map((t, i) => ({
            '#': i + 1,
            'Sana': new Date(t.date).toLocaleDateString('uz-UZ'),
            'Turi': t.type === 'income' ? 'Daromad' : 'Xarajat',
            'Kategoriya': getCategoryLabel(t.category),
            'Tavsif': t.description || '-',
            "To'lov": getPaymentLabel(t.paymentMethod),
            'Summa (so\'m)': t.type === 'income' ? t.amount : -t.amount,
        }))

        // Jami qator
        const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        rows.push({
            '#': '',
            'Sana': 'JAMI',
            'Turi': '',
            'Kategoriya': '',
            'Tavsif': `Kirim: ${totalIncome.toLocaleString()} | Chiqim: ${totalExpense.toLocaleString()}`,
            "To'lov": '',
            'Summa (so\'m)': totalIncome - totalExpense,
        })

        const ws = XLSX.utils.json_to_sheet(rows)
        ws['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 50 }, { wch: 12 }, { wch: 18 }]

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, periodLabel)

        const dateStr = now.toLocaleDateString('uz-UZ').replace(/\./g, '-')
        XLSX.writeFile(wb, `${periodLabel}_tranzaksiyalar_${dateStr}.xlsx`)
    }, [transactions, activePeriod])

    // Chart data
    const chartData = useMemo(() => {
        const last7Days = []
        for (let i = 6; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            last7Days.push({
                dateStr: date.toISOString().split('T')[0],
                dateObj: new Date(date.getFullYear(), date.getMonth(), date.getDate())
            })
        }

        const dailyData = last7Days.map(day => {
            const dayT = transactions.filter(t => {
                if (!t.date) return false
                const tDate = new Date(t.date)
                const tDateNorm = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate())
                return tDateNorm.getTime() === day.dateObj.getTime()
            })
            return {
                date: day.dateStr,
                income: dayT.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
                expense: dayT.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
            }
        })

        const categoryData = {}
        transactions.forEach(t => {
            if (!categoryData[t.category]) categoryData[t.category] = 0
            categoryData[t.category] += t.amount
        })

        return { dailyData, categoryData }
    }, [transactions])

    const lineChartData = {
        labels: chartData.dailyData.map(d => new Date(d.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })),
        datasets: [
            { label: 'Daromad', data: chartData.dailyData.map(d => d.income), borderColor: '#52c41a', backgroundColor: 'rgba(82,196,26,0.1)', fill: true, tension: 0.4 },
            { label: 'Xarajat', data: chartData.dailyData.map(d => d.expense), borderColor: '#ff4d4f', backgroundColor: 'rgba(255,77,79,0.1)', fill: true, tension: 0.4 }
        ]
    }

    const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { usePointStyle: true, color: '#94a3b8' } }, tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + formatCurrency(ctx.raw) } } }, scales: { x: { grid: { display: false }, ticks: { color: '#64748b' } }, y: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#64748b', callback: v => formatShort(v) } } } }

    const categoryColors = { medicine_sale: '#52c41a', medicine_purchase: '#ff4d4f', service: '#1890ff', salary: '#faad14', rent: '#722ed1', utilities: '#13c2c2', other: '#8c8c8c' }
    const doughnutData = { labels: Object.keys(chartData.categoryData).map(getCategoryLabel), datasets: [{ data: Object.values(chartData.categoryData), backgroundColor: Object.keys(chartData.categoryData).map(c => categoryColors[c] || '#8c8c8c'), borderWidth: 0 }] }

    return (
        <div className="accounting-v2">
            <div className="acc-header">
                <div><h1><Wallet className="h-icon" /> Hisob-kitob</h1><p>Moliyaviy operatsiyalar va tahlillar</p></div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={exportToCSV}><Download size={18} /> Export</button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={20} /> Yangi tranzaksiya</button>
                </div>
            </div>

            {/* ── Real vaqt balansi ── */}
            <div className="balance-row">
                <div className="balance-card balance-total">
                    <div className="balance-icon"><Wallet size={22}/></div>
                    <div className="balance-info">
                        <span className="balance-label">Umumiy balans</span>
                        <strong className={`balance-amount ${realBalance.total >= 0 ? 'pos' : 'neg'}`}>{formatCurrency(realBalance.total)}</strong>
                    </div>
                </div>
                <div className="balance-card balance-cash">
                    <div className="balance-icon"><Banknote size={22}/></div>
                    <div className="balance-info">
                        <span className="balance-label">Naqd pul</span>
                        <strong className={`balance-amount ${realBalance.cash >= 0 ? 'pos' : 'neg'}`}>{formatCurrency(realBalance.cash)}</strong>
                    </div>
                </div>
                <div className="balance-card balance-card-pay">
                    <div className="balance-icon"><CreditCard size={22}/></div>
                    <div className="balance-info">
                        <span className="balance-label">Karta</span>
                        <strong className={`balance-amount ${realBalance.card >= 0 ? 'pos' : 'neg'}`}>{formatCurrency(realBalance.card)}</strong>
                    </div>
                </div>
                <div className="balance-card balance-transfer">
                    <div className="balance-icon"><ArrowUpRight size={22}/></div>
                    <div className="balance-info">
                        <span className="balance-label">O'tkazma</span>
                        <strong className={`balance-amount ${realBalance.transfer >= 0 ? 'pos' : 'neg'}`}>{formatCurrency(realBalance.transfer)}</strong>
                    </div>
                </div>
            </div>

            <div>
                <div className="periods-toggle-row">
                    {[
                        { key: 'daily',   label: 'Kunlik',   Icon: Clock },
                        { key: 'weekly',  label: 'Haftalik', Icon: Calendar },
                        { key: 'monthly', label: 'Oylik',    Icon: BarChart3 },
                        { key: 'yearly',  label: 'Yillik',   Icon: TrendingUp },
                    ].map(({ key, label, Icon }) => (
                        <button
                            key={key}
                            className={`ptoggle-btn ${activePeriod === key ? 'active' : ''}`}
                            onClick={() => setActivePeriod(key)}
                        >
                            <Icon size={16}/> {label}
                        </button>
                    ))}
                </div>

                {/* Kirim / Chiqim Bar grafigi */}
                <div className="chart-box wide" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <h3 style={{ margin: 0 }}>
                            {activePeriod === 'daily' && 'Kunlik kirim / chiqim (oxirgi 7 kun)'}
                            {activePeriod === 'weekly' && 'Haftalik kirim / chiqim (oxirgi 8 hafta)'}
                            {activePeriod === 'monthly' && 'Oylik kirim / chiqim (oxirgi 12 oy)'}
                            {activePeriod === 'yearly' && 'Yillik kirim / chiqim (oxirgi 5 yil)'}
                        </h3>
                        <button
                            onClick={downloadExcel}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '7px 16px', borderRadius: 8,
                                background: '#16a34a', color: '#fff',
                                border: 'none', cursor: 'pointer',
                                fontSize: '0.85rem', fontWeight: 600,
                                boxShadow: '0 2px 6px rgba(22,163,74,0.3)',
                            }}
                        >
                            <Download size={15} /> Excel yuklab olish
                        </button>
                    </div>
                    <div className="chart-wrap">
                        <Bar
                            data={{
                                labels: periodBarChartData.labels,
                                datasets: [
                                    {
                                        label: 'Kirim',
                                        data: periodBarChartData.incomes,
                                        backgroundColor: 'rgba(34,197,94,0.75)',
                                        borderColor: 'rgba(34,197,94,1)',
                                        borderWidth: 1,
                                        borderRadius: 6,
                                    },
                                    {
                                        label: 'Chiqim',
                                        data: periodBarChartData.expenses,
                                        backgroundColor: 'rgba(239,68,68,0.75)',
                                        borderColor: 'rgba(239,68,68,1)',
                                        borderWidth: 1,
                                        borderRadius: 6,
                                    },
                                ],
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'top', labels: { color: '#64748b' } },
                                    tooltip: {
                                        callbacks: {
                                            label: (ctx) => ` ${formatCurrency(ctx.parsed.y)}`
                                        }
                                    }
                                },
                                scales: {
                                    x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b22' } },
                                    y: { ticks: { color: '#94a3b8', callback: v => formatCurrency(v) }, grid: { color: '#1e293b22' } },
                                },
                            }}
                        />
                    </div>
                </div>

                <div className="periods-wrap">
                    {[
                        { key: 'daily',   label: 'Kunlik',   sub: 'Bugun',          Icon: Clock,    cls: 'daily'   },
                        { key: 'weekly',  label: 'Haftalik', sub: "So'nggi 7 kun",  Icon: Calendar, cls: 'weekly'  },
                        { key: 'monthly', label: 'Oylik',    sub: 'Bu oy',          Icon: BarChart3,cls: 'monthly' },
                        { key: 'yearly',  label: 'Yillik',   sub: `${new Date().getFullYear()}-yil`, Icon: TrendingUp, cls: 'yearly' },
                    ].map(({ key, label, sub, Icon, cls }) => {
                        const s = periodStats[key]
                        const profit = s.income - s.expense
                        const isPos = profit >= 0
                        return (
                            <div key={key} className={`pcard pcard--${cls}`}>
                                {/* top accent */}
                                <div className="pcard__accent" />

                                {/* header */}
                                <div className="pcard__head">
                                    <div className={`pcard__icon pcard__icon--${cls}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <div className="pcard__title">{label}</div>
                                        <div className="pcard__sub">{sub}</div>
                                    </div>
                                    <span className="pcard__count">{s.count} ta</span>
                                </div>

                                {/* profit hero */}
                                <div className={`pcard__profit ${isPos ? 'pos' : 'neg'}`}>
                                    {isPos ? <ArrowUpRight size={18}/> : <ArrowDownRight size={18}/>}
                                    <span>{formatCurrency(Math.abs(profit))}</span>
                                    <em>sof foyda</em>
                                </div>

                                {/* income / expense row */}
                                <div className="pcard__row">
                                    <div className="pcard__stat pcard__stat--in">
                                        <ArrowUpRight size={14}/>
                                        <div>
                                            <div className="pcard__stat-label">Daromad</div>
                                            <div className="pcard__stat-val">{formatCurrency(s.income)}</div>
                                        </div>
                                    </div>
                                    <div className="pcard__divider"/>
                                    <div className="pcard__stat pcard__stat--out">
                                        <ArrowDownRight size={14}/>
                                        <div>
                                            <div className="pcard__stat-label">Xarajat</div>
                                            <div className="pcard__stat-val">{formatCurrency(s.expense)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* progress bar */}
                                {s.income + s.expense > 0 && (
                                    <div className="pcard__bar">
                                        <div
                                            className="pcard__bar-fill"
                                            style={{ width: `${Math.round((s.income / (s.income + s.expense)) * 100)}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>Yangi tranzaksiya</h2><button className="modal-close" onClick={() => setShowModal(false)}><X size={24} /></button></div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            {error && <div className="alert error">{error}</div>}
                            {success && <div className="alert success"><Check size={18} /> {success}</div>}
                            <div className="type-selector">
                                <button type="button" className={`type-btn income ${formData.type === 'income' ? 'active' : ''}`} onClick={() => setFormData({ ...formData, type: 'income' })}><ArrowUpRight size={20} /> Daromad</button>
                                <button type="button" className={`type-btn expense ${formData.type === 'expense' ? 'active' : ''}`} onClick={() => setFormData({ ...formData, type: 'expense' })}><ArrowDownRight size={20} /> Xarajat</button>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Summa *</label><input type="number" className="form-input" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required /></div>
                                <div className="form-group"><label>Sana</label><input type="date" className="form-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Kategoriya</label><select className="form-input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>{formData.type === 'income' ? <><option value="medicine_sale">Dori savdosi</option><option value="service">Xizmat</option><option value="other">Boshqa</option></> : <><option value="medicine_purchase">Dori xaridi</option><option value="salary">Ish haqi</option><option value="rent">Ijara</option><option value="utilities">Kommunal</option><option value="other">Boshqa</option></>}</select></div>
                                <div className="form-group"><label>To'lov usuli</label><select className="form-input" value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}><option value="cash">Naqd</option><option value="card">Karta</option><option value="transfer">O'tkazma</option></select></div>
                            </div>
                            <div className="form-group"><label>Tavsif</label><textarea className="form-input" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows="2" /></div>
                            <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Bekor</button><button type="submit" className="btn btn-primary"><Plus size={20} /> Qo'shish</button></div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                /* === REAL BALANCE ROW === */
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
                .balance-amount { font-size: 1.15rem; font-weight: 700; }
                .balance-amount.pos { color: #111827; }
                .balance-amount.neg { color: #ef4444; }
                @media (max-width: 900px) { .balance-row { grid-template-columns: repeat(2,1fr); } }
                @media (max-width: 500px) { .balance-row { grid-template-columns: 1fr; } }

                /* === ACCOUNTING LIGHT THEME === */
                .accounting-v2 { padding: 0; color: #111827; }

                /* Header */
                .acc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0; }
                .acc-header h1 { display: flex; align-items: center; gap: 10px; font-size: 1.75rem; font-weight: 700; color: #111827; margin-bottom: 4px; }
                .h-icon { color: #2563eb; }
                .acc-header p { color: #6b7280; font-size: 0.9rem; }
                .header-actions { display: flex; gap: 10px; }

                /* Tabs */
                .acc-tabs { display: flex; gap: 4px; padding: 5px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 28px; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
                .tab-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; background: transparent; color: #6b7280; border-radius: 10px; cursor: pointer; font-weight: 500; font-size: 0.9rem; transition: all .15s; }
                .tab-btn:hover { background: #f1f5f9; color: #111827; }
                .tab-btn.active { background: #2563eb; color: #ffffff; box-shadow: 0 2px 8px rgba(37,99,235,.3); }

                /* Summary cards */
                .summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
                .sum-card { display: flex; align-items: center; gap: 16px; padding: 20px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
                .sum-card span { font-size: 0.8rem; color: #6b7280; font-weight: 500; }
                .sum-card strong { font-size: 1.35rem; font-weight: 700; display: block; color: #111827; margin-top: 2px; }
                .sum-card.income svg { color: #16a34a; }
                .sum-card.expense svg { color: #dc2626; }
                .sum-card.profit svg { color: #2563eb; }
                .sum-card.total svg { color: #7c3aed; }
                .sum-card strong.pos { color: #16a34a; }
                .sum-card strong.neg { color: #dc2626; }

                /* Charts */
                .charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
                .chart-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
                .chart-box.full { grid-column: 1 / -1; }
                .chart-box h3 { margin: 0 0 20px; font-size: 1rem; font-weight: 600; color: #111827; }
                .chart-wrap { height: 280px; }
                .chart-wrap.lg { height: 350px; }

                /* ── Periods toggle ── */
                .periods-toggle-row { display:flex; gap:6px; margin-bottom:18px; }
                .ptoggle-btn { display:flex; align-items:center; gap:7px; padding:9px 18px; border:1px solid #e2e8f0; border-radius:10px; background:#fff; color:#6b7280; font-size:.875rem; font-weight:600; cursor:pointer; transition:all .15s; }
                .ptoggle-btn:hover { background:#f1f5f9; color:#111827; border-color:#cbd5e1; }
                .ptoggle-btn.active { background:#2563eb; color:#fff; border-color:#2563eb; box-shadow:0 2px 8px rgba(37,99,235,.3); }

                /* ── Periods ── */
                .periods-wrap { display: grid; grid-template-columns: repeat(4,1fr); gap: 18px; }
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
                .pcard__title { font-size:.95rem; font-weight:700; color:#111827; line-height:1.2; }
                .pcard__sub { font-size:.75rem; color:#9ca3af; margin-top:1px; }
                .pcard__count { margin-left:auto; background:#f1f5f9; color:#6b7280; font-size:.72rem; font-weight:600; padding:3px 9px; border-radius:999px; white-space:nowrap; }

                .pcard__profit { display:flex; align-items:center; gap:6px; padding:14px 16px; border-radius:12px; }
                .pcard__profit.pos { background:#f0fdf4; color:#16a34a; }
                .pcard__profit.neg { background:#fef2f2; color:#dc2626; }
                .pcard__profit span { font-size:1.3rem; font-weight:800; }
                .pcard__profit em { font-style:normal; font-size:.72rem; color:inherit; opacity:.75; margin-left:2px; }

                .pcard__row { display:flex; align-items:stretch; gap:0; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; }
                .pcard__stat { flex:1; display:flex; align-items:center; gap:8px; padding:12px 14px; }
                .pcard__stat--in  svg { color:#16a34a; flex-shrink:0; }
                .pcard__stat--out svg { color:#dc2626; flex-shrink:0; }
                .pcard__stat-label { font-size:.7rem; color:#9ca3af; font-weight:500; }
                .pcard__stat-val { font-size:.88rem; font-weight:700; color:#111827; margin-top:1px; }
                .pcard__divider { width:1px; background:#e2e8f0; align-self:stretch; }

                .pcard__bar { height:6px; background:#e2e8f0; border-radius:999px; overflow:hidden; }
                .pcard__bar-fill { height:100%; background:linear-gradient(90deg,#16a34a,#4ade80); border-radius:999px; transition:width .4s ease; }

                /* Transactions table */
                .trans-content { display: flex; flex-direction: column; gap: 16px; }
                .toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
                .search-input { display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 8px 14px; border-radius: 10px; border: 1px solid #e2e8f0; width: 280px; }
                .search-input svg { color: #9ca3af; flex-shrink: 0; }
                .search-input input { background: none; border: none; color: #111827; width: 100%; font-size: 0.9rem; outline: none; }
                .search-input input::placeholder { color: #9ca3af; }
                .filter-tabs { display: flex; gap: 6px; }
                .filter-tab { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; color: #6b7280; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all .15s; }
                .filter-tab:hover { background: #f1f5f9; color: #111827; }
                .filter-tab.active { background: #2563eb; color: #ffffff; border-color: #2563eb; }
                .filter-tab.income.active { background: #16a34a; border-color: #16a34a; color: #fff; }
                .filter-tab.expense.active { background: #dc2626; border-color: #dc2626; color: #fff; }

                .data-table-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table thead tr { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
                .data-table th { padding: 12px 16px; text-align: left; font-size: 0.8rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; }
                .data-table td { padding: 13px 16px; font-size: 0.9rem; color: #374151; border-bottom: 1px solid #f1f5f9; }
                .data-table tbody tr:last-child td { border-bottom: none; }
                .data-table tbody tr:hover { background: #f8fafc; }

                .type-badge { padding: 4px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
                .type-badge.income { background: #dcfce7; color: #16a34a; }
                .type-badge.expense { background: #fee2e2; color: #dc2626; }
                td.income { color: #16a34a; font-weight: 600; }
                td.expense { color: #dc2626; font-weight: 600; }

                /* Pagination */
                .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px; }
                .pagination button { width: 36px; height: 36px; border: 1px solid #e2e8f0; background: #ffffff; color: #374151; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; }
                .pagination button:hover:not(:disabled) { background: #2563eb; color: white; border-color: #2563eb; }
                .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
                .pagination span { color: #6b7280; font-size: 0.9rem; }

                /* Analytics */
                .analytics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .analytics-grid .chart-box.full { grid-column: 1 / -1; }
                .stats-list { display: flex; flex-direction: column; gap: 10px; }
                .stat-item { display: flex; justify-content: space-between; align-items: center; padding: 13px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; }
                .stat-item span { color: #6b7280; font-size: 0.875rem; }
                .stat-item strong { font-size: 1rem; font-weight: 700; color: #111827; }
                .stat-item strong.income { color: #16a34a; }
                .stat-item strong.expense { color: #dc2626; }

                /* Modal */
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
                .modal { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; width: 100%; max-width: 520px; box-shadow: 0 20px 60px rgba(0,0,0,.15); }
                .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
                .modal-header h2 { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0; }
                .modal-close { background: #f1f5f9; border: none; color: #6b7280; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; }
                .modal-close:hover { background: #e2e8f0; color: #111827; }
                .modal-form { display: flex; flex-direction: column; gap: 16px; }
                .type-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .type-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 10px; color: #6b7280; font-weight: 600; cursor: pointer; transition: all .15s; font-size: 0.95rem; }
                .type-btn:hover { border-color: #cbd5e1; color: #374151; }
                .type-btn.income.active { background: #dcfce7; border-color: #16a34a; color: #16a34a; }
                .type-btn.expense.active { background: #fee2e2; border-color: #dc2626; color: #dc2626; }
                .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .form-group { display: flex; flex-direction: column; gap: 6px; }
                .form-group label { font-size: 0.85rem; font-weight: 600; color: #374151; }
                .form-input { padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; color: #111827; font-size: 0.9rem; transition: border-color .15s; outline: none; width: 100%; box-sizing: border-box; }
                .form-input:focus { border-color: #2563eb; background: #ffffff; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
                .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
                .alert { padding: 12px 16px; border-radius: 10px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; }
                .alert.error { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
                .alert.success { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }

                /* Buttons */
                .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; font-weight: 600; font-size: 0.9rem; cursor: pointer; border: none; transition: all .15s; }
                .btn-primary { background: #2563eb; color: #ffffff; }
                .btn-primary:hover { background: #1d4ed8; box-shadow: 0 4px 12px rgba(37,99,235,.3); }
                .btn-secondary { background: #ffffff; color: #374151; border: 1px solid #e2e8f0; }
                .btn-secondary:hover { background: #f1f5f9; border-color: #cbd5e1; }

                /* Loading / Empty */
                .loading-state { display: flex; justify-content: center; align-items: center; height: 200px; }
                .spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin .7s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; height: 200px; color: #9ca3af; }
                .empty-state h3 { margin: 0; color: #6b7280; }

                /* Responsive */
                @media (max-width: 1200px) { .periods-wrap { grid-template-columns: repeat(2,1fr); } }
                @media (max-width: 1024px) { .summary-row { grid-template-columns: repeat(2, 1fr); } .charts-row, .analytics-grid { grid-template-columns: 1fr; } }
                @media (max-width: 768px) { .acc-header { flex-direction: column; gap: 14px; } .summary-row, .periods-wrap { grid-template-columns: 1fr; } .toolbar { flex-direction: column; align-items: stretch; gap: 10px; } .search-input { width: 100%; } .form-row { grid-template-columns: 1fr; } }
            `}</style>
        </div>
    )
}

export default Accounting
