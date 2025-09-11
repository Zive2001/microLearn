import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  BookOpen, 
  Sparkles, 
  Zap,
  Users,
  Trophy,
  Play
} from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="relative min-h-screen bg-white overflow-hidden">
      {/* Notion-style subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      <div className="relative container mx-auto px-6 pt-24 pb-16">
        <div className="flex flex-col lg:flex-row items-center justify-between min-h-[85vh]">
          
          {/* Left Content */}
          <div className="lg:w-1/2 text-center lg:text-left mb-12 lg:mb-0">
            
            {/* Notion-style Badge */}
            <div className="inline-flex items-center px-3 py-1.5 bg-gray-100 rounded-md mb-8">
              <Sparkles className="h-3.5 w-3.5 text-gray-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">AI-Powered Learning Platform</span>
            </div>

            {/* Main Headline - Notion Typography */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6 tracking-tight">
              Learn Programming
              <span className="block text-blue-600">
                5 Minutes at a Time
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-8 max-w-2xl font-normal">
              Master JavaScript, React, Python, and more through bite-sized, personalized lessons powered by AI. 
              <span className="font-medium text-gray-800"> Start your coding journey today.</span>
            </p>

            {/* Stats Row - Notion style */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 mb-10">
              <div className="flex items-center text-gray-600">
                <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center mr-2">
                  <Users className="h-4 w-4 text-gray-700" />
                </div>
                <span className="font-semibold text-gray-900">10,000+</span>
                <span className="ml-1 text-gray-600">Learners</span>
              </div>
              <div className="flex items-center text-gray-600">
                <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center mr-2">
                  <Trophy className="h-4 w-4 text-gray-700" />
                </div>
                <span className="font-semibold text-gray-900">95%</span>
                <span className="ml-1 text-gray-600">Success Rate</span>
              </div>
              <div className="flex items-center text-gray-600">
                <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center mr-2">
                  <Zap className="h-4 w-4 text-gray-700" />
                </div>
                <span className="font-semibold text-gray-900">5min</span>
                <span className="ml-1 text-gray-600">Lessons</span>
              </div>
            </div>

            {/* CTA Buttons - Notion style */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                to="/auth/register"
                className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-200 text-sm"
              >
                Start Learning Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              
              <button className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-md transition-colors duration-200 text-sm">
                <Play className="mr-2 h-4 w-4" />
                Watch Demo
              </button>
            </div>

            {/* Trust indicators - Notion minimal style */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">Trusted by learners at:</p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 opacity-60">
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
                <div className="h-6 w-20 bg-gray-200 rounded"></div>
                <div className="h-6 w-14 bg-gray-200 rounded"></div>
                <div className="h-6 w-18 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>

          {/* Right Content - Notion-style illustration container */}
          <div className="lg:w-1/2 flex justify-center">
            <div className="relative">
              {/* Main illustration container - Notion style */}
              <div className="w-96 h-96 lg:w-[500px] lg:h-[500px] bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center relative overflow-hidden">
                
                {/* Placeholder for hero illustration */}
                <img 
                  src="/illustrations/notion-hero-learning.svg"
                  alt="AI-powered learning illustration"
                  className="w-full h-full object-contain p-8"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                
                {/* Notion-style fallback */}
                <div className="hidden flex-col items-center text-gray-400 p-8">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg mb-6 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Hero Learning Illustration</h3>
                  <p className="text-center text-sm text-gray-500 leading-relaxed">
                    Visual representation of AI-powered micro-learning
                    <br />
                    <span className="text-xs text-gray-400">Add your Notion-style illustration here</span>
                  </p>
                </div>

                {/* Notion-style floating UI elements */}
                <div className="absolute top-4 right-4 bg-white rounded-md p-2 shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-xs font-medium text-gray-700">JavaScript</span>
                  </div>
                </div>

                <div className="absolute bottom-6 left-4 bg-white rounded-md p-2 shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <Trophy className="h-3 w-3 text-yellow-500 mr-1" />
                    <span className="text-xs font-medium text-gray-700">Level Up!</span>
                  </div>
                </div>

                <div className="absolute top-1/3 left-2 bg-white rounded-md p-2 shadow-sm border border-gray-200">
                  <div className="space-y-1">
                    <div className="w-6 h-1 bg-blue-500 rounded-full"></div>
                    <div className="w-4 h-1 bg-gray-200 rounded-full"></div>
                    <div className="w-3 h-1 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notion-style scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="w-5 h-8 border border-gray-300 rounded-full flex justify-center">
            <div className="w-0.5 h-2 bg-gray-400 rounded-full mt-1.5 animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;