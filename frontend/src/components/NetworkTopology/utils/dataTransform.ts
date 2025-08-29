import { TopologyNode, TopologyEdge, Device } from '../../../services/api';
import { createCustomNode, createCustomEdge } from './visConfig';

export const transformToVisData = (
  topologyNodes: TopologyNode[],
  topologyEdges: TopologyEdge[],
  selectedDevices: Device[],
  fixedNodes: Set<string>
) => {
  // Create a map of selected device IDs for quick lookup
  const selectedDeviceIds = new Set(selectedDevices.map(d => d.id));
  
  // Transform nodes
  const visNodes = topologyNodes.map(node => {
    const isSelected = selectedDeviceIds.has(node.id);
    const isFixed = fixedNodes.has(node.id);
    const status = getNodeStatus(node);
    const type = getNodeType(node);
    
    return createCustomNode(
      node.id,
      node.label || node.id,
      type,
      status,
      isFixed
    );
  });
  
  // Transform edges with relationship types
  const visEdges = topologyEdges.map(edge => {
    const relationshipType = determineRelationshipType(edge);
    return createCustomEdge(
      edge.id,
      edge.source,
      edge.target,
      edge.label,
      relationshipType
    );
  });
  
  return { nodes: visNodes, edges: visEdges };
};

const getNodeStatus = (node: TopologyNode): 'online' | 'offline' | 'warning' => {
  // Check various status indicators
  if (node.data?.status === 'online' || node.data?.state === '0') {
    return 'online';
  }
  if (node.data?.status === 'offline' || node.data?.state === '2') {
    return 'offline';
  }
  if (node.data?.status === 'warning' || node.data?.state === '1') {
    return 'warning';
  }
  
  // Default to online if no status information
  return 'online';
};

const getNodeType = (node: TopologyNode): string => {
  // Check various type indicators
  if (node.data?.type) {
    return node.data.type.toLowerCase();
  }
  if (node.data?.deviceClass) {
    return node.data.deviceClass.toLowerCase();
  }
  if (node.label) {
    const label = node.label.toLowerCase();
    if (label.includes('router')) return 'router';
    if (label.includes('switch')) return 'switch';
    if (label.includes('server')) return 'server';
    if (label.includes('firewall')) return 'firewall';
    if (label.includes('load')) return 'loadbalancer';
    if (label.includes('storage')) return 'storage';
    if (label.includes('database')) return 'database';
  }
  
  return 'unknown';
};

const determineRelationshipType = (edge: TopologyEdge): 'parent' | 'child' | 'peer' => {
  // Determine relationship type based on edge data
  if (edge.data?.relationship === 'parent' || edge.data?.type === 'parent') {
    return 'parent';
  }
  if (edge.data?.relationship === 'child' || edge.data?.type === 'child') {
    return 'child';
  }
  
  // Default to peer relationship
  return 'peer';
};

// Helper function to create hierarchical levels for layout
export const calculateHierarchyLevels = (
  nodes: TopologyNode[],
  edges: TopologyEdge[]
): Map<string, number> => {
  const levels = new Map<string, number>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const childToParent = new Map<string, string[]>();
  const parentToChild = new Map<string, string[]>();
  
  // Build relationship maps
  edges.forEach(edge => {
    if (!childToParent.has(edge.target)) {
      childToParent.set(edge.target, []);
    }
    childToParent.get(edge.target)!.push(edge.source);
    
    if (!parentToChild.has(edge.source)) {
      parentToChild.set(edge.source, []);
    }
    parentToChild.get(edge.source)!.push(edge.target);
  });
  
  // Find root nodes (no parents)
  const roots = nodes.filter(node => !childToParent.has(node.id) || childToParent.get(node.id)!.length === 0);
  
  // BFS to assign levels
  const queue: { id: string; level: number }[] = roots.map(r => ({ id: r.id, level: 0 }));
  const visited = new Set<string>();
  
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    
    if (visited.has(id)) continue;
    visited.add(id);
    levels.set(id, level);
    
    const children = parentToChild.get(id) || [];
    children.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }
  
  // Assign default level to any unvisited nodes
  nodes.forEach(node => {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0);
    }
  });
  
  return levels;
};

// Helper function to group nodes by type
export const groupNodesByType = (nodes: TopologyNode[]): Map<string, TopologyNode[]> => {
  const groups = new Map<string, TopologyNode[]>();
  
  nodes.forEach(node => {
    const type = getNodeType(node);
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type)!.push(node);
  });
  
  return groups;
};

// Helper function to detect clusters
export const detectClusters = (
  nodes: TopologyNode[],
  edges: TopologyEdge[],
  minClusterSize: number = 3
): Map<string, Set<string>> => {
  const clusters = new Map<string, Set<string>>();
  const visited = new Set<string>();
  const adjacencyList = new Map<string, Set<string>>();
  
  // Build adjacency list
  edges.forEach(edge => {
    if (!adjacencyList.has(edge.source)) {
      adjacencyList.set(edge.source, new Set());
    }
    if (!adjacencyList.has(edge.target)) {
      adjacencyList.set(edge.target, new Set());
    }
    adjacencyList.get(edge.source)!.add(edge.target);
    adjacencyList.get(edge.target)!.add(edge.source);
  });
  
  // DFS to find connected components
  const dfs = (nodeId: string, cluster: Set<string>) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    cluster.add(nodeId);
    
    const neighbors = adjacencyList.get(nodeId) || new Set();
    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        dfs(neighborId, cluster);
      }
    });
  };
  
  // Find all clusters
  let clusterIndex = 0;
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const cluster = new Set<string>();
      dfs(node.id, cluster);
      
      if (cluster.size >= minClusterSize) {
        clusters.set(`cluster_${clusterIndex++}`, cluster);
      }
    }
  });
  
  return clusters;
};