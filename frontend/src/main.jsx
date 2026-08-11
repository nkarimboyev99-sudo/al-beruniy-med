import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/index.css'

// Global API URL - production yoki development
const API_URL = import.meta.env.VITE_API_URL || '';

// Global fetch override - /api bilan boshlanadigan so'rovlarni backend ga yo'naltirish
const originalFetch = window.fetch;
window.fetch = function (url, options = {}) {
    let urlString = typeof url === 'string' ? url : (url && url.url ? url.url : '');

    if (typeof url === 'string' && (url.startsWith('/api') || url.startsWith('api/'))) {
        const cleanPath = url.startsWith('/') ? url : '/' + url;
        url = API_URL ? (API_URL.endsWith('/') ? API_URL.slice(0, -1) + cleanPath : API_URL + cleanPath) : cleanPath;
        urlString = url;
    }

    const token = localStorage.getItem('token');
    if (token && typeof urlString === 'string' && urlString.includes('/api/') && !urlString.includes('/api/auth/login')) {
        options = options || {};
        options.headers = options.headers || {};

        let hasAuth = false;
        if (options.headers instanceof Headers) {
            hasAuth = options.headers.has('Authorization');
            if (!hasAuth) options.headers.set('Authorization', `Bearer ${token}`);
        } else if (Array.isArray(options.headers)) {
            hasAuth = options.headers.some(([k]) => k.toLowerCase() === 'authorization');
            if (!hasAuth) options.headers.push(['Authorization', `Bearer ${token}`]);
        } else {
            hasAuth = Object.keys(options.headers).some(k => k.toLowerCase() === 'authorization');
            if (!hasAuth) options.headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return originalFetch.call(this, url, options).then(response => {
        if (response.status === 401 && typeof urlString === 'string' && !urlString.includes('/api/auth/login')) {
            if (window.location.pathname !== '/login') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
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
