const { SL1Client, QUERIES } = require('./sl1-client');
const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const CACHE_TABLE = process.env.CACHE_TABLE || 'sl1-topology-cache';
const CACHE_TTL = 900; // 15 minutes

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,GET'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Parse query parameters
    const params = event.queryStringParameters || {};
    const search = params.search || '';
    const type = params.type || null;
    const status = params.status || null;
    const limit = parseInt(params.limit) || 50;
    const offset = parseInt(params.offset) || 0;
    
    // Create cache key
    const cacheKey = `devices:${search}:${type}:${status}:${limit}:${offset}`;
    
    // Check cache
    const cacheResult = await checkCache(cacheKey);
    if (cacheResult) {
      console.log('Returning cached result');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(cacheResult)
      };
    }
    
    // Query SL1
    const sl1Client = new SL1Client();
    const data = await sl1Client.query(QUERIES.GET_DEVICES, {
      limit
    });
    
    // Process and filter results
    let devices = data.devices.edges.map(edge => ({
      id: edge.node.id,
      name: edge.node.name,
      ip: edge.node.ip || 'N/A',
      type: edge.node.deviceClass?.id || 'Unknown', // We'll use deviceClass ID for now
      status: normalizeStatus(edge.node.state),
      organization: edge.node.organization?.id || '0'
    }));
    
    // Apply additional filters if provided
    if (type) {
      devices = devices.filter(d => d.type.toLowerCase() === type.toLowerCase());
    }
    if (status) {
      devices = devices.filter(d => d.status.toLowerCase() === status.toLowerCase());
    }
    
    const response = {
      devices,
      pagination: {
        total: devices.length, // SL1 doesn't provide totalCount
        limit,
        offset,
        hasMore: data.devices.pageInfo?.hasNextPage || false
      },
      filters: {
        availableTypes: getUniqueTypes(devices),
        availableStatuses: ['online', 'offline', 'warning', 'unknown']
      }
    };
    
    // Cache the result
    await cacheResult(cacheKey, response);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
    
  } catch (error) {
    console.error('Error fetching devices:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch devices',
        message: error.message
      })
    };
  }
};

// Helper functions
function normalizeStatus(status) {
  if (!status) return 'unknown';
  
  const statusLower = status.toLowerCase();
  if (statusLower.includes('online') || statusLower.includes('up') || statusLower.includes('healthy')) {
    return 'online';
  } else if (statusLower.includes('offline') || statusLower.includes('down')) {
    return 'offline';
  } else if (statusLower.includes('warning') || statusLower.includes('degraded')) {
    return 'warning';
  }
  return 'unknown';
}

function getUniqueTypes(devices) {
  const types = [...new Set(devices.map(d => d.type))];
  return types.filter(t => t !== 'Unknown').sort();
}

async function checkCache(key) {
  try {
    const result = await dynamodb.get({
      TableName: CACHE_TABLE,
      Key: { cacheKey: key }
    }).promise();
    
    if (result.Item && result.Item.ttl > Math.floor(Date.now() / 1000)) {
      return result.Item.data;
    }
  } catch (error) {
    console.error('Cache check error:', error);
  }
  return null;
}

async function cacheResult(key, data) {
  try {
    await dynamodb.put({
      TableName: CACHE_TABLE,
      Item: {
        cacheKey: key,
        data,
        ttl: Math.floor(Date.now() / 1000) + CACHE_TTL
      }
    }).promise();
  } catch (error) {
    console.error('Cache write error:', error);
  }
}