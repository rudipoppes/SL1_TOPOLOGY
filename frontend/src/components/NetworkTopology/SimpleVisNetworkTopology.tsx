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
  const [layout, setLayout] = useState<'hierarchical' | 'physics' | 'grid'>('physics');
  
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

  useEffect(() => {
    if (!containerRef.current) return;

    // Transform data to vis-network format
    const visNodes = topologyData?.nodes.map(node => {
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
        title: `${node.label || node.id} (${node.type || 'Unknown'})\nDirection: ${direction}`, // Tooltip
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
        // Store additional data for modal
        nodeData: {
          name: node.label || node.id,
          type: node.type,
          direction: direction,
        },
      };
    }) || [];

    const visEdges = topologyData?.edges.map((edge, index) => ({
      id: `edge-${index}`,
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

    const data = {
      nodes: new DataSet(visNodes),
      edges: new DataSet(visEdges),
    };

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

    // Add click event listener for node clicks
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0] as string;
        const node = visNodes.find(n => n.id === nodeId);
        
        if (node && containerRef.current) {
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
            nodeName: node.nodeData?.name || nodeId,
            nodeType: node.nodeData?.type,
          });
        }
      }
    });

    // Apply grid layout if selected (disabled physics for static layout)
    if (layout === 'grid') {
      network.setOptions({ physics: { enabled: false } });
    }

    return () => {
      network.destroy();
      networkRef.current = null;
    };
  }, [topologyData, layout, deviceDirections]);

  const handleLayoutChange = (newLayout: typeof layout) => {
    setLayout(newLayout);
  };

  const handleFitView = () => {
    networkRef.current?.fit({ animation: { duration: 1000, easingFunction: 'easeInOutQuad' } });
  };

  const handleResetPhysics = () => {
    if (networkRef.current && layout === 'physics') {
      networkRef.current.stabilize();
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