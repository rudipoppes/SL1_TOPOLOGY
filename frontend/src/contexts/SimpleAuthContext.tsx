import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { simpleAuthService, SimpleUser } from '../services/simpleAuth';

interface SimpleAuthContextType {
  isAuthenticated: boolean;
  user: SimpleUser | null;
  isLoading: boolean;
  isAuthEnabled: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

interface SimpleAuthProviderProps {
  children: ReactNode;
}

export const SimpleAuthProvider: React.FC<SimpleAuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthEnabled] = useState(() => simpleAuthService.isAuthEnabled());

  const checkAuthStatus = () => {
    if (!isAuthEnabled) {
      setIsAuthenticated(true);
      setUser({ username: 'developer', isAuthenticated: true });
      setIsLoading(false);
      return;
    }

    const authenticated = simpleAuthService.isAuthenticated();
    setIsAuthenticated(authenticated);
    setUser(authenticated ? simpleAuthService.getUser() : null);
    setIsLoading(false);
  };

  useEffect(() => {
    checkAuthStatus();
  }, [isAuthEnabled]);

  const login = async (username: string, password: string): Promise<boolean> => {
    const success = await simpleAuthService.login(username, password);
    if (success) {
      checkAuthStatus();
    }
    return success;
  };

  const logout = () => {
    simpleAuthService.logout();
    checkAuthStatus();
  };

  return (
    <SimpleAuthContext.Provider value={{
      isAuthenticated,
      user,
      isLoading,
      isAuthEnabled,
      login,
      logout
    }}>
      {children}
    </SimpleAuthContext.Provider>
  );
};

export const useSimpleAuth = () => {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
};