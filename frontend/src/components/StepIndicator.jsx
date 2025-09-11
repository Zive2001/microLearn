import React from 'react';
import { Check } from 'lucide-react';

const StepIndicator = ({ steps, currentStep }) => {
  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const isLast = index === steps.length - 1;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div className={`
                  relative flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all duration-200
                  ${isCompleted 
                    ? 'bg-gray-900 border-gray-900 text-white' 
                    : isActive 
                      ? 'border-gray-900 bg-gray-50 text-gray-900' 
                      : 'border-gray-200 bg-white text-gray-400'
                  }
                `}>
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{stepNumber}</span>
                  )}
                </div>
                
                <div className="mt-3 text-center">
                  <div className={`text-sm font-medium transition-colors duration-200 ${
                    isActive ? 'text-gray-900' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 hidden sm:block">
                    {step.subtitle}
                  </div>
                </div>
              </div>
              
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-4 transition-colors duration-200 ${
                  stepNumber < currentStep ? 'bg-gray-900' : 'bg-gray-200'
                }`}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;