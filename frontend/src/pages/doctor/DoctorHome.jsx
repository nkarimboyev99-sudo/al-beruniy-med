import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Users,
    UserPlus,
    Stethoscope,
    Activity,
    Clock,
    TrendingUp,
    Calendar,
    ArrowRight,
    CheckCircle,
    AlertCircle,
    FileText
} from 'lucide-react'
import './DoctorPages.css'

function DoctorHome() {
    const [stats, setStats] = useState({
        totalPatients: 0,
        todayPatients: 0,
        pendingDiagnosis: 0,
        completedToday: 0
    })
    const [recentPatients, setRecentPatients] = useState([])
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState(null)

    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (userData) {
            setUser(JSON.parse(userData))
        }
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/patients', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                const patients = await response.json()

                const today = new Date().toDateString()
                const todayPatients = patients.filter(p =>
                    new Date(p.createdAt).toDateString() === today
                )

                setStats({
                    totalPatients: patients.length,
                    todayPatients: todayPatients.length,
                    pendingDiagnosis: patients.filter(p => !p.diagnoses || p.diagnoses.length === 0).length,
                    completedToday: todayPatients.filter(p => p.diagnoses && p.diagnoses.length > 0).length
                })

                setRecentPatients(patients.slice(0, 6))
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Xayrli tong'
        if (hour < 18) return 'Xayrli kun'
        return 'Xayrli kech'
    }

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('uz-UZ', {
            day: 'numeric',
            month: 'short'
        })
    }

    const statCards = [
        {
            label: 'Jami bemorlar',
            value: stats.totalPatients,
            icon: Users,
            color: 'primary',
            description: 'Umumiy ro\'yxatda'
        },
        {
            label: 'Bugungi',
            value: stats.todayPatients,
            icon: Calendar,
            color: 'accent',
            description: 'Bugun qabul qilingan'
        },
        {
            label: 'Kutilmoqda',
            value: stats.pendingDiagnosis,
            icon: Clock,
            color: 'warning',
            description: 'Analiz kutilmoqda'
        },
        {
            label: 'Yakunlangan',
            value: stats.completedToday,
            icon: CheckCircle,
            color: 'success',
            description: 'Bugun yakunlandi'
        }
    ]

    const quickActions = [
        {
            label: 'Yangi bemor',
            description: 'Ro\'yxatga olish',
            icon: UserPlus,
            path: '/doctor/add-patient',
            color: 'accent'
        },
        {
            label: 'Bemorlar',
            description: 'Ro\'yxatni ko\'rish',
            icon: Users,
            path: '/doctor/patients',
            color: 'primary'
        },
        {
            label: 'Analiz',
            description: 'analiz qo'shish',
            icon: Stethoscope,
            path: '/doctor/diagnosis',
            color: 'success'
        },
        {
            label: 'Dorilar',
            description: 'Katalogni ko\'rish',
            icon: FileText,
            path: '/doctor/medicines',
            color: 'warning'
        }
    ]

    return (
        <div className="doctor-home">
            {/* Hero Welcome Section */}
            <div className="hero-welcome">
                <div className="hero-content">
                    <div className="hero-text">
                        <span className="greeting-badge">
                            <Activity size={16} />
                            {getGreeting()}
                        </span>
                        <h1>
                            {user?.fullName || 'Doktor'}
                            <span className="wave-emoji">👋</span>
                        </h1>
                        <p>Bugungi ishingizga omad tilaymiz! Quyida tezkor statistika va amallar.</p>
                    </div>
                    <div className="hero-action">
                        <Link to="/doctor/add-patient" className="hero-btn">
                            <UserPlus size={20} />
                            <span>Yangi bemor qo'shish</span>
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
                <div className="hero-decoration">
                    <div className="decoration-circle circle-1"></div>
                    <div className="decoration-circle circle-2"></div>
                    <div className="decoration-circle circle-3"></div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-section">
                <div className="stats-grid">
                    {statCards.map((stat, index) => (
                        <div key={index} className={`stat-card ${stat.color}`}>
                            <div className="stat-card-inner">
                                <div className="stat-icon-wrapper">
                                    <div className="stat-icon">
                                        <stat.icon size={24} />
                                    </div>
                                </div>
                                <div className="stat-content">
                                    <span className="stat-value">
                                        {loading ? (
                                            <span className="stat-loading"></span>
                                        ) : (
                                            stat.value
                                        )}
                                    </span>
                                    <span className="stat-label">{stat.label}</span>
                                    <span className="stat-description">{stat.description}</span>
                                </div>
                            </div>
                            <div className="stat-glow"></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="main-content-grid">
                {/* Quick Actions */}
                <div className="quick-actions-section">
                    <div className="section-header">
                        <h2>Tezkor amallar</h2>
                        <p>Eng ko'p ishlatiladigan funksiyalar</p>
                    </div>
                    <div className="quick-actions-grid">
                        {quickActions.map((action, index) => (
                            <Link key={index} to={action.path} className={`quick-action-card ${action.color}`}>
                                <div className="action-icon">
                                    <action.icon size={28} />
                                </div>
                                <div className="action-content">
                                    <span className="action-label">{action.label}</span>
                                    <span className="action-description">{action.description}</span>
                                </div>
                                <ArrowRight size={20} className="action-arrow" />
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Patients */}
                <div className="recent-patients-section">
                    <div className="section-header">
                        <div>
                            <h2>So'nggi bemorlar</h2>
                            <p>Yaqinda qabul qilingan</p>
                        </div>
                        <Link to="/doctor/patients" className="view-all-btn">
                            Barchasi
                            <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div className="patients-list-container">
                        {loading ? (
                            <div className="loading-skeleton">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="skeleton-row">
                                        <div className="skeleton-avatar"></div>
                                        <div className="skeleton-content">
                                            <div className="skeleton-line"></div>
                                            <div className="skeleton-line short"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : recentPatients.length === 0 ? (
                            <div className="empty-patients">
                                <div className="empty-icon">
                                    <Users size={48} />
                                </div>
                                <h3>Bemorlar topilmadi</h3>
                                <p>Yangi bemor qo'shish uchun tugmani bosing</p>
                                <Link to="/doctor/add-patient" className="empty-action-btn">
                                    <UserPlus size={18} />
                                    Yangi bemor
                                </Link>
                            </div>
                        ) : (
                            <div className="patients-scroll-list">
                                {recentPatients.map(patient => (
                                    <div key={patient._id} className="patient-list-item">
                                        <div className="patient-avatar-wrapper">
                                            <div className="patient-avatar">
                                                {patient.fullName?.charAt(0) || 'B'}
                                            </div>
                                            <span className={`status-dot ${patient.diagnoses?.length > 0 ? 'completed' : 'pending'}`}></span>
                                        </div>
                                        <div className="patient-details">
                                            <span className="patient-name">{patient.fullName}</span>
                                            <span className="patient-meta">
                                                {patient.age} yosh • {patient.gender === 'male' ? 'Erkak' : 'Ayol'}
                                            </span>
                                        </div>
                                        <div className="patient-actions">
                                            {patient.diagnoses?.length > 0 ? (
                                                <span className="mini-badge completed">
                                                    <CheckCircle size={12} />
                                                    Yakunlangan
                                                </span>
                                            ) : (
                                                <Link
                                                    to={`/doctor/diagnosis?patient=${patient._id}`}
                                                    className="mini-badge pending clickable"
                                                >
                                                    <AlertCircle size={12} />
                                                    Analiz
                                                </Link>
                                            )}
                                            <span className="patient-date">{formatDate(patient.createdAt)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Stats Banner */}
            <div className="bottom-banner">
                <div className="banner-item">
                    <TrendingUp size={24} />
                    <div className="banner-text">
                        <span className="banner-value">{stats.completedToday}</span>
                        <span className="banner-label">Bugun yakunlandi</span>
                    </div>
                </div>
                <div className="banner-divider"></div>
                <div className="banner-item">
                    <Clock size={24} />
                    <div className="banner-text">
                        <span className="banner-value">{stats.pendingDiagnosis}</span>
                        <span className="banner-label">Kutilmoqda</span>
                    </div>
                </div>
                <div className="banner-divider"></div>
                <div className="banner-item">
                    <Activity size={24} />
                    <div className="banner-text">
                        <span className="banner-value">{stats.totalPatients}</span>
                        <span className="banner-label">Jami</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DoctorHome
