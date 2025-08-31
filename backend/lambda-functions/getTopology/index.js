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
    const depth = Math.min(Math.max(body.depth || 1, 1), 5); // Validate depth between 1-5
    const direction = body.direction || 'both';
    const deviceDirections = body.deviceDirections || {}; // Map of deviceId -> direction
    const deviceDepths = body.deviceDepths || {}; // Map of deviceId -> depth

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

    // Create cache key - include device directions and depths if provided
    const hasDeviceDirections = Object.keys(deviceDirections).length > 0;
    const hasDeviceDepths = Object.keys(deviceDepths).length > 0;
    const directionsStr = hasDeviceDirections ? JSON.stringify(deviceDirections) : direction;
    const depthsStr = hasDeviceDepths ? JSON.stringify(deviceDepths) : depth.toString();
    const cacheKey = `topology:${deviceIds.join(',')}:${depthsStr}:${directionsStr}`;
    
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
    
    // Build relationship graph for multi-level traversal
    let relationshipGraph = new Map(); // parentId -> [childIds]
    let reverseGraph = new Map(); // childId -> [parentIds]
    
    if (relationshipData.deviceRelationships && relationshipData.deviceRelationships.edges) {
      relationshipData.deviceRelationships.edges.forEach(edge => {
        const parentId = edge.node.parentDevice?.id;
        const childId = edge.node.childDevice?.id;
        
        if (parentId && childId) {
          // Forward graph (parent -> children)
          if (!relationshipGraph.has(parentId)) {
            relationshipGraph.set(parentId, []);
          }
          relationshipGraph.get(parentId).push({
            childId,
            relationship: edge.node
          });
          
          // Reverse graph (child -> parents)  
          if (!reverseGraph.has(childId)) {
            reverseGraph.set(childId, []);
          }
          reverseGraph.get(childId).push({
            parentId,
            relationship: edge.node
          });
        }
      });
    }

    // Multi-level traversal with cycle detection
    const globalVisitedNodes = new Set();
    const allDiscoveredRelationships = [];
    const globalNodeDepthMap = new Map(); // Track depth of each discovered node
    
    // Traverse from each starting device with its specific depth/direction settings
    for (const deviceId of deviceIds) {
      const deviceDepth = deviceDepths[deviceId] || depth;
      const deviceDirection = deviceDirections[deviceId] || direction;
      
      console.log(`Traversing from device ${deviceId} with depth ${deviceDepth} and direction ${deviceDirection}`);
      
      // Create per-device tracking to avoid cross-contamination
      const deviceVisitedNodes = new Set();
      const deviceDiscoveredRelationships = [];
      const deviceNodeDepthMap = new Map();
      
      // Recursive traversal for this specific device
      traverseRelationships(
        deviceId,
        deviceDepth,
        deviceDirection,
        relationshipGraph,
        reverseGraph,
        deviceVisitedNodes,
        deviceDiscoveredRelationships,
        deviceNodeDepthMap,
        new Set([deviceId]), // Current path for cycle detection
        0 // Current depth level
      );
      
      // Merge results into global collections (avoid duplicates)
      deviceVisitedNodes.forEach(nodeId => globalVisitedNodes.add(nodeId));
      deviceDiscoveredRelationships.forEach(rel => {
        // Check for duplicate relationships by comparing parent-child pairs
        const isDuplicate = allDiscoveredRelationships.some(existingRel => 
          existingRel.node.parentDevice?.id === rel.node.parentDevice?.id &&
          existingRel.node.childDevice?.id === rel.node.childDevice?.id
        );
        if (!isDuplicate) {
          allDiscoveredRelationships.push(rel);
        }
      });
      
      // Merge depth maps (keep shallowest depth for each node)
      deviceNodeDepthMap.forEach((nodeDepth, nodeId) => {
        const existingDepth = globalNodeDepthMap.get(nodeId);
        if (existingDepth === undefined || nodeDepth < existingDepth) {
          globalNodeDepthMap.set(nodeId, nodeDepth);
        }
      });
    }
    
    const allRelationships = allDiscoveredRelationships;
    console.log(`Multi-level traversal complete: Found ${allRelationships.length} relationships across ${globalVisitedNodes.size} nodes`);
    
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
        depth: hasDeviceDepths ? 'per-device' : depth,
        direction: hasDeviceDirections ? 'per-device' : direction,
        deviceDepths: hasDeviceDepths ? deviceDepths : undefined,
        deviceDirections: hasDeviceDirections ? deviceDirections : undefined
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

// Multi-level traversal function with cycle detection
function traverseRelationships(
  currentNodeId,
  maxDepth,
  direction,
  relationshipGraph,
  reverseGraph,
  visitedNodes,
  discoveredRelationships,
  nodeDepthMap,
  currentPath,
  currentDepth
) {
  // Base case: reached maximum depth
  if (currentDepth >= maxDepth) {
    return;
  }
  
  // Record this node as visited at this depth
  if (!nodeDepthMap.has(currentNodeId)) {
    nodeDepthMap.set(currentNodeId, currentDepth);
  }
  visitedNodes.add(currentNodeId);
  
  // Get relationships based on direction
  const shouldTraverseChildren = direction === 'children' || direction === 'both';
  const shouldTraverseParents = direction === 'parents' || direction === 'both';
  
  // Traverse children (outgoing edges)
  if (shouldTraverseChildren && relationshipGraph.has(currentNodeId)) {
    const children = relationshipGraph.get(currentNodeId);
    
    for (const child of children) {
      const childId = child.childId;
      
      // Cycle detection: skip if child is already in current path
      if (currentPath.has(childId)) {
        console.log(`Cycle detected: skipping ${childId} -> ${currentNodeId}`);
        continue;
      }
      
      // Add relationship to results
      discoveredRelationships.push({
        node: child.relationship
      });
      
      // Recursively traverse child if within depth limit
      if (currentDepth + 1 < maxDepth) {
        const newPath = new Set(currentPath);
        newPath.add(childId);
        
        traverseRelationships(
          childId,
          maxDepth,
          direction,
          relationshipGraph,
          reverseGraph,
          visitedNodes,
          discoveredRelationships,
          nodeDepthMap,
          newPath,
          currentDepth + 1
        );
      }
    }
  }
  
  // Traverse parents (incoming edges)
  if (shouldTraverseParents && reverseGraph.has(currentNodeId)) {
    const parents = reverseGraph.get(currentNodeId);
    
    for (const parent of parents) {
      const parentId = parent.parentId;
      
      // Cycle detection: skip if parent is already in current path
      if (currentPath.has(parentId)) {
        console.log(`Cycle detected: skipping ${parentId} -> ${currentNodeId}`);
        continue;
      }
      
      // Add relationship to results
      discoveredRelationships.push({
        node: parent.relationship
      });
      
      // Recursively traverse parent if within depth limit
      if (currentDepth + 1 < maxDepth) {
        const newPath = new Set(currentPath);
        newPath.add(parentId);
        
        traverseRelationships(
          parentId,
          maxDepth,
          direction,
          relationshipGraph,
          reverseGraph,
          visitedNodes,
          discoveredRelationships,
          nodeDepthMap,
          newPath,
          currentDepth + 1
        );
      }
    }
  }
}

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