import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  User as UserIcon,
  Mail as MailIcon,
  Briefcase as BriefcaseIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  X as XIcon,
  Trophy,
  BookOpen,
  Clock,
  TrendingUp,
  Calendar,
  Settings,
  Shield,
  Trash2,
  MapPin as MapPinIcon,
  Heart as HeartIcon,
  Eye as EyeIcon,
  Palette as PaletteIcon,
  Bell as BellIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    email: user?.email || '',
    // Step 2: Profile Setup
    profession: user?.profile?.profession || '',
    experienceLevel: user?.profile?.experienceLevel || 'Complete Beginner',
    gender: user?.profile?.gender || 'Prefer not to say',
    dateOfBirth: user?.profile?.dateOfBirth ? user.profile.dateOfBirth.split('T')[0] : '',
    location: user?.profile?.location || '',
    bio: user?.profile?.bio || '',
    learningPace: user?.profile?.learningPace || 'Moderate',  // NEW
    problemSolvingApproach: user?.profile?.problemSolvingApproach || 'Practical',  // NEW
    // Step 3: Learning Preferences
    learningGoal: user?.learningPreferences?.learningGoal || '',
    learningStyle: user?.learningPreferences?.learningStyle || 'visual',
    preferredSchedule: user?.learningPreferences?.preferredSchedule || [],
    enableNotifications: user?.learningPreferences?.enableNotifications !== false,
    availableSessionTime: user?.learningPreferences?.availableSessionTime || 'Short (15-30 min)',  // NEW
    learningFocus: user?.learningPreferences?.learningFocus || 'Mixed'  // NEW
  });

  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setStatsLoading(true);
        const response = await authAPI.getDashboard();
        if (response.data && response.data.stats) {
          setDashboardData(response.data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await authAPI.updateProfile({ profile: formData });
      toast.success('Profile updated successfully! 🎉');
      setIsEditing(false);
      // Refresh dashboard data after profile update
      const response = await authAPI.getDashboard();
      if (response.data && response.data.stats) {
        setDashboardData(response.data.stats);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.profile?.firstName || '',
      lastName: user?.profile?.lastName || '',
      email: user?.email || '',
      profession: user?.profile?.profession || '',
      experienceLevel: user?.profile?.experienceLevel || 'Complete Beginner',
      gender: user?.profile?.gender || 'Prefer not to say',
      dateOfBirth: user?.profile?.dateOfBirth ? user.profile.dateOfBirth.split('T')[0] : '',
      location: user?.profile?.location || '',
      bio: user?.profile?.bio || '',
      learningPace: user?.profile?.learningPace || 'Moderate',
      problemSolvingApproach: user?.profile?.problemSolvingApproach || 'Practical',
      learningGoal: user?.learningPreferences?.learningGoal || '',
      learningStyle: user?.learningPreferences?.learningStyle || 'visual',
      preferredSchedule: user?.learningPreferences?.preferredSchedule || [],
      enableNotifications: user?.learningPreferences?.enableNotifications !== false,
      availableSessionTime: user?.learningPreferences?.availableSessionTime || 'Short (15-30 min)',
      learningFocus: user?.learningPreferences?.learningFocus || 'Mixed'
    });
    setIsEditing(false);
  };

  const stats = [
    {
      label: 'Topics Completed',
      value: statsLoading ? '...' : dashboardData?.totalSelectedTopics || '0',
      icon: Trophy,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      label: 'Assessments Taken',
      value: statsLoading ? '...' : dashboardData?.assessedTopics || '0',
      icon: BookOpen,
      color: 'text-[#495057]',
      bgColor: 'bg-gray-50'
    },
    {
      label: 'Videos Watched',
      value: statsLoading ? '...' : dashboardData?.completedVideos || '0',
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Learning Streak',
      value: statsLoading ? '...' : '0 days',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F7F6F3] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-[#E9E9E7] p-8">
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-[#2383E2] to-[#0F62FE] rounded-2xl flex items-center justify-center mr-4">
              <UserIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#37352F] mb-2">
                {user?.profile?.firstName} {user?.profile?.lastName}
              </h1>
              <p className="text-[#6B6B6B] flex items-center">
                <MailIcon className="h-4 w-4 mr-2" />
                {user?.email}
              </p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className={`${stat.bgColor} rounded-xl p-4 text-center transition-transform hover:scale-105`}>
                  <div className={`inline-flex items-center justify-center w-10 h-10 ${stat.color} mb-3`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="text-2xl font-bold text-[#37352F] mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-[#6B6B6B]">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Profile Information */}
        <div className="bg-white rounded-2xl border border-[#E9E9E7]">
          <div className="px-8 py-6 border-b border-[#E9E9E7]">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-[#2383E2]/10 rounded-lg flex items-center justify-center mr-3">
                  <Settings className="h-4 w-4 text-[#2383E2]" />
                </div>
                <h2 className="text-xl font-semibold text-[#37352F]">
                  Personal Information
                </h2>
              </div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 border border-[#E9E9E7] text-sm font-medium rounded-lg text-[#37352F] bg-white hover:bg-[#F7F6F3] transition-all duration-200"
                >
                  <EditIcon className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex space-x-3">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white transition-all duration-200 ${
                      loading
                        ? 'bg-[#9B9B9B] cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#2383E2] to-[#0F62FE] hover:from-[#0F62FE] hover:to-[#2383E2]'
                    }`}
                  >
                    <SaveIcon className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center px-4 py-2 border border-[#E9E9E7] text-sm font-medium rounded-lg text-[#6B6B6B] bg-white hover:bg-[#F7F6F3] transition-all duration-200"
                  >
                    <XIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="px-8 py-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-[#37352F] mb-3">
                  First Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="firstName"
                    id="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#E9E9E7] rounded-lg bg-white text-[#37352F] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2383E2] focus:border-transparent hover:border-[#D0D0CE]"
                  />
                ) : (
                  <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7]">
                    {formData.firstName || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-[#37352F] mb-3">
                  Last Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="lastName"
                    id="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#E9E9E7] rounded-lg bg-white text-[#37352F] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2383E2] focus:border-transparent hover:border-[#D0D0CE]"
                  />
                ) : (
                  <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7]">
                    {formData.lastName || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#37352F] mb-3">
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#E9E9E7] rounded-lg bg-white text-[#37352F] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2383E2] focus:border-transparent hover:border-[#D0D0CE]"
                  />
                ) : (
                  <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7] flex items-center">
                    <MailIcon className="h-4 w-4 mr-2 text-[#6B6B6B]" />
                    {formData.email || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="profession" className="block text-sm font-medium text-[#37352F] mb-3">
                  Profession
                </label>
                {isEditing ? (
                  <select
                    name="profession"
                    id="profession"
                    value={formData.profession}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#E9E9E7] rounded-lg bg-white text-[#37352F] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2383E2] focus:border-transparent hover:border-[#D0D0CE]"
                  >
                    <option value="">Select your profession</option>
                    <option value="Student">Student</option>
                    <option value="Software Developer">Software Developer</option>
                    <option value="Web Developer">Web Developer</option>
                    <option value="Data Scientist">Data Scientist</option>
                    <option value="Product Manager">Product Manager</option>
                    <option value="UI/UX Designer">UI/UX Designer</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7] flex items-center">
                    <BriefcaseIcon className="h-4 w-4 mr-2 text-[#6B6B6B]" />
                    {formData.profession || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-[#37352F] mb-3">
                  Gender
                </label>
                {isEditing ? (
                  <select
                    name="gender"
                    id="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#E9E9E7] rounded-lg bg-white text-[#37352F] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2383E2] focus:border-transparent hover:border-[#D0D0CE]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                ) : (
                  <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7]">
                    {formData.gender || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="experienceLevel" className="block text-sm font-medium text-[#37352F] mb-3">
                  Experience Level
                </label>
                {isEditing ? (
                  <select
                    name="experienceLevel"
                    id="experienceLevel"
                    value={formData.experienceLevel}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#E9E9E7] rounded-lg bg-white text-[#37352F] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2383E2] focus:border-transparent hover:border-[#D0D0CE]"
                  >
                    <option value="Complete Beginner">Complete Beginner</option>
                    <option value="Some Experience">Some Experience</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                ) : (
                  <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7]">
                    {formData.experienceLevel || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-[#37352F] mb-3">
                  Date of Birth
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    name="dateOfBirth"
                    id="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#E9E9E7] rounded-lg bg-white text-[#37352F] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2383E2] focus:border-transparent hover:border-[#D0D0CE]"
                  />
                ) : (
                  <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7] flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-[#6B6B6B]" />
                    {formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString() : 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-[#37352F] mb-3">
                  Location
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="location"
                    id="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="City, Country"
                    className="w-full px-4 py-3 border border-[#E9E9E7] rounded-lg bg-white text-[#37352F] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2383E2] focus:border-transparent hover:border-[#D0D0CE]"
                  />
                ) : (
                  <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7] flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-2 text-[#6B6B6B]" />
                    {formData.location || 'Not provided'}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="bio" className="block text-sm font-medium text-[#37352F] mb-3">
                  Bio
                </label>
                {isEditing ? (
                  <textarea
                    name="bio"
                    id="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Tell us about yourself..."
                    className="w-full px-4 py-3 border border-[#E9E9E7] rounded-lg bg-white text-[#37352F] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2383E2] focus:border-transparent hover:border-[#D0D0CE] resize-none"
                  />
                ) : (
                  <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7]">
                    {formData.bio || 'Not provided'}
                  </p>
                )}
                <div className="text-xs text-[#6B6B6B] mt-1">
                  {formData.bio?.length || 0}/200 characters
                </div>
              </div>
            </div>
            
            {/* Account Info */}
            <div className="mt-8 pt-8 border-t border-[#E9E9E7]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#37352F] mb-3">
                    Member Since
                  </label>
                  <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7] flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-[#6B6B6B]" />
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#37352F] mb-3">
                    Account Status
                  </label>
                  <p className="text-base text-[#37352F] py-3 px-4 bg-green-50 rounded-lg border border-green-200 flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-green-600" />
                    <span className="text-green-800">Active</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Preferences */}
        <div className="bg-white rounded-2xl border border-[#E9E9E7]">
          <div className="px-8 py-6 border-b border-[#E9E9E7]">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center mr-3">
                <PaletteIcon className="h-4 w-4 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-[#37352F]">
                Learning Preferences
              </h2>
            </div>
          </div>

          <div className="px-8 py-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#37352F] mb-3">
                  Learning Goal
                </label>
                <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7]">
                  {formData.learningGoal || 'Not provided'}
                </p>
              </div>

              <div>
                <label htmlFor="learningStyle" className="block text-sm font-medium text-[#37352F] mb-3">
                  Learning Style
                </label>
                {isEditing ? (
                  <select
                    name="learningStyle"
                    id="learningStyle"
                    value={formData.learningStyle}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#E9E9E7] rounded-lg bg-white text-[#37352F] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2383E2] focus:border-transparent hover:border-[#D0D0CE]"
                  >
                    <option value="visual">Visual</option>
                    <option value="hands_on">Hands-On</option>
                    <option value="reading">Reading</option>
                    <option value="interactive">Interactive</option>
                  </select>
                ) : (
                  <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7] flex items-center">
                    <EyeIcon className="h-4 w-4 mr-2 text-[#6B6B6B]" />
                    {formData.learningStyle === 'hands_on' ? 'Hands-On' :
                     formData.learningStyle.charAt(0).toUpperCase() + formData.learningStyle.slice(1) || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#37352F] mb-3">
                  Preferred Schedule
                </label>
                <div className="space-y-2">
                  {Array.isArray(formData.preferredSchedule) && formData.preferredSchedule.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {formData.preferredSchedule.map((time) => (
                        <span
                          key={time}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                        >
                          {time.charAt(0).toUpperCase() + time.slice(1)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7]">
                      Not specified
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#37352F] mb-3">
                  Notifications
                </label>
                <div className="flex items-center space-x-3">
                  {isEditing ? (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="enableNotifications"
                        checked={formData.enableNotifications}
                        onChange={(e) =>
                          setFormData(prev => ({
                            ...prev,
                            enableNotifications: e.target.checked
                          }))
                        }
                        className="w-4 h-4 rounded border-[#E9E9E7] text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-[#37352F]">
                        {formData.enableNotifications ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  ) : (
                    <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7] flex items-center">
                      <BellIcon className="h-4 w-4 mr-2 text-[#6B6B6B]" />
                      {formData.enableNotifications ? (
                        <span className="text-green-600 font-medium">Enabled</span>
                      ) : (
                        <span className="text-gray-600">Disabled</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#37352F] mb-3">
                  Preferred Content Length
                </label>
                <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7]">
                  {user?.learningPreferences?.preferredContentLength || 'Not provided'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#37352F] mb-3">
                  Interested Areas
                </label>
                {user?.learningPreferences?.interestedAreas && user.learningPreferences.interestedAreas.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.learningPreferences.interestedAreas.map((topic) => (
                      <span
                        key={topic}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200"
                      >
                        {topic.charAt(0).toUpperCase() + topic.slice(1)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7]">
                    Not specified
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="availableSessionTime" className="block text-sm font-medium text-[#37352F] mb-3">
                  Available Session Time
                </label>
                {isEditing ? (
                  <select
                    name="availableSessionTime"
                    id="availableSessionTime"
                    value={formData.availableSessionTime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#E9E9E7] rounded-lg bg-white text-[#37352F] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2383E2] focus:border-transparent hover:border-[#D0D0CE]"
                  >
                    <option value="Micro (5-10 min)">Micro (5-10 min)</option>
                    <option value="Short (15-30 min)">Short (15-30 min)</option>
                    <option value="Medium (30-60 min)">Medium (30-60 min)</option>
                    <option value="Long (60+ min)">Long (60+ min)</option>
                  </select>
                ) : (
                  <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7]">
                    {formData.availableSessionTime || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="learningFocus" className="block text-sm font-medium text-[#37352F] mb-3">
                  Learning Focus
                </label>
                {isEditing ? (
                  <select
                    name="learningFocus"
                    id="learningFocus"
                    value={formData.learningFocus}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#E9E9E7] rounded-lg bg-white text-[#37352F] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2383E2] focus:border-transparent hover:border-[#D0D0CE]"
                  >
                    <option value="Conceptual">Conceptual</option>
                    <option value="Practical-Projects">Practical & Projects</option>
                    <option value="Interview-Prep">Interview Preparation</option>
                    <option value="Certification">Certification</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                ) : (
                  <p className="text-base text-[#37352F] py-3 px-4 bg-[#F7F6F3] rounded-lg border border-[#E9E9E7]">
                    {formData.learningFocus || 'Not provided'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-2xl border border-[#E9E9E7]">
          <div className="px-8 py-6 border-b border-[#E9E9E7]">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center mr-3">
                <Settings className="h-4 w-4 text-yellow-600" />
              </div>
              <h2 className="text-xl font-semibold text-[#37352F]">
                Account Settings
              </h2>
            </div>
          </div>
          
          <div className="px-8 py-8">
            <div className="space-y-6">
              {/* Change Password */}
              <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-4 mt-1">
                    <Shield className="h-4 w-4 text-[#495057]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-[#37352F] mb-2">
                      Change Password
                    </h3>
                    <p className="text-[#6B6B6B] mb-4 leading-relaxed">
                      Keep your account secure by updating your password regularly. We recommend using a strong, unique password.
                    </p>
                    <button className="inline-flex items-center px-5 py-3 bg-[#212529] text-white font-medium rounded-lg hover:bg-[#495057] transition-colors duration-200">
                      <Shield className="h-4 w-4 mr-2" />
                      Update Password
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Danger Zone */}
              <div className="p-6 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-4 mt-1">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-red-900 mb-2">
                      Delete Account
                    </h3>
                    <p className="text-red-700 mb-4 leading-relaxed">
                      Permanently delete your account and all associated data. This action cannot be undone and will remove all your learning progress.
                    </p>
                    <button className="inline-flex items-center px-5 py-3 border-2 border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-100 transition-colors duration-200">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;