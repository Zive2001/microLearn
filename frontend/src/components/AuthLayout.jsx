// src/components/AuthLayout.jsx
import { Outlet, Link } from 'react-router-dom';
import { AcademicCapIcon } from 'lucide-react';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <Link to="/" className="flex justify-center items-center mb-8">
          <AcademicCapIcon className="h-10 w-10 text-gray-900" />
          <span className="ml-2 text-xl font-semibold text-gray-900">
            AdaptiveLearn
          </span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="bg-white py-8 px-6 border border-gray-200 rounded-lg shadow-sm">
          <Outlet />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Discover your programming potential with AI-powered learning
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;