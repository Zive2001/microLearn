// src/components/Loading.jsx
const Loading = ({ 
  size = 'md', 
  text = 'Loading...', 
  className = '',
  fullScreen = false 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className={`animate-spin rounded-full border-2 border-gray-200 border-t-gray-900 mx-auto ${sizeClasses[size]}`}></div>
          {text && (
            <p className={`mt-3 text-gray-600 ${textSizeClasses[size]}`}>
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-gray-200 border-t-gray-900 ${sizeClasses[size]}`}></div>
      {text && (
        <span className={`ml-3 text-gray-600 ${textSizeClasses[size]}`}>
          {text}
        </span>
      )}
    </div>
  );
};

// Skeleton loading component for lists/cards
export const SkeletonCard = ({ className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="bg-gray-100 rounded-md h-4 mb-3"></div>
    <div className="bg-gray-100 rounded-md h-3 mb-2 w-3/4"></div>
    <div className="bg-gray-100 rounded-md h-3 w-1/2"></div>
  </div>
);

// Skeleton for topic cards
export const TopicSkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-sm transition-shadow animate-pulse">
    <div className="flex items-center mb-4">
      <div className="bg-gray-100 rounded-full h-10 w-10"></div>
      <div className="ml-3">
        <div className="bg-gray-100 rounded-md h-4 w-24 mb-2"></div>
        <div className="bg-gray-100 rounded-md h-3 w-16"></div>
      </div>
    </div>
    <div className="space-y-3">
      <div className="bg-gray-100 rounded-md h-3 w-full"></div>
      <div className="bg-gray-100 rounded-md h-3 w-4/5"></div>
    </div>
    <div className="mt-6 flex justify-between items-center">
      <div className="bg-gray-100 rounded-md h-3 w-20"></div>
      <div className="bg-gray-100 rounded-md h-8 w-20"></div>
    </div>
  </div>
);

// Skeleton for video cards
export const VideoSkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow animate-pulse">
    <div className="bg-gray-100 h-48 w-full"></div>
    <div className="p-4">
      <div className="bg-gray-100 rounded-md h-4 mb-3"></div>
      <div className="bg-gray-100 rounded-md h-3 mb-2 w-3/4"></div>
      <div className="flex justify-between items-center mt-4">
        <div className="bg-gray-100 rounded-md h-3 w-16"></div>
        <div className="bg-gray-100 rounded-md h-3 w-20"></div>
      </div>
    </div>
  </div>
);

export default Loading;