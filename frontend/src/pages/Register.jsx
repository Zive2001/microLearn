import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    profession: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await register(formData);
      toast.success('Account created successfully!');
      navigate('/app/dashboard');
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Create your account
        </h2>
        <p className="text-sm text-gray-600">
          Start your personalized learning journey
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-900 mb-2">
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              value={formData.firstName}
              onChange={handleChange}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-gray-400 transition-colors text-sm"
              placeholder="First name"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-900 mb-2">
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              value={formData.lastName}
              onChange={handleChange}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-gray-400 transition-colors text-sm"
              placeholder="Last name"
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-gray-400 transition-colors text-sm"
            placeholder="Enter your email"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="profession" className="block text-sm font-medium text-gray-900 mb-2">
            Profession
          </label>
          <select
            id="profession"
            name="profession"
            required
            value={formData.profession}
            onChange={handleChange}
            className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-0 focus:border-gray-400 transition-colors text-sm"
            disabled={isLoading}
          >
            <option value="">Select your profession</option>
            <option value="student">Student</option>
            <option value="software-engineer">Software Engineer</option>
            <option value="web-developer">Web Developer</option>
            <option value="data-scientist">Data Scientist</option>
            <option value="product-manager">Product Manager</option>
            <option value="designer">Designer</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2.5 pr-10 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-gray-400 transition-colors text-sm"
              placeholder="Create a password"
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOffIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              ) : (
                <EyeIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-2">
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2.5 pr-10 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-gray-400 transition-colors text-sm"
              placeholder="Confirm your password"
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
            >
              {showConfirmPassword ? (
                <EyeOffIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              ) : (
                <EyeIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating account...
              </div>
            ) : (
              'Create account'
            )}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Already have an account?</span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/auth/login"
            className="text-sm text-gray-900 hover:text-gray-700 font-medium transition-colors"
          >
            Sign in instead
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;