const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

class ConfigLoader {
  constructor() {
    this.config = null;
    this.deployConfig = null;
    this.ssm = new AWS.SSM();
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Load configuration based on environment
   * Priority: AWS Parameter Store > Environment Variables > Config Files
   */
  async loadConfig() {
    if (this.config) {
      return this.config;
    }

    try {
      // Load base configuration from templates or existing files
      const baseConfig = await this.loadBaseConfig();
      
      // Load credentials from AWS Parameter Store
      const credentials = await this.loadCredentialsFromParameterStore();
      
      // Merge configurations
      this.config = this.mergeConfigurations(baseConfig, credentials);
      
      console.log(`✅ Configuration loaded securely for environment: ${this.environment}`);
      return this.config;
    } catch (error) {
      console.error('❌ Error loading configuration:', error);
      throw new Error('Failed to load configuration');
    }
  }

  /**
   * Load base configuration from files
   */
  async loadBaseConfig() {
    // Try to load from config file, fall back to template
    const configPath = path.join(__dirname, '../../config/sl1-config.json');
    const templatePath = path.join(__dirname, '../../config/sl1-config.template.json');
    
    let configFile = configPath;
    if (!fs.existsSync(configPath) && fs.existsSync(templatePath)) {
      configFile = templatePath;
      console.log('📄 Using template config file');
    }
    
    if (!fs.existsSync(configFile)) {
      throw new Error('No configuration file found. Please run setup-credentials.sh');
    }
    
    return JSON.parse(fs.readFileSync(configFile, 'utf8'));
  }

  /**
   * Load credentials from AWS Systems Manager Parameter Store
   */
  async loadCredentialsFromParameterStore() {
    try {
      const parameterNames = [
        `/sl1-topology/${this.environment}/sl1-username`,
        `/sl1-topology/${this.environment}/sl1-password`,
        `/sl1-topology/${this.environment}/sl1-url`
      ];

      console.log('🔐 Loading credentials from AWS Parameter Store...');
      
      const response = await this.ssm.getParameters({
        Names: parameterNames,
        WithDecryption: true
      }).promise();

      const credentials = {};
      response.Parameters.forEach(param => {
        const key = param.Name.split('/').pop();
        credentials[key] = param.Value;
      });

      // Check if all required parameters were found
      const missingParams = parameterNames.filter(name => 
        !response.Parameters.find(p => p.Name === name)
      );
      
      if (missingParams.length > 0) {
        throw new Error(`Missing parameters in Parameter Store: ${missingParams.join(', ')}`);
      }

      console.log('✅ Credentials loaded securely from Parameter Store');
      return credentials;
      
    } catch (error) {
      console.error('❌ Failed to load credentials from Parameter Store:', error.message);
      console.log('💡 Run scripts/setup-credentials.sh to configure credentials');
      throw error;
    }
  }

  /**
   * Merge base config with secure credentials
   */
  mergeConfigurations(baseConfig, credentials) {
    const config = JSON.parse(JSON.stringify(baseConfig)); // Deep copy
    
    // Override with secure credentials from Parameter Store
    if (credentials['sl1-url']) {
      config.sl1.url = credentials['sl1-url'];
    }
    if (credentials['sl1-username']) {
      config.sl1.username = credentials['sl1-username'];
    }
    if (credentials['sl1-password']) {
      config.sl1.password = credentials['sl1-password'];
    }

    // Override with environment variables (highest priority)
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

    return config;
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
  async getSL1Config() {
    const config = await this.loadConfig();
    return config.sl1;
  }

  /**
   * Get API configuration
   */
  async getApiConfig() {
    const config = await this.loadConfig();
    return config.api;
  }

  /**
   * Get cache configuration
   */
  async getCacheConfig() {
    const config = await this.loadConfig();
    return config.cache;
  }

  /**
   * Get topology configuration
   */
  async getTopologyConfig() {
    const config = await this.loadConfig();
    return config.topology;
  }

  /**
   * Validate required configuration
   */
  async validateConfig() {
    const config = await this.loadConfig();
    
    if (!config.sl1.url || !config.sl1.username || !config.sl1.password) {
      throw new Error('Missing required SL1 configuration (url, username, password)');
    }

    return true;
  }
}

// Export singleton instance
module.exports = new ConfigLoader();