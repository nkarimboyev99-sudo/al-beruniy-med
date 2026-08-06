import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/index.css'

// Global API URL - production yoki development
const API_URL = import.meta.env.VITE_API_URL || '';

// Global fetch override - /api bilan boshlanadigan so'rovlarni backend ga yo'naltirish
const originalFetch = window.fetch;
window.fetch = function (url, options) {
    // Agar URL /api bilan boshlansa, API_URL qo'shish
    if (typeof url === 'string' && url.startsWith('/api')) {
        url = API_URL + url;
    }
    return originalFetch.call(this, url, options).then(response => {
        if (response.status === 401 && !url.includes('/api/auth/login')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return response;
    });
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>,
)

