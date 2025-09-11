// src/services/auth.js
import { authAPI, userJourneyAPI } from './api';

export const authService = {
  // Use unified API services for core auth functions
  register: (userData) => userJourneyAPI.completeRegistration(userData),
  login: (email, password) => userJourneyAPI.completeLogin(email, password),
  getProfile: () => authAPI.getProfile(),
  updateProfile: (profileData) => authAPI.updateProfile(profileData),
  getDashboard: () => userJourneyAPI.getUserDashboard(),

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