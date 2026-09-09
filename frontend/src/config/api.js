export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const apiFetch = async (path, options = {}) => {
    const url = path.startsWith('http') ? path : `${API_URL}${path}`;
    const token = localStorage.getItem('token');

    const headers = {
        ...(options.headers || {})
    };

    if (token && !headers['Authorization'] && !headers['authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
    }

    return response;
};

export default API_URL;

