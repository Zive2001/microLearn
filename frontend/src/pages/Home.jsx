// src/pages/Home.jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  GraduationCap as AcademicCapIcon, 
  ArrowRight as ArrowRightIcon, 
  CheckCircle as CheckCircleIcon,
  Sparkles as SparklesIcon,
  BookOpen as BookOpenIcon,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';

const Home = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: SparklesIcon,
      title: 'AI-Powered Assessment',
      description: 'Dynamic questions that adapt to your skill level in real-time'
    },
    {
      icon: BookOpenIcon,
      title: 'Curated Learning',
      description: 'Hand-picked YouTube videos matched to your exact knowledge level'
    },
    {
      icon: TrendingUpIcon,
      title: 'Track Progress',
      description: 'Monitor your learning journey with detailed analytics and insights'
    }
  ];

  const benefits = [
    'Personalized learning paths based on your assessment results',
    'AI-curated video recommendations from top educators',
    'Real-time difficulty adaptation during assessments',
    'Progress tracking across multiple programming topics',
    'Microlearning approach for better retention'
  ];

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      {/* Header */}
      <header className="bg-white border-b border-[#E9E9E7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <AcademicCapIcon className="h-8 w-8 text-[#2383E2]" />
              <span className="ml-2 text-xl font-semibold text-[#37352F]">
                AdaptiveLearn
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link
                  to="/app/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-[#2383E2] hover:bg-[#0F62FE] transition-colors"
                >
                  Go to Dashboard
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/auth/login"
                    className="text-[#6B6B6B] hover:text-[#37352F] font-medium transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/auth/register"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-[#2383E2] hover:bg-[#0F62FE] transition-colors"
                  >
                    Get Started
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
            <div className="lg:col-span-6">
              <h1 className="text-4xl lg:text-6xl font-bold text-[#37352F] leading-tight">
                Discover Your
                <span className="block text-[#2383E2]">Programming Potential</span>
              </h1>
              
              <p className="mt-6 text-xl text-[#6B6B6B] leading-relaxed">
                Take personalized AI assessments, get your exact skill level, and receive 
                curated video recommendations tailored to your learning needs.
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                {!isAuthenticated ? (
                  <>
                    <Link
                      to="/auth/register"
                      className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-[#2383E2] hover:bg-[#0F62FE] transition-colors"
                    >
                      Start Your Assessment
                      <ArrowRightIcon className="ml-2 h-5 w-5" />
                    </Link>
                    <Link
                      to="/auth/login"
                      className="inline-flex items-center justify-center px-6 py-3 border border-[#E9E9E7] text-base font-medium rounded-lg text-[#37352F] bg-white hover:bg-[#F7F6F3] transition-colors"
                    >
                      Sign In
                    </Link>
                  </>
                ) : (
                  <Link
                    to="/app/dashboard"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-[#2383E2] hover:bg-[#0F62FE] transition-colors"
                  >
                    Continue Learning
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </Link>
                )}
              </div>
            </div>
            
            <div className="mt-12 lg:mt-0 lg:col-span-6">
              <div className="relative">
                {/* Placeholder for hero illustration */}
                <div className="w-full h-96 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                  <img 
                    src="/illustrations/hero-main.svg" 
                    alt="AI-powered learning illustration" 
                    className="w-full h-full object-contain p-8"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden flex-col items-center text-gray-400">
                    <div className="w-32 h-32 bg-gray-100 rounded-full mb-4 flex items-center justify-center">
                      <AcademicCapIcon className="h-16 w-16 text-[#2383E2]" />
                    </div>
                    <p className="text-sm">Hero Illustration Placeholder</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#37352F]">
              How AdaptiveLearn Works
            </h2>
            <p className="mt-4 text-xl text-[#6B6B6B]">
              AI-powered personalization for your learning journey
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="flex justify-center">
                    <div className="flex items-center justify-center h-16 w-16 rounded-lg bg-[#2383E2]/10 text-[#2383E2]">
                      <Icon className="h-8 w-8" />
                    </div>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-[#37352F]">
                    {feature.title}
                  </h3>
                  <p className="mt-4 text-[#6B6B6B] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-[#F7F6F3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-[#37352F]">
                Why Choose AdaptiveLearn?
              </h2>
              
              <ul className="mt-8 space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-[#6B6B6B] leading-relaxed">{benefit}</span>
                  </li>
                ))}
              </ul>

              {!isAuthenticated && (
                <div className="mt-8">
                  <Link
                    to="/auth/register"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-[#2383E2] hover:bg-[#0F62FE] transition-colors"
                  >
                    Start Learning Today
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </Link>
                </div>
              )}
            </div>
            
            <div className="mt-12 lg:mt-0">
              {/* Placeholder for benefits illustration */}
              <div className="w-full h-80 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                <img 
                  src="/illustrations/benefits.svg" 
                  alt="Learning benefits illustration" 
                  className="w-full h-full object-contain p-6"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden flex-col items-center text-gray-400">
                  <div className="w-24 h-24 bg-gray-100 rounded-full mb-4 flex items-center justify-center">
                    <SparklesIcon className="h-12 w-12 text-[#2383E2]" />
                  </div>
                  <p className="text-sm">Benefits Illustration Placeholder</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-20 bg-[#2383E2]">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-white">
              Ready to discover your programming level?
            </h2>
            <p className="mt-4 text-xl text-blue-100">
              Join thousands of learners who've found their perfect learning path
            </p>
            <div className="mt-8">
              <Link
                to="/auth/register"
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-[#2383E2] bg-white hover:bg-gray-50 transition-colors"
              >
                Get Started Free
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-[#E9E9E7]">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center items-center mb-4">
              <AcademicCapIcon className="h-6 w-6 text-[#2383E2]" />
              <span className="ml-2 text-lg font-semibold text-[#37352F]">
                AdaptiveLearn
              </span>
            </div>
            <p className="text-sm text-[#6B6B6B]">
              &copy; 2025 AdaptiveLearn. Built with AI-powered personalization.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;