import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Cookies from 'js-cookie';
import CryptoJS from 'crypto-js';

// Auth configuration - in production, load from secure config
const AUTH_CONFIG = {
  credentials: {
    // Pre-hashed: sl1_topo
    username: '$2a$12$K0Hgb.4wD.zJhRnSP7tHUe8.jOyRLm9m8BqF6ZlB5kD8xVsJKZf/K',
    // Pre-hashed: sl1_t0p0log33  
    password: '$2a$12$M2N9b3Qz2aG5Ux8Vh7mK4eTrYw1Pj9L6Q4R5xA7F9bC8dV3nH5mE2',
  },
  session: {
    timeout: 3600000, // 1 hour
    secret: 'sl1_topo_jwt_secret_key_2025_secure_random_string_auth',
    algorithm: 'HS256' as const,
  },
  security: {
    maxLoginAttempts: 3,
    lockoutDuration: 300000, // 5 minutes
  }
};

export interface User {
  username: string;
  isAuthenticated: boolean;
  loginTime: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  remainingAttempts?: number;
  lockoutUntil?: number;
}

class AuthService {
  private static instance: AuthService;
  private loginAttempts: Map<string, { count: number; lockoutUntil: number }> = new Map();

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Check if authentication is enabled
   */
  public isAuthEnabled(): boolean {
    // Check environment variable or build mode
    return import.meta.env.VITE_AUTH_MODE === 'true' || window.location.port === '4000';
  }

  /**
   * Authenticate user with credentials
   */
  public async login(credentials: LoginCredentials): Promise<LoginResult> {
    const { username, password } = credentials;
    
    // Check for lockout
    const lockoutStatus = this.checkLockout(username);
    if (lockoutStatus.isLocked) {
      return {
        success: false,
        error: `Account locked. Try again in ${Math.ceil((lockoutStatus.lockoutUntil! - Date.now()) / 60000)} minutes.`,
        lockoutUntil: lockoutStatus.lockoutUntil
      };
    }

    try {
      // Validate credentials against pre-hashed values
      const usernameValid = await bcrypt.compare(username, AUTH_CONFIG.credentials.username);
      const passwordValid = await bcrypt.compare(password, AUTH_CONFIG.credentials.password);

      if (usernameValid && passwordValid) {
        // Success - clear login attempts
        this.loginAttempts.delete(username);
        
        // Generate JWT token
        const user: User = {
          username: 'sl1_topo',
          isAuthenticated: true,
          loginTime: Date.now()
        };

        const token = jwt.sign(
          { 
            username: user.username,
            loginTime: user.loginTime,
            iat: Math.floor(Date.now() / 1000)
          },
          AUTH_CONFIG.session.secret,
          { 
            algorithm: AUTH_CONFIG.session.algorithm,
            expiresIn: '1h'
          }
        );

        // Store token securely
        this.setAuthToken(token);
        this.setUser(user);

        return {
          success: true,
          user,
          token
        };
      } else {
        // Failed login - increment attempts
        const attempts = this.incrementLoginAttempts(username);
        const remainingAttempts = AUTH_CONFIG.security.maxLoginAttempts - attempts.count;

        if (attempts.count >= AUTH_CONFIG.security.maxLoginAttempts) {
          return {
            success: false,
            error: 'Too many failed attempts. Account locked for 5 minutes.',
            remainingAttempts: 0,
            lockoutUntil: attempts.lockoutUntil
          };
        }

        return {
          success: false,
          error: 'Invalid username or password',
          remainingAttempts: Math.max(0, remainingAttempts)
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Authentication service error'
      };
    }
  }

  /**
   * Logout user and clear session
   */
  public logout(): void {
    Cookies.remove('auth_token');
    Cookies.remove('user_data');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user_data');
  }

  /**
   * Check if user is currently authenticated
   */
  public isAuthenticated(): boolean {
    if (!this.isAuthEnabled()) {
      return true; // No auth required in dev mode
    }

    const token = this.getAuthToken();
    const user = this.getUser();

    if (!token || !user) {
      return false;
    }

    try {
      const decoded = jwt.verify(token, AUTH_CONFIG.session.secret) as jwt.JwtPayload;
      
      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        this.logout();
        return false;
      }

      // Check session timeout
      const sessionAge = Date.now() - user.loginTime;
      if (sessionAge > AUTH_CONFIG.session.timeout) {
        this.logout();
        return false;
      }

      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  }

  /**
   * Get current authenticated user
   */
  public getCurrentUser(): User | null {
    if (!this.isAuthenticated()) {
      return null;
    }
    return this.getUser();
  }

  /**
   * Refresh authentication token
   */
  public refreshToken(): boolean {
    const user = this.getUser();
    if (!user || !this.isAuthenticated()) {
      return false;
    }

    try {
      const newToken = jwt.sign(
        { 
          username: user.username,
          loginTime: user.loginTime,
          iat: Math.floor(Date.now() / 1000)
        },
        AUTH_CONFIG.session.secret,
        { 
          algorithm: AUTH_CONFIG.session.algorithm,
          expiresIn: '1h'
        }
      );

      this.setAuthToken(newToken);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Private helper methods
  private setAuthToken(token: string): void {
    Cookies.set('auth_token', token, { 
      expires: 1/24, // 1 hour
      secure: window.location.protocol === 'https:',
      sameSite: 'strict'
    });
    sessionStorage.setItem('auth_token', token);
  }

  private getAuthToken(): string | null {
    return Cookies.get('auth_token') || sessionStorage.getItem('auth_token');
  }

  private setUser(user: User): void {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(user), AUTH_CONFIG.session.secret).toString();
    Cookies.set('user_data', encrypted, { 
      expires: 1/24,
      secure: window.location.protocol === 'https:',
      sameSite: 'strict'
    });
    sessionStorage.setItem('user_data', encrypted);
  }

  private getUser(): User | null {
    try {
      const encrypted = Cookies.get('user_data') || sessionStorage.getItem('user_data');
      if (!encrypted) return null;

      const decrypted = CryptoJS.AES.decrypt(encrypted, AUTH_CONFIG.session.secret).toString(CryptoJS.enc.Utf8);
      return JSON.parse(decrypted);
    } catch (error) {
      return null;
    }
  }

  private checkLockout(username: string): { isLocked: boolean; lockoutUntil?: number } {
    const attempts = this.loginAttempts.get(username);
    if (!attempts) {
      return { isLocked: false };
    }

    if (attempts.count >= AUTH_CONFIG.security.maxLoginAttempts) {
      if (Date.now() < attempts.lockoutUntil) {
        return { isLocked: true, lockoutUntil: attempts.lockoutUntil };
      } else {
        // Lockout expired, reset attempts
        this.loginAttempts.delete(username);
        return { isLocked: false };
      }
    }

    return { isLocked: false };
  }

  private incrementLoginAttempts(username: string): { count: number; lockoutUntil: number } {
    const existing = this.loginAttempts.get(username) || { count: 0, lockoutUntil: 0 };
    const newCount = existing.count + 1;
    const lockoutUntil = newCount >= AUTH_CONFIG.security.maxLoginAttempts 
      ? Date.now() + AUTH_CONFIG.security.lockoutDuration 
      : 0;

    const attempts = { count: newCount, lockoutUntil };
    this.loginAttempts.set(username, attempts);
    return attempts;
  }
}

export const authService = AuthService.getInstance();
export default authService;