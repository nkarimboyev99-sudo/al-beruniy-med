import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Users,
    Stethoscope,
    Activity,
    TrendingUp,
    TrendingDown,
    UserPlus,
    Calendar
} from 'lucide-react'
import './Dashboard.css'

function Dashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalDiagnoses: 0,
        totalPatients: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token')
            const headers = { 'Authorization': `Bearer ${token}` }
            const user = JSON.parse(localStorage.getItem('user') || '{}')
            const isAdmin = user.role === 'admin'

            const requests = [
                isAdmin ? fetch('/api/auth/users', { headers }).catch(() => ({ ok: false })) : Promise.resolve({ ok: false }),
                fetch('/api/diagnoses', { headers }).catch(() => ({ ok: false })),
                fetch('/api/patients', { headers }).catch(() => ({ ok: false }))
            ]

            const [usersRes, diagnosesRes, patientsRes] = await Promise.all(requests)

            const users = usersRes.ok ? await usersRes.json() : []
            const diagnoses = diagnosesRes.ok ? await diagnosesRes.json() : []
            const patients = patientsRes.ok ? await patientsRes.json() : []

            setStats({
                totalUsers: Array.isArray(users) ? users.length : 0,
                totalDiagnoses: Array.isArray(diagnoses) ? diagnoses.length : 0,
                totalPatients: Array.isArray(patients) ? patients.length : 0
            })
        } catch (error) {
            console.error('Stats fetch error:', error)
        } finally {
            setLoading(false)
        }
    }

    const statCards = [
        {
            title: 'Jami Foydalanuvchilar',
            value: stats.totalUsers,
            icon: Users,
            color: 'blue',
            trend: '+12%',
            trendUp: true
        },
        {
            title: 'Jami Bemorlar',
            value: stats.totalPatients,
            icon: UserPlus,
            color: 'green',
            trend: '+8%',
            trendUp: true
        },
        {
            title: 'Analizlar',
            value: stats.totalDiagnoses,
            icon: Stethoscope,
            color: 'purple',
            trend: '+5%',
            trendUp: true
        }
    ]

    const recentActivities = [
        { action: 'Yangi bemor qo\'shildi', time: '5 daqiqa oldin', icon: UserPlus },
        { action: 'Analiz belgilandi', time: '15 daqiqa oldin', icon: Stethoscope },
        { action: 'Yangi foydalanuvchi yaratildi', time: '2 soat oldin', icon: Users },
    ]

    return (
        <div className="dashboard-page">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>Laboratoriya tizimi statistikasi</p>
                </div>
                <div className="header-date">
                    <Calendar size={20} />
                    <span>{new Date().toLocaleDateString('uz-UZ', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {statCards.map((stat, index) => (
                    <div
                        key={index}
                        className={`stat-card glass-card ${stat.color} ${loading ? 'loading' : ''}`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className="stat-icon">
                            <stat.icon size={28} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-title">{stat.title}</span>
                            <span className="stat-value">{loading ? '...' : stat.value}</span>
                        </div>
                        <div className={`stat-trend ${stat.trendUp ? 'up' : 'down'}`}>
                            {stat.trendUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            <span>{stat.trend}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Content Grid */}
            <div className="dashboard-grid">
                {/* Recent Activity */}
                <div className="activity-card glass-card">
                    <div className="card-header">
                        <h3>So'nggi faoliyatlar</h3>
                        <Activity size={20} />
                    </div>
                    <div className="activity-list">
                        {recentActivities.map((activity, index) => (
                            <div key={index} className="activity-item">
                                <div className="activity-icon">
                                    <activity.icon size={18} />
                                </div>
                                <div className="activity-info">
                                    <span className="activity-action">{activity.action}</span>
                                    <span className="activity-time">{activity.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="quick-actions-card glass-card">
                    <div className="card-header">
                        <h3>Tezkor amallar</h3>
                    </div>
                    <div className="quick-actions">
                        <Link to="/admin/patients" className="quick-action-btn">
                            <UserPlus size={24} />
                            <span>Yangi bemor</span>
                        </Link>
                        <Link to="/admin/diagnoses" className="quick-action-btn">
                            <Stethoscope size={24} />
                            <span>Analiz qo'shish</span>
                        </Link>
                        <Link to="/admin/doctors" className="quick-action-btn">
                            <Users size={24} />
                            <span>Doktorlar</span>
                        </Link>
                    </div>
                </div>
            </div>

            <style>{`
            `}</style>
        </div>
    )
}

export default Dashboard
