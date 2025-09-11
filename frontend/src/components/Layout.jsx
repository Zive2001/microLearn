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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 px-4 mb-8">
              <Link to="/app/dashboard" className="flex items-center">
                <AcademicCapIcon className="h-8 w-8 text-gray-900" />
                <span className="ml-2 text-xl font-semibold text-gray-900">
                  AdaptiveLearn
                </span>
              </Link>
            </div>
            
            {/* Navigation */}
            <nav className="px-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive(item.href)
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${
                      isActive(item.href) ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          {/* User menu */}
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-gray-900">
                    {user?.profile?.firstName} {user?.profile?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 group-hover:text-gray-700">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <LogOutIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 flex z-40">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <XIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4 mb-8">
                <AcademicCapIcon className="h-8 w-8 text-gray-900" />
                <span className="ml-2 text-xl font-semibold text-gray-900">
                  AdaptiveLearn
                </span>
              </div>
              <nav className="px-3 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        isActive(item.href)
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${
                        isActive(item.href) ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                      }`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.profile?.firstName} {user?.profile?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    handleLogout();
                  }}
                  className="ml-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  <LogOutIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top bar for mobile */}
        <div className="md:hidden relative z-10 flex-shrink-0 flex h-16 bg-white shadow border-b border-gray-200">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex items-center">
              <AcademicCapIcon className="h-8 w-8 text-gray-900" />
              <span className="ml-2 text-lg font-semibold text-gray-900">
                AdaptiveLearn
              </span>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;