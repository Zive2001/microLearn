import { Outlet, Link, useLocation } from 'react-router-dom';
import { BookOpen, Shield, Users, Zap } from 'lucide-react';

const AuthLayout = () => {
  const location = useLocation();
  const isRegisterPage = location.pathname.includes('/register');

  // Don't show AuthLayout for register page as it has its own layout
  if (isRegisterPage) {
    return <Outlet />;
  }

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
            <div className="w-10 h-10 bg-gray-900 rounded-md flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-200">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              MicroLearn
            </span>
          </Link>

          {/* Main heading */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
            Master Programming 
            <span className="block text-blue-600">5 Minutes at a Time</span>
          </h1>

          <p className="text-gray-600 mb-8 leading-relaxed">
            Join thousands of developers learning with AI-powered micro-lessons designed for your busy schedule.
          </p>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center mr-3">
                <Zap className="h-4 w-4 text-gray-700" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">AI-Powered Learning</div>
                <div className="text-xs text-gray-500">Personalized lessons adapt to you</div>
              </div>
            </div>

            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center mr-3">
                <Users className="h-4 w-4 text-gray-700" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">10,000+ Active Learners</div>
                <div className="text-xs text-gray-500">Join our growing community</div>
              </div>
            </div>

            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center mr-3">
                <Shield className="h-4 w-4 text-gray-700" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">95% Success Rate</div>
                <div className="text-xs text-gray-500">Proven learning methodology</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center space-x-3 mb-4 group">
              <div className="w-8 h-8 bg-gray-900 rounded-md flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-200">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                MicroLearn
              </span>
            </Link>
          </div>

          {/* Auth Form Container */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <Outlet />
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Secure authentication powered by industry-standard encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;