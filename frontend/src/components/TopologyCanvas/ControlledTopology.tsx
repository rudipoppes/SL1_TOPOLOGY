import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
  ReactFlowProvider,
  Position,
  Handle,
  BackgroundVariant,
  useReactFlow,
  XYPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Device, TopologyNode, TopologyEdge } from '../../services/api';

// Professional device node with proper styling
const ProfessionalDeviceNode = React.memo(({ data }: { data: any }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'online': return '#10b981';
      case 'offline': return '#ef4444'; 
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getDeviceIcon = () => {
    const type = data.type?.toLowerCase() || '';
    if (type.includes('router')) return '🔀';
    if (type.includes('switch')) return '🔌';
    if (type.includes('server')) return '🖥️';
    if (type.includes('firewall')) return '🛡️';
    return '📡';
  };

  return (
    <div
      style={{
        padding: '10px 15px',
        borderRadius: '8px',
        background: '#ffffff',
        border: `2px solid ${getStatusColor()}`,
        fontSize: '12px',
        fontWeight: 500,
        textAlign: 'center',
        position: 'relative',
        userSelect: 'none',
        minWidth: '120px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        cursor: 'grab',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: getStatusColor(), width: 8, height: 8 }}
      />
      
      {/* Device icon */}
      <div style={{ fontSize: '18px', marginBottom: '4px' }}>
        {getDeviceIcon()}
      </div>
      
      {/* Device name */}
      <div style={{ color: '#1f2937', fontWeight: 600, marginBottom: '2px' }}>
        {data.label}
      </div>
      
      {/* IP address */}
      {data.ip && (
        <div style={{ fontSize: '10px', color: '#6b7280' }}>
          {data.ip}
        </div>
      )}
      
      {/* Status indicator */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: getStatusColor(),
          border: '2px solid #ffffff',
        }}
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: getStatusColor(), width: 8, height: 8 }}
      />
    </div>
  );
});

ProfessionalDeviceNode.displayName = 'ProfessionalDeviceNode';

const nodeTypes = { device: ProfessionalDeviceNode };

// Layout algorithms
type LayoutType = 'grid' | 'hierarchical' | 'radial' | 'circular';

const calculatePosition = (index: number, total: number, layoutType: LayoutType): XYPosition => {
  const SPACING_X = 200;
  const SPACING_Y = 150;
  const START_X = 150;
  const START_Y = 100;

  switch (layoutType) {
    case 'grid':
      const columns = Math.ceil(Math.sqrt(total));
      const col = index % columns;
      const row = Math.floor(index / columns);
      return {
        x: START_X + (col * SPACING_X),
        y: START_Y + (row * SPACING_Y),
      };

    case 'hierarchical':
      const levels = Math.ceil(total / 4);
      const itemsPerLevel = Math.ceil(total / levels);
      const level = Math.floor(index / itemsPerLevel);
      const posInLevel = index % itemsPerLevel;
      return {
        x: START_X + (posInLevel * SPACING_X),
        y: START_Y + (level * SPACING_Y),
      };

    case 'radial':
      if (index === 0) {
        return { x: 400, y: 300 }; // Center
      }
      const angle = ((index - 1) * 2 * Math.PI) / (total - 1);
      const radius = 200;
      return {
        x: 400 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle),
      };

    case 'circular':
      const circleAngle = (index * 2 * Math.PI) / total;
      const circleRadius = Math.max(150, total * 20);
      return {
        x: 400 + circleRadius * Math.cos(circleAngle),
        y: 300 + circleRadius * Math.sin(circleAngle),
      };

    default:
      return { x: START_X, y: START_Y };
  }
};

interface ControlledTopologyProps {
  devices?: Device[];
  topologyData?: {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
  };
  onDirectionChange?: (direction: 'parents' | 'children' | 'both', deviceId: string) => void;
  className?: string;
}

const ControlledTopologyInner: React.FC<ControlledTopologyProps> = ({
  devices = [],
  topologyData,
  onDirectionChange,
  className = '',
}) => {
  const reactFlowInstance = useReactFlow();
  
  // Controlled state - we manage everything explicitly
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [currentLayout, setCurrentLayout] = useState<LayoutType>('grid');
  const [showControls, setShowControls] = useState(false);
  
  // Track positions separately to ensure stability
  const nodePositions = useRef<Map<string, XYPosition>>(new Map());
  const isDragging = useRef(false);
  
  // Build nodes and edges from props
  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const processedIds = new Set<string>();
    
    // Process devices first
    devices.forEach((device, index) => {
      if (!processedIds.has(device.id)) {
        // Get existing position or calculate new one
        let position = nodePositions.current.get(device.id);
        if (!position) {
          position = calculatePosition(index, devices.length + (topologyData?.nodes.length || 0), currentLayout);
          nodePositions.current.set(device.id, position);
        }
        
        newNodes.push({
          id: device.id,
          type: 'device',
          position: { ...position }, // Clone to prevent reference issues
          data: {
            label: device.name,
            status: device.status,
            ip: device.ip,
          },
          draggable: true,
          selectable: true,
          connectable: false,
        });
        processedIds.add(device.id);
      }
    });
    
    // Process topology data
    if (topologyData) {
      // Add topology nodes
      topologyData.nodes.forEach((node) => {
        if (!processedIds.has(node.id)) {
          // Calculate position for new topology nodes
          let position = nodePositions.current.get(node.id);
          if (!position) {
            // Place new nodes below existing ones
            const existingCount = processedIds.size;
            const totalCount = devices.length + (topologyData?.nodes.length || 0);
            position = calculatePosition(existingCount, totalCount, currentLayout);
            nodePositions.current.set(node.id, position);
          }
          
          newNodes.push({
            id: node.id,
            type: 'device',
            position: { ...position },
            data: {
              label: node.label,
              status: node.status,
              ip: node.ip,
            },
            draggable: true,
            selectable: true,
            connectable: false,
          });
          processedIds.add(node.id);
        }
      });
      
      // Add edges
      topologyData.edges.forEach((edge, index) => {
        newEdges.push({
          id: `e-${edge.source}-${edge.target}-${index}`,
          source: edge.source,
          target: edge.target,
          type: 'straight',
          animated: false,
        });
      });
    }
    
    // Only update if there are actual changes
    setNodes(newNodes);
    setEdges(newEdges);
    
  }, [devices, topologyData, currentLayout]);
  
  // Handle node drag - update our position map
  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    const roundedPosition = {
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
    };
    
    // Update our position map
    nodePositions.current.set(node.id, roundedPosition);
    
    // Update the node with rounded position
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === node.id) {
          return {
            ...n,
            position: roundedPosition,
          };
        }
        return n;
      })
    );
    
    isDragging.current = false;
  }, []);
  
  const handleNodeDragStart = useCallback(() => {
    isDragging.current = true;
  }, []);
  
  // Prevent any automatic node changes
  const handleNodesChange = useCallback(() => {
    // Do nothing - we control positions manually
    return;
  }, []);
  
  const handleEdgesChange = useCallback(() => {
    // Do nothing for edges either
    return;
  }, []);
  
  // Simple context menu
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      
      if (!onDirectionChange) return;
      
      // Create a simple context menu
      const menu = document.getElementById('topology-context-menu');
      if (menu) {
        menu.remove();
      }
      
      const newMenu = document.createElement('div');
      newMenu.id = 'topology-context-menu';
      newMenu.style.cssText = `
        position: fixed;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        z-index: 10000;
      `;
      
      const options = [
        { label: '↑ Parents', dir: 'parents' as const },
        { label: '↓ Children', dir: 'children' as const },
        { label: '↕ Both', dir: 'both' as const },
      ];
      
      options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.textContent = opt.label;
        btn.style.cssText = `
          display: block;
          width: 100%;
          padding: 6px 12px;
          text-align: left;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 13px;
        `;
        btn.onmouseover = () => {
          btn.style.background = '#f1f5f9';
        };
        btn.onmouseout = () => {
          btn.style.background = 'none';
        };
        btn.onclick = () => {
          onDirectionChange(opt.dir, node.id);
          newMenu.remove();
        };
        newMenu.appendChild(btn);
      });
      
      document.body.appendChild(newMenu);
      
      // Remove on click outside
      const removeMenu = () => {
        newMenu.remove();
        document.removeEventListener('click', removeMenu);
      };
      setTimeout(() => {
        document.addEventListener('click', removeMenu);
      }, 0);
    },
    [onDirectionChange]
  );
  
  // Apply layout
  const applyLayout = useCallback((layoutType: LayoutType) => {
    const updatedNodes = nodes.map((node, index) => {
      const newPosition = calculatePosition(index, nodes.length, layoutType);
      nodePositions.current.set(node.id, newPosition);
      return {
        ...node,
        position: newPosition,
      };
    });
    setNodes(updatedNodes);
    
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 100);
  }, [nodes, reactFlowInstance]);

  // Change layout
  const changeLayout = useCallback((layoutType: LayoutType) => {
    setCurrentLayout(layoutType);
    applyLayout(layoutType);
  }, [applyLayout]);
  
  return (
    <div className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onNodeContextMenu={handleNodeContextMenu}
        nodeTypes={nodeTypes}
        // Minimal features to reduce bugs
        fitView={false}
        attributionPosition="bottom-left"
        minZoom={0.5}
        maxZoom={2}
        snapGrid={[15, 15]}
        snapToGrid={false}
        nodesDraggable={true}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        panOnDrag={true}
        panOnScroll={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        // Disable all automatic behaviors
        autoPanOnConnect={false}
        autoPanOnNodeDrag={false}
        connectOnClick={false}
        disableKeyboardA11y={true}
        deleteKeyCode={null}
        nodeOrigin={[0, 0]}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background variant={BackgroundVariant.Cross} gap={25} size={0.5} color="#e2e8f0" />
        <Controls position="bottom-right" />
        
        {/* Professional Layout Controls */}
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}>
          {!showControls ? (
            <button
              onClick={() => setShowControls(true)}
              style={{
                padding: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#6b7280',
              }}
              title="Show layout controls"
            >
              ⚙️
            </button>
          ) : (
            <div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '8px' 
              }}>
                <h3 style={{ 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: '#1f2937',
                  margin: 0 
                }}>
                  Layout Controls
                </h3>
                <button
                  onClick={() => setShowControls(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#6b7280',
                    padding: '2px',
                  }}
                >
                  ✕
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { type: 'grid' as LayoutType, label: '📊 Grid', desc: 'Square grid layout' },
                  { type: 'hierarchical' as LayoutType, label: '📈 Hierarchical', desc: 'Layered structure' },
                  { type: 'radial' as LayoutType, label: '⭐ Radial', desc: 'Center-out layout' },
                  { type: 'circular' as LayoutType, label: '🔄 Circular', desc: 'Circular arrangement' },
                ].map(({ type, label, desc }) => (
                  <button
                    key={type}
                    onClick={() => changeLayout(type)}
                    style={{
                      padding: '8px 12px',
                      background: currentLayout === type ? '#3b82f6' : '#f8fafc',
                      color: currentLayout === type ? 'white' : '#374151',
                      border: `1px solid ${currentLayout === type ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: '140px',
                    }}
                    onMouseEnter={(e) => {
                      if (currentLayout !== type) {
                        e.currentTarget.style.background = '#f1f5f9';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentLayout !== type) {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }
                    }}
                  >
                    <span>{label}</span>
                    <span style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                      {desc}
                    </span>
                  </button>
                ))}
                
                <div style={{ 
                  borderTop: '1px solid #e5e7eb', 
                  paddingTop: '6px', 
                  marginTop: '6px' 
                }}>
                  <button
                    onClick={() => reactFlowInstance.fitView({ padding: 0.2 })}
                    style={{
                      padding: '6px 12px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                      width: '100%',
                    }}
                  >
                    🎯 Center View
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ReactFlow>
    </div>
  );
};

export const ControlledTopology: React.FC<ControlledTopologyProps> = (props) => {
  return (
    <ReactFlowProvider>
      <ControlledTopologyInner {...props} />
    </ReactFlowProvider>
  );
};

export default ControlledTopology;