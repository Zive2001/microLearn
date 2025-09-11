import React from 'react';
import { Eye, EyeOff, Mail, User, Lock, AlertCircle } from 'lucide-react';

const BasicInfoStep = ({ 
  formData, 
  setFormData, 
  errors, 
  showPassword, 
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword 
}) => {
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Create Your Account
        </h2>
        <p className="text-gray-600">
          Let's start with your basic information
        </p>
      </div>

      <div className="space-y-5">
        {/* First Name and Last Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="firstName"
                type="text"
                value={formData.firstName || ''}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={`
                  w-full pl-10 pr-3 py-2.5 border rounded-md text-gray-900 placeholder-gray-500 
                  focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                  transition-colors duration-200
                  ${errors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}
                `}
                placeholder="First name"
              />
            </div>
            {errors.firstName && (
              <div className="flex items-center mt-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.firstName}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="lastName"
                type="text"
                value={formData.lastName || ''}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={`
                  w-full pl-10 pr-3 py-2.5 border rounded-md text-gray-900 placeholder-gray-500 
                  focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                  transition-colors duration-200
                  ${errors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}
                `}
                placeholder="Last name"
              />
            </div>
            {errors.lastName && (
              <div className="flex items-center mt-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.lastName}
              </div>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`
                w-full pl-10 pr-3 py-2.5 border rounded-md text-gray-900 placeholder-gray-500 
                focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                transition-colors duration-200
                ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}
              `}
              placeholder="Enter your email address"
            />
          </div>
          {errors.email && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.email}
            </div>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password || ''}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`
                w-full pl-10 pr-10 py-2.5 border rounded-md text-gray-900 placeholder-gray-500 
                focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                transition-colors duration-200
                ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}
              `}
              placeholder="Create a strong password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {errors.password && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.password}
            </div>
          )}
          <div className="mt-2 text-xs text-gray-500">
            Password must be at least 8 characters with uppercase, lowercase, and number
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword || ''}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className={`
                w-full pl-10 pr-10 py-2.5 border rounded-md text-gray-900 placeholder-gray-500 
                focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                transition-colors duration-200
                ${errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}
              `}
              placeholder="Confirm your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.confirmPassword}
            </div>
          )}
        </div>

        {/* Terms and Privacy */}
        <div className="pt-4">
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.agreeToTerms || false}
              onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
              className="mt-1 h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="ml-3 text-sm text-gray-600 leading-5">
              I agree to the{' '}
              <a href="/terms" className="text-gray-900 hover:text-gray-700 font-medium">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-gray-900 hover:text-gray-700 font-medium">
                Privacy Policy
              </a>
            </span>
          </label>
          {errors.agreeToTerms && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.agreeToTerms}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BasicInfoStep;