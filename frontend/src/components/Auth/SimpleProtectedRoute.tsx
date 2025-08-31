import React, { ReactNode } from 'react';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { SimpleLoginPage } from './SimpleLoginPage';

interface SimpleProtectedRouteProps {
  children: ReactNode;
}

export const SimpleProtectedRoute: React.FC<SimpleProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, isAuthEnabled, login } = useSimpleAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-100/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-6 shadow-lg">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-semibold text-slate-700 mb-2">Loading SL1 Topology</h2>
          <p className="text-slate-500">Initializing application...</p>
        </div>
      </div>
    );
  }

  if (!isAuthEnabled) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return <SimpleLoginPage onLogin={login} />;
  }

  return <>{children}</>;
};