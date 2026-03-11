import { useState, useEffect } from 'react'
import { User, Lock, Phone, Save, Check, X, Eye, EyeOff } from 'lucide-react'
import './Settings.css'

function ProfileSettings() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    const [profileData, setProfileData] = useState({ fullName: '', phone: '' })
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' })
    const [showNew, setShowNew] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (userData) {
            const parsed = JSON.parse(userData)
            setUser(parsed)
            setProfileData({ fullName: parsed.fullName || '', phone: parsed.phone || '' })
        }
    }, [])

    const showMsg = (msg, type = 'success') => {
        if (type === 'success') { setSuccess(msg); setError('') }
        else { setError(msg); setSuccess('') }
        setTimeout(() => { setSuccess(''); setError('') }, 3000)
    }

    const handleProfileSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/auth/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(profileData)
            })
            if (res.ok) {
                const updated = { ...user, ...profileData }
                localStorage.setItem('user', JSON.stringify(updated))
                setUser(updated)
                showMsg("Profil yangilandi!")
            } else {
                const d = await res.json()
                showMsg(d.message || 'Xatolik', 'error')
            }
        } catch { showMsg("Server bilan aloqa yo'q", 'error') }
        finally { setLoading(false) }
    }

    const handlePasswordSubmit = async (e) => {
        e.preventDefault()
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showMsg('Parollar mos kelmayapti', 'error'); return
        }
        if (passwordData.newPassword.length < 4) {
            showMsg('Parol kamida 4 ta belgi bo\'lishi kerak', 'error'); return
        }
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/auth/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ password: passwordData.newPassword })
            })
            if (res.ok) {
                setPasswordData({ newPassword: '', confirmPassword: '' })
                showMsg("Parol o'zgartirildi!")
            } else {
                const d = await res.json()
                showMsg(d.message || 'Xatolik', 'error')
            }
        } catch { showMsg("Server bilan aloqa yo'q", 'error') }
        finally { setLoading(false) }
    }

    return (
        <div className="data-management-page settings-page">
            <div className="page-header">
                <div>
                    <h1>Profil</h1>
                    <p>Shaxsiy ma'lumotlar va parol</p>
                </div>
            </div>

            {success && <div className="alert success" style={{ marginBottom: 16 }}><Check size={16} /> {success}</div>}
            {error && <div className="alert error" style={{ marginBottom: 16 }}><X size={16} /> {error}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '520px' }}>

                {/* Profil ma'lumotlari */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '4px', fontSize: '1rem', fontWeight: 700 }}>
                        <User size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                        Shaxsiy ma'lumotlar
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                        Ism va telefon raqamingizni o'zgartiring
                    </p>
                    <form onSubmit={handleProfileSubmit} className="settings-form">
                        <div className="form-group">
                            <label className="form-label"><User size={15} /> To'liq ism</label>
                            <input
                                type="text"
                                className="form-input"
                                value={profileData.fullName}
                                onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                                placeholder="Ism familiyangiz"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label"><Phone size={15} /> Telefon</label>
                            <input
                                type="text"
                                className="form-input"
                                value={profileData.phone}
                                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                placeholder="+998 90 123 45 67"
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                <Save size={16} />
                                {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Parol o'zgartirish */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '4px', fontSize: '1rem', fontWeight: 700 }}>
                        <Lock size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                        Parolni o'zgartirish
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                        Xavfsizlik uchun kuchli parol tanlang
                    </p>
                    <form onSubmit={handlePasswordSubmit} className="settings-form">
                        <div className="form-group">
                            <label className="form-label"><Lock size={15} /> Yangi parol</label>
                            <div className="password-input">
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    className="form-input"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    placeholder="Yangi parol"
                                />
                                <button type="button" className="password-toggle" onClick={() => setShowNew(!showNew)}>
                                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label"><Lock size={15} /> Parolni tasdiqlang</label>
                            <div className="password-input">
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    className="form-input"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    placeholder="Parolni qaytaring"
                                />
                                <button type="button" className="password-toggle" onClick={() => setShowConfirm(!showConfirm)}>
                                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                <Save size={16} />
                                {loading ? 'Saqlanmoqda...' : 'Parolni saqlash'}
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    )
}

export default ProfileSettings
