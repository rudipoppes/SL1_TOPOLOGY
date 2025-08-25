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
    const deviceDirections = body.deviceDirections || {}; // Map of deviceId -> direction

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

    // Create cache key - include device directions if provided
    const hasDeviceDirections = Object.keys(deviceDirections).length > 0;
    const directionsStr = hasDeviceDirections ? JSON.stringify(deviceDirections) : direction;
    const cacheKey = `topology:${deviceIds.join(',')}:${depth}:${directionsStr}`;
    
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
    
    // Since SL1 doesn't support cursor-based pagination, fetch a large batch
    // This is a temporary solution until we implement a better approach
    console.log('Fetching relationships (single large batch)');
    
    const relationshipData = await sl1Client.query(QUERIES.GET_DEVICE_RELATIONSHIPS, { first: 5000 });
    
    let allRelationships = [];
    if (relationshipData.deviceRelationships && relationshipData.deviceRelationships.edges) {
      // Filter to only relationships involving our devices
      allRelationships = relationshipData.deviceRelationships.edges.filter(edge => {
        const parentId = edge.node.parentDevice?.id;
        const childId = edge.node.childDevice?.id;
        
        // Apply direction-based filtering (per-device or global)
        if (hasDeviceDirections) {
          // Per-device direction filtering
          let includeEdge = false;
          
          // Check if any of our devices want to see this relationship
          for (const deviceId of deviceIds) {
            const deviceDirection = deviceDirections[deviceId] || 'both';
            
            if (deviceDirection === 'parents' && deviceId === childId) {
              // Device wants to see parents and is the child in this relationship
              includeEdge = true;
              break;
            } else if (deviceDirection === 'children' && deviceId === parentId) {
              // Device wants to see children and is the parent in this relationship
              includeEdge = true;
              break;
            } else if (deviceDirection === 'both' && (deviceId === parentId || deviceId === childId)) {
              // Device wants to see both and is involved in this relationship
              includeEdge = true;
              break;
            }
          }
          
          return includeEdge;
        } else {
          // Global direction filtering (legacy)
          if (direction === 'parents') {
            return deviceIds.includes(childId);
          } else if (direction === 'children') {
            return deviceIds.includes(parentId);
          } else {
            return deviceIds.includes(parentId) || deviceIds.includes(childId);
          }
        }
      });
      
      const directionInfo = hasDeviceDirections ? `Per-device: ${JSON.stringify(deviceDirections)}` : `Global: ${direction}`;
      console.log(`${directionInfo} - Found ${allRelationships.length} relevant relationships out of ${relationshipData.deviceRelationships.edges.length} total`);
    }
    
    console.log(`Total relationships found: ${allRelationships.length}`);

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