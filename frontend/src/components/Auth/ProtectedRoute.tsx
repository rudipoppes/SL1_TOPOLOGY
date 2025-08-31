import React, { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoginPage } from './LoginPage';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, isAuthEnabled, login } = useAuth();

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-100/30 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-6 shadow-lg">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Loading SL1 Topology
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Initializing application...
          </p>
        </div>
      </div>
    );
  }

  // If auth is disabled (development mode), always show content
  if (!isAuthEnabled) {
    return <>{children}</>;
  }

  // If auth is enabled but user is not authenticated, show login page
  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  // User is authenticated, show protected content
  return <>{children}</>;
};