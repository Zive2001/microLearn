// src/services/auth.js
import { apiClient, handleApiResponse, handleApiError } from './api';

export const authService = {
  // User Registration
  register: async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // User Login
  login: async (credentials) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const data = handleApiResponse(response);
      
      // Store token and user data
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get User Profile
  getProfile: async () => {
    try {
      const response = await apiClient.get('/auth/profile');
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Update User Profile
  updateProfile: async (profileData) => {
    try {
      const response = await apiClient.put('/auth/profile', profileData);
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get Dashboard Data
  getDashboard: async () => {
    try {
      const response = await apiClient.get('/auth/dashboard');
      return handleApiResponse(response);
    } catch (error) {
      handleApiError(error);
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/';
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Get auth token
  getToken: () => {
    return localStorage.getItem('authToken');
  }
};