const { SL1Client, QUERIES } = require('./sl1-client');

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
    const searchTerm = params.search || '';
    const limit = parseInt(params.limit) || 20;
    
    if (!searchTerm || searchTerm.length < 2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Search term must be at least 2 characters'
        })
      };
    }
    
    // Query SL1
    const sl1Client = new SL1Client();
    const data = await sl1Client.query(QUERIES.SEARCH_DEVICES, {
      searchTerm,
      limit
    });
    
    // Process results
    const devices = data.devices.edges.map(edge => ({
      id: edge.node.id,
      name: edge.node.name,
      ip: edge.node.ip || 'N/A',
      type: edge.node.deviceClass?.name || 'Unknown',
      status: normalizeStatus(edge.node.state),
      hostname: edge.node.hostname
    }));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        devices,
        searchTerm,
        resultCount: devices.length
      })
    };
    
  } catch (error) {
    console.error('Error searching devices:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to search devices',
        message: error.message
      })
    };
  }
};

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