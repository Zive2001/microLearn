import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  CheckCircle as CheckCircleIcon, 
  Play as PlayIcon, 
  Lock as LockIcon,
  BookOpen as BookOpenIcon,
  Clock as ClockIcon,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';

// Sample learning path data
const sampleLearningPaths = {
  javascript: {
    title: "JavaScript Mastery Path",
    description: "A comprehensive path to master JavaScript from basics to advanced concepts",
    estimatedTime: "8 weeks",
    difficulty: "Beginner to Advanced",
    modules: [
      {
        id: 1,
        title: "JavaScript Fundamentals",
        description: "Variables, data types, and basic operations",
        status: "available",
        estimatedTime: "1 week",
        videos: 5,
        completed: false
      },
      {
        id: 2,
        title: "Functions and Scope",
        description: "Understanding functions, parameters, and scope",
        status: "available",
        estimatedTime: "1 week",
        videos: 4,
        completed: false
      },
      {
        id: 3,
        title: "Objects and Arrays",
        description: "Working with complex data structures",
        status: "locked",
        estimatedTime: "1.5 weeks",
        videos: 6,
        completed: false
      },
      {
        id: 4,
        title: "DOM Manipulation",
        description: "Interacting with HTML elements",
        status: "locked",
        estimatedTime: "1 week",
        videos: 5,
        completed: false
      },
      {
        id: 5,
        title: "Async JavaScript",
        description: "Promises, async/await, and API calls",
        status: "locked",
        estimatedTime: "2 weeks",
        videos: 7,
        completed: false
      },
      {
        id: 6,
        title: "Advanced Concepts",
        description: "Closures, prototypes, and design patterns",
        status: "locked",
        estimatedTime: "1.5 weeks",
        videos: 6,
        completed: false
      }
    ]
  },
  react: {
    title: "React Development Path",
    description: "Build modern web applications with React",
    estimatedTime: "6 weeks",
    difficulty: "Intermediate",
    modules: [
      {
        id: 1,
        title: "React Basics",
        description: "Components, JSX, and props",
        status: "available",
        estimatedTime: "1 week",
        videos: 4,
        completed: false
      },
      {
        id: 2,
        title: "State Management",
        description: "useState and component state",
        status: "available",
        estimatedTime: "1 week",
        videos: 5,
        completed: false
      },
      {
        id: 3,
        title: "React Hooks",
        description: "useEffect and custom hooks",
        status: "locked",
        estimatedTime: "1.5 weeks",
        videos: 6,
        completed: false
      },
      {
        id: 4,
        title: "Routing",
        description: "React Router and navigation",
        status: "locked",
        estimatedTime: "1 week",
        videos: 4,
        completed: false
      },
      {
        id: 5,
        title: "API Integration",
        description: "Fetching data and handling responses",
        status: "locked",
        estimatedTime: "1.5 weeks",
        videos: 5,
        completed: false
      }
    ]
  }
};

const LearningPath = () => {
  const { topic } = useParams();
  const [learningPath, setLearningPath] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setLearningPath(sampleLearningPaths[topic] || null);
      setLoading(false);
    }, 1000);
  }, [topic]);

  const getStatusIcon = (status, completed) => {
    if (completed) {
      return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
    }
    if (status === 'locked') {
      return <LockIcon className="h-6 w-6 text-gray-400" />;
    }
    return <PlayIcon className="h-6 w-6 text-gray-600" />;
  };

  const getStatusStyles = (status, completed) => {
    if (completed) {
      return 'border-green-200 bg-green-50';
    }
    if (status === 'locked') {
      return 'border-gray-200 bg-gray-50 opacity-60';
    }
    return 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm cursor-pointer';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="bg-gray-200 h-8 w-64 mb-2 rounded"></div>
          <div className="bg-gray-200 h-4 w-96 mb-4 rounded"></div>
          <div className="bg-gray-200 h-32 rounded-lg mb-6"></div>
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-gray-200 h-24 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!learningPath) {
    return (
      <div className="text-center py-12">
        <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Learning Path Not Found
        </h3>
        <p className="text-gray-600">
          The requested learning path is not available yet.
        </p>
      </div>
    );
  }

  const completedModules = learningPath.modules.filter(m => m.completed).length;
  const progressPercentage = (completedModules / learningPath.modules.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          {learningPath.title}
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          {learningPath.description}
        </p>
        
        <div className="flex flex-wrap gap-6 text-sm text-gray-600">
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-2" />
            {learningPath.estimatedTime}
          </div>
          <div className="flex items-center">
            <TrendingUpIcon className="h-4 w-4 mr-2" />
            {learningPath.difficulty}
          </div>
          <div className="flex items-center">
            <BookOpenIcon className="h-4 w-4 mr-2" />
            {learningPath.modules.length} modules
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Your Progress</h2>
          <span className="text-sm text-gray-600">
            {completedModules} of {learningPath.modules.length} completed
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-gray-900 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        <p className="text-sm text-gray-600">
          {progressPercentage === 0 
            ? "Ready to start your learning journey!"
            : `You're ${Math.round(progressPercentage)}% through this learning path. Keep going!`
          }
        </p>
      </div>

      {/* Learning Modules */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Learning Modules</h2>
        
        {learningPath.modules.map((module, index) => (
          <div
            key={module.id}
            className={`border rounded-lg p-6 transition-all ${getStatusStyles(module.status, module.completed)}`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-4">
                {getStatusIcon(module.status, module.completed)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-medium text-gray-900">
                    Module {module.id}: {module.title}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{module.videos} videos</span>
                    <span>{module.estimatedTime}</span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  {module.description}
                </p>
                
                {module.status === 'available' && !module.completed && (
                  <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800">
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Start Module
                  </button>
                )}
                
                {module.completed && (
                  <div className="inline-flex items-center text-sm text-green-600">
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Completed
                  </div>
                )}
                
                {module.status === 'locked' && (
                  <div className="inline-flex items-center text-sm text-gray-500">
                    <LockIcon className="h-4 w-4 mr-2" />
                    Complete previous modules to unlock
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Next Steps */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Ready to Get Started?
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Begin with the first module and work your way through the structured learning path.
        </p>
        <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800">
          Start Learning Path
        </button>
      </div>
    </div>
  );
};

export default LearningPath;