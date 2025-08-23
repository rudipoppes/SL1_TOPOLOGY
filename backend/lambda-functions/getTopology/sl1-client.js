const https = require('https');
const configLoader = require('./config-loader');

class SL1Client {
  constructor() {
    this.config = null;
  }

  async initialize() {
    if (!this.config) {
      this.config = await configLoader.getSL1Config();
      
      if (!this.config.url || !this.config.username || !this.config.password) {
        throw new Error('Missing SL1 configuration. Please ensure Parameter Store contains sl1-url, sl1-username, and sl1-password.');
      }
    }
    return this.config;
  }

  async query(graphqlQuery, variables = {}) {
    const config = await this.initialize();
    
    const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    
    const requestBody = JSON.stringify({
      query: graphqlQuery,
      variables
    });

    const url = new URL(config.url);
    
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
              console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
              reject(new Error('GraphQL query failed: ' + JSON.stringify(result.errors)));
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
    query GetDevices($limit: Int!) {
      devices(first: $limit) {
        edges {
          node {
            id
            name
            ip
            state
            deviceClass {
              id
            }
            organization {
              id
            }
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  `,
  
  GET_DEVICES_BY_IDS: `
    query GetDevicesByIds($deviceIds: [ID!]!) {
      devices(filter: { id: { in: $deviceIds } }, first: 100) {
        edges {
          node {
            id
            name
            ip
            state
            deviceClass {
              id
              class
            }
            organization {
              id
            }
          }
        }
      }
    }
  `,

  GET_DEVICE_RELATIONSHIPS: `
    query GetDeviceRelationships {
      deviceRelationships(first: 100) {
        edges {
          node {
            id
            parentDevice {
              id
              name
              ip
              state
            }
            childDevice {
              id
              name
              ip
              state
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