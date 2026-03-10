import { useState, useEffect, useRef } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import {
    UserPlus,
    Settings as SettingsIcon,
    LogOut
} from 'lucide-react'
import '../admin/AdminLayout.css'

import RegistratorPatients from './RegistratorPatients'
import Settings from '../admin/Settings'

function RegistratorDashboard() {
    const location = useLocation()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024)
    const [user, setUser] = useState(null)

    const userMenuRef = useRef(null)

    const closeSidebarOnMobile = () => {
        if (window.innerWidth <= 1024) {
            setSidebarOpen(false)
        }
    }

    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (userData) {
            const parsed = JSON.parse(userData)
            if (parsed.role !== 'registrator') {
                navigate('/login')
            } else {
                setUser(parsed)
            }
        } else {
            navigate('/login')
        }
    }, [navigate])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {}
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login')
    }

    const menuItems = [
        { path: '/registrator/patients', icon: UserPlus, label: 'Bemorlar' },
        { path: '/registrator/settings', icon: SettingsIcon, label: 'Sozlamalar' },
    ]

    const isActive = (path) => location.pathname.startsWith(path)

    return (
        <div className={`admin-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
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
                            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
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

            <div className="admin-main">
                <main className="admin-content">
                    <Routes>
                        <Route index element={<RegistratorPatients />} />
                        <Route path="patients" element={<RegistratorPatients />} />
                        <Route path="settings" element={<Settings />} />
                    </Routes>
                </main>
            </div>
        </div>
    )
}

export default RegistratorDashboard
