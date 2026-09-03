import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Login from './components/Login'

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const DoctorDashboard = lazy(() => import('./pages/doctor/DoctorDashboard'))
const RegistratorDashboard = lazy(() => import('./pages/registrator/RegistratorDashboard'))

const PageLoader = () => (
    <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#f0f4f8'
    }}>
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
        }}>
            <div style={{
                width: '48px', height: '48px', border: '4px solid #e2e8f0',
                borderTopColor: '#3b82f6', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
            }} />
            <p style={{ color: '#64748b', fontSize: '14px' }}>Yuklanmoqda...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    </div>
)

function App() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin/*" element={<AdminDashboard />} />
                <Route path="/doctor/*" element={<DoctorDashboard />} />
                <Route path="/registrator/*" element={<RegistratorDashboard />} />
            </Routes>
        </Suspense>
    )
}

export default App
