import axios from 'axios';

const API_BASE_URL = 'https://turtle-backend-4rzx.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('turtleAuthToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('turtleAuthToken');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const verifyToken = async () => {
  const response = await api.get('/auth/verify');
  return response.data;
};

// Path APIs
export const getAllPaths = async () => {
  const response = await api.get('/paths');
  return response.data;
};

export const getPathById = async (id) => {
  const response = await api.get(`/paths/${id}`);
  return response.data;
};

export const createPath = async (name, locations = []) => {
  const response = await api.post('/paths', { name, locations });
  return response.data;
};

export const updatePathName = async (id, name) => {
  const response = await api.put(`/paths/${id}`, { name });
  return response.data;
};

export const deletePath = async (id) => {
  const response = await api.delete(`/paths/${id}`);
  return response.data;
};

// Location APIs
export const addLocation = async (pathId, lat, lng) => {
  const response = await api.post(`/paths/${pathId}/locations`, { lat, lng });
  return response.data;
};

export const updateLocation = async (pathId, locationId, lat, lng) => {
  const response = await api.put(`/paths/${pathId}/locations/${locationId}`, { lat, lng });
  return response.data;
};

export const deleteLocation = async (pathId, locationId) => {
  const response = await api.delete(`/paths/${pathId}/locations/${locationId}`);
  return response.data;
};

export default api;
