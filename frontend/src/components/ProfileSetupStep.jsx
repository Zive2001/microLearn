import React from 'react';
import { Camera, Calendar, MapPin, Briefcase, User, AlertCircle } from 'lucide-react';

const ProfileSetupStep = ({ formData, setFormData, errors }) => {
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const experienceLevels = [
    { value: 'Complete Beginner', label: 'Complete Beginner', description: 'New to programming' },
    { value: 'Some Experience', label: 'Some Experience', description: '6 months - 1 year' },
    { value: 'Intermediate', label: 'Intermediate', description: '1-3 years experience' },
    { value: 'Advanced', label: 'Advanced', description: '3+ years experience' },
  ];

  // Backend expects these exact profession values
  const currentRoles = [
    'Student',
    'Software Developer', 
    'Web Developer',
    'Data Scientist',
    'UI/UX Designer',
    'Product Manager',
    'Other'
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Set Up Your Profile
        </h2>
        <p className="text-gray-600">
          Help us personalize your learning experience
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Picture */}
        <div className="text-center">
          <div className="inline-block relative">
            <div className="w-24 h-24 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center hover:border-gray-300 transition-colors duration-200">
              {formData.profilePicture ? (
                <img 
                  src={formData.profilePicture} 
                  alt="Profile" 
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                <div className="text-center">
                  <User className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                  <div className="text-xs text-gray-400">Photo</div>
                </div>
              )}
            </div>
            <button 
              type="button"
              className="absolute bottom-1 right-1 w-6 h-6 bg-gray-900 rounded flex items-center justify-center text-white hover:bg-gray-800 transition-colors duration-200"
            >
              <Camera className="w-3 h-3" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">Optional: Add a profile picture</p>
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
            Date of Birth
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth || ''}
              onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              className={`
                w-full pl-10 pr-3 py-2.5 border rounded-md text-gray-900 
                focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                transition-colors duration-200
                ${errors.dateOfBirth ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}
              `}
            />
          </div>
          {errors.dateOfBirth && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.dateOfBirth}
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id="location"
              type="text"
              value={formData.location || ''}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className={`
                w-full pl-10 pr-3 py-2.5 border rounded-md text-gray-900 placeholder-gray-500 
                focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                transition-colors duration-200
                ${errors.location ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}
              `}
              placeholder="City, Country"
            />
          </div>
          {errors.location && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.location}
            </div>
          )}
        </div>

        {/* Current Role */}
        <div>
          <label htmlFor="currentRole" className="block text-sm font-medium text-gray-700 mb-2">
            Current Role
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Briefcase className="h-4 w-4 text-gray-400" />
            </div>
            <select
              id="currentRole"
              value={formData.currentRole || ''}
              onChange={(e) => handleInputChange('currentRole', e.target.value)}
              className={`
                w-full pl-10 pr-3 py-2.5 border rounded-md text-gray-900 
                focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                transition-colors duration-200
                ${errors.currentRole ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}
              `}
            >
              <option value="">Select your current role</option>
              {currentRoles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          {errors.currentRole && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.currentRole}
            </div>
          )}
        </div>

        {/* Experience Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Programming Experience Level
          </label>
          <div className="space-y-3">
            {experienceLevels.map((level) => (
              <label key={level.value} className="flex items-start cursor-pointer">
                <input
                  type="radio"
                  name="experienceLevel"
                  value={level.value}
                  checked={formData.experienceLevel === level.value}
                  onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
                  className="mt-1 h-4 w-4 text-gray-900 border-gray-300 focus:ring-gray-900 focus:ring-2"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">
                    {level.label}
                  </div>
                  <div className="text-sm text-gray-500">
                    {level.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
          {errors.experienceLevel && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.experienceLevel}
            </div>
          )}
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
            Bio (Optional)
          </label>
          <textarea
            id="bio"
            rows={3}
            value={formData.bio || ''}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            className={`
              w-full px-3 py-2.5 border rounded-md text-gray-900 placeholder-gray-500 
              focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
              transition-colors duration-200 resize-none
              ${errors.bio ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}
            `}
            placeholder="Tell us a bit about yourself and your learning goals..."
          />
          <div className="text-xs text-gray-500 mt-1">
            {(formData.bio || '').length}/200 characters
          </div>
          {errors.bio && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.bio}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSetupStep;