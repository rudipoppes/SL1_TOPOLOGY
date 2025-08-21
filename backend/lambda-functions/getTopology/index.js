const { SL1Client, QUERIES } = require('../../shared/sl1-client');

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
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { deviceIds, depth = 1, direction = 'children' } = body;
    
    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'deviceIds array is required'
        })
      };
    }
    
    // Query SL1 for relationships
    const sl1Client = new SL1Client();
    const data = await sl1Client.query(QUERIES.GET_DEVICE_RELATIONSHIPS, {
      deviceIds
    });
    
    // Build topology structure
    const topology = buildTopology(data.deviceRelationships.edges, deviceIds, depth, direction);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        topology,
        stats: {
          totalDevices: topology.nodes.length,
          totalRelationships: topology.edges.length,
          depth,
          direction
        }
      })
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

function buildTopology(relationships, startDeviceIds, maxDepth, direction) {
  const nodes = new Map();
  const edges = [];
  const visitedRelationships = new Set();
  
  // Helper to add a device node
  function addNode(device) {
    if (!nodes.has(device.id)) {
      nodes.set(device.id, {
        id: device.id,
        label: device.name,
        type: device.type || 'Unknown',
        status: normalizeStatus(device.status)
      });
    }
  }
  
  // Process relationships recursively
  function processRelationships(currentDeviceIds, currentDepth) {
    if (currentDepth > maxDepth) return;
    
    const nextLevelDeviceIds = new Set();
    
    relationships.forEach(edge => {
      const rel = edge.node;
      const relationshipKey = `${rel.parentDevice.id}-${rel.childDevice.id}`;
      
      if (visitedRelationships.has(relationshipKey)) return;
      
      // Check if this relationship involves our current devices
      const parentInCurrent = currentDeviceIds.includes(rel.parentDevice.id);
      const childInCurrent = currentDeviceIds.includes(rel.childDevice.id);
      
      if (direction === 'children' && parentInCurrent) {
        // Add child device and edge
        addNode(rel.parentDevice);
        addNode(rel.childDevice);
        edges.push({
          source: rel.parentDevice.id,
          target: rel.childDevice.id
        });
        visitedRelationships.add(relationshipKey);
        nextLevelDeviceIds.add(rel.childDevice.id);
        
      } else if (direction === 'parents' && childInCurrent) {
        // Add parent device and edge
        addNode(rel.parentDevice);
        addNode(rel.childDevice);
        edges.push({
          source: rel.parentDevice.id,
          target: rel.childDevice.id
        });
        visitedRelationships.add(relationshipKey);
        nextLevelDeviceIds.add(rel.parentDevice.id);
        
      } else if (direction === 'both' && (parentInCurrent || childInCurrent)) {
        // Add both devices and edge
        addNode(rel.parentDevice);
        addNode(rel.childDevice);
        edges.push({
          source: rel.parentDevice.id,
          target: rel.childDevice.id
        });
        visitedRelationships.add(relationshipKey);
        
        if (parentInCurrent) nextLevelDeviceIds.add(rel.childDevice.id);
        if (childInCurrent) nextLevelDeviceIds.add(rel.parentDevice.id);
      }
    });
    
    // Recursively process next level
    if (nextLevelDeviceIds.size > 0 && currentDepth < maxDepth) {
      processRelationships(Array.from(nextLevelDeviceIds), currentDepth + 1);
    }
  }
  
  // Start processing from initial devices
  processRelationships(startDeviceIds, 1);
  
  return {
    nodes: Array.from(nodes.values()),
    edges
  };
}

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