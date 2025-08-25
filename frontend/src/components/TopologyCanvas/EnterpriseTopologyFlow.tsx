import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  ConnectionLineType,
  MarkerType,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Device, TopologyNode, TopologyEdge } from '../../services/api';

interface TopologyFlowProps {
  devices?: Device[];
  selectedDevices?: Device[];
  topologyData?: {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
  };
  onDeviceClick?: (device: Device) => void;
  onRemoveDevice?: (deviceId: string) => void;
  onClearAll?: () => void;
  deviceDirections?: Map<string, 'parents' | 'children' | 'both'>;
  onDirectionChange?: (direction: 'parents' | 'children' | 'both', deviceId?: string) => void;
  onAddDeviceToSelection?: (device: Device) => void;
  className?: string;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId?: string;
  nodeName?: string;
}

// Enhanced edge styling based on relationship type/importance
const getEdgeStyle = (sourceType?: string, targetType?: string) => {
  // Could be enhanced with actual relationship types from SL1
  const baseStyle = {
    stroke: '#3B82F6',
    strokeWidth: 2,
    strokeOpacity: 0.8,
  };

  // Add visual hierarchy based on device types
  if (sourceType?.toLowerCase().includes('router') || targetType?.toLowerCase().includes('router')) {
    return {
      ...baseStyle,
      stroke: '#EF4444', // Red for router connections
      strokeWidth: 2.5,
    };
  }
  
  if (sourceType?.toLowerCase().includes('server') || targetType?.toLowerCase().includes('server')) {
    return {
      ...baseStyle,
      stroke: '#10B981', // Green for server connections
    };
  }

  return baseStyle;
};

// Professional device icons (more compact)
const getDeviceIcon = (type: string, deviceName: string) => {
  const name = deviceName.toLowerCase();
  const typeStr = type.toLowerCase();
  
  if (name.includes('kubernetes') || name.includes('k8s')) return '☸️';
  if (name.includes('docker')) return '🐳';
  if (name.includes('office') || name.includes('building')) return '🏢';
  if (name.includes('pam') || name.includes('auth')) return '🔐';
  if (name.includes('router') || typeStr.includes('router')) return '📡';
  if (name.includes('switch') || typeStr.includes('switch')) return '🔌';
  if (name.includes('firewall')) return '🛡️';
  if (name.includes('load') || name.includes('balance')) return '⚖️';
  if (name.includes('worker')) return '⚙️';
  if (name.includes('server') || typeStr.includes('server')) return '🖥️';
  if (name.includes('cluster')) return '🔷';
  if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) return '🌐';
  return '💻';
};

// Status colors
const getStatusColors = (status: string = 'unknown') => {
  switch (status) {
    case 'online': return { bg: '#10B981', shadow: '0 0 8px rgba(16, 185, 129, 0.4)' };
    case 'offline': return { bg: '#EF4444', shadow: '0 0 8px rgba(239, 68, 68, 0.4)' };
    case 'warning': return { bg: '#F59E0B', shadow: '0 0 8px rgba(245, 158, 11, 0.4)' };
    default: return { bg: '#6B7280', shadow: '0 0 8px rgba(107, 114, 128, 0.3)' };
  }
};

// Simple Device Node - no removal controls needed
const ProfessionalDeviceNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  const { label, type, status, direction } = data;
  const icon = getDeviceIcon(type || '', label);
  const colors = getStatusColors(status);
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ 
          background: '#3B82F6', 
          width: 8, 
          height: 8, 
          borderRadius: '50%',
          border: '1px solid white',
        }}
      />
      
      <div
        className="relative flex flex-col items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          minWidth: '80px',
          maxWidth: '90px',
          background: '#F8FAFC',
          border: selected 
            ? '2px solid #3B82F6' 
            : '1px solid #CBD5E0',
          borderRadius: '8px',
          padding: '6px',
          boxShadow: selected 
            ? '0 0 15px rgba(59, 130, 246, 0.5)' 
            : isHovered ? colors.shadow : '0 2px 4px rgba(0,0,0,0.05)',
          cursor: 'grab',
          // Remove transform to prevent blurriness
          // transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          // Use outline for hover effect instead
          outline: isHovered ? '2px solid rgba(59, 130, 246, 0.3)' : 'none',
          outlineOffset: '2px',
          // Disable transition to prevent flickering
          // transition: 'all 0.2s ease',
          // Force GPU acceleration and prevent blurriness
          willChange: 'auto',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
        }}
      >
        {/* No removal controls - selection manages topology */}
        
        {/* Status dot */}
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
          style={{ background: colors.bg }}
        />
        
        {/* Direction indicator */}
        {direction && (
          <div
            className="absolute -top-1 -left-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white text-xs"
            title={`Showing ${direction === 'parents' ? 'parent(s)' : direction === 'children' ? 'child(ren)' : 'both'}`}
          >
            {direction === 'parents' && '👆'}
            {direction === 'children' && '👇'}  
            {direction === 'both' && '↕️'}
          </div>
        )}
        
        {/* Device icon */}
        <div className="text-lg mb-1">{icon}</div>
        
        {/* Device name */}
        <div 
          className="text-[10px] font-semibold text-center text-gray-800 leading-tight"
          style={{ 
            wordBreak: 'break-word',
            hyphens: 'auto',
            maxWidth: '100%',
            // Improve text rendering
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          }}
        >
          {label}
        </div>
        
        {/* Device type (on hover) */}
        {isHovered && type && (
          <div className="text-[10px] text-gray-500 text-center mt-1 truncate max-w-full">
            {type}
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ 
          background: '#3B82F6', 
          width: 8, 
          height: 8, 
          borderRadius: '50%',
          border: '1px solid white',
        }}
      />
    </>
  );
};

// Layout algorithms
const applyHierarchicalLayout = (nodes: Node[], edges: Edge[]) => {
  // Find root nodes (no incoming edges)
  const hasIncomingEdge = new Set(edges.map(e => e.target));
  const rootNodes = nodes.filter(n => !hasIncomingEdge.has(n.id));
  
  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  edges.forEach(edge => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge.target);
  });
  
  // Level-based positioning
  const levels = new Map<string, number>();
  const visited = new Set<string>();
  
  const assignLevel = (nodeId: string, level: number) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    levels.set(nodeId, Math.max(levels.get(nodeId) || 0, level));
    
    const children = adjacency.get(nodeId) || [];
    children.forEach(child => assignLevel(child, level + 1));
  };
  
  rootNodes.forEach(node => assignLevel(node.id, 0));
  
  // Position nodes by level
  const levelGroups = new Map<number, Node[]>();
  nodes.forEach(node => {
    const level = levels.get(node.id) || 0;
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(node);
  });
  
  let yPos = 100;
  const levelHeight = 120;
  
  levelGroups.forEach((levelNodes, _level) => {
    const totalWidth = levelNodes.length * 120;
    const startX = Math.max(100, (800 - totalWidth) / 2);
    
    levelNodes.forEach((node, index) => {
      node.position = {
        x: startX + (index * 120),
        y: yPos
      };
    });
    yPos += levelHeight;
  });
  
  return nodes;
};

const applyRadialLayout = (nodes: Node[], edges: Edge[]) => {
  if (nodes.length === 0) return nodes;
  
  // Find central node (most connections)
  const connectionCount = new Map<string, number>();
  edges.forEach(edge => {
    connectionCount.set(edge.source, (connectionCount.get(edge.source) || 0) + 1);
    connectionCount.set(edge.target, (connectionCount.get(edge.target) || 0) + 1);
  });
  
  const centralNode = nodes.reduce((max, node) => 
    (connectionCount.get(node.id) || 0) > (connectionCount.get(max.id) || 0) ? node : max
  );
  
  // Place central node at center
  centralNode.position = { x: 400, y: 300 };
  
  // Place other nodes in concentric circles
  const otherNodes = nodes.filter(n => n.id !== centralNode.id);
  const radius = 200;
  const angleStep = (2 * Math.PI) / Math.max(otherNodes.length, 1);
  
  otherNodes.forEach((node, index) => {
    const angle = index * angleStep;
    node.position = {
      x: 400 + radius * Math.cos(angle),
      y: 300 + radius * Math.sin(angle)
    };
  });
  
  return nodes;
};

const applyGridLayout = (nodes: Node[]) => {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const cellSize = 100;
  
  nodes.forEach((node, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    node.position = {
      x: 100 + col * cellSize,
      y: 100 + row * cellSize
    };
  });
  
  return nodes;
};

// Main component
const EnterpriseTopologyFlowInner: React.FC<TopologyFlowProps> = ({
  devices = [],
  selectedDevices = [],
  topologyData,
  onDeviceClick,
  onRemoveDevice,
  onClearAll,
  deviceDirections = new Map(),
  onDirectionChange,
  onAddDeviceToSelection,
  className = '',
}) => {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, originalOnEdgesChange] = useEdgesState<Edge>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
  });
  
  // Custom edge change handler with phantom detection
  const onEdgesChange = useCallback((changes: any) => {
    console.log('🔗 Edge changes detected:', changes);
    
    // Allow the original changes
    originalOnEdgesChange(changes);
    
    // After changes, validate for phantoms
    setTimeout(() => {
      setEdges(currentEdges => {
        const nodeIds = new Set(nodes.map(n => n.id));
        const validEdges = currentEdges.filter(edge => 
          nodeIds.has(edge.source) && nodeIds.has(edge.target)
        );
        
        if (validEdges.length !== currentEdges.length) {
          console.log('🧹 Cleaning phantom edges in onEdgesChange:', {
            before: currentEdges.length,
            after: validEdges.length,
            removed: currentEdges.length - validEdges.length
          });
        }
        
        return validEdges;
      });
    }, 0);
  }, [originalOnEdgesChange, nodes, setEdges]);
  const [currentLayout, setCurrentLayout] = useState<string>('hierarchical');
  const [preservePositions, setPreservePositions] = useState<boolean>(false);
  const [savedPositions, setSavedPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [manualLayoutLocked, setManualLayoutLocked] = useState<boolean>(false);
  const [edgeType, setEdgeType] = useState<string>('bezier');
  
  const nodeTypes = useMemo(() => ({
    professional: ProfessionalDeviceNode,
  }), []);

  // Save node positions when they change
  useEffect(() => {
    const positions = new Map<string, { x: number; y: number }>();
    nodes.forEach(node => {
      positions.set(node.id, { ...node.position });
    });
    setSavedPositions(positions);
  }, [nodes]);

  // Clear nodes and edges when topology data is cleared
  useEffect(() => {
    console.log('🔄 TopologyFlow effect triggered:', { 
      topologyData: !!topologyData, 
      devicesLength: devices.length,
      topologyNodes: topologyData?.nodes?.length || 0,
      topologyEdges: topologyData?.edges?.length || 0,
      deviceNames: devices.map(d => d.name),
      edgeType: edgeType,
      currentLayout: currentLayout
    });
    
    // CRITICAL: Always clear edges at the start to prevent phantom connections
    console.log('🧹 PHANTOM PREVENTION: Clearing all edges at start of topology effect');
    setEdges([]);
    
    if (!topologyData && devices.length === 0) {
      console.log('🧹 Clearing all nodes and edges (no topology data)');
      setNodes([]);
      setPreservePositions(false);
      setSavedPositions(new Map());
      setManualLayoutLocked(false);
      return;
    }
    
    if (!topologyData) {
      console.log('🧹 No topology data but have devices - clearing edges only');
      return;
    }
    
    let flowNodes: Node[] = [];
    let flowEdges: Edge[] = [];

    if (topologyData && topologyData.nodes.length > 0) {
      console.log('🔍 Processing topology data with', topologyData.nodes.length, 'nodes and', topologyData.edges.length, 'edges');
      
      // Create nodes from topology data - preserve existing positions
      const existingNodes = new Map(nodes.map(n => [n.id, n]));
      
      flowNodes = topologyData.nodes.map((node) => {
        const nodeLabel = node.label || String(node.id);
        const existingNode = existingNodes.get(nodeLabel);
        
        return {
          id: nodeLabel,
          type: 'professional',
          // Preserve existing position if node exists, otherwise use default
          position: existingNode ? existingNode.position : { x: 0, y: 0 },
          draggable: true,
          data: { 
            label: nodeLabel,
            type: node.type,
            status: 'online',
            direction: deviceDirections.get(node.id) || 'children',
          },
        };
      });

      // Create edges if they exist - with enhanced filtering
      if (topologyData.edges && topologyData.edges.length > 0) {
        // Get all valid node IDs for edge validation
        const validNodeIds = new Set(topologyData.nodes.map(n => n.id));
        const validNodeLabels = new Set(topologyData.nodes.map(n => n.label || String(n.id)));
        
        console.log('🔗 Validating edges against nodes:', {
          totalEdges: topologyData.edges.length,
          validNodeIds: Array.from(validNodeIds),
          validNodeLabels: Array.from(validNodeLabels)
        });
        
        flowEdges = topologyData.edges
          .filter((edge) => {
            const sourceNode = topologyData.nodes.find(n => n.id === edge.source);
            const targetNode = topologyData.nodes.find(n => n.id === edge.target);
            
            // Enhanced validation: both nodes must exist in current topology data
            const isValid = sourceNode && targetNode && 
                           validNodeIds.has(edge.source) && 
                           validNodeIds.has(edge.target);
            
            if (!isValid) {
              console.log('🚫 Filtering out invalid edge:', {
                edge: `${edge.source} → ${edge.target}`,
                sourceExists: !!sourceNode,
                targetExists: !!targetNode,
                sourceInSet: validNodeIds.has(edge.source),
                targetInSet: validNodeIds.has(edge.target)
              });
            }
            
            return isValid;
          })
          .map((edge) => {
            const sourceNode = topologyData.nodes.find(n => n.id === edge.source)!;
            const targetNode = topologyData.nodes.find(n => n.id === edge.target)!;
            const sourceId = sourceNode.label || String(edge.source);
            const targetId = targetNode.label || String(edge.target);
            
            // Double-check that both nodes exist in the flowNodes we're creating
            const sourceFlowNode = flowNodes.find(n => n.id === sourceId);
            const targetFlowNode = flowNodes.find(n => n.id === targetId);
            
            if (!sourceFlowNode || !targetFlowNode) {
              console.warn('⚠️ Edge references non-existent flow node:', {
                edge: `${sourceId} → ${targetId}`,
                sourceNodeExists: !!sourceFlowNode,
                targetNodeExists: !!targetFlowNode
              });
            }
            
            const edgeStyle = getEdgeStyle(sourceNode.type, targetNode.type);
            
            return {
              id: `${sourceId}-${targetId}`,
              source: sourceId,
              target: targetId,
              type: edgeType, // Dynamic edge type
              animated: false,
              style: edgeStyle,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 14,
                height: 14,
                color: edgeStyle.stroke,
              },
              // Improve interaction
              interactionWidth: 10, // Wider invisible clickable area
            };
          });
      } else {
        flowEdges = [];
      }
    } else if (devices.length > 0) {
      // Fallback for device list - simple nodes
      console.log('📍 Showing devices without topology data');
      flowNodes = devices.map((device) => ({
        id: device.id,
        type: 'professional',
        position: { x: 0, y: 0 },
        draggable: true,
        data: { 
          label: device.name,
          type: device.type,
          status: device.status,
          direction: deviceDirections.get(device.id) || 'children',
        },
      }));
      
      flowEdges = []; // Ensure no edges for device-only view
      
      // Explicitly clear any existing edges to prevent phantom connections
      console.log('🧹 Explicitly clearing edges for devices-only view');
      setEdges([]);
    }

    if (flowNodes.length > 0) {
      // Apply layout with incremental positioning
      let layoutedNodes = [...flowNodes];
      
      // Identify existing vs new nodes
      const existingNodeIds = new Set(nodes.map(n => n.id));
      const newNodeIds = flowNodes.filter(n => !existingNodeIds.has(n.id)).map(n => n.id);
      const hasNewNodes = newNodeIds.length > 0;
      const shouldPreservePositions = nodes.length > 0; // If we have existing nodes, preserve their positions
      
      console.log('📍 Layout analysis:', {
        totalNodes: flowNodes.length,
        existingNodes: existingNodeIds.size,
        newNodes: newNodeIds.length,
        shouldPreservePositions,
        preservePositions,
        manualLayoutLocked
      });
      
      if (shouldPreservePositions && !manualLayoutLocked && hasNewNodes && existingNodeIds.size > 0) {
        console.log('🔒 INCREMENTAL LAYOUT: Preserving existing positions, positioning new nodes');
        
        // For existing nodes: keep their current positions from React Flow state
        layoutedNodes = layoutedNodes.map(node => {
          const existingNode = nodes.find(n => n.id === node.id);
          if (existingNode) {
            // Preserve position from current React Flow state
            return { ...node, position: existingNode.position };
          }
          // New nodes keep default position for now
          return node;
        });
        
        // Position only new nodes intelligently
        if (hasNewNodes) {
          const newNodes = layoutedNodes.filter(n => newNodeIds.includes(n.id));
          const existingPositions = nodes.map(n => n.position);
          
          if (existingPositions.length > 0) {
            // Calculate smart positioning for new nodes
            const maxX = Math.max(...existingPositions.map(p => p.x), 200);
            const avgY = existingPositions.reduce((sum, p) => sum + p.y, 0) / existingPositions.length;
            
            newNodes.forEach((node, index) => {
              const targetNode = layoutedNodes.find(n => n.id === node.id);
              if (targetNode) {
                // Place new nodes to the right of existing ones
                targetNode.position = {
                  x: maxX + 150 + (index % 3) * 120,
                  y: avgY + (Math.floor(index / 3) - 1) * 120
                };
              }
            });
          } else {
            // Fallback if no existing positions
            newNodes.forEach((node, index) => {
              const targetNode = layoutedNodes.find(n => n.id === node.id);
              if (targetNode) {
                targetNode.position = {
                  x: 100 + (index % 3) * 120,
                  y: 100 + Math.floor(index / 3) * 120
                };
              }
            });
          }
        }
      } else if (manualLayoutLocked) {
        console.log('🔒 MANUAL LAYOUT LOCKED: Preserving all positions');
        // Keep all existing positions when manual layout is locked
        layoutedNodes = layoutedNodes.map(node => {
          const savedPos = savedPositions.get(node.id);
          const existingNode = nodes.find(n => n.id === node.id);
          if (existingNode) {
            return { ...node, position: existingNode.position };
          } else if (savedPos) {
            return { ...node, position: savedPos };
          }
          return node;
        });
      } else {
        console.log('🎯 FULL LAYOUT: Applying algorithmic layout');
        // Apply full layout when not preserving or first load
        switch (currentLayout) {
          case 'hierarchical':
            layoutedNodes = applyHierarchicalLayout(layoutedNodes, flowEdges);
            break;
          case 'radial':
            layoutedNodes = applyRadialLayout(layoutedNodes, flowEdges);
            break;
          case 'grid':
            layoutedNodes = applyGridLayout(layoutedNodes);
            break;
          default:
            layoutedNodes = applyHierarchicalLayout(layoutedNodes, flowEdges);
        }
      }
      
      console.log('🎯 Setting nodes:', layoutedNodes.length, 'edges:', flowEdges.length);
      
      // AGGRESSIVE: Final validation with enhanced phantom edge prevention
      const nodeIds = new Set(layoutedNodes.map(n => n.id));
      console.log('🔍 PHANTOM PREVENTION: Final edge validation', {
        totalEdges: flowEdges.length,
        availableNodes: Array.from(nodeIds),
        edgeDetails: flowEdges.map(e => `${e.source}→${e.target}`)
      });
      
      const validatedEdges = flowEdges.filter(edge => {
        const sourceExists = nodeIds.has(edge.source);
        const targetExists = nodeIds.has(edge.target);
        const isValid = sourceExists && targetExists;
        
        if (!isValid) {
          console.error('🚫 PHANTOM EDGE REMOVED at final validation:', {
            edge: `${edge.source} → ${edge.target}`,
            sourceExists,
            targetExists,
            availableNodes: Array.from(nodeIds)
          });
        }
        return isValid;
      });
      
      if (validatedEdges.length !== flowEdges.length) {
        console.warn('🧹 PHANTOM CLEANUP: Removed', flowEdges.length - validatedEdges.length, 'phantom edges');
      }
      
      console.log('✅ Final edge count after phantom cleanup:', validatedEdges.length, 'vs original:', flowEdges.length);
      
      setNodes(layoutedNodes);
      setEdges(validatedEdges);
      
      // Enable position preservation after first layout
      if (!preservePositions && !manualLayoutLocked) {
        setPreservePositions(true);
      }
      
      // Log for debugging deletable state
      console.log('Node deletable states:', flowNodes.map(n => `${n.data.label}: ${n.deletable}`));
      
      // Fit view logic: initial load, layout changes, or manual layout unlock
      const isInitialLoad = nodes.length === 0;
      const isLayoutChangeOrUnlock = !shouldPreservePositions || manualLayoutLocked === false;
      const isIncrementalOnly = shouldPreservePositions && hasNewNodes && existingNodeIds.size > 0;
      
      if (isInitialLoad || (isLayoutChangeOrUnlock && !isIncrementalOnly)) {
        console.log('🎯 Fitting view (initial load or layout change)');
        setTimeout(() => {
          reactFlowInstance.fitView({ padding: 0.1, duration: 500 });
        }, 100);
      } else {
        console.log('🔒 PRESERVING VIEW: Skipping fitView for incremental update');
      }
    } else {
      // Clear everything when no nodes
      console.log('🧹 No nodes - clearing topology');
      setNodes([]);
      setEdges([]);
    }
  }, [topologyData, devices, currentLayout, edgeType, setNodes, setEdges, reactFlowInstance, onRemoveDevice]);

  // Additional phantom edge detection - watch for edges that shouldn't exist
  useEffect(() => {
    if (edges.length > 0 && nodes.length > 0) {
      const nodeIds = new Set(nodes.map(n => n.id));
      const phantomEdges = edges.filter(edge => 
        !nodeIds.has(edge.source) || !nodeIds.has(edge.target)
      );
      
      if (phantomEdges.length > 0) {
        console.error('🚨 PHANTOM EDGES DETECTED after state update:', {
          phantomEdges: phantomEdges.map(e => `${e.source} → ${e.target}`),
          totalEdges: edges.length,
          availableNodes: Array.from(nodeIds),
          timestamp: new Date().toISOString()
        });
        
        // Immediately remove phantom edges
        const cleanEdges = edges.filter(edge => 
          nodeIds.has(edge.source) && nodeIds.has(edge.target)
        );
        console.log('🧹 Removing phantom edges immediately:', cleanEdges.length, 'remaining');
        setEdges(cleanEdges);
      }
    }
  }, [edges, nodes, setEdges]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    console.log(`Clicked node: ${node.data.label}, deletable: ${node.deletable}`);
    // Hide context menu on regular click
    setContextMenu({ visible: false, x: 0, y: 0 });
    if (onDeviceClick) {
      const device: Device = {
        id: node.id,
        name: String(node.data.label || 'Unknown'),
        type: String(node.data.type || 'unknown'),
        status: (node.data.status || 'unknown') as Device['status'],
        ip: String(node.data.ip || 'N/A'),
      };
      onDeviceClick(device);
    }
  }, [onDeviceClick]);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      
      // Calculate position relative to the viewport
      const bounds = (event.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect();
      if (!bounds) return;
      
      setContextMenu({
        visible: true,
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        nodeId: node.id,
        nodeName: String(node.data.label || 'Unknown'),
      });
    },
    []
  );

  const onPaneClick = useCallback(() => {
    // Hide context menu when clicking on the pane
    setContextMenu({ visible: false, x: 0, y: 0 });
  }, []);

  const handleContextMenuAction = useCallback((direction: 'parents' | 'children' | 'both') => {
    if (!contextMenu.nodeId) return;
    
    // Find the device ID for the clicked node
    const topologyNode = topologyData?.nodes.find(n => n.label === contextMenu.nodeId);
    const deviceId = topologyNode?.id || contextMenu.nodeId;
    
    // Check if clicked device is already in selected devices (chip area)
    const isDeviceInChipArea = selectedDevices.some(d => d.name === contextMenu.nodeId);
    
    if (!isDeviceInChipArea && onAddDeviceToSelection) {
      // Device is NOT in chip area - need to add it first
      const clickedDevice: Device = {
        id: deviceId,
        name: contextMenu.nodeName || 'Unknown',
        type: topologyNode?.type || 'Unknown',
        status: (topologyNode?.status || 'unknown') as Device['status'],
        ip: topologyNode?.ip || 'N/A',
      };
      
      console.log('🎯 Adding device to selection and changing direction:', {
        device: clickedDevice.name,
        deviceId,
        direction,
        isInChipArea: isDeviceInChipArea
      });
      
      // Add to chip area first, then change direction will be triggered
      onAddDeviceToSelection(clickedDevice);
    }
    
    // Change direction for THIS SPECIFIC device only
    console.log('🎯 Changing direction for device:', deviceId, 'to:', direction);
    onDirectionChange?.(direction, deviceId);
    setContextMenu({ visible: false, x: 0, y: 0 });
  }, [contextMenu.nodeId, contextMenu.nodeName, selectedDevices, topologyData?.nodes, onAddDeviceToSelection, onDirectionChange]);

  // Export functions
  const exportAsPNG = useCallback(() => {
    // For now, use a simple screenshot approach
    // In production, you'd use a library like html2canvas or react-flow's toObject/toSvg
    
    // Create a temporary canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Export as PNG
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `topology-${new Date().toISOString().split('T')[0]}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    }
  }, [nodes]);

  const exportAsHTML = useCallback(() => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Network Topology - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { border-bottom: 2px solid #3B82F6; padding-bottom: 10px; margin-bottom: 20px; }
        .device { margin: 10px 0; padding: 10px; border: 1px solid #E5E7EB; border-radius: 8px; }
        .connections { margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Network Topology Report</h1>
        <p>Generated: ${new Date().toLocaleDateString()}</p>
        <p>Devices: ${nodes.length} | Connections: ${edges.length}</p>
    </div>
    
    <h2>Devices</h2>
    ${nodes.map(node => `
        <div class="device">
            <strong>${node.data.label}</strong><br>
            Type: ${node.data.type || 'Unknown'}<br>
            Status: ${node.data.status || 'Unknown'}
        </div>
    `).join('')}
    
    <div class="connections">
        <h2>Connections</h2>
        ${edges.map(edge => `
            <div>${edge.source} → ${edge.target}</div>
        `).join('')}
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `topology-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  return (
    <div className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.5}
        maxZoom={2}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        deleteKeyCode={null} // Disable default delete key to use custom removal only
        // Improve edge interaction and connection behavior
        connectionLineStyle={{ 
          strokeWidth: 2, 
          stroke: '#3B82F6', 
          strokeOpacity: 0.6 
        }}
        connectionLineType={ConnectionLineType.Bezier}
        panOnDrag={[1, 2]}
        selectionOnDrag={false}
        selectNodesOnDrag={false}
        defaultEdgeOptions={{
          type: edgeType as any,
          animated: false,
          style: {
            strokeWidth: 2,
            stroke: '#3B82F6',
            strokeOpacity: 0.8,
          },
        }}
        // Disable animations that can cause blur
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        preventScrolling={true}
        // Force pixel-perfect rendering
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#E2E8F0" />
        
        <Controls 
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          position="bottom-right"
        />
        
        {/* Context Menu */}
        {contextMenu.visible && (
          <div
            className="absolute bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              minWidth: '200px',
            }}
          >
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
              {contextMenu.nodeName}
            </div>
            <button
              onClick={() => handleContextMenuAction('parents')}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                (() => {
                  const topologyNode = topologyData?.nodes.find(n => n.label === contextMenu.nodeId);
                  const deviceId = topologyNode?.id || contextMenu.nodeId;
                  const deviceDirection = deviceDirections.get(deviceId) || 'children';
                  return deviceDirection === 'parents' ? 'bg-blue-100 text-blue-800' : '';
                })()
              }`}
            >
              👆 Show parent(s)
            </button>
            <button
              onClick={() => handleContextMenuAction('children')}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                (() => {
                  const topologyNode = topologyData?.nodes.find(n => n.label === contextMenu.nodeId);
                  const deviceId = topologyNode?.id || contextMenu.nodeId;
                  const deviceDirection = deviceDirections.get(deviceId) || 'children';
                  return deviceDirection === 'children' ? 'bg-blue-100 text-blue-800' : '';
                })()
              }`}
            >
              👇 Show child(ren)
            </button>
            <button
              onClick={() => handleContextMenuAction('both')}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                (() => {
                  const topologyNode = topologyData?.nodes.find(n => n.label === contextMenu.nodeId);
                  const deviceId = topologyNode?.id || contextMenu.nodeId;
                  const deviceDirection = deviceDirections.get(deviceId) || 'children';
                  return deviceDirection === 'both' ? 'bg-blue-100 text-blue-800' : '';
                })()
              }`}
            >
              ↕️ Show both
            </button>
            <div className="border-t border-gray-100 mt-2 pt-2">
              <button
                onClick={() => {
                  // Refresh topology for this device with its current direction
                  const topologyNode = topologyData?.nodes.find(n => n.label === contextMenu.nodeId);
                  const deviceId = topologyNode?.id || contextMenu.nodeId;
                  const deviceDirection = deviceDirections.get(deviceId) || 'children';
                  onDirectionChange?.(deviceDirection, deviceId);
                  setContextMenu({ visible: false, x: 0, y: 0 });
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                🔄 Refresh Relationships
              </button>
            </div>
          </div>
        )}
        
        <MiniMap 
          nodeColor={(node) => {
            const status = String(node.data?.status || 'unknown');
            const colors = getStatusColors(status);
            return colors.bg;
          }}
          nodeStrokeWidth={2}
          pannable
          zoomable
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
          }}
        />
        
        <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-3 space-y-2">
          <div className="text-xs font-semibold text-gray-700 mb-2">Layout</div>
          
          {['hierarchical', 'radial', 'grid'].map((layout) => (
            <button
              key={layout}
              onClick={() => {
                setCurrentLayout(layout);
                setPreservePositions(false); // Reset preservation when changing layout
                setManualLayoutLocked(false); // Unlock manual layout
              }}
              className={`block w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
                currentLayout === layout && !manualLayoutLocked
                  ? 'bg-blue-100 text-blue-800 font-medium' 
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {layout === 'hierarchical' && '📊'} {layout === 'radial' && '🎯'} {layout === 'grid' && '⊞'} {layout.charAt(0).toUpperCase() + layout.slice(1)}
            </button>
          ))}
          
          <div className="border-t pt-2 mt-2">
            <button
              onClick={() => {
                setManualLayoutLocked(!manualLayoutLocked);
              }}
              className={`block w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
                manualLayoutLocked
                  ? 'bg-green-100 text-green-800 font-medium' 
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {manualLayoutLocked ? '🔒' : '🔓'} Manual Layout
            </button>
            
            <button
              onClick={() => {
                setManualLayoutLocked(false);
                setPreservePositions(false);
                setSavedPositions(new Map());
                // Re-apply the current layout
                const tempLayout = currentLayout;
                setCurrentLayout('temp');
                setTimeout(() => setCurrentLayout(tempLayout), 0);
              }}
              className="block w-full text-left px-3 py-1.5 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 rounded transition-colors mt-1"
            >
              🔄 Reset Layout
            </button>
          </div>
          
          <div className="border-t pt-2">
            <div className="mb-2">
              <div className="text-xs font-semibold text-gray-700 mb-2">Edge Style</div>
              {['straight', 'bezier', 'smoothstep', 'step'].map((type) => (
                <button
                  key={type}
                  onClick={() => setEdgeType(type)}
                  className={`block w-full text-left px-3 py-1.5 text-xs rounded transition-colors mb-1 ${
                    edgeType === type 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {type === 'straight' && '📏'} {type === 'bezier' && '〰️'} 
                  {type === 'smoothstep' && '⚡'} {type === 'step' && '📐'} {type}
                </button>
              ))}
            </div>
            
            
            <button
              onClick={() => reactFlowInstance.fitView({ padding: 0.1, duration: 500 })}
              className="block w-full text-left px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded transition-colors mt-2"
            >
              🎯 Fit View
            </button>
            
            {nodes.length > 0 && (
              <>
                <div className="border-t pt-2">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Export</div>
                  <button
                    onClick={exportAsPNG}
                    className="block w-full text-left px-3 py-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors mb-1"
                  >
                    📷 PNG
                  </button>
                  <button
                    onClick={exportAsHTML}
                    className="block w-full text-left px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
                  >
                    📄 HTML Report
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    // Clear topology component state
                    setNodes([]);
                    setEdges([]);
                    setPreservePositions(false);
                    setSavedPositions(new Map());
                    setManualLayoutLocked(false);
                    // Notify parent to clear its state too
                    if (onClearAll) {
                      onClearAll();
                    }
                  }}
                  className="block w-full text-left px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors mt-2"
                >
                  🗑️ Clear
                </button>
              </>
            )}
          </div>
        </Panel>
        
        <Panel position="top-right" className="bg-white rounded-lg shadow-lg px-4 py-2">
          <div className="text-xs text-gray-600">
            <span className="font-semibold">{nodes.length}</span> devices • 
            <span className="font-semibold ml-1">{edges.length}</span> connections
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const EnterpriseTopologyFlow: React.FC<TopologyFlowProps> = (props) => {
  return (
    <ReactFlowProvider>
      <EnterpriseTopologyFlowInner {...props} />
    </ReactFlowProvider>
  );
};

export default EnterpriseTopologyFlow;