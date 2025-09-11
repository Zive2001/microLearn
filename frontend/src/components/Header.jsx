import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  Menu, 
  X, 
  ChevronDown,
  Play,
  Users,
  FileText,
  Mail
} from 'lucide-react';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const navigation = [
    {
      name: 'Courses',
      href: '#courses',
      hasDropdown: true,
      dropdownItems: [
        { name: 'JavaScript', href: '/courses/javascript', icon: Play },
        { name: 'React', href: '/courses/react', icon: Play },
        { name: 'Python', href: '/courses/python', icon: Play },
        { name: 'TypeScript', href: '/courses/typescript', icon: Play },
        { name: 'View All Courses', href: '/courses', icon: FileText }
      ]
    },
    {
      name: 'How it Works',
      href: '#how-it-works'
    },
    {
      name: 'Success Stories',
      href: '#testimonials'
    },
    {
      name: 'Pricing',
      href: '#pricing'
    }
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-sm border-b border-gray-200' 
        : 'bg-white/80 backdrop-blur-sm'
    }`}>
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo - Notion style */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 bg-gray-900 rounded-md flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-200">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              MicroLearn
            </span>
          </Link>

          {/* Desktop Navigation - Notion style */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) => (
              <div key={item.name} className="relative group">
                <a
                  href={item.href}
                  className="flex items-center px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-medium transition-colors duration-200 rounded-md text-sm"
                >
                  {item.name}
                  {item.hasDropdown && (
                    <ChevronDown className="ml-1 h-3 w-3 transition-transform group-hover:rotate-180" />
                  )}
                </a>

                {/* Dropdown Menu - Notion style */}
                {item.hasDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="p-1">
                      {item.dropdownItems.map((dropdownItem) => {
                        const IconComponent = dropdownItem.icon;
                        return (
                          <Link
                            key={dropdownItem.name}
                            to={dropdownItem.href}
                            className="flex items-center px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200 text-sm"
                          >
                            <IconComponent className="h-3 w-3 mr-3 text-gray-500" />
                            {dropdownItem.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Desktop CTA Buttons - Notion style */}
          <div className="hidden lg:flex items-center space-x-2">
            <Link
              to="/auth/login"
              className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-medium transition-colors duration-200 rounded-md text-sm"
            >
              Sign In
            </Link>
            <Link
              to="/auth/register"
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-200 text-sm"
            >
              Start Learning
            </Link>
          </div>

          {/* Mobile Menu Button - Notion style */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navigation - Notion style */}
        <div className={`lg:hidden transition-all duration-200 ${
          isOpen 
            ? 'max-h-screen opacity-100 pb-4' 
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          <nav className="space-y-1 pt-4 border-t border-gray-200">
            {navigation.map((item) => (
              <div key={item.name}>
                <a
                  href={item.href}
                  className="block px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md font-medium transition-colors duration-200 text-sm"
                >
                  {item.name}
                </a>
                
                {/* Mobile Dropdown */}
                {item.hasDropdown && (
                  <div className="ml-3 mt-1 space-y-1">
                    {item.dropdownItems.map((dropdownItem) => {
                      const IconComponent = dropdownItem.icon;
                      return (
                        <Link
                          key={dropdownItem.name}
                          to={dropdownItem.href}
                          className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200 text-sm"
                        >
                          <IconComponent className="h-3 w-3 mr-3" />
                          {dropdownItem.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Mobile CTA Buttons */}
            <div className="space-y-2 pt-4 border-t border-gray-200">
              <Link
                to="/auth/login"
                className="block w-full px-3 py-2 text-center text-gray-700 border border-gray-300 font-medium rounded-md hover:bg-gray-100 transition-colors duration-200 text-sm"
              >
                Sign In
              </Link>
              <Link
                to="/auth/register"
                className="block w-full px-3 py-2 text-center bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-200 text-sm"
              >
                Start Learning
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;