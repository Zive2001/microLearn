import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { validateStep, validateAllSteps } from '../utils/FormValidation';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

// Import step components
import StepIndicator from '../components/StepIndicator';
import BasicInfoStep from '../components/BasicInfoStep';
import ProfileSetupStep from '../components/ProfileSetupStep';
import LearningPreferencesStep from '../components/LearningPreferencesStep';
import RegistrationSuccess from '../components/RegistrationSuccess';

const Register = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    
    // Step 2: Profile Setup
    dateOfBirth: '',
    location: '',
    currentRole: '',
    experienceLevel: 'Complete Beginner', // Default value
    bio: '',
    
    // Step 3: Learning Preferences
    learningGoal: '',
    interestedTopics: [],
    timeCommitment: '',
    learningStyle: '',
    preferredSchedule: [],
    enableNotifications: true
  });

  // Validation errors state
  const [errors, setErrors] = useState({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Step definitions
  const steps = [
    {
      id: 1,
      title: 'Basic Info',
      subtitle: 'Account details'
    },
    {
      id: 2,
      title: 'Profile',
      subtitle: 'Personal info'
    },
    {
      id: 3,
      title: 'Preferences',
      subtitle: 'Learning style'
    }
  ];

  const handleNext = () => {
    // Validate current step
    const stepErrors = validateStep(currentStep, formData);
    setErrors(stepErrors);

    // If there are errors, don't proceed
    if (Object.keys(stepErrors).length > 0) {
      toast.error('Please fix the errors below');
      return;
    }

    // Move to next step
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate all steps
    const allErrors = validateAllSteps(formData);
    setErrors(allErrors);

    if (Object.keys(allErrors).length > 0) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      // Map form data to backend expected format
      const registrationData = {
        email: formData.email,
        password: formData.password,
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          profession: formData.currentRole, // Map currentRole to profession
          gender: 'Prefer not to say', // Default value since not collected in current form
          experienceLevel: formData.experienceLevel || 'Complete Beginner'
        },
        learningPreferences: {
          learningGoal: mapLearningGoal(formData.learningGoal),
          interestedAreas: formData.interestedTopics || [],
          preferredContentLength: mapTimeCommitment(formData.timeCommitment)
        }
      };

      // Call registration API
      await authAPI.register(registrationData);
      
      // Show success
      toast.success('Account created successfully! 🎉');
      setIsRegistrationComplete(true);
      
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to map learning goals to backend expected values
  const mapLearningGoal = (goal) => {
    const goalMap = {
      'career_change': 'Career Change',
      'skill_improvement': 'Skill Enhancement', 
      'hobby': 'Personal Interest',
      'academic': 'Academic Requirements'
    };
    return goalMap[goal] || 'Personal Interest';
  };

  // Helper function to map time commitment to backend expected values
  const mapTimeCommitment = (commitment) => {
    const commitmentMap = {
      '5-10': 'Short (5-10 min)',
      '15-30': 'Medium (15-30 min)',
      '30-60': 'Long (30-60 min)',
      '60+': 'Long (30-60 min)'
    };
    return commitmentMap[commitment] || 'Short (5-10 min)';
  };

  // If registration is complete, show success component
  if (isRegistrationComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <RegistrationSuccess 
            userEmail={formData.email}
            userName={formData.firstName}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-3 mb-6 group">
            <div className="w-10 h-10 bg-gray-900 rounded-md flex items-center justify-center group-hover:bg-gray-700 transition-colors duration-200">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
              MicroLearn
            </span>
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Join MicroLearn
          </h1>
          <p className="text-gray-600">
            Start your personalized learning journey today
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator steps={steps} currentStep={currentStep} />

        {/* Form Container */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            
            {/* Step Illustration */}
            <div className="flex justify-center mb-8">
              <div className="w-32 h-32 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                <img 
                  src={`/illustrations/notion-register-step-${currentStep}.svg`}
                  alt={`Step ${currentStep} illustration`}
                  className="w-full h-full object-contain p-4"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden flex-col items-center text-gray-400">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                    <div className="w-8 h-8 bg-gray-300 rounded text-xs font-medium text-gray-600 flex items-center justify-center">
                      {currentStep}
                    </div>
                  </div>
                  <p className="text-xs text-center">
                    Step {currentStep}
                    <br />
                    <span className="text-gray-300">Notion illustration</span>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Step Content */}
            {currentStep === 1 && (
              <BasicInfoStep
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                showConfirmPassword={showConfirmPassword}
                setShowConfirmPassword={setShowConfirmPassword}
              />
            )}

            {currentStep === 2 && (
              <ProfileSetupStep
                formData={formData}
                setFormData={setFormData}
                errors={errors}
              />
            )}

            {currentStep === 3 && (
              <LearningPreferencesStep
                formData={formData}
                setFormData={setFormData}
                errors={errors}
              />
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <div>
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </button>
                ) : (
                  <Link 
                    to="/auth/login"
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200"
                  >
                    Already have an account?
                  </Link>
                )}
              </div>

              <div>
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-md transition-colors duration-200"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`inline-flex items-center px-6 py-3 font-medium rounded-md transition-colors duration-200 ${
                      isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sign In Link for Step 1 */}
          {currentStep === 1 && (
            <div className="text-center mt-6">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link 
                  to="/auth/login" 
                  className="text-gray-900 hover:text-gray-700 font-medium transition-colors duration-200"
                >
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;