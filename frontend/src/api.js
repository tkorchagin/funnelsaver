import axios from 'axios';

// Toggle this to switch between dev and prod
const USE_PROD = true;

const API_URL = USE_PROD
  ? 'https://b.hugmediary.com'
  : (process.env.REACT_APP_API_URL || 'http://localhost:5000');

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const login = (username, password) => {
  return api.post('/auth/login', { username, password });
};

export const register = (username, password) => {
  return api.post('/auth/register', { username, password });
};

export const getProjects = () => {
  return api.get('/projects');
};

export const createProject = (url) => {
  return api.post('/projects', { url });
};

export const getProject = (id) => {
  return api.get(`/projects/${id}`);
};

export const getScreenshotImage = (screenshotPath) => {
  // screenshotPath is like "project_1/step_0.png"
  return `${API_URL}/static/uploads/${screenshotPath}`;
};

export const downloadFile = (id) => {
  return `${API_URL}/api/files/${id}`;
};

export const togglePublic = (projectId) => {
  return api.post(`/projects/${projectId}/toggle-public`);
};

export const cancelProject = (projectId) => {
  return api.post(`/projects/${projectId}/cancel`);
};

export const deleteProject = (projectId) => {
  return api.delete(`/projects/${projectId}`);
};

export const getPublicProject = (id) => {
  return axios.get(`${API_URL}/api/public/projects/${id}`);
};

export const getCurrentUser = () => {
  return api.get('/auth/me');
};

export const duplicateProject = (projectId) => {
  return api.post(`/projects/${projectId}/duplicate`);
};

export const updateProject = (projectId, data) => {
  return api.patch(`/projects/${projectId}`, data);
};

export default api;
