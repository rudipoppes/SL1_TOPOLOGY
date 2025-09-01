import React from 'react';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';

interface LogoutButtonProps {
  className?: string;
  variant?: 'button' | 'menu';
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({ 
  className = '', 
  variant = 'button' 
}) => {
  // Check if we're in an environment that supports auth
  const isAuthPort = window.location.port === '4000';
  
  // Don't render anything if not on auth port
  if (!isAuthPort) {
    return null;
  }

  let logout, user, isAuthEnabled;
  
  try {
    const authContext = useSimpleAuth();
    logout = authContext.logout;
    user = authContext.user;
    isAuthEnabled = authContext.isAuthEnabled;
  } catch (error) {
    // If SimpleAuthProvider is not available, don't render
    return null;
  }

  // Don't show logout button if auth is disabled
  if (!isAuthEnabled) {
    return null;
  }

  const handleLogout = () => {
    logout();
    // Force page reload to prevent back button access to cached content
    window.location.reload();
  };

  if (variant === 'menu') {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <span>{user?.username || 'User'}</span>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 
                   hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
          title="Sign out"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white 
                 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800
                 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg ${className}`}
      title="Sign out"
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Sign out
    </button>
  );
};