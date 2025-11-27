import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

export const getScreenshotImage = (id) => {
  return `${API_URL}/api/screenshots/${id}/image`;
};

export const downloadFile = (id) => {
  return `${API_URL}/api/files/${id}`;
};

export default api;
