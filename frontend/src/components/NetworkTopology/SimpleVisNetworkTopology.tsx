import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network/standalone';
import { DataSet } from 'vis-data/standalone';
import { Device, TopologyNode, TopologyEdge } from '../../services/api';
import { DeviceRelationshipModal } from './DeviceRelationshipModal';
import styles from './SimpleTopology.module.css';

interface SimpleVisNetworkTopologyProps {
  devices?: Device[];
  selectedDevices?: Device[];
  topologyData?: {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
  };
  deviceDirections?: Map<string, 'parents' | 'children' | 'both'>;
  onDirectionChange?: (direction: 'parents' | 'children' | 'both', deviceId: string) => void;
  onAddDeviceToSelection?: (device: Device) => void;
  onClearAll?: () => void;
  className?: string;
}

const getDeviceIcon = (type: string): string => {
  const lowerType = type?.toLowerCase() || '';
  
  if (lowerType.includes('router')) return '🔀';
  if (lowerType.includes('switch')) return '🔌';
  if (lowerType.includes('server')) return '🖥️';
  if (lowerType.includes('firewall')) return '🛡️';
  if (lowerType.includes('load')) return '⚖️';
  if (lowerType.includes('storage')) return '💾';
  if (lowerType.includes('database')) return '🗄️';
  
  return '📡';
};

const getNodeStatus = (node: any): 'online' | 'offline' | 'warning' => {
  if (node.status === 'online' || node.state === '0') return 'online';
  if (node.status === 'offline' || node.state === '2') return 'offline';
  if (node.status === 'warning' || node.state === '1') return 'warning';
  return 'online';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return '#10b981';
    case 'offline': return '#ef4444';
    case 'warning': return '#f59e0b';
    default: return '#6b7280';
  }
};

export const SimpleVisNetworkTopology: React.FC<SimpleVisNetworkTopologyProps> = ({
  topologyData,
  deviceDirections,
  onDirectionChange,
  onClearAll,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesDataSetRef = useRef<DataSet<any> | null>(null);
  const edgesDataSetRef = useRef<DataSet<any> | null>(null);
  const [layout, setLayout] = useState<'hierarchical' | 'physics' | 'grid'>('physics');
  const [forceRedraw, setForceRedraw] = useState(false);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [isStabilized, setIsStabilized] = useState(false);
  
  // Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    nodeId: string;
    nodeName: string;
    nodeType?: string;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    nodeId: '',
    nodeName: '',
    nodeType: undefined,
  });

  // Initialize network once
  useEffect(() => {
    if (!containerRef.current || networkRef.current) return;

    // Initialize empty datasets
    const nodesDataSet = new DataSet([]);
    const edgesDataSet = new DataSet([]);
    nodesDataSetRef.current = nodesDataSet;
    edgesDataSetRef.current = edgesDataSet;

    const data = {
      nodes: nodesDataSet,
      edges: edgesDataSet,
    };

    const options = {
      physics: {
        enabled: physicsEnabled,
        barnesHut: {
          gravitationalConstant: -8000,
          centralGravity: 0.3,
          springLength: 200,
          springConstant: 0.04,
          damping: 0.09,
        },
        stabilization: {
          enabled: true,
          iterations: 100,
          updateInterval: 25,
        },
      },
      layout: {
        hierarchical: layout === 'hierarchical' ? {
          enabled: true,
          direction: 'UD',
          sortMethod: 'directed',
          levelSeparation: 150,
          nodeSpacing: 200,
        } : {
          enabled: false,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        multiselect: true,
        dragView: true,
        zoomView: true,
        dragNodes: true,
      },
      nodes: {
        chosen: true,
      },
      edges: {
        chosen: true,
      },
    };

    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    // Listen for stabilization completion
    network.on('stabilizationIterationsDone', () => {
      console.log('Network stabilized - disabling physics to preserve positions');
      setIsStabilized(true);
      // Disable physics after stabilization to lock positions
      network.setOptions({
        physics: { enabled: false }
      });
      setPhysicsEnabled(false);
    });

    // Add click event listener for node clicks
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0] as string;
        const currentNode = nodesDataSetRef.current?.get(nodeId);
        
        if (currentNode && containerRef.current) {
          // Get canvas position relative to container
          const containerRect = containerRef.current.getBoundingClientRect();
          const canvasPosition = network.canvasToDOM(params.pointer.canvas);
          
          // Calculate modal position relative to viewport
          const modalPosition = {
            x: containerRect.left + canvasPosition.x,
            y: containerRect.top + canvasPosition.y,
          };

          setModalState({
            isOpen: true,
            position: modalPosition,
            nodeId: nodeId,
            nodeName: currentNode.nodeData?.name || nodeId,
            nodeType: currentNode.nodeData?.type,
          });
        }
      }
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
        nodesDataSetRef.current = null;
        edgesDataSetRef.current = null;
      }
    };
  }, []);

  // Handle data updates with position preservation
  useEffect(() => {
    if (!networkRef.current || !nodesDataSetRef.current || !edgesDataSetRef.current) return;

    // If force redraw is requested (layout change), clear everything and re-enable physics
    if (forceRedraw) {
      console.log('Force redraw requested - clearing canvas and re-enabling physics');
      nodesDataSetRef.current.clear();
      edgesDataSetRef.current.clear();
      setForceRedraw(false);
      setPhysicsEnabled(true);
      setIsStabilized(false);
      networkRef.current.setOptions({ physics: { enabled: true } });
    }

    // Transform new data to vis-network format
    const newVisNodes = topologyData?.nodes.map(node => {
      const status = getNodeStatus(node);
      const icon = getDeviceIcon(node.type || '');
      const statusColor = getStatusColor(status);
      const direction = deviceDirections?.get(node.id) || 'children';
      
      // Add direction indicator to label
      const directionIcon = direction === 'parents' ? '🔼' : 
                           direction === 'both' ? '🔄' : '🔽';
      const directionLabel = `${icon}\n${node.label || node.id}\n${directionIcon}`;

      return {
        id: node.id,
        label: directionLabel,
        title: `${node.label || node.id} (${node.type || 'Unknown'})\nDirection: ${direction}`,
        color: {
          background: '#ffffff',
          border: statusColor,
          highlight: {
            background: '#f9fafb',
            border: '#667eea',
          },
        },
        borderWidth: 2,
        borderWidthSelected: 4,
        shape: 'box',
        shapeProperties: {
          borderRadius: 12,
        },
        font: {
          size: 14,
          face: 'Inter, system-ui, sans-serif',
          color: '#1f2937',
          strokeWidth: 2,
          strokeColor: '#ffffff',
        },
        margin: {
          top: 10,
          right: 15,
          bottom: 10,
          left: 15,
        },
        shadow: {
          enabled: true,
          color: 'rgba(0, 0, 0, 0.2)',
          size: 15,
          x: 0,
          y: 5,
        },
        widthConstraint: {
          minimum: 140,
          maximum: 200,
        },
        nodeData: {
          name: node.label || node.id,
          type: node.type,
          direction: direction,
        },
      };
    }) || [];

    const newVisEdges = topologyData?.edges.map((edge, index) => ({
      id: `edge-${edge.source}-${edge.target}-${index}`,
      from: edge.source,
      to: edge.target,
      arrows: {
        to: {
          enabled: true,
          type: 'arrow',
          scaleFactor: 0.8,
        },
      },
      color: {
        color: '#cbd5e0',
        highlight: '#667eea',
        hover: '#667eea',
      },
      width: 2,
      smooth: {
        enabled: true,
        type: 'dynamic',
        roundness: 0.5,
      },
    })) || [];

    // Save current positions before making changes (only when physics is disabled)
    const savedPositions = new Map();
    if (!physicsEnabled && !forceRedraw && isStabilized) {
      console.log('Saving current node positions before update');
      const currentNodeIds = nodesDataSetRef.current.getIds();
      currentNodeIds.forEach((nodeId) => {
        const nodeIdStr = String(nodeId);
        const position = networkRef.current?.getPositions([nodeIdStr])[nodeIdStr];
        if (position) {
          savedPositions.set(nodeIdStr, position);
        }
      });
    }

    // Get current node and edge IDs
    const currentNodeIds = new Set(nodesDataSetRef.current.getIds());
    const currentEdgeIds = new Set(edgesDataSetRef.current.getIds());
    const newNodeIds = new Set(newVisNodes.map(n => n.id));
    const newEdgeIds = new Set(newVisEdges.map(e => e.id));

    // Remove nodes that are no longer present
    const nodesToRemove = Array.from(currentNodeIds).filter(id => !newNodeIds.has(id as string));
    if (nodesToRemove.length > 0) {
      console.log('Removing nodes:', nodesToRemove);
      nodesDataSetRef.current.remove(nodesToRemove);
    }

    // Remove edges that are no longer present
    const edgesToRemove = Array.from(currentEdgeIds).filter(id => !newEdgeIds.has(id as string));
    if (edgesToRemove.length > 0) {
      console.log('Removing edges:', edgesToRemove);
      edgesDataSetRef.current.remove(edgesToRemove);
    }

    // Prepare nodes for update - preserve positions if physics is disabled
    const nodesToUpdate = newVisNodes.map(node => {
      const savedPosition = savedPositions.get(node.id);
      if (savedPosition && !physicsEnabled && !forceRedraw) {
        console.log(`Preserving position for node ${node.id}:`, savedPosition);
        return {
          ...node,
          x: savedPosition.x,
          y: savedPosition.y,
          fixed: { x: false, y: false }, // Allow dragging but preserve position
        };
      }
      return node;
    });

    if (nodesToUpdate.length > 0) {
      console.log('Updating nodes:', nodesToUpdate.length);
      nodesDataSetRef.current.update(nodesToUpdate);
    }

    // Add or update edges
    if (newVisEdges.length > 0) {
      console.log('Updating edges:', newVisEdges.length);
      edgesDataSetRef.current.update(newVisEdges);
    }

    // If we have new nodes and physics is disabled, position them away from existing nodes
    if (!physicsEnabled && !forceRedraw && isStabilized) {
      const newNodes = newVisNodes.filter(node => !savedPositions.has(node.id));
      if (newNodes.length > 0) {
        console.log('Positioning new nodes without physics:', newNodes.length);
        // Give new nodes default positions spread out
        const positionedNewNodes = newNodes.map((node, index) => ({
          id: node.id,
          x: 100 + (index * 200),
          y: 100 + (index * 100),
          fixed: { x: false, y: false },
        }));
        
        setTimeout(() => {
          if (nodesDataSetRef.current) {
            nodesDataSetRef.current.update(positionedNewNodes);
          }
        }, 50);
      }
    }

  }, [topologyData, deviceDirections, forceRedraw, physicsEnabled, isStabilized]);

  // Handle layout changes
  useEffect(() => {
    if (!networkRef.current) return;

    const options = {
      physics: {
        enabled: layout === 'physics',
        barnesHut: {
          gravitationalConstant: -8000,
          centralGravity: 0.3,
          springLength: 200,
          springConstant: 0.04,
          damping: 0.09,
        },
        stabilization: {
          enabled: true,
          iterations: 200,
        },
      },
      layout: {
        hierarchical: layout === 'hierarchical' ? {
          enabled: true,
          direction: 'UD',
          sortMethod: 'directed',
          levelSeparation: 150,
          nodeSpacing: 200,
        } : {
          enabled: false,
        },
      },
    };

    networkRef.current.setOptions(options);

    // Apply grid layout if selected (disabled physics for static layout)
    if (layout === 'grid') {
      networkRef.current.setOptions({ physics: { enabled: false } });
    }
  }, [layout]);

  const handleLayoutChange = (newLayout: typeof layout) => {
    console.log(`Layout change requested: ${newLayout}`);
    setLayout(newLayout);
    setForceRedraw(true); // Force redraw when layout changes
    setPhysicsEnabled(true); // Re-enable physics for new layout
    setIsStabilized(false); // Reset stabilization state
  };

  const handleFitView = () => {
    networkRef.current?.fit({ animation: { duration: 1000, easingFunction: 'easeInOutQuad' } });
  };

  const handleResetPhysics = () => {
    console.log('Reset requested');
    if (networkRef.current) {
      setForceRedraw(true); // Force redraw on reset
      setPhysicsEnabled(true); // Re-enable physics for reset
      setIsStabilized(false); // Reset stabilization state
    }
  };

  const handleDirectionSelect = (direction: 'parents' | 'children' | 'both') => {
    if (onDirectionChange && modalState.nodeId) {
      onDirectionChange(direction, modalState.nodeId);
    }
  };

  const handleModalClose = () => {
    setModalState(prev => ({
      ...prev,
      isOpen: false,
    }));
  };

  return (
    <div className={`${styles.simpleVisNetworkTopology} ${className}`}>
      {/* Simple Controls */}
      <div className={styles.simpleControls}>
        <div className={styles.controlGroup}>
          <button
            onClick={() => handleLayoutChange('physics')}
            className={`${styles.controlBtn} ${layout === 'physics' ? styles.active : ''}`}
          >
            ⚛️ Physics
          </button>
          <button
            onClick={() => handleLayoutChange('hierarchical')}
            className={`${styles.controlBtn} ${layout === 'hierarchical' ? styles.active : ''}`}
          >
            🌳 Hierarchy
          </button>
          <button
            onClick={() => handleLayoutChange('grid')}
            className={`${styles.controlBtn} ${layout === 'grid' ? styles.active : ''}`}
          >
            ⚏ Grid
          </button>
        </div>
        
        <div className={styles.controlGroup}>
          <button onClick={handleFitView} className={styles.controlBtn}>
            🔍 Fit View
          </button>
          <button onClick={handleResetPhysics} className={styles.controlBtn}>
            🔄 Reset
          </button>
          {onClearAll && (
            <button onClick={onClearAll} className={`${styles.controlBtn} ${styles.danger}`}>
              🗑️ Clear
            </button>
          )}
        </div>
      </div>
      
      <div 
        ref={containerRef} 
        className={styles.visContainer}
      />

      {/* Device Relationship Modal */}
      <DeviceRelationshipModal
        isOpen={modalState.isOpen}
        position={modalState.position}
        nodeId={modalState.nodeId}
        nodeName={modalState.nodeName}
        nodeType={modalState.nodeType}
        currentDirection={deviceDirections?.get(modalState.nodeId) || 'children'}
        onDirectionSelect={handleDirectionSelect}
        onClose={handleModalClose}
      />
    </div>
  );
};