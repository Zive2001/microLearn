import { useState } from 'react';
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
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    email: user?.email || '',
    profession: user?.profile?.profession || ''
  });

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
      profession: user?.profile?.profession || ''
    });
    setIsEditing(false);
  };

  const stats = [
    {
      label: 'Topics Completed',
      value: '0',
      icon: Trophy,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      label: 'Assessments Taken',
      value: '0',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Videos Watched',
      value: '0',
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Learning Streak',
      value: '0 days',
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
              <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-4 mt-1">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-[#37352F] mb-2">
                      Change Password
                    </h3>
                    <p className="text-[#6B6B6B] mb-4 leading-relaxed">
                      Keep your account secure by updating your password regularly. We recommend using a strong, unique password.
                    </p>
                    <button className="inline-flex items-center px-5 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200">
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