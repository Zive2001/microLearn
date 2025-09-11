// src/components/AuthLayout.jsx
import { Outlet, Link } from 'react-router-dom';
import { AcademicCapIcon } from 'lucide-react';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <Link to="/" className="flex justify-center items-center">
          <AcademicCapIcon className="h-12 w-12 text-blue-600" />
          <span className="ml-2 text-2xl font-bold text-gray-900">
            AdaptiveLearn
          </span>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Outlet />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          Discover your programming potential with AI-powered learning
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;