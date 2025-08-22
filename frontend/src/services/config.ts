import frontendConfig from '../../../config/frontend-config.json';

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

export interface TopologyConfig {
  canvas: {
    defaultLayout: string;
    layouts: string[];
    maxNodes: number;
    animationDuration: number;
  };
  controls: {
    defaultDepth: number;
    maxDepth: number;
    defaultDirection: string;
    directions: string[];
  };
}

export interface UIConfig {
  theme: string;
  animations: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

export interface DevicesConfig {
  itemsPerPage: number;
  maxItemsPerPage: number;
  virtualScrolling: boolean;
}

export interface AppConfig {
  api: ApiConfig;
  topology: TopologyConfig;
  ui: UIConfig;
  devices: DevicesConfig;
}

class ConfigService {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    // Start with config file
    const baseConfig = frontendConfig as AppConfig;

    // Override with environment variables if available
    const envApiUrl = import.meta.env.VITE_API_URL;
    if (envApiUrl) {
      baseConfig.api.baseUrl = envApiUrl;
    }

    const envTheme = import.meta.env.VITE_THEME;
    if (envTheme) {
      baseConfig.ui.theme = envTheme;
    }

    // Validate required configuration
    if (!baseConfig.api.baseUrl) {
      console.warn('API base URL not configured. Using localhost fallback.');
      baseConfig.api.baseUrl = 'http://localhost:3000';
    }

    return baseConfig;
  }

  // Getter methods for different config sections
  getApiConfig(): ApiConfig {
    return this.config.api;
  }

  getTopologyConfig(): TopologyConfig {
    return this.config.topology;
  }

  getUIConfig(): UIConfig {
    return this.config.ui;
  }

  getDevicesConfig(): DevicesConfig {
    return this.config.devices;
  }

  // Specific config values for convenience
  getApiBaseUrl(): string {
    return this.config.api.baseUrl;
  }

  getDefaultLayout(): string {
    return this.config.topology.canvas.defaultLayout;
  }

  getAvailableLayouts(): string[] {
    return this.config.topology.canvas.layouts;
  }

  getItemsPerPage(): number {
    return this.config.devices.itemsPerPage;
  }

  getMaxNodes(): number {
    return this.config.topology.canvas.maxNodes;
  }

  // Runtime config updates (for user preferences)
  updateTheme(theme: string): void {
    this.config.ui.theme = theme;
    // Could persist to localStorage here
    localStorage.setItem('app-theme', theme);
  }

  updateDefaultLayout(layout: string): void {
    if (this.config.topology.canvas.layouts.includes(layout)) {
      this.config.topology.canvas.defaultLayout = layout;
      localStorage.setItem('default-layout', layout);
    }
  }

  // Load user preferences from localStorage
  private loadUserPreferences(): void {
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme) {
      this.config.ui.theme = savedTheme;
    }

    const savedLayout = localStorage.getItem('default-layout');
    if (savedLayout && this.config.topology.canvas.layouts.includes(savedLayout)) {
      this.config.topology.canvas.defaultLayout = savedLayout;
    }
  }
}

// Export singleton instance
export const configService = new ConfigService();
export default configService;