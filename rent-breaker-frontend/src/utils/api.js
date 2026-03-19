import axios from 'axios';

const api = axios.create({
  // Make sure this matches your backend URL during local development, e.g., 'http://localhost:5000/api'
  baseURL: import.meta.env.VITE_APP_API_URL || 'http://localhost:5000/api', 
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Clear out the expired/invalid session data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to the updated auth route!
      window.location.href = '/auth?page=login';
    }
    return Promise.reject(err);
  }
);

export default api;