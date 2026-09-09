let rawUrl = import.meta.env.VITE_API_URL || '';
if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    rawUrl = `https://${rawUrl}`;
}
export const API_URL = rawUrl.replace(/\/$/, '');

export const apiFetch = async (path, options = {}, retries = 2) => {
    const url = path.startsWith('http') ? path : `${API_URL}${path}`;
    const token = localStorage.getItem('token');

    const headers = {
        ...(options.headers || {})
    };

    if (token && !headers['Authorization'] && !headers['authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
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
    } catch (err) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return apiFetch(path, options, retries - 1);
        }
        throw err;
    }
};

export default API_URL;

