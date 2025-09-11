// src/components/Layout.jsx
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  HomeIcon, 
  BookOpenIcon, 
  AcademicCapIcon, 
  VideoCameraIcon,
  UserIcon,
  LogOutIcon,
  MenuIcon,
  XIcon
} from 'lucide-react';
import { useState } from 'react';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/app/dashboard', icon: HomeIcon },
    { name: 'Topics', href: '/app/topics', icon: BookOpenIcon },
    { name: 'Assessment', href: '/app/assessment', icon: AcademicCapIcon },
    { name: 'Videos', href: '/app/recommendations', icon: VideoCameraIcon },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (href) => location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Desktop Navigation */}
            <div className="flex items-center">
              <Link to="/app/dashboard" className="flex-shrink-0 flex items-center">
                <AcademicCapIcon className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">
                  AdaptiveLearn
                </span>
              </Link>
              
              {/* Desktop Navigation */}
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* User Info - Desktop */}
              <div className="hidden md:flex md:items-center md:space-x-4">
                <div className="text-sm">
                  <p className="text-gray-900 font-medium">
                    {user?.profile?.firstName} {user?.profile?.lastName}
                  </p>
                  <p className="text-gray-500 text-xs">{user?.profile?.profession}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Link
                    to="/app/profile"
                    className={`p-2 rounded-full transition-colors ${
                      isActive('/app/profile')
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <UserIcon className="h-5 w-5" />
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <LogOutIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Mobile menu button */}
              <button
                type="button"
                className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <XIcon className="h-6 w-6" />
                ) : (
                  <MenuIcon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-4 py-2 text-base font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-50 border-r-4 border-blue-500 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
            
            {/* Mobile User Menu */}
            <div className="pt-4 pb-3 border-t border-gray-200 bg-gray-50">
              <div className="px-4">
                <div className="text-base font-medium text-gray-800">
                  {user?.profile?.firstName} {user?.profile?.lastName}
                </div>
                <div className="text-sm text-gray-500">{user?.email}</div>
              </div>
              <div className="mt-3 space-y-1">
                <Link
                  to="/app/profile"
                  className="flex items-center px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <UserIcon className="h-5 w-5 mr-3" />
                  Profile
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center w-full px-4 py-2 text-base font-medium text-gray-500 hover:text-red-600 hover:bg-red-50"
                >
                  <LogOutIcon className="h-5 w-5 mr-3" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            <p>&copy; 2025 AdaptiveLearn. Built with AI-powered personalization.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;