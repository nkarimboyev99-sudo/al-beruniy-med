import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff } from 'lucide-react'
import logoImg from '../logo/logo.png'
import './Login.css'

const API_URL = import.meta.env.VITE_API_URL || '';

function Login() {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({ username: '', password: '' })
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (response.ok) {
                localStorage.setItem('token', data.token)
                localStorage.setItem('user', JSON.stringify(data.user))
                if (data.user.role === 'admin') navigate('/admin')
                else if (data.user.role === 'registrator') navigate('/registrator')
                else navigate('/doctor')
            } else {
                setError(data.message || 'Login xatosi')
            }
        } catch (err) {
            setError("Server bilan aloqa yo'q")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">
                    <img src={logoImg} alt="Al-Beruniy Med" className="login-logo-img" />
                    <span className="login-logo-text">Al-Beruniy <b>Med</b></span>
                </div>

                <h2 className="login-title">Tizimga kirish</h2>
                <p className="login-subtitle">Foydalanuvchi ma'lumotlaringizni kiriting</p>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label className="form-label">Foydalanuvchi nomi</label>
                        <div className="input-icon-wrapper">
                            <User className="input-icon" size={18} />
                            <input
                                type="text"
                                name="username"
                                className="form-input"
                                placeholder="Login kiriting"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Parol</label>
                        <div className="input-icon-wrapper">
                            <Lock className="input-icon" size={18} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                className="form-input"
                                placeholder="Parolni kiriting"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="login-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? <span className="loader"></span> : 'Kirish'}
                    </button>
                </form>

                <p className="login-footer">Tizim versiyasi: 1.0.0</p>
            </div>
        </div>
    )
}

export default Login
