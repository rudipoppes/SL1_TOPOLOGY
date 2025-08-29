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
  const nodePositionCounter = useRef({ x: 100, y: 100 });
  
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
        enabled: false, // Always disable physics for static positioning
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        multiselect: true,
        dragView: true,
        zoomView: true,
        dragNodes: true, // Allow manual dragging
      },
      nodes: {
        chosen: true,
      },
      edges: {
        chosen: true,
        length: 200, // Default edge length
        smooth: {
          enabled: true,
          type: 'continuous',
          roundness: 0.2,
        },
      },
    };

    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    // No stabilization needed - physics is always disabled

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

  // Handle data updates with static positioning
  useEffect(() => {
    if (!networkRef.current || !nodesDataSetRef.current || !edgesDataSetRef.current) return;

    // If force redraw is requested (layout change), clear everything
    if (forceRedraw) {
      console.log('Force redraw requested - clearing canvas');
      nodesDataSetRef.current.clear();
      edgesDataSetRef.current.clear();
      setForceRedraw(false);
      // Reset position counter for layout changes
      nodePositionCounter.current = { x: 100, y: 100 };
    }

    // Transform new data to vis-network format with static positioning
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
          scaleFactor: 1.0,
        },
      },
      color: {
        color: '#cbd5e0',
        highlight: '#667eea',
        hover: '#667eea',
      },
      width: 2,
      length: 200, // Minimum edge length
      smooth: {
        enabled: true,
        type: 'continuous',
        roundness: 0.2,
      },
    })) || [];

    // Get current positions from the network (includes manual drag positions)
    const currentPositions = new Map();
    const allCurrentNodeIds = nodesDataSetRef.current.getIds();
    
    // Get actual positions from network (this includes manual drag updates)
    if (allCurrentNodeIds.length > 0) {
      const networkPositions = networkRef.current?.getPositions(allCurrentNodeIds as string[]);
      if (networkPositions) {
        Object.entries(networkPositions).forEach(([nodeId, position]) => {
          currentPositions.set(nodeId, { x: position.x, y: position.y });
          console.log(`STATIC: Current position for ${nodeId}:`, position);
        });
      }
    }

    // Get current node and edge IDs
    const currentNodeIds = new Set(allCurrentNodeIds);
    const currentEdgeIds = new Set(edgesDataSetRef.current.getIds());
    const newNodeIds = new Set(newVisNodes.map(n => n.id));
    const newEdgeIds = new Set(newVisEdges.map(e => e.id));

    // Remove nodes that are no longer present (simple removal)
    const nodesToRemove = Array.from(currentNodeIds).filter(id => !newNodeIds.has(id as string));
    if (nodesToRemove.length > 0) {
      console.log('STATIC: Removing nodes without movement:', nodesToRemove);
      nodesDataSetRef.current.remove(nodesToRemove);
    }

    // Remove edges that are no longer present
    const edgesToRemove = Array.from(currentEdgeIds).filter(id => !newEdgeIds.has(id as string));
    if (edgesToRemove.length > 0) {
      console.log('STATIC: Removing edges without movement:', edgesToRemove);
      edgesDataSetRef.current.remove(edgesToRemove);
    }

    // Process nodes: preserve existing positions, assign new positions to new nodes
    const nodesToUpdate = newVisNodes.map(node => {
      const existingPosition = currentPositions.get(node.id);
      if (existingPosition) {
        // Existing node - preserve exact position
        console.log(`STATIC: Preserving position for existing node ${node.id}`);
        return {
          ...node,
          x: existingPosition.x,
          y: existingPosition.y,
        };
      } else {
        // New node - assign static position with much better spacing
        const newPosition = {
          x: nodePositionCounter.current.x,
          y: nodePositionCounter.current.y,
        };
        // Increment position for next new node with balanced spacing
        nodePositionCounter.current.x += 280;
        if (nodePositionCounter.current.x > 1000) {
          nodePositionCounter.current.x = 100;
          nodePositionCounter.current.y += 220;
        }
        
        console.log(`STATIC: Assigning position to new node ${node.id}:`, newPosition);
        return {
          ...node,
          x: newPosition.x,
          y: newPosition.y,
        };
      }
    });

    // Update nodes (existing keep position, new get static position)
    if (nodesToUpdate.length > 0) {
      console.log('STATIC: Updating nodes with preserved/static positions');
      nodesDataSetRef.current.update(nodesToUpdate);
    }

    // Update edges
    if (newVisEdges.length > 0) {
      console.log('STATIC: Updating edges');
      edgesDataSetRef.current.update(newVisEdges);
    }

  }, [topologyData, deviceDirections, forceRedraw]);

  // Handle layout changes by enabling physics temporarily
  useEffect(() => {
    if (!networkRef.current || !forceRedraw) return;

    console.log(`Applying layout: ${layout}`);
    
    if (layout === 'hierarchical') {
      // Enable hierarchical layout temporarily
      networkRef.current.setOptions({
        physics: { enabled: true },
        layout: {
          hierarchical: {
            enabled: true,
            direction: 'UD',
            sortMethod: 'directed',
            levelSeparation: 250, // Keep vertical spacing good
            nodeSpacing: 400, // MASSIVE horizontal spacing to prevent overlap
            treeSpacing: 400, // Massive tree spacing 
            blockShifting: true, // Enable block shifting to prevent overlap
            edgeMinimization: true, // Minimize edge crossings
            parentCentralization: true, // Center parent nodes
          },
        },
      });
      
      // Disable physics after a short delay
      setTimeout(() => {
        if (networkRef.current) {
          networkRef.current.setOptions({ physics: { enabled: false } });
          console.log('Layout applied - physics disabled for static positioning');
        }
      }, 2000);
    } else if (layout === 'physics') {
      // Enable physics temporarily for natural layout with better spacing
      networkRef.current.setOptions({
        physics: { 
          enabled: true,
          barnesHut: {
            gravitationalConstant: -6000, // Reduced from -8000 for less attraction
            centralGravity: 0.2, // Reduced from 0.3 for less central pull
            springLength: 250, // Increased from 200 for longer connections
            springConstant: 0.03, // Reduced from 0.04 for softer springs
            damping: 0.09,
            avoidOverlap: 1, // Add overlap avoidance
          },
        },
        layout: { hierarchical: { enabled: false } },
      });
      
      // Disable physics after stabilization
      setTimeout(() => {
        if (networkRef.current) {
          networkRef.current.setOptions({ physics: { enabled: false } });
          console.log('Physics layout applied - physics disabled for static positioning');
        }
      }, 3000);
    } else {
      // Grid layout - keep physics disabled, arrange in grid pattern
      const nodes = nodesDataSetRef.current?.get() as any[];
      if (nodes && nodes.length > 0) {
        const gridSize = Math.ceil(Math.sqrt(nodes.length));
        const spacing = 400; // Much larger spacing to prevent overlap
        
        const gridNodes = nodes.map((node, index) => ({
          id: node.id,
          x: (index % gridSize) * spacing + 100,
          y: Math.floor(index / gridSize) * spacing + 100,
        }));
        
        nodesDataSetRef.current?.update(gridNodes);
        console.log('Grid layout applied with static positions');
      }
    }
  }, [layout, forceRedraw]);

  const handleLayoutChange = (newLayout: typeof layout) => {
    console.log(`STATIC: Layout change requested: ${newLayout}`);
    setLayout(newLayout);
    setForceRedraw(true); // This will trigger layout change
  };

  const handleFitView = () => {
    networkRef.current?.fit({ animation: { duration: 1000, easingFunction: 'easeInOutQuad' } });
  };

  const handleResetPhysics = () => {
    console.log('STATIC: Reset requested');
    setForceRedraw(true); // This will clear and redraw everything
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