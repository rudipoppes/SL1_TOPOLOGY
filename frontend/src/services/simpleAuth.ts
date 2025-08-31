// Simple authentication reading from config
export interface SimpleUser {
  username: string;
  isAuthenticated: boolean;
}

class SimpleAuthService {
  private user: SimpleUser | null = null;
  private authConfig: any = null;

  private async loadAuthConfig() {
    if (this.authConfig) return this.authConfig;
    
    try {
      const response = await fetch('/config/simple-auth-config.json');
      this.authConfig = await response.json();
      return this.authConfig;
    } catch (error) {
      console.error('Failed to load auth config:', error);
      // Fallback to hardcoded values
      this.authConfig = {
        credentials: {
          username: 'sl1_topo',
          passwordHash: 'dfb714b8367a4bca16dc5d2de71fb4a2cc771cd9d579159b8f70939f25cbc984ecf64c211d792b7d8f6a89e9240fe33c01e151dcbfac073606878645e976df18'
        },
        config: {
          saltKey: 'sl1_topology_secure_salt_2025',
          iterations: 1000
        }
      };
      return this.authConfig;
    }
  }

  private hashPassword(password: string, salt: string, iterations: number): string {
    // Simple string hash that works without crypto API (HTTP compatible)
    let combined = password + salt;
    
    // Simple hash function using string manipulation
    for (let i = 0; i < iterations; i++) {
      let hash = 0;
      for (let j = 0; j < combined.length; j++) {
        const char = combined.charCodeAt(j);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      combined = Math.abs(hash).toString(16);
    }
    
    return combined;
  }

  isAuthEnabled(): boolean {
    return window.location.port === '4000';
  }

  async login(username: string, password: string): Promise<boolean> {
    const config = await this.loadAuthConfig();
    
    const expectedHash = this.hashPassword(
      password,
      config.config.saltKey,
      config.config.iterations
    );
    
    // Debug logging
    console.log('=== LOGIN DEBUG ===');
    console.log('Input username:', username);
    console.log('Config username:', config.credentials.username);
    console.log('Username match:', username === config.credentials.username);
    console.log('Generated hash:', expectedHash);
    console.log('Config hash:', config.credentials.passwordHash);
    console.log('Hash match:', expectedHash === config.credentials.passwordHash);
    console.log('==================');
    
    if (username === config.credentials.username && expectedHash === config.credentials.passwordHash) {
      this.user = {
        username,
        isAuthenticated: true
      };
      localStorage.setItem('sl1_auth', JSON.stringify(this.user));
      return true;
    }
    return false;
  }

  logout(): void {
    this.user = null;
    localStorage.removeItem('sl1_auth');
  }

  isAuthenticated(): boolean {
    if (!this.isAuthEnabled()) {
      return true; // No auth required in dev mode
    }

    if (this.user) {
      return this.user.isAuthenticated;
    }

    // Check localStorage
    const stored = localStorage.getItem('sl1_auth');
    if (stored) {
      try {
        this.user = JSON.parse(stored);
        return this.user?.isAuthenticated || false;
      } catch {
        localStorage.removeItem('sl1_auth');
      }
    }

    return false;
  }

  getUser(): SimpleUser | null {
    return this.user;
  }
}

export const simpleAuthService = new SimpleAuthService();