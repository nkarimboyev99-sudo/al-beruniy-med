import { useState, useEffect, useRef } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import {
    UserPlus,
    Settings as SettingsIcon,
    LogOut,
    FileText
} from 'lucide-react'
import '../admin/AdminLayout.css'

// Admin sahifalarini import qilish (Doktorlar bo'limisiz)
import PatientManagement from '../admin/PatientManagement'
import DiagnosisForm from './DiagnosisForm'
import AddPatientPage from './AddPatientPage'
import DoctorAnalyses from './DoctorAnalyses'
import Settings from '../admin/Settings'

function DoctorDashboard() {
    const location = useLocation()
    const navigate = useNavigate()
    // Mobile da default yopiq bo'lishi
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024)
    const [user, setUser] = useState(null)
    const [showUserMenu, setShowUserMenu] = useState(false)

    // Refs for dropdown click outside detection
    const userMenuRef = useRef(null)

    // Mobile uchun sidebar yopish funksiyasi
    const closeSidebarOnMobile = () => {
        if (window.innerWidth <= 1024) {
            setSidebarOpen(false)
        }
    }

    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (userData) {
            setUser(JSON.parse(userData))
        } else {
            navigate('/login')
        }
    }, [navigate])

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close user menu if clicked outside
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login')
    }

    // Menu items
    const menuItems = [
        { path: '/doctor/patients', icon: UserPlus, label: 'Bemorlar' },
        { path: '/doctor/settings', icon: SettingsIcon, label: 'Sozlamalar' },
    ]

    const isActive = (path, exact = false) => {
        if (exact) {
            return location.pathname === path
        }
        return location.pathname.startsWith(path)
    }

    return (
        <div className={`admin-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <img src="/logo.png" alt="logo" className="sidebar-logo-img" />
                        {sidebarOpen && <span className="logo-text">Al-Beruniy <span>Med</span></span>}
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${isActive(item.path, item.exact) ? 'active' : ''}`}
                            onClick={closeSidebarOnMobile}
                        >
                            <item.icon size={22} className="nav-icon" />
                            {sidebarOpen && <span className="nav-label">{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={22} />
                        {sidebarOpen && <span>Chiqish</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="admin-main">
                {/* Content Area */}
                <main className="admin-content">
                    <Routes>
                        <Route index element={<PatientManagement />} />
                        <Route path="patients" element={<PatientManagement />} />
                        <Route path="patients/add" element={<AddPatientPage />} />
                        <Route path="patients/diagnosis/:patientId" element={<DiagnosisForm />} />
                        <Route path="analyses" element={<DoctorAnalyses />} />
                        <Route path="settings" element={<Settings />} />
                    </Routes>
                </main>
            </div>
        </div>
    )
}

// Placeholder for coming soon pages
function ComingSoon({ title }) {
    return (
        <div className="coming-soon">
            <div className="coming-soon-content glass-card">
                <FileText size={60} />
                <h2>{title}</h2>
                <p>Bu sahifa tez orada qo'shiladi</p>
            </div>
        </div>
    )
}

export default DoctorDashboard
