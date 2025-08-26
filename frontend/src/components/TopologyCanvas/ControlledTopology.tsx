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

// Professional device node with consistent sizing
const ProfessionalDeviceNode = React.memo(({ data }: { data: any }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  
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

  // Truncate long names
  const truncateName = (name: string, maxLength: number = 12) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={isHovered ? `${data.label}${data.ip ? ` (${data.ip})` : ''}` : ''}
      style={{
        padding: '14px 18px',
        borderRadius: '10px',
        background: '#ffffff',
        border: `3px solid ${getStatusColor()}`,
        fontSize: '12px',
        fontWeight: 500,
        textAlign: 'center',
        position: 'relative',
        userSelect: 'none',
        // FIXED CONSISTENT SIZE
        width: '160px',
        height: '100px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: isHovered 
          ? '0 8px 25px rgba(0,0,0,0.2)' 
          : '0 4px 12px rgba(0,0,0,0.15)',
        cursor: 'grab',
        transition: 'all 0.2s ease-in-out',
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        // Ensure solid background
        backdropFilter: 'blur(0px)',
        opacity: 1,
        zIndex: isHovered ? 10 : 1,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ 
          background: getStatusColor(), 
          width: 10, 
          height: 10,
          border: '2px solid #ffffff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      />
      
      {/* Device icon */}
      <div style={{ 
        fontSize: '22px', 
        marginBottom: '8px',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
        lineHeight: 1,
      }}>
        {getDeviceIcon()}
      </div>
      
      {/* Device name - TRUNCATED */}
      <div style={{ 
        color: '#000000 !important', 
        fontWeight: 800, 
        marginBottom: '4px',
        textShadow: 'none',
        fontSize: '13px',
        lineHeight: '15px',
        // Force text to be visible
        WebkitTextFillColor: '#000000',
        textRendering: 'optimizeLegibility',
        // Ensure text fits in fixed width
        maxWidth: '130px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {truncateName(data.label || 'Device', 15)}
      </div>
      
      {/* IP address - TRUNCATED */}
      {data.ip && (
        <div style={{ 
          fontSize: '11px', 
          color: '#1f2937 !important',
          fontWeight: 600,
          textShadow: 'none',
          lineHeight: '13px',
          // Force text to be visible
          WebkitTextFillColor: '#1f2937',
          textRendering: 'optimizeLegibility',
          // Ensure IP fits
          maxWidth: '130px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {data.ip}
        </div>
      )}
      
      {/* Status indicator */}
      <div
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: getStatusColor(),
          border: '3px solid #ffffff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ 
          background: getStatusColor(), 
          width: 10, 
          height: 10,
          border: '2px solid #ffffff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  );
});

ProfessionalDeviceNode.displayName = 'ProfessionalDeviceNode';

const nodeTypes = { device: ProfessionalDeviceNode };

// Layout algorithms
type LayoutType = 'grid' | 'hierarchical' | 'radial' | 'circular';

// Smart placement that finds empty space on canvas
const findEmptyPosition = (
  existingPositions: Map<string, XYPosition>,
  existingEdges: Edge[],
  minDistance: number = 400
): XYPosition => {
  if (existingPositions.size === 0) {
    return { x: 400, y: 300 };
  }

  // Find all connected groups
  const groups: Set<Set<string>> = new Set();
  const nodeToGroup = new Map<string, Set<string>>();
  
  // Build groups from edges
  existingEdges.forEach(edge => {
    let sourceGroup = nodeToGroup.get(edge.source);
    let targetGroup = nodeToGroup.get(edge.target);
    
    if (sourceGroup && targetGroup && sourceGroup !== targetGroup) {
      // Merge groups
      targetGroup.forEach(node => {
        sourceGroup!.add(node);
        nodeToGroup.set(node, sourceGroup!);
      });
      groups.delete(targetGroup);
    } else if (sourceGroup) {
      sourceGroup.add(edge.target);
      nodeToGroup.set(edge.target, sourceGroup);
    } else if (targetGroup) {
      targetGroup.add(edge.source);
      nodeToGroup.set(edge.source, targetGroup);
    } else {
      // Create new group
      const newGroup = new Set([edge.source, edge.target]);
      groups.add(newGroup);
      nodeToGroup.set(edge.source, newGroup);
      nodeToGroup.set(edge.target, newGroup);
    }
  });
  
  // Add ungrouped nodes as individual groups
  existingPositions.forEach((_, nodeId) => {
    if (!nodeToGroup.has(nodeId)) {
      const singleGroup = new Set([nodeId]);
      groups.add(singleGroup);
      nodeToGroup.set(nodeId, singleGroup);
    }
  });

  // Find bounding boxes for each group
  const groupBounds: { minX: number; maxX: number; minY: number; maxY: number; }[] = [];
  groups.forEach(group => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    group.forEach(nodeId => {
      const pos = existingPositions.get(nodeId);
      if (pos) {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
      }
    });
    
    if (minX !== Infinity) {
      groupBounds.push({
        minX: minX - minDistance/2,
        maxX: maxX + minDistance/2,
        minY: minY - minDistance/2,
        maxY: maxY + minDistance/2,
      });
    }
  });

  // Find a position that doesn't overlap with any group
  const canvasWidth = 2000;
  const canvasHeight = 1500;
  const stepSize = 100;
  
  // Try positions in a spiral pattern from center
  for (let distance = 0; distance < Math.max(canvasWidth, canvasHeight); distance += stepSize) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      const x = 600 + distance * Math.cos(angle);
      const y = 400 + distance * Math.sin(angle);
      
      // Check if this position is far enough from all groups
      const isFarEnough = groupBounds.every(bounds => 
        x < bounds.minX || x > bounds.maxX ||
        y < bounds.minY || y > bounds.maxY
      );
      
      if (isFarEnough && x > 100 && x < canvasWidth && y > 100 && y < canvasHeight) {
        return { x: Math.round(x), y: Math.round(y) };
      }
    }
  }
  
  // Fallback: place to the right of everything
  const maxX = Math.max(...Array.from(existingPositions.values()).map(p => p.x));
  return { x: maxX + minDistance, y: 300 };
};

const calculatePosition = (index: number, total: number, layoutType: LayoutType): XYPosition => {
  const SPACING_X = 280; // Normal spacing for connected devices
  const SPACING_Y = 200; // Normal spacing for connected devices
  const START_X = 250;
  const START_Y = 200;

  switch (layoutType) {
    case 'grid':
      // Perfect square grid
      const columns = Math.ceil(Math.sqrt(total));
      const col = index % columns;
      const row = Math.floor(index / columns);
      return {
        x: START_X + (col * SPACING_X),
        y: START_Y + (row * SPACING_Y),
      };

    case 'hierarchical':
      // True hierarchical: fewer items per level, more levels
      const maxPerLevel = Math.max(2, Math.ceil(total / 3)); // Max 2-3 items per level
      const level = Math.floor(index / maxPerLevel);
      const posInLevel = index % maxPerLevel;
      const levelWidth = Math.min(maxPerLevel, total - (level * maxPerLevel));
      const levelStartX = START_X + ((maxPerLevel - levelWidth) * SPACING_X) / 2; // Center the level
      return {
        x: levelStartX + (posInLevel * SPACING_X),
        y: START_Y + (level * (SPACING_Y + 50)), // Extra vertical spacing
      };

    case 'radial':
      if (total === 1) {
        return { x: 500, y: 400 };
      }
      if (index === 0) {
        return { x: 500, y: 400 }; // Center
      }
      const angle = ((index - 1) * 2 * Math.PI) / (total - 1);
      const radius = Math.max(250, total * 25); // Normal radius for connected devices
      return {
        x: 500 + radius * Math.cos(angle),
        y: 400 + radius * Math.sin(angle),
      };

    case 'circular':
      const circleAngle = (index * 2 * Math.PI) / total;
      const circleRadius = Math.max(200, total * 30); // Normal circle for connected devices
      return {
        x: 500 + circleRadius * Math.cos(circleAngle),
        y: 400 + circleRadius * Math.sin(circleAngle),
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
  
  // Track which devices are newly added (need relationship loading)
  const previousDeviceIds = useRef<Set<string>>(new Set());
  const newlyAddedDevices = useRef<Set<string>>(new Set());
  
  // Auto-load relationships for newly added devices
  useEffect(() => {
    const currentDeviceIds = new Set(devices.map(d => d.id));
    const newDevices: Device[] = [];
    
    devices.forEach(device => {
      if (!previousDeviceIds.current.has(device.id)) {
        newDevices.push(device);
        newlyAddedDevices.current.add(device.id);
      }
    });
    
    // Auto-load relationships for new devices with 'children' direction
    if (newDevices.length > 0 && onDirectionChange) {
      console.log('🔄 Auto-loading relationships for newly added devices:', newDevices.map(d => d.name));
      newDevices.forEach(device => {
        // Trigger relationship loading for each new device (default: children)
        setTimeout(() => {
          onDirectionChange(device.id, 'children');
        }, 100);
      });
    }
    
    previousDeviceIds.current = currentDeviceIds;
  }, [devices, onDirectionChange]);
  
  // Build nodes and edges from props
  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const processedIds = new Set<string>();
    
    // First, build edges to understand connections
    if (topologyData) {
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
    
    // Group devices by their relationship clusters
    const deviceGroups = new Map<string, Set<string>>(); // root device -> related devices
    
    // Process each device and its relationships
    devices.forEach((device, index) => {
      if (!processedIds.has(device.id)) {
        // Get existing position or calculate new one
        let position = nodePositions.current.get(device.id);
        
        if (!position) {
          // Check if this device belongs to a relationship group
          const relatedDevices = new Set<string>();
          const isRootDevice = newlyAddedDevices.current.has(device.id);
          
          // Find all devices connected to this one
          if (topologyData) {
            topologyData.edges.forEach(edge => {
              if (edge.source === device.id) {
                relatedDevices.add(edge.target);
              } else if (edge.target === device.id) {
                relatedDevices.add(edge.source);
              }
            });
          }
          
          if (isRootDevice && relatedDevices.size > 0) {
            // This is a newly added device with relationships - use radial layout
            // First, find empty position for the whole group
            const groupCenter = findEmptyPosition(nodePositions.current, [], 500);
            position = groupCenter;
            deviceGroups.set(device.id, relatedDevices);
          } else if (relatedDevices.size > 0) {
            // This device is part of a relationship - will be positioned later
            position = null;
          } else {
            // Standalone device - find empty position
            position = findEmptyPosition(nodePositions.current, newEdges);
          }
          
          if (position) {
            nodePositions.current.set(device.id, position);
          }
        }
        
        if (position) {
          newNodes.push({
            id: device.id,
            type: 'device',
            position: { ...position },
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
      }
    });
    
    // Process topology data nodes with radial layout around their root devices
    if (topologyData) {
      topologyData.nodes.forEach((node, nodeIndex) => {
        if (!processedIds.has(node.id)) {
          let position = nodePositions.current.get(node.id);
          
          if (!position) {
            // Find which root device this node belongs to
            let rootDevice: string | null = null;
            let rootPosition: XYPosition | null = null;
            
            deviceGroups.forEach((relatedSet, rootId) => {
              if (relatedSet.has(node.id)) {
                rootDevice = rootId;
                rootPosition = nodePositions.current.get(rootId) || null;
              }
            });
            
            if (!rootPosition) {
              // Check if this node is connected to any device
              const connectedEdge = newEdges.find(edge => 
                edge.source === node.id || edge.target === node.id
              );
              
              if (connectedEdge) {
                const connectedId = connectedEdge.source === node.id ? connectedEdge.target : connectedEdge.source;
                rootPosition = nodePositions.current.get(connectedId);
                rootDevice = connectedId;
              }
            }
            
            if (rootPosition && rootDevice) {
              // Get all related nodes for proper radial layout
              const relatedToRoot = new Set<string>();
              newEdges.forEach(edge => {
                if (edge.source === rootDevice) {
                  relatedToRoot.add(edge.target);
                } else if (edge.target === rootDevice) {
                  relatedToRoot.add(edge.source);
                }
              });
              
              const relatedCount = relatedToRoot.size;
              const relatedArray = Array.from(relatedToRoot);
              const relatedIndex = relatedArray.indexOf(node.id);
              
              if (relatedIndex !== -1) {
                // Radial layout around root device - evenly distributed
                const angle = (relatedIndex * 2 * Math.PI) / relatedCount;
                const radius = Math.min(250, Math.max(180, relatedCount * 25)); // Dynamic radius based on count
                
                position = {
                  x: rootPosition.x + radius * Math.cos(angle),
                  y: rootPosition.y + radius * Math.sin(angle),
                };
              } else {
                // Fallback - find empty position
                position = findEmptyPosition(nodePositions.current, newEdges);
              }
            } else {
              // Fallback - find empty position
              position = findEmptyPosition(nodePositions.current, newEdges);
            }
            
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
    }
    
    // Only update if there are actual changes
    setNodes(newNodes);
    setEdges(newEdges);
    
    
    // Auto-fit view only when there are newly added devices (not just topology updates)
    if (newlyAddedDevices.current.size > 0 && reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({ 
          padding: 0.25, 
          duration: 1000,
          maxZoom: 1.2,
          minZoom: 0.1 
        });
        // Clear newly added devices after auto-zoom
        newlyAddedDevices.current.clear();
      }, 200);
    }
    
  }, [devices, topologyData, currentLayout, reactFlowInstance]);
  
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
  
  // Optimized node changes - only handle position updates
  const handleNodesChange = useCallback((changes: any[]) => {
    // Only handle position changes for better performance
    const positionChanges = changes.filter(change => 
      change.type === 'position' && change.dragging
    );
    
    if (positionChanges.length === 0) return;
    
    // Update positions directly
    setNodes(prevNodes => 
      prevNodes.map(node => {
        const change = positionChanges.find(c => c.id === node.id);
        if (change && change.position) {
          const roundedPos = {
            x: Math.round(change.position.x),
            y: Math.round(change.position.y),
          };
          nodePositions.current.set(node.id, roundedPos);
          return { ...node, position: roundedPos };
        }
        return node;
      })
    );
  }, [setNodes]);
  
  const handleEdgesChange = useCallback(() => {
    // Do nothing for edges - we control them manually
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
        background: #ffffff;
        border: 2px solid #3b82f6;
        border-radius: 8px;
        padding: 8px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        z-index: 10000;
        backdrop-filter: blur(10px);
        min-width: 200px;
      `;
      
      const options = [
        { label: '↑ Parents', dir: 'parents' as const },
        { label: '↓ Children', dir: 'children' as const },
        { label: '↕ Both', dir: 'both' as const },
      ];
      
      // Add title
      const title = document.createElement('div');
      title.textContent = `${node.data.label} - Load Relationships`;
      title.style.cssText = `
        font-weight: 700;
        font-size: 14px;
        color: #1f2937;
        padding: 8px 12px 4px 12px;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 4px;
        text-align: center;
      `;
      newMenu.appendChild(title);
      
      options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.textContent = opt.label;
        btn.style.cssText = `
          display: block;
          width: 100%;
          padding: 10px 16px;
          text-align: left;
          border: 1px solid transparent;
          background: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          border-radius: 6px;
          margin: 2px 0;
          transition: all 0.2s ease;
        `;
        btn.onmouseover = () => {
          btn.style.background = '#3b82f6';
          btn.style.color = '#ffffff';
          btn.style.borderColor = '#2563eb';
          btn.style.transform = 'scale(1.02)';
        };
        btn.onmouseout = () => {
          btn.style.background = 'none';
          btn.style.color = '#1f2937';
          btn.style.borderColor = 'transparent';
          btn.style.transform = 'scale(1)';
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
        <Background 
          variant={BackgroundVariant.Cross} 
          gap={30} 
          size={0.3} 
          color="transparent"
          style={{ opacity: 0 }}
        />
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