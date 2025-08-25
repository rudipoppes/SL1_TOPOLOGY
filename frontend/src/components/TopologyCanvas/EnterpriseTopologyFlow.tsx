import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  ConnectionLineType,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  BackgroundVariant,
  useUpdateNodeInternals,
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
  deviceDirections?: Map<string, 'parents' | 'children' | 'both'>;
  onDirectionChange?: (direction: 'parents' | 'children' | 'both', deviceId: string) => void;
  onAddDeviceToSelection?: (device: Device) => void;
  onClearAll?: () => void;
  className?: string;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId?: string;
  nodeName?: string;
}

const getDeviceIcon = (type: string, label: string) => {
  const lowerType = type.toLowerCase();
  const lowerLabel = label.toLowerCase();

  if (lowerType.includes('router') || lowerLabel.includes('router')) return '🔀';
  if (lowerType.includes('switch') || lowerLabel.includes('switch')) return '🔌';
  if (lowerType.includes('server') || lowerLabel.includes('server')) return '🖥️';
  if (lowerType.includes('firewall') || lowerLabel.includes('firewall')) return '🛡️';
  if (lowerType.includes('load') && lowerType.includes('balancer')) return '⚖️';
  if (lowerType.includes('storage') || lowerLabel.includes('storage')) return '💾';
  if (lowerType.includes('database') || lowerLabel.includes('database')) return '🗄️';
  
  return '📡';
};

const getStatusColors = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'online':
    case 'up':
      return {
        bg: 'bg-green-500',
        border: 'border-green-600',
        shadow: '0 0 10px rgba(34, 197, 94, 0.5)'
      };
    case 'offline':
    case 'down':
      return {
        bg: 'bg-red-500',
        border: 'border-red-600', 
        shadow: '0 0 10px rgba(239, 68, 68, 0.5)'
      };
    case 'warning':
    case 'degraded':
      return {
        bg: 'bg-yellow-500',
        border: 'border-yellow-600',
        shadow: '0 0 10px rgba(234, 179, 8, 0.5)'
      };
    default:
      return {
        bg: 'bg-gray-400',
        border: 'border-gray-500',
        shadow: '0 0 10px rgba(107, 114, 128, 0.5)'
      };
  }
};

const ProfessionalDeviceNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const { label, type, status, ip } = data;
  const icon = getDeviceIcon(type || '', label);
  const colors = getStatusColors(status);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ 
          opacity: 0,
          pointerEvents: 'none',
          width: 1, 
          height: 1, 
          minWidth: 1,
          minHeight: 1,
          border: 'none',
          background: 'transparent',
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
          outline: isHovered ? '2px solid rgba(59, 130, 246, 0.3)' : 'none',
          outlineOffset: '2px',
          willChange: 'auto',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
        }}
      >
        {/* Status indicator */}
        <div 
          className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${colors.bg} ${colors.border} border-2`}
          title={status}
        />
        
        {/* Device icon */}
        <div className="text-2xl mb-1" style={{ lineHeight: 1 }}>
          {icon}
        </div>
        
        {/* Device name */}
        <div className="text-xs font-medium text-gray-700 text-center truncate max-w-full" style={{ fontSize: '10px', lineHeight: '12px' }}>
          {label}
        </div>
        
        {/* IP address */}
        {ip && (
          <div className="text-[8px] text-gray-500 text-center mt-1 truncate max-w-full">
            {ip}
          </div>
        )}
        
        {/* Type on hover */}
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
          opacity: 0,
          pointerEvents: 'none',
          width: 1, 
          height: 1, 
          minWidth: 1,
          minHeight: 1,
          border: 'none',
          background: 'transparent',
        }}
      />
    </>
  );
};

// Layout algorithms
const applyHierarchicalLayout = (nodes: Node[], edges: Edge[]): Node[] => {
  if (nodes.length === 0) return nodes;
  
  const hasIncomingEdge = new Set(edges.map(e => e.target));
  const rootNodes = nodes.filter(n => !hasIncomingEdge.has(n.id));
  
  if (rootNodes.length === 0) return nodes.map((n, i) => ({ ...n, position: { x: i * 150, y: 100 } }));
  
  const levels: string[][] = [];
  const visited = new Set<string>();
  const queue: Array<{id: string, level: number}> = rootNodes.map(n => ({ id: n.id, level: 0 }));
  
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    
    visited.add(id);
    if (!levels[level]) levels[level] = [];
    levels[level].push(id);
    
    const children = edges.filter(e => e.source === id && !visited.has(e.target));
    children.forEach(e => queue.push({ id: e.target, level: level + 1 }));
  }
  
  return nodes.map(node => {
    const levelIndex = levels.findIndex(level => level.includes(node.id));
    const positionInLevel = levels[levelIndex]?.indexOf(node.id) || 0;
    const levelWidth = levels[levelIndex]?.length || 1;
    const totalWidth = Math.max(1200, levelWidth * 150);
    const startX = (window.innerWidth - totalWidth) / 2;
    
    return {
      ...node,
      position: {
        x: startX + positionInLevel * (totalWidth / levelWidth),
        y: 100 + levelIndex * 120
      }
    };
  });
};

const applyGridLayout = (nodes: Node[]): Node[] => {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  
  return nodes.map((node, index) => ({
    ...node,
    position: {
      x: 100 + (index % cols) * 200,
      y: 100 + Math.floor(index / cols) * 120
    }
  }));
};

const applyRadialLayout = (nodes: Node[], edges: Edge[]): Node[] => {
  if (nodes.length <= 1) return nodes;
  
  const hasIncomingEdge = new Set(edges.map(e => e.target));
  const rootNode = nodes.find(n => !hasIncomingEdge.has(n.id)) || nodes[0];
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  
  return nodes.map((node, index) => {
    if (node.id === rootNode.id) {
      return { ...node, position: { x: centerX, y: centerY } };
    }
    
    const angle = (index * 2 * Math.PI) / (nodes.length - 1);
    const radius = 200;
    
    return {
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      }
    };
  });
};

const EnterpriseTopologyFlowInner: React.FC<TopologyFlowProps> = ({
  devices = [],
  topologyData,
  deviceDirections = new Map(),
  onDirectionChange,
  className = '',
}) => {
  const reactFlowInstance = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, originalOnEdgesChange] = useEdgesState<Edge>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
  });
  
  // Immediate edge change handler - let React Flow handle the optimization
  const onEdgesChange = useCallback((changes: any[]) => {
    originalOnEdgesChange(changes);
  }, [originalOnEdgesChange]);

  // Lock manual layout when user drags nodes
  const onNodeDragStop = useCallback(() => {
    console.log('🔒 User dragged node - locking manual layout');
    setManualLayoutLocked(true);
  }, []);

  // Load relationships for a specific device in specified direction
  const loadDeviceRelationships = useCallback(async (deviceId: string, direction: 'up' | 'down' | 'both') => {
    console.log('🔗 Loading relationships for device:', deviceId, 'direction:', direction);
    setContextMenu({ visible: false, x: 0, y: 0 });
    setIsUpdatingTopology(true);
    
    try {
      // Map direction to expected format
      const mappedDirection = direction === 'up' ? 'parents' : direction === 'down' ? 'children' : 'both';
      
      // This will trigger the parent component to load topology data for this specific device
      if (onDirectionChange) {
        await onDirectionChange(mappedDirection, deviceId);
      }
      
      // Reset loading state after successful completion
      setIsUpdatingTopology(false);
    } catch (error) {
      console.error('Failed to load relationships:', error);
      setIsUpdatingTopology(false);
    }
  }, [onDirectionChange]);

  const [currentLayout, setCurrentLayout] = useState<string>('hierarchical');
  const [manualLayoutLocked, setManualLayoutLocked] = useState<boolean>(false);
  const [isUpdatingTopology, setIsUpdatingTopology] = useState<boolean>(false);
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(false);  // Start collapsed
  
  const nodeTypes = useMemo(() => ({
    professional: ProfessionalDeviceNode,
  }), []);

  // Save node positions when they change
  useEffect(() => {
    nodes.forEach(node => {
      canvasStateRef.current.nodePositions.set(node.id, node.position);
    });
  }, [nodes]);

  // Apply layout to current nodes
  const applyLayoutToNodes = useCallback((layoutType: string) => {
    if (nodes.length === 0) {
      console.log('⚠️ No nodes to layout');
      return;
    }

    console.log('🎯 Applying layout:', layoutType, 'to', nodes.length, 'nodes');
    
    let layoutedNodes: Node[];
    switch (layoutType) {
      case 'hierarchical':
        layoutedNodes = applyHierarchicalLayout(nodes, edges);
        break;
      case 'radial':
        layoutedNodes = applyRadialLayout(nodes, edges);
        break;
      case 'grid':
        layoutedNodes = applyGridLayout(nodes);
        break;
      default:
        layoutedNodes = applyHierarchicalLayout(nodes, edges);
    }
    
    console.log('✅ After layout:', layoutedNodes.map(n => ({ id: n.id, pos: n.position })));
    
    // Update position cache with NEW position objects
    layoutedNodes.forEach(node => {
      canvasStateRef.current.nodePositions.set(node.id, { ...node.position });
    });
    
    setNodes(layoutedNodes);
    
    setTimeout(() => {
      // Fit view to show the new layout
      reactFlowInstance.fitView({ padding: 0.1, duration: 800 });
      console.log('🎯 Layout update completed with fitView');
    }, 50);
    
  }, [nodes, edges, setNodes, reactFlowInstance, updateNodeInternals]);

  // Canvas state management
  const canvasStateRef = useRef({
    nodePositions: new Map<string, { x: number; y: number }>(),
    isFirstLoad: true,
    preserveView: false
  });

  // Process topology data to create nodes and edges for relationships
  const updateCanvasFromTopologyData = useCallback((topologyData: { nodes: TopologyNode[], edges: TopologyEdge[] }) => {
    console.log('🎯 Updating canvas from topology data', {
      nodeCount: topologyData.nodes.length,
      edgeCount: topologyData.edges.length,
      nodes: topologyData.nodes.map(n => n.label),
      edges: topologyData.edges.map(e => `${e.source}->${e.target}`)
    });

    // Create React Flow nodes from topology nodes
    const flowNodes: Node[] = topologyData.nodes.map(node => {
      const existingPosition = canvasStateRef.current.nodePositions.get(node.id);
      
      return {
        id: node.id,
        type: 'professional',
        position: existingPosition || { x: 0, y: 0 },
        draggable: true,
        data: {
          label: node.label,
          type: node.type,
          status: node.status,
          direction: deviceDirections.get(node.id) || 'children',
          ip: node.ip
        }
      };
    });

    // Apply positioning to new nodes
    const nodesNeedingLayout = flowNodes.filter(n => n.position.x === 0 && n.position.y === 0);
    if (nodesNeedingLayout.length > 0) {
      console.log('📍 Positioning', nodesNeedingLayout.length, 'new topology nodes');
      
      // Smart positioning for new relationship nodes
      const existingPositions = flowNodes
        .filter(n => n.position.x !== 0 || n.position.y !== 0)
        .map(n => n.position);
      
      let startX = 300;
      let startY = 200;
      
      if (existingPositions.length > 0) {
        // Place new nodes around existing ones
        const avgX = existingPositions.reduce((sum, p) => sum + p.x, 0) / existingPositions.length;
        const avgY = existingPositions.reduce((sum, p) => sum + p.y, 0) / existingPositions.length;
        startX = avgX;
        startY = avgY + 200; // Below existing nodes
      }
      
      // Radial positioning around center
      const centerX = startX;
      const centerY = startY;
      const radius = 150;
      
      nodesNeedingLayout.forEach((node, index) => {
        const angle = (index * 2 * Math.PI) / nodesNeedingLayout.length;
        node.position = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      });
    }

    // Create React Flow edges from topology edges
    const flowEdges: Edge[] = topologyData.edges.map((edge, index) => ({
      id: `edge-${edge.source}-${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      type: 'straight',
      animated: false,
      style: {
        strokeWidth: 2,
        stroke: '#3B82F6',
        strokeOpacity: 0.8,
      },
    }));

    // Update canvas with nodes and edges
    setNodes(flowNodes);
    setEdges(flowEdges);
    
    console.log('✨ Canvas updated with topology data:', {
      nodes: flowNodes.length,
      edges: flowEdges.length
    });
    
    // Save positions
    flowNodes.forEach(node => {
      canvasStateRef.current.nodePositions.set(node.id, node.position);
    });

    // Fit view to show all nodes
    if (flowNodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.1, duration: 500 });
      }, 100);
    }

  }, [deviceDirections, setNodes, setEdges, reactFlowInstance]);

  // Core canvas management - handles device chip area changes
  const updateCanvasFromChipArea = useCallback((selectedDevices: Device[]) => {
    console.log('🎯 Updating canvas from chip area - DEVICE ONLY', {
      deviceCount: selectedDevices.length,
      deviceNames: selectedDevices.map(d => d.name)
    });

    if (selectedDevices.length === 0) {
      // Clear all when chip area is empty
      console.log('🧹 Clearing canvas - no devices selected');
      setNodes([]);
      setEdges([]);
      canvasStateRef.current.nodePositions.clear();
      canvasStateRef.current.isFirstLoad = true;
      canvasStateRef.current.preserveView = false;
      return;
    }

    // Create nodes for all devices in chip area
    const newNodes: Node[] = selectedDevices.map(device => {
      const existingPosition = canvasStateRef.current.nodePositions.get(device.id);
      
      return {
        id: device.id,
        type: 'professional',
        position: existingPosition || { x: 0, y: 0 }, // Will be positioned if no position
        draggable: true,
        data: {
          label: device.name,
          type: device.type,
          status: device.status,
          direction: deviceDirections.get(device.id) || 'children',
          ip: device.ip
        }
      };
    });

    // Apply positioning to new devices only - no relationships loading
    const nodesNeedingLayout = newNodes.filter(n => n.position.x === 0 && n.position.y === 0);
    if (nodesNeedingLayout.length > 0) {
      console.log('📍 Positioning', nodesNeedingLayout.length, 'new devices on canvas');
      
      // Position devices in a clean grid layout
      const existingPositions = newNodes
        .filter(n => n.position.x !== 0 || n.position.y !== 0)
        .map(n => n.position);
      
      let startX = 300;
      let startY = 200;
      
      if (existingPositions.length > 0) {
        // Place new devices to the right of existing ones
        const maxX = Math.max(...existingPositions.map(p => p.x), 200);
        const avgY = existingPositions.reduce((sum, p) => sum + p.y, 0) / existingPositions.length;
        startX = maxX + 200;
        startY = avgY;
      }
      
      // Grid positioning for devices only
      nodesNeedingLayout.forEach((node, index) => {
        node.position = {
          x: startX + (index % 4) * 200,
          y: startY + Math.floor(index / 4) * 150
        };
      });
    }

    // Update canvas with device nodes only - clear edges since relationships are manual
    setNodes(newNodes);
    
    // Clear edges - relationships will be added manually per device
    setEdges([]);
    console.log('✨ Canvas updated with', newNodes.length, 'devices (no auto relationships)');
    
    // Save positions
    newNodes.forEach(node => {
      canvasStateRef.current.nodePositions.set(node.id, node.position);
    });

    // Apply first-time layout
    if (canvasStateRef.current.isFirstLoad && newNodes.length > 0) {
      console.log('🎯 Fitting view (device selection)');
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.1, duration: 500 });
        canvasStateRef.current.isFirstLoad = false;
      }, 100);
    }

    canvasStateRef.current.preserveView = true;
  }, [deviceDirections, setNodes, setEdges, reactFlowInstance]);


  // Handle device selection changes from chip area - DEVICE ONLY (no auto relationships)
  useEffect(() => {
    console.log('🔄 Device-only selection effect:', {
      deviceCount: devices.length,
      deviceNames: devices.map(d => d.name)
    });
    
    // Simply place devices on canvas - no topology loading
    updateCanvasFromChipArea(devices);
    
  }, [devices, updateCanvasFromChipArea]);

  // Handle topology data changes - process relationship loading results
  useEffect(() => {
    if (topologyData && (topologyData.nodes.length > 0 || topologyData.edges.length > 0)) {
      console.log('🔄 Topology data effect - processing relationships:', {
        nodeCount: topologyData.nodes.length,
        edgeCount: topologyData.edges.length
      });
      
      updateCanvasFromTopologyData(topologyData);
    }
  }, [topologyData, updateCanvasFromTopologyData]);

  // Reset loading state when topology data changes (safeguard against infinite loading)
  useEffect(() => {
    if (isUpdatingTopology) {
      console.log('🛡️ Topology data changed - resetting loading state');
      setIsUpdatingTopology(false);
    }
  }, [nodes.length, edges.length, isUpdatingTopology]);

  // Event handlers
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    console.log('🖱️ Node clicked:', node.data.label);
    setContextMenu({ visible: false, x: 0, y: 0 });
  }, []);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
      nodeName: node.data.label as string
    });
    console.log('🖱️ Context menu opened for:', node.data.label);
  }, []);

  const onPaneClick = useCallback(() => {
    // Hide context menu when clicking on the pane
    setContextMenu({ visible: false, x: 0, y: 0 });
  }, []);


  return (
    <div className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDragStop={onNodeDragStop}
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
          type: 'straight', // Use straight edges for better performance during dragging
          animated: false,
          style: {
            strokeWidth: 2,
            stroke: '#3B82F6',
            strokeOpacity: 0.8,
          },
        }}
        // Performance optimizations for smooth edge following
        elevateEdgesOnSelect={false}
        elevateNodesOnSelect={false}
        disableKeyboardA11y={false}
        autoPanOnConnect={false}
        autoPanOnNodeDrag={false}
        // Additional performance settings
        onlyRenderVisibleElements={true}
        translateExtent={[[-2000, -2000], [2000, 2000]]}
        nodeExtent={[[-2000, -2000], [2000, 2000]]}
        snapToGrid={false}
        snapGrid={[15, 15]}
        // Edge rendering optimizations
        edgesFocusable={false}
        // Disable animations that can cause blur
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        preventScrolling={true}
        // Force pixel-perfect rendering
        attributionPosition="bottom-left"
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color="#E2E8F0" 
          className="opacity-30 dark:!opacity-0"
        />
        
        <Controls 
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          position="bottom-right"
          className="glass-panel backdrop-blur-md border-white/30 rounded-xl shadow-lg"
        />
        
        {/* Enhanced Context Menu */}
        {contextMenu.visible && (
          <div
            className="absolute glass-panel backdrop-blur-lg border-white/30 rounded-xl shadow-xl py-2 z-50"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              minWidth: '220px',
            }}
          >
            <div className="px-4 py-3 border-b border-white/20">
              <div className="text-xs font-semibold text-muted uppercase tracking-wide">Relationship Controls</div>
              <div className="text-sm font-medium text-emphasis mt-1" style={{ fontSize: 'var(--text-sm)' }}>{contextMenu.nodeName}</div>
            </div>
            <button
              onClick={() => contextMenu.nodeId && loadDeviceRelationships(contextMenu.nodeId, 'up')}
              className="w-full text-left px-4 py-3 transition-all duration-300 flex items-center space-x-3 hover:bg-blue-50/50 hover:backdrop-blur-sm text-secondary hover:text-primary"
              style={{ fontSize: 'var(--text-sm)' }}
            >
              <span className="text-base">⬆️</span>
              <span className="font-medium">Load Parent Devices</span>
            </button>
            <button
              onClick={() => contextMenu.nodeId && loadDeviceRelationships(contextMenu.nodeId, 'down')}
              className="w-full text-left px-4 py-3 transition-all duration-300 flex items-center space-x-3 hover:bg-green-50/50 hover:backdrop-blur-sm text-secondary hover:text-primary"
              style={{ fontSize: 'var(--text-sm)' }}
            >
              <span className="text-base">⬇️</span>
              <span className="font-medium">Load Child Devices</span>
            </button>
            <button
              onClick={() => contextMenu.nodeId && loadDeviceRelationships(contextMenu.nodeId, 'both')}
              className="w-full text-left px-4 py-3 transition-all duration-300 flex items-center space-x-3 hover:bg-purple-50/50 hover:backdrop-blur-sm text-secondary hover:text-primary"
              style={{ fontSize: 'var(--text-sm)' }}
            >
              <span className="text-base">🔄</span>
              <span className="font-medium">Load Both Directions</span>
            </button>
          </div>
        )}

        {/* Collapsible Layout Controls Panel */}
        <Panel position="top-left" className="glass-panel backdrop-blur-md border-white/30 rounded-xl shadow-lg">
          {!isControlsOpen ? (
            <button
              onClick={() => setIsControlsOpen(true)}
              className="p-2 text-primary hover:text-primary-600 transition-colors duration-300"
              title="Show layout controls"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </button>
          ) : (
            <div className="p-4" style={{ minWidth: '200px' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-primary">Layout Controls</h3>
                <button
                  onClick={() => setIsControlsOpen(false)}
                  className="text-muted hover:text-primary transition-colors duration-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-2">Layout Algorithm</label>
                  <div className="space-y-1">
                    {['hierarchical', 'radial', 'grid'].map((layout) => (
                      <button
                        key={layout}
                        onClick={() => {
                          console.log('🎯 Layout button clicked:', layout);
                          setCurrentLayout(layout);
                          setManualLayoutLocked(false);
                          applyLayoutToNodes(layout);
                        }}
                        className={`block w-full text-left px-2 py-1 rounded-md transition-all duration-300 text-xs ${
                          currentLayout === layout && !manualLayoutLocked
                            ? 'bg-blue-100 text-blue-800 font-medium' 
                            : 'bg-white/50 hover:bg-white/70 text-secondary hover:text-emphasis'
                        }`}
                      >
                        {layout.charAt(0).toUpperCase() + layout.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="border-t border-white/20 pt-2 mt-2 space-y-1">
                  <button
                    onClick={() => {
                      setManualLayoutLocked(!manualLayoutLocked);
                    }}
                    className={`block w-full text-left px-2 py-1 rounded-md transition-all duration-300 text-xs ${
                      manualLayoutLocked
                        ? 'bg-green-100 text-green-800 font-medium' 
                        : 'bg-white/50 hover:bg-white/70 text-secondary hover:text-emphasis'
                    }`}
                  >
                    🔒 Manual Layout {manualLayoutLocked ? 'Locked' : 'Unlocked'}
                  </button>
                  
                  <button
                    onClick={() => {
                      console.log('🔄 Reset layout clicked');
                      setManualLayoutLocked(false);
                      canvasStateRef.current.nodePositions.clear();
                      applyLayoutToNodes(currentLayout);
                    }}
                    className="block w-full text-left px-2 py-1 rounded-md transition-all duration-300 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700"
                  >
                    🔄 Reset Positions
                  </button>
                </div>
              </div>
            </div>
          )}
        </Panel>

        {/* Loading indicator */}
        {isUpdatingTopology && (
          <div className="absolute top-4 right-4 glass-panel backdrop-blur-md border-white/30 rounded-xl p-4 z-40">
            <div className="flex items-center space-x-3 text-primary">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-medium text-sm">Loading relationships...</span>
            </div>
          </div>
        )}
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