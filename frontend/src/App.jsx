import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import AdminDashboard from './pages/admin/AdminDashboard'
import DoctorDashboard from './pages/doctor/DoctorDashboard'

function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
            <Route path="/doctor/*" element={<DoctorDashboard />} />
        </Routes>
    )
}

export default App
