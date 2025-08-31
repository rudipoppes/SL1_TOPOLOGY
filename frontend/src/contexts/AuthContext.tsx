import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, User } from '../services/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  isAuthEnabled: boolean;
  login: () => void;
  logout: () => void;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthEnabled] = useState(() => authService.isAuthEnabled());

  const checkAuthStatus = () => {
    if (!isAuthEnabled) {
      // Auth disabled - user is always "authenticated"
      setIsAuthenticated(true);
      setUser({
        username: 'developer',
        isAuthenticated: true,
        loginTime: Date.now()
      });
      setIsLoading(false);
      return;
    }

    // Auth enabled - check actual authentication
    const authenticated = authService.isAuthenticated();
    const currentUser = authService.getCurrentUser();
    
    setIsAuthenticated(authenticated);
    setUser(currentUser);
    setIsLoading(false);
  };

  const login = () => {
    // This will be called after successful login
    checkAuthStatus();
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const refreshAuth = () => {
    if (isAuthEnabled && authService.refreshToken()) {
      checkAuthStatus();
    }
  };

  // Initial auth check
  useEffect(() => {
    checkAuthStatus();
  }, [isAuthEnabled]);

  // Auto-refresh token periodically
  useEffect(() => {
    if (!isAuthEnabled) return;

    const interval = setInterval(() => {
      if (authService.isAuthenticated()) {
        authService.refreshToken();
      } else if (isAuthenticated) {
        // User was authenticated but token expired
        logout();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, isAuthEnabled]);

  // Listen for auth changes across tabs
  useEffect(() => {
    if (!isAuthEnabled) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'user_data') {
        checkAuthStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isAuthEnabled]);

  // Handle page visibility change - refresh auth when page becomes visible
  useEffect(() => {
    if (!isAuthEnabled) return;

    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        // Page became visible - check if auth is still valid
        setTimeout(checkAuthStatus, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, isAuthEnabled]);

  const value: AuthContextType = {
    isAuthenticated,
    user,
    isLoading,
    isAuthEnabled,
    login,
    logout,
    refreshAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};