const https = require('https');
const configLoader = require('./config-loader');

class SL1Client {
  constructor() {
    this.configLoaded = false;
    this.baseUrl = null;
    this.username = null;
    this.password = null;
    this.timeout = 30000;
    this.retryAttempts = 3;
  }

  async loadConfig() {
    if (this.configLoaded) {
      return;
    }

    try {
      // Load configuration from secure sources
      const sl1Config = await configLoader.getSL1Config();
      
      this.baseUrl = sl1Config.url;
      this.username = sl1Config.username;
      this.password = sl1Config.password;
      this.timeout = sl1Config.timeout || 30000;
      this.retryAttempts = sl1Config.retryAttempts || 3;
      
      // Validate configuration
      await configLoader.validateConfig();
      
      this.configLoaded = true;
      console.log('🔐 SL1Client configured securely');
    } catch (error) {
      console.error('❌ Failed to load SL1 configuration:', error.message);
      throw error;
    }
  }

  async query(graphqlQuery, variables = {}) {
    // Ensure configuration is loaded
    await this.loadConfig();
    
    const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    
    const requestBody = JSON.stringify({
      query: graphqlQuery,
      variables
    });

    const url = new URL(this.baseUrl);
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
          'Authorization': `Basic ${auth}`
        },
        rejectUnauthorized: false // For self-signed certificates - configure properly in production
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            
            if (result.errors) {
              console.error('GraphQL Errors:', result.errors);
              reject(new Error('GraphQL query failed'));
            } else {
              resolve(result.data);
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        console.error('Request error:', error);
        reject(error);
      });

      req.write(requestBody);
      req.end();
    });
  }
}

// GraphQL Queries
const QUERIES = {
  GET_DEVICES: `
    query GetDevices($search: String, $limit: Int!, $offset: Int!) {
      devices(
        search: { name: { contains: $search } }
        first: $limit
        skip: $offset
      ) {
        edges {
          node {
            id
            name
            ip
            type
            status
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
        totalCount
      }
    }
  `,
  
  GET_DEVICE_RELATIONSHIPS: `
    query GetDeviceRelationships($deviceIds: [ID!]) {
      deviceRelationships(
        filter: { 
          OR: [
            { parentDevice: { id: { in: $deviceIds } } },
            { childDevice: { id: { in: $deviceIds } } }
          ]
        }
        first: 1000
      ) {
        edges {
          node {
            id
            parentDevice {
              id
              name
              type
              status
            }
            childDevice {
              id
              name
              type
              status
            }
          }
        }
      }
    }
  `,
  
  SEARCH_DEVICES: `
    query SearchDevices($searchTerm: String!, $limit: Int!) {
      devices(
        search: { 
          OR: [
            { name: { contains: $searchTerm } },
            { ip: { contains: $searchTerm } }
          ]
        }
        first: $limit
      ) {
        edges {
          node {
            id
            name
            ip
            type
            status
          }
        }
      }
    }
  `
};

module.exports = {
  SL1Client,
  QUERIES
};