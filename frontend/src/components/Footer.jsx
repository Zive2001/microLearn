import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Mail, 
  Twitter, 
  Github, 
  Linkedin,
  ArrowRight,
  Heart,
  Play,
  FileText,
  HelpCircle,
  Shield,
  Users
} from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'Courses',
      links: [
        { name: 'JavaScript', href: '/courses/javascript', icon: Play },
        { name: 'React', href: '/courses/react', icon: Play },
        { name: 'Python', href: '/courses/python', icon: Play },
        { name: 'TypeScript', href: '/courses/typescript', icon: Play },
        { name: 'Node.js', href: '/courses/nodejs', icon: Play },
        { name: 'View All', href: '/courses', icon: ArrowRight }
      ]
    },
    {
      title: 'Learn',
      links: [
        { name: 'How it Works', href: '/how-it-works', icon: HelpCircle },
        { name: 'Success Stories', href: '/testimonials', icon: Users },
        { name: 'Curriculum', href: '/curriculum', icon: FileText },
        { name: 'Free Resources', href: '/resources', icon: FileText },
        { name: 'Blog', href: '/blog', icon: FileText }
      ]
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', href: '/about', icon: Users },
        { name: 'Careers', href: '/careers', icon: Users },
        { name: 'Contact', href: '/contact', icon: Mail },
        { name: 'Press Kit', href: '/press', icon: FileText },
        { name: 'Partners', href: '/partners', icon: Users }
      ]
    },
    {
      title: 'Support',
      links: [
        { name: 'Help Center', href: '/help', icon: HelpCircle },
        { name: 'Privacy Policy', href: '/privacy', icon: Shield },
        { name: 'Terms of Service', href: '/terms', icon: Shield },
        { name: 'Community', href: '/community', icon: Users },
        { name: 'Status', href: '/status', icon: Shield }
      ]
    }
  ];

  const socialLinks = [
    { name: 'Twitter', href: 'https://twitter.com/microlearn', icon: Twitter },
    { name: 'GitHub', href: 'https://github.com/microlearn', icon: Github },
    { name: 'LinkedIn', href: 'https://linkedin.com/company/microlearn', icon: Linkedin }
  ];

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      {/* Newsletter Section - Notion style */}
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Stay Updated with MicroLearn
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Get the latest course updates, learning tips, and exclusive content delivered to your inbox weekly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors text-sm"
              />
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-200 flex items-center justify-center text-sm">
                Subscribe
                <ArrowRight className="ml-2 h-3 w-3" />
              </button>
            </div>
            
            <p className="text-gray-500 text-xs mt-3">
              No spam, unsubscribe at any time. We respect your privacy.
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer Content - Notion style */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-12">
          
          {/* Brand Section - Notion style */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center space-x-3 mb-4 group">
              <div className="w-8 h-8 bg-gray-900 rounded-md flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-200">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                MicroLearn
              </span>
            </Link>
            
            <p className="text-gray-600 leading-relaxed mb-6 max-w-sm text-sm">
              Empowering developers worldwide with bite-sized, AI-powered learning experiences. 
              Master programming skills 5 minutes at a time.
            </p>
            
            {/* Social Links - Notion style */}
            <div className="flex space-x-2">
              {socialLinks.map((social) => {
                const IconComponent = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-md flex items-center justify-center transition-colors duration-200"
                    aria-label={social.name}
                  >
                    <IconComponent className="h-4 w-4 text-gray-700" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Footer Links - Notion style */}
          {footerSections.map((section) => (
            <div key={section.title} className="lg:col-span-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => {
                  const IconComponent = link.icon;
                  return (
                    <li key={link.name}>
                      <Link
                        to={link.href}
                        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200 text-sm group"
                      >
                        <IconComponent className="h-3 w-3 mr-2 opacity-60 group-hover:opacity-100" />
                        {link.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar - Notion style */}
      <div className="border-t border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between text-sm">
            
            {/* Copyright - Notion style */}
            <div className="flex items-center text-gray-500 mb-4 md:mb-0">
              <span>© {currentYear} MicroLearn. Made with</span>
              <Heart className="h-3 w-3 mx-1 text-red-500 fill-current" />
              <span>for developers worldwide.</span>
            </div>

            {/* Legal Links - Notion style */}
            <div className="flex items-center space-x-6">
              <Link 
                to="/privacy" 
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                Privacy
              </Link>
              <Link 
                to="/terms" 
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                Terms
              </Link>
              <Link 
                to="/cookies" 
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                Cookies
              </Link>
              <div className="flex items-center text-gray-500">
                <span className="text-xs">🌍 Global Learning Platform</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;