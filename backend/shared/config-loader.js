const fs = require('fs');
const path = require('path');

class ConfigLoader {
  constructor() {
    this.config = null;
    this.deployConfig = null;
  }

  /**
   * Load configuration based on environment
   * Priority: Environment Variables > Deploy Config > Default Config
   */
  loadConfig() {
    if (this.config) {
      return this.config;
    }

    try {
      // Load base configuration
      const configPath = path.join(__dirname, '../../config/sl1-config.json');
      const baseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Load environment-specific configuration
      const environment = process.env.NODE_ENV || 'development';
      const deployConfigPath = path.join(__dirname, '../../config/deploy-config.json');
      
      let envConfig = {};
      if (fs.existsSync(deployConfigPath)) {
        const deployConfig = JSON.parse(fs.readFileSync(deployConfigPath, 'utf8'));
        envConfig = deployConfig[environment] || {};
      }

      // Merge configurations with environment variables taking precedence
      this.config = this.mergeWithEnvVars(baseConfig, envConfig);
      
      console.log(`Configuration loaded for environment: ${environment}`);
      return this.config;
    } catch (error) {
      console.error('Error loading configuration:', error);
      throw new Error('Failed to load configuration');
    }
  }

  /**
   * Merge config with environment variables
   * Environment variables override config file values
   */
  mergeWithEnvVars(baseConfig, envConfig) {
    const config = { ...baseConfig };

    // Override with environment-specific config
    if (envConfig.sl1) {
      config.sl1 = { ...config.sl1, ...envConfig.sl1 };
    }
    if (envConfig.cors) {
      config.api.cors = { ...config.api.cors, ...envConfig.cors };
    }
    if (envConfig.cache) {
      config.cache = { ...config.cache, ...envConfig.cache };
    }

    // Override with environment variables
    if (process.env.SL1_URL) {
      config.sl1.url = process.env.SL1_URL;
    }
    if (process.env.SL1_USER) {
      config.sl1.username = process.env.SL1_USER;
    }
    if (process.env.SL1_PASS) {
      config.sl1.password = process.env.SL1_PASS;
    }
    if (process.env.CORS_ORIGIN) {
      config.api.cors.allowedOrigins = [process.env.CORS_ORIGIN];
    }
    if (process.env.CACHE_TABLE) {
      config.cache.tableName = process.env.CACHE_TABLE;
    }
    if (process.env.CACHE_TTL) {
      config.cache.ttlSeconds = parseInt(process.env.CACHE_TTL);
    }

    return config;
  }

  /**
   * Get SL1 configuration
   */
  getSL1Config() {
    const config = this.loadConfig();
    return config.sl1;
  }

  /**
   * Get API configuration
   */
  getApiConfig() {
    const config = this.loadConfig();
    return config.api;
  }

  /**
   * Get cache configuration
   */
  getCacheConfig() {
    const config = this.loadConfig();
    return config.cache;
  }

  /**
   * Get topology configuration
   */
  getTopologyConfig() {
    const config = this.loadConfig();
    return config.topology;
  }

  /**
   * Validate required configuration
   */
  validateConfig() {
    const config = this.loadConfig();
    
    if (!config.sl1.url || !config.sl1.username || !config.sl1.password) {
      throw new Error('Missing required SL1 configuration (url, username, password)');
    }

    return true;
  }
}

// Export singleton instance
module.exports = new ConfigLoader();