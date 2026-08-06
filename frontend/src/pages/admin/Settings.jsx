import { useState, useEffect } from 'react'
import {
    Settings as SettingsIcon,
    User,
    Lock,
    Building2,
    Phone,
    Mail,
    MapPin,
    Save,
    Check,
    X,
    Eye,
    EyeOff,
    Printer,
    FileText,
    Palette,
    Bell
} from 'lucide-react'
import './DataManagement.css'
import './Settings.css'

function Settings() {
    const [activeTab, setActiveTab] = useState('profile')
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    // Profile form
    const [profileData, setProfileData] = useState({
        fullName: '',
        phone: '',
        email: ''
    })

    // Password form
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    })

    // Clinic settings
    const [clinicData, setClinicData] = useState({
        clinicName: 'Al-Beruniy Med',
        address: 'Toshkent sh., Mirzo Ulug\'bek tumani',
        phone: '+998 71 123 45 67',
        email: 'info@labregistr.uz',
        workingHours: '08:00 - 18:00'
    })

    // Print settings
    const [printSettings, setPrintSettings] = useState({
        showLogo: true,
        showClinicInfo: true,
        receiptWidth: '80mm',
        diagnosisFormat: 'A4'
    })

    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (userData) {
            const parsed = JSON.parse(userData)
            setUser(parsed)
            setProfileData({
                fullName: parsed.fullName || '',
                phone: parsed.phone || '',
                email: parsed.email || ''
            })
        }

        // Load saved settings from localStorage
        const savedClinicData = localStorage.getItem('clinicSettings')
        if (savedClinicData) {
            setClinicData(JSON.parse(savedClinicData))
        }

        const savedPrintSettings = localStorage.getItem('printSettings')
        if (savedPrintSettings) {
            setPrintSettings(JSON.parse(savedPrintSettings))
        }
    }, [])

    const handleProfileSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/auth/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profileData)
            })

            if (response.ok) {
                const updatedUser = { ...user, ...profileData }
                localStorage.setItem('user', JSON.stringify(updatedUser))
                setUser(updatedUser)
                setSuccess('Profil muvaffaqiyatli yangilandi!')
                setTimeout(() => setSuccess(''), 3000)
            } else {
                const data = await response.json()
                setError(data.message || 'Xatolik yuz berdi')
            }
        } catch (err) {
            setError('Server bilan aloqa yo\'q')
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('Yangi parollar mos kelmayapti')
            setLoading(false)
            return
        }

        if (passwordData.newPassword.length < 4) {
            setError('Parol kamida 4 ta belgidan iborat bo\'lishi kerak')
            setLoading(false)
            return
        }

        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/auth/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password: passwordData.newPassword })
            })

            if (response.ok) {
                setSuccess('Parol muvaffaqiyatli o\'zgartirildi!')
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                })
                setTimeout(() => setSuccess(''), 3000)
            } else {
                const data = await response.json()
                setError(data.message || 'Xatolik yuz berdi')
            }
        } catch (err) {
            setError('Server bilan aloqa yo\'q')
        } finally {
            setLoading(false)
        }
    }

    const handleClinicSubmit = (e) => {
        e.preventDefault()
        localStorage.setItem('clinicSettings', JSON.stringify(clinicData))
        setSuccess('Klinika sozlamalari saqlandi!')
        setTimeout(() => setSuccess(''), 3000)
    }

    const handlePrintSubmit = (e) => {
        e.preventDefault()
        localStorage.setItem('printSettings', JSON.stringify(printSettings))
        setSuccess('Chop etish sozlamalari saqlandi!')
        setTimeout(() => setSuccess(''), 3000)
    }

    const tabs = [
        { id: 'profile', icon: User, label: 'Profil' },
        { id: 'password', icon: Lock, label: 'Parol' },
        { id: 'print', icon: Printer, label: 'Chop etish' }
    ]

    return (
        <div className="data-management-page settings-page">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1>Sozlamalar</h1>
                    <p>Profil va tizim sozlamalarini boshqarish</p>
                </div>
            </div>

            {/* Settings Container */}
            <div className="settings-container">
                {/* Tabs */}
                <div className="settings-tabs glass-card">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab(tab.id)
                                setError('')
                                setSuccess('')
                            }}
                        >
                            <tab.icon size={20} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="settings-content glass-card">
                    {/* Success/Error Messages */}
                    {success && (
                        <div className="alert success">
                            <Check size={18} />
                            {success}
                        </div>
                    )}
                    {error && (
                        <div className="alert error">
                            <X size={18} />
                            {error}
                        </div>
                    )}

                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <form onSubmit={handleProfileSubmit} className="settings-form">
                            <h3>Profil ma'lumotlari</h3>
                            <p className="form-description">
                                O'zingiz haqingizdagi asosiy ma'lumotlarni yangilang
                            </p>

                            <div className="form-group">
                                <label className="form-label">
                                    <User size={16} />
                                    To'liq ism
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={profileData.fullName}
                                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                                    placeholder="Ism familiyangiz"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        <Phone size={16} />
                                        Telefon
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={profileData.phone}
                                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                        placeholder="+998 90 123 45 67"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        <Mail size={16} />
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={profileData.email}
                                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                        placeholder="email@example.com"
                                    />
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    <Save size={18} />
                                    {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Password Tab */}
                    {activeTab === 'password' && (
                        <form onSubmit={handlePasswordSubmit} className="settings-form">
                            <h3>Parolni o'zgartirish</h3>
                            <p className="form-description">
                                Xavfsizlik uchun kuchli parol tanlang
                            </p>

                            <div className="form-group">
                                <label className="form-label">
                                    <Lock size={16} />
                                    Joriy parol
                                </label>
                                <div className="password-input">
                                    <input
                                        type={showPasswords.current ? 'text' : 'password'}
                                        className="form-input"
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        placeholder="Joriy parolingiz"
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                    >
                                        {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        <Lock size={16} />
                                        Yangi parol
                                    </label>
                                    <div className="password-input">
                                        <input
                                            type={showPasswords.new ? 'text' : 'password'}
                                            className="form-input"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            placeholder="Yangi parol"
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                        >
                                            {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        <Lock size={16} />
                                        Parolni tasdiqlash
                                    </label>
                                    <div className="password-input">
                                        <input
                                            type={showPasswords.confirm ? 'text' : 'password'}
                                            className="form-input"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            placeholder="Yangi parolni takrorlang"
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                        >
                                            {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    <Save size={18} />
                                    {loading ? 'Saqlanmoqda...' : 'Parolni o\'zgartirish'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Print Tab */}
                    {activeTab === 'print' && (
                        <form onSubmit={handlePrintSubmit} className="settings-form">
                            <h3>Chop etish sozlamalari</h3>
                            <p className="form-description">
                                Kvitansiya va hisobotlar uchun chop etish parametrlari
                            </p>

                            <div className="settings-section">
                                <h4>Kvitansiya sozlamalari</h4>

                                <div className="form-group checkbox-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={printSettings.showLogo}
                                            onChange={(e) => setPrintSettings({ ...printSettings, showLogo: e.target.checked })}
                                        />
                                        <span className="checkmark"></span>
                                        Logotipni ko'rsatish
                                    </label>
                                </div>

                                <div className="form-group checkbox-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={printSettings.showClinicInfo}
                                            onChange={(e) => setPrintSettings({ ...printSettings, showClinicInfo: e.target.checked })}
                                        />
                                        <span className="checkmark"></span>
                                        Klinika ma'lumotlarini ko'rsatish
                                    </label>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        <Printer size={16} />
                                        Kvitansiya kengligi
                                    </label>
                                    <select
                                        className="form-input"
                                        value={printSettings.receiptWidth}
                                        onChange={(e) => setPrintSettings({ ...printSettings, receiptWidth: e.target.value })}
                                    >
                                        <option value="58mm">58mm (Kichik termoprinter)</option>
                                        <option value="80mm">80mm (Standart termoprinter)</option>
                                        <option value="A4">A4 (Oddiy printer)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="settings-section">
                                <h4>Analiz varaqasi</h4>

                                <div className="form-group">
                                    <label className="form-label">
                                        <FileText size={16} />
                                        Format
                                    </label>
                                    <select
                                        className="form-input"
                                        value={printSettings.diagnosisFormat}
                                        onChange={(e) => setPrintSettings({ ...printSettings, diagnosisFormat: e.target.value })}
                                    >
                                        <option value="A4">A4</option>
                                        <option value="A5">A5</option>
                                        <option value="Letter">Letter</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    <Save size={18} />
                                    Saqlash
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Settings
