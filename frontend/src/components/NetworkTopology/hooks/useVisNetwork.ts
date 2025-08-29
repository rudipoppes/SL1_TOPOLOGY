import { useState, useEffect, useCallback, useRef } from 'react';
import { Network } from 'vis-network/standalone';
import { DataSet } from 'vis-data/standalone';

interface NodePosition {
  x: number;
  y: number;
}

interface NodeData {
  id: string;
  label: string;
  x?: number;
  y?: number;
  fixed?: boolean;
  physics?: boolean;
  group?: string;
  [key: string]: any;
}

interface EdgeData {
  id: string;
  from: string;
  to: string;
  label?: string;
  [key: string]: any;
}

export const useVisNetwork = (network: Network | null) => {
  const [nodes, setNodes] = useState<DataSet<NodeData> | null>(null);
  const [edges, setEdges] = useState<DataSet<EdgeData> | null>(null);
  const [isStabilized, setIsStabilized] = useState(false);
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(new Map());
  const stabilizationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize data sets when network is available
  useEffect(() => {
    if (network) {
      const nodesDataSet = network.body.data.nodes as DataSet<NodeData>;
      const edgesDataSet = network.body.data.edges as DataSet<EdgeData>;
      
      setNodes(nodesDataSet);
      setEdges(edgesDataSet);

      // Set up stabilization tracking
      network.on('stabilizationProgress', (params) => {
        setIsStabilized(false);
      });

      network.on('stabilizationIterationsDone', () => {
        setIsStabilized(true);
        // Clear any existing timeout
        if (stabilizationTimeoutRef.current) {
          clearTimeout(stabilizationTimeoutRef.current);
        }
        // Set a timeout to mark as stabilized after a delay
        stabilizationTimeoutRef.current = setTimeout(() => {
          setIsStabilized(true);
        }, 500);
      });

      // Track node positions
      network.on('dragEnd', (params) => {
        if (params.nodes.length > 0) {
          const positions = network.getPositions(params.nodes);
          const newPositions = new Map(nodePositions);
          Object.entries(positions).forEach(([id, pos]) => {
            newPositions.set(id, pos);
          });
          setNodePositions(newPositions);
        }
      });
    }

    return () => {
      if (stabilizationTimeoutRef.current) {
        clearTimeout(stabilizationTimeoutRef.current);
      }
    };
  }, [network]);

  // Add a node to the network
  const addNode = useCallback((nodeData: NodeData) => {
    if (nodes) {
      nodes.add(nodeData);
    }
  }, [nodes]);

  // Remove a node from the network
  const removeNode = useCallback((nodeId: string) => {
    if (nodes) {
      nodes.remove(nodeId);
    }
  }, [nodes]);

  // Update multiple nodes
  const updateNodes = useCallback((nodeUpdates: NodeData[]) => {
    if (nodes) {
      nodes.update(nodeUpdates);
    }
  }, [nodes]);

  // Add an edge to the network
  const addEdge = useCallback((edgeData: EdgeData) => {
    if (edges) {
      edges.add(edgeData);
    }
  }, [edges]);

  // Remove an edge from the network
  const removeEdge = useCallback((edgeId: string) => {
    if (edges) {
      edges.remove(edgeId);
    }
  }, [edges]);

  // Update multiple edges
  const updateEdges = useCallback((edgeUpdates: EdgeData[]) => {
    if (edges) {
      edges.update(edgeUpdates);
    }
  }, [edges]);

  // Update node positions
  const updateNodePositions = useCallback((positions: { [key: string]: NodePosition }) => {
    if (nodes && network) {
      const updates = Object.entries(positions).map(([id, pos]) => ({
        id,
        x: pos.x,
        y: pos.y,
      }));
      nodes.update(updates);
      
      // Update local position tracking
      const newPositions = new Map(nodePositions);
      Object.entries(positions).forEach(([id, pos]) => {
        newPositions.set(id, pos);
      });
      setNodePositions(newPositions);
    }
  }, [nodes, network, nodePositions]);

  // Toggle node fixed state
  const updateNodeFixed = useCallback((nodeId: string, fixed: boolean, position?: NodePosition) => {
    if (nodes) {
      const update: NodeData = {
        id: nodeId,
        fixed: fixed,
        physics: !fixed,
      };
      
      if (position && fixed) {
        update.x = position.x;
        update.y = position.y;
      }
      
      nodes.update(update);
    }
  }, [nodes]);

  // Get current node positions
  const getCurrentPositions = useCallback((): { [key: string]: NodePosition } => {
    if (network) {
      const nodeIds = nodes?.getIds() || [];
      return network.getPositions(nodeIds);
    }
    return {};
  }, [network, nodes]);

  // Cluster nodes by group
  const clusterByGroup = useCallback((groupId: string, nodeIds: string[]) => {
    if (network && nodeIds.length > 1) {
      const clusterOptions = {
        joinCondition: (nodeOptions: any) => {
          return nodeIds.includes(nodeOptions.id);
        },
        clusterNodeProperties: {
          id: groupId,
          label: `Group (${nodeIds.length})`,
          borderWidth: 3,
          color: {
            background: '#e5e7eb',
            border: '#6b7280',
            highlight: {
              background: '#d1d5db',
              border: '#374151',
            },
          },
          shape: 'ellipse',
          font: {
            size: 16,
            color: '#1f2937',
          },
        },
      };
      
      network.cluster(clusterOptions);
    }
  }, [network]);

  // Open a cluster
  const openCluster = useCallback((clusterId: string) => {
    if (network) {
      network.openCluster(clusterId);
    }
  }, [network]);

  // Fit network to view
  const fitToView = useCallback((animationOptions?: any) => {
    if (network) {
      const options = animationOptions || {
        animation: {
          duration: 1000,
          easingFunction: 'easeInOutQuad',
        },
      };
      network.fit(options);
    }
  }, [network]);

  // Center view on specific nodes
  const focusOnNodes = useCallback((nodeIds: string[], animationOptions?: any) => {
    if (network) {
      const options = animationOptions || {
        animation: {
          duration: 1000,
          easingFunction: 'easeInOutQuad',
        },
        scale: 1.0,
      };
      network.focus(nodeIds[0], options);
    }
  }, [network]);

  // Get connected nodes
  const getConnectedNodes = useCallback((nodeId: string): string[] => {
    if (network) {
      return network.getConnectedNodes(nodeId) as string[];
    }
    return [];
  }, [network]);

  // Get connected edges
  const getConnectedEdges = useCallback((nodeId: string): string[] => {
    if (network) {
      return network.getConnectedEdges(nodeId) as string[];
    }
    return [];
  }, [network]);

  // Select nodes programmatically
  const selectNodes = useCallback((nodeIds: string[]) => {
    if (network) {
      network.setSelection({ nodes: nodeIds, edges: [] });
    }
  }, [network]);

  // Get currently selected nodes
  const getSelectedNodes = useCallback((): string[] => {
    if (network) {
      return network.getSelectedNodes() as string[];
    }
    return [];
  }, [network]);

  // Get node at position
  const getNodeAt = useCallback((position: { x: number; y: number }): string | undefined => {
    if (network) {
      return network.getNodeAt(position) as string | undefined;
    }
    return undefined;
  }, [network]);

  // Start stabilization
  const stabilize = useCallback((iterations?: number) => {
    if (network) {
      setIsStabilized(false);
      network.stabilize(iterations);
    }
  }, [network]);

  // Stop stabilization
  const stopSimulation = useCallback(() => {
    if (network) {
      network.stopSimulation();
      setIsStabilized(true);
    }
  }, [network]);

  // Get network statistics
  const getNetworkStats = useCallback(() => {
    if (nodes && edges) {
      return {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        isStabilized,
        hasFixedNodes: Array.from(nodePositions.keys()).length > 0,
      };
    }
    return {
      nodeCount: 0,
      edgeCount: 0,
      isStabilized: false,
      hasFixedNodes: false,
    };
  }, [nodes, edges, isStabilized, nodePositions]);

  return {
    nodes,
    edges,
    isStabilized,
    nodePositions,
    addNode,
    removeNode,
    updateNodes,
    addEdge,
    removeEdge,
    updateEdges,
    updateNodePositions,
    updateNodeFixed,
    getCurrentPositions,
    clusterByGroup,
    openCluster,
    fitToView,
    focusOnNodes,
    getConnectedNodes,
    getConnectedEdges,
    selectNodes,
    getSelectedNodes,
    getNodeAt,
    stabilize,
    stopSimulation,
    getNetworkStats,
  };
};