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
    const cachedData = await checkCache(cacheKey);
    if (cachedData) {
      console.log('Returning cached result');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(cachedData)
      };
    }
    
    // Query SL1
    const sl1Client = new SL1Client();
    
    // Build query variables and select appropriate query
    const variables = { limit };
    let queryToUse;
    
    if (search && search.trim()) {
      // Use search query when search term is provided
      variables.search = {
        name: {
          contains: search.trim()
        }
      };
      queryToUse = QUERIES.GET_DEVICES_WITH_SEARCH;
    } else {
      // Use regular query without search parameter
      queryToUse = QUERIES.GET_DEVICES;
    }
    
    const data = await sl1Client.query(queryToUse, variables);
    
    // Process and filter results
    let devices = data.devices.edges.map(edge => ({
      id: edge.node.id,
      name: edge.node.name,
      ip: edge.node.ip || 'N/A',
      type: edge.node.deviceClass?.class || 'Unknown',
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
        total: -1, // Unknown total count from SL1 GraphQL  
        limit,
        offset,
        hasMore: data.devices.pageInfo?.hasNextPage || false,
        currentPage: Math.floor(offset / limit) + 1
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