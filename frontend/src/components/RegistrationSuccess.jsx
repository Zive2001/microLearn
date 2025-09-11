import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Mail, Sparkles, BookOpen, Trophy, Users } from 'lucide-react';

const RegistrationSuccess = ({ userEmail, userName }) => {
  useEffect(() => {
    // Confetti effect could be added here
    // Or any success analytics tracking
  }, []);

  const nextSteps = [
    {
      icon: Mail,
      title: 'Verify Your Email',
      description: 'Check your inbox and click the verification link',
      action: 'Check Email',
      actionLink: '#',
      priority: 'high'
    },
    {
      icon: BookOpen,
      title: 'Complete Profile',
      description: 'Add more details to personalize your experience',
      action: 'Complete Profile',
      actionLink: '/profile',
      priority: 'medium'
    },
    {
      icon: Trophy,
      title: 'Take Assessment',
      description: 'Let us recommend the perfect learning path',
      action: 'Start Assessment',
      actionLink: '/assessment',
      priority: 'high'
    }
  ];

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Learning',
      description: 'Personalized lessons adapt to your pace'
    },
    {
      icon: Users,
      title: 'Join 10,000+ Learners',
      description: 'Be part of our growing community'
    },
    {
      icon: Trophy,
      title: '95% Success Rate',
      description: 'Most learners complete their goals'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Success Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to MicroLearn, {userName}! 🎉
        </h2>
        
        <p className="text-lg text-gray-600 mb-6">
          Your account has been created successfully. You're now part of our learning community!
        </p>

        {/* Success Badge */}
        <div className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
          <span className="text-sm font-medium text-green-800">
            Account created for {userEmail}
          </span>
        </div>
      </div>

      {/* What's Next Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          What's next?
        </h3>
        
        <div className="space-y-4">
          {nextSteps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={index} className="flex items-start p-4 bg-white rounded-lg border border-gray-200">
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${
                  step.priority === 'high' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <IconComponent className={`w-5 h-5 ${
                    step.priority === 'high' ? 'text-gray-900' : 'text-gray-600'
                  }`} />
                </div>
                
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    {step.title}
                    {step.priority === 'high' && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Required
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {step.description}
                  </p>
                  
                  <Link
                    to={step.actionLink}
                    className={`inline-flex items-center text-sm font-medium transition-colors duration-200 ${
                      step.priority === 'high' 
                        ? 'text-gray-900 hover:text-blue-700' 
                        : 'text-gray-600 hover:text-gray-700'
                    }`}
                  >
                    {step.action}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Features Preview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          What makes MicroLearn special?
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div key={index} className="text-center p-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-3">
                  <IconComponent className="w-6 h-6 text-gray-700" />
                </div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  {feature.title}
                </h4>
                <p className="text-xs text-gray-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary CTA */}
      <div className="text-center pt-4">
        <Link
          to="/dashboard"
          className="inline-flex items-center px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-md transition-colors duration-200"
        >
          Go to Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
        
        <p className="text-sm text-gray-500 mt-4">
          You can always complete these steps later from your dashboard.
        </p>
      </div>

      {/* Email Verification Reminder */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Mail className="h-5 w-5 text-gray-900 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Don't forget to verify your email
            </h4>
            <p className="text-sm text-blue-800">
              We've sent a verification link to <strong>{userEmail}</strong>. 
              Please check your inbox and click the link to activate all features.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuccess;