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
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
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
    // Parse POST body
    const body = JSON.parse(event.body || '{}');
    const deviceIds = body.deviceIds || [];
    const depth = body.depth || 1;
    const direction = body.direction || 'both';

    if (!deviceIds.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing deviceIds',
          message: 'At least one device ID is required'
        })
      };
    }

    // Create cache key
    const cacheKey = `topology:${deviceIds.join(',')}:${depth}:${direction}`;
    
    // Check cache
    const cachedData = await checkCache(cacheKey);
    if (cachedData) {
      console.log('Returning cached topology result');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(cachedData)
      };
    }
    
    // Query SL1 for device relationships with pagination
    const sl1Client = new SL1Client();
    console.log('Fetching relationships for device IDs:', deviceIds);
    
    // Fetch relationships in batches until we find all relevant ones
    let allRelationships = [];
    let hasNextPage = true;
    let cursor = null;
    let fetchCount = 0;
    const maxPages = 10; // Limit to prevent infinite loops
    
    while (hasNextPage && fetchCount < maxPages) {
      console.log(`Fetching relationships page ${fetchCount + 1}${cursor ? ' after cursor ' + cursor : ''}`);
      
      const variables = { first: 1000 };
      if (cursor) variables.after = cursor;
      
      const relationshipData = await sl1Client.query(QUERIES.GET_DEVICE_RELATIONSHIPS, variables);
      
      if (relationshipData.deviceRelationships && relationshipData.deviceRelationships.edges) {
        // Filter to only relationships involving our devices
        const relevantRelationships = relationshipData.deviceRelationships.edges.filter(edge => {
          const parentId = edge.node.parentDevice?.id;
          const childId = edge.node.childDevice?.id;
          return deviceIds.includes(parentId) || deviceIds.includes(childId);
        });
        
        console.log(`Found ${relevantRelationships.length} relevant relationships in page ${fetchCount + 1}`);
        allRelationships.push(...relevantRelationships);
        
        hasNextPage = relationshipData.deviceRelationships.pageInfo?.hasNextPage || false;
        cursor = relationshipData.deviceRelationships.pageInfo?.endCursor || null;
      } else {
        hasNextPage = false;
      }
      
      fetchCount++;
      
      // If we found relationships for all our devices, we can stop early
      const foundDeviceIds = new Set();
      allRelationships.forEach(edge => {
        if (edge.node.parentDevice?.id) foundDeviceIds.add(edge.node.parentDevice.id);
        if (edge.node.childDevice?.id) foundDeviceIds.add(edge.node.childDevice.id);
      });
      
      const hasAllDevices = deviceIds.every(id => foundDeviceIds.has(id));
      if (hasAllDevices && allRelationships.length > 0) {
        console.log('Found relationships for all requested devices, stopping pagination');
        break;
      }
    }
    
    console.log(`Total relationships found: ${allRelationships.length} across ${fetchCount} pages`);

    // Also get full device info for the requested devices
    const devicesData = await sl1Client.query(QUERIES.GET_DEVICES_BY_IDS, {
      limit: 100
    });

    // Process the results
    const nodes = new Map();
    const edges = [];

    // Add the original devices as nodes (filter to only requested deviceIds)
    if (devicesData.devices) {
      devicesData.devices.edges.forEach(edge => {
        const device = edge.node;
        if (deviceIds.includes(device.id)) {
          nodes.set(device.id, {
            id: device.id,
            label: device.name,
            type: device.deviceClass?.class || 'Unknown',
            status: normalizeStatus(device.state),
            ip: device.ip || 'N/A'
          });
        }
      });
    }

    // Process the filtered relationships and add connected devices
    allRelationships.forEach(edge => {
      const relationship = edge.node;
      
      if (relationship.parentDevice && relationship.childDevice) {
        // Add parent device as node
        if (!nodes.has(relationship.parentDevice.id)) {
          nodes.set(relationship.parentDevice.id, {
            id: relationship.parentDevice.id,
            label: relationship.parentDevice.name,
            type: 'Unknown', // Will be set properly if it's one of our queried devices
            status: normalizeStatus(relationship.parentDevice.state),
            ip: relationship.parentDevice.ip || 'N/A'
          });
        }

        // Add child device as node
        if (!nodes.has(relationship.childDevice.id)) {
          nodes.set(relationship.childDevice.id, {
            id: relationship.childDevice.id,
            label: relationship.childDevice.name,
            type: 'Unknown', // Will be set properly if it's one of our queried devices
            status: normalizeStatus(relationship.childDevice.state),
            ip: relationship.childDevice.ip || 'N/A'
          });
        }

        // Add edge
        edges.push({
          source: relationship.parentDevice.id,
          target: relationship.childDevice.id
        });
      }
    });

    const response = {
      topology: {
        nodes: Array.from(nodes.values()),
        edges
      },
      stats: {
        totalDevices: nodes.size,
        totalRelationships: edges.length,
        depth,
        direction
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
    console.error('Error fetching topology:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch topology',
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