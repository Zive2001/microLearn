import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye as EyeIcon, EyeOff as EyeOffIcon, BookOpen, Sparkles, Zap, Users, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authAPI.login(formData.email, formData.password);
      toast.success('Welcome back! 👋');
      navigate(from, { replace: true });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-white flex-col justify-center p-12 relative overflow-hidden">
        
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>

        <div className="relative z-10 max-w-md">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center space-x-3 mb-8 group">
            <div className="w-10 h-10 bg-gray-900 rounded-md flex items-center justify-center group-hover:bg-gray-700 transition-colors duration-200">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
              MicroLearn
            </span>
          </Link>

          {/* Main heading */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
            Welcome back to your 
            <span className="block text-gray-700">learning journey</span>
          </h1>

          <p className="text-gray-600 mb-8 leading-relaxed">
            Continue building your programming skills with personalized AI-powered micro-lessons.
          </p>

          {/* Illustration placeholder */}
          <div className="w-80 h-80 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center mb-8 mx-auto">
            <img 
              src="/illustrations/notion-login-hero.svg"
              alt="Welcome back illustration"
              className="w-full h-full object-contain p-6"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden flex-col items-center text-gray-400">
              <div className="w-20 h-20 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-gray-500" />
              </div>
              <p className="text-sm text-center">
                Login Hero Illustration
                <br />
                <span className="text-xs text-gray-400">Notion-style welcome visual</span>
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center mx-auto mb-2">
                <Users className="h-4 w-4 text-gray-700" />
              </div>
              <div className="text-lg font-semibold text-gray-900">10K+</div>
              <div className="text-xs text-gray-500">Learners</div>
            </div>
            <div>
              <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center mx-auto mb-2">
                <Trophy className="h-4 w-4 text-gray-700" />
              </div>
              <div className="text-lg font-semibold text-gray-900">95%</div>
              <div className="text-xs text-gray-500">Success</div>
            </div>
            <div>
              <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center mx-auto mb-2">
                <Zap className="h-4 w-4 text-gray-700" />
              </div>
              <div className="text-lg font-semibold text-gray-900">5min</div>
              <div className="text-xs text-gray-500">Lessons</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center space-x-3 mb-4 group">
              <div className="w-8 h-8 bg-gray-900 rounded-md flex items-center justify-center group-hover:bg-gray-700 transition-colors duration-200">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                MicroLearn
              </span>
            </Link>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            {/* Form Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Sign in to your account
              </h2>
              <p className="text-gray-600">
                Welcome back! Please enter your details
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors duration-200 hover:border-gray-400"
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors duration-200 hover:border-gray-400"
                    placeholder="Enter your password"
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

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>

                <div>
                  <Link 
                    to="/auth/forgot-password" 
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md text-sm font-medium text-white transition-colors duration-200 ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link 
                  to="/auth/register" 
                  className="font-medium text-gray-900 hover:text-gray-700 transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Secure authentication with industry-standard encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;