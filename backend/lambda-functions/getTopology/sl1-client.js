const https = require('https');

class SL1Client {
  constructor() {
    this.baseUrl = process.env.SL1_URL;
    this.username = process.env.SL1_USER;
    this.password = process.env.SL1_PASS;
    
    if (!this.baseUrl || !this.username || !this.password) {
      throw new Error('Missing SL1 configuration. Please set SL1_URL, SL1_USER, and SL1_PASS environment variables.');
    }
  }

  async query(graphqlQuery, variables = {}) {
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
    query GetDevices($limit: Int!) {
      devices(
        first: $limit
      ) {
        edges {
          node {
            id
            name
            ip
            state
            deviceClass {
              name
            }
            organization {
              name
            }
            hostname
          }
        }
        pageInfo {
          hasNextPage
        }
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