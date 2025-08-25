import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
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

// Note: Layout algorithms removed as they're not used in the new architecture
// The new architecture uses intelligent incremental positioning instead

// Main component
const EnterpriseTopologyFlowInner: React.FC<TopologyFlowProps> = ({
  devices = [],
  selectedDevices = [],
  topologyData,
  onDeviceClick,
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
  
  // Use original edge change handler without phantom detection to avoid race conditions
  const onEdgesChange = originalOnEdgesChange;
  const [currentLayout, setCurrentLayout] = useState<string>('hierarchical');
  const [manualLayoutLocked, setManualLayoutLocked] = useState<boolean>(false);
  const [edgeType, setEdgeType] = useState<string>('bezier');
  
  const nodeTypes = useMemo(() => ({
    professional: ProfessionalDeviceNode,
  }), []);

  // Save node positions when they change
  useEffect(() => {
    nodes.forEach(node => {
      canvasStateRef.current.nodePositions.set(node.id, node.position);
    });
  }, [nodes]);

  // Fresh React Flow architecture with proper state management
  const lastTopologyRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const canvasStateRef = useRef({
    nodePositions: new Map<string, { x: number; y: number }>(),
    isFirstLoad: true,
    preserveView: false
  });

  // Core canvas management - handles device chip area changes
  const updateCanvasFromChipArea = useCallback((selectedDevices: Device[]) => {
    console.log('🎯 FRESH ARCHITECTURE: Updating canvas from chip area', {
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
        position: existingPosition || { x: 0, y: 0 }, // Will be layouted if no position
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

    // Apply layout only to nodes without positions
    const nodesNeedingLayout = newNodes.filter(n => n.position.x === 0 && n.position.y === 0);
    if (nodesNeedingLayout.length > 0 && !manualLayoutLocked) {
      console.log('📍 Applying layout to', nodesNeedingLayout.length, 'new nodes');
      
      // Simple incremental positioning
      const existingPositions = newNodes
        .filter(n => n.position.x !== 0 || n.position.y !== 0)
        .map(n => n.position);
      
      let startX = 100;
      let startY = 100;
      
      if (existingPositions.length > 0) {
        // Place new nodes to the right of existing ones
        const maxX = Math.max(...existingPositions.map(p => p.x), 100);
        const avgY = existingPositions.reduce((sum, p) => sum + p.y, 0) / existingPositions.length;
        startX = maxX + 150;
        startY = avgY;
      }
      
      nodesNeedingLayout.forEach((node, index) => {
        node.position = {
          x: startX + (index % 3) * 120,
          y: startY + Math.floor(index / 3) * 120
        };
      });
    }

    // Update canvas with just the device nodes (no relationships yet)
    setNodes(newNodes);
    setEdges([]); // Clear edges until topology data arrives
    
    // Save positions
    newNodes.forEach(node => {
      canvasStateRef.current.nodePositions.set(node.id, node.position);
    });

    // Fit view only on first load
    if (canvasStateRef.current.isFirstLoad && newNodes.length > 0) {
      console.log('🎯 Fitting view (first load)');
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.1, duration: 500 });
        canvasStateRef.current.isFirstLoad = false;
      }, 100);
    }

    canvasStateRef.current.preserveView = true;
  }, [deviceDirections, manualLayoutLocked, reactFlowInstance, setNodes, setEdges]);

  // Relationship management - handles topology data changes
  const updateCanvasRelationships = useCallback((topologyData: { nodes: TopologyNode[], edges: TopologyEdge[] }) => {
    console.log('🔗 FRESH ARCHITECTURE: Updating relationships', {
      nodes: topologyData.nodes.length,
      edges: topologyData.edges.length
    });

    // Get current nodes to merge with topology nodes
    const currentNodeMap = new Map(nodes.map(n => [n.id, n]));
    const allNodes: Node[] = [];

    // Process topology nodes
    topologyData.nodes.forEach(apiNode => {
      const existingNode = currentNodeMap.get(apiNode.id);
      
      if (existingNode) {
        // Update existing node data, preserve position
        allNodes.push({
          ...existingNode,
          data: {
            ...existingNode.data,
            label: apiNode.label,
            type: apiNode.type,
            status: apiNode.status,
            ip: apiNode.ip,
            direction: deviceDirections.get(apiNode.id) || existingNode.data.direction
          }
        });
      } else {
        // New node from relationships - position it near related nodes
        const savedPosition = canvasStateRef.current.nodePositions.get(apiNode.id);
        let newPosition = savedPosition || { x: 0, y: 0 };
        
        if (!savedPosition) {
          // Find connected nodes to position near them
          const connectedEdges = topologyData.edges.filter(e => e.source === apiNode.id || e.target === apiNode.id);
          const connectedNodeIds = connectedEdges.flatMap(e => [e.source, e.target]).filter(id => id !== apiNode.id);
          const connectedPositions = connectedNodeIds
            .map(id => canvasStateRef.current.nodePositions.get(id))
            .filter(pos => pos !== undefined);
          
          if (connectedPositions.length > 0) {
            // Position near connected nodes
            const avgX = connectedPositions.reduce((sum, pos) => sum + pos.x, 0) / connectedPositions.length;
            const avgY = connectedPositions.reduce((sum, pos) => sum + pos.y, 0) / connectedPositions.length;
            newPosition = {
              x: avgX + (Math.random() - 0.5) * 100, // Add some randomness
              y: avgY + (Math.random() - 0.5) * 100
            };
          } else {
            // Default positioning for orphaned nodes
            const existingPositions = Array.from(canvasStateRef.current.nodePositions.values());
            if (existingPositions.length > 0) {
              const maxX = Math.max(...existingPositions.map((p: { x: number; y: number }) => p.x), 200);
              newPosition = { x: maxX + 150, y: 200 + Math.random() * 100 };
            } else {
              newPosition = { x: 300 + Math.random() * 100, y: 300 + Math.random() * 100 };
            }
          }
        }
        
        allNodes.push({
          id: apiNode.id,
          type: 'professional',
          position: newPosition,
          draggable: true,
          data: {
            label: apiNode.label,
            type: apiNode.type,
            status: apiNode.status,
            direction: deviceDirections.get(apiNode.id) || 'children',
            ip: apiNode.ip
          }
        });
        
        canvasStateRef.current.nodePositions.set(apiNode.id, newPosition);
      }
    });

    // Create valid edges - strict validation
    const nodeIdSet = new Set(allNodes.map(n => n.id));
    const validEdges: Edge[] = topologyData.edges
      .filter(edge => {
        const sourceExists = nodeIdSet.has(edge.source);
        const targetExists = nodeIdSet.has(edge.target);
        
        if (!sourceExists || !targetExists) {
          console.log('🚫 Filtering invalid edge:', edge, {
            sourceExists,
            targetExists,
            availableNodes: Array.from(nodeIdSet)
          });
        }
        
        return sourceExists && targetExists;
      })
      .map(edge => {
        const sourceNode = topologyData.nodes.find(n => n.id === edge.source);
        const targetNode = topologyData.nodes.find(n => n.id === edge.target);
        const edgeStyle = getEdgeStyle(sourceNode?.type, targetNode?.type);
        
        return {
          id: `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          type: edgeType,
          animated: false,
          style: edgeStyle,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: edgeStyle.stroke
          }
        };
      });

    console.log('✅ Canvas update complete:', {
      totalNodes: allNodes.length,
      validEdges: validEdges.length,
      preserveView: canvasStateRef.current.preserveView
    });

    // Update canvas
    setNodes(allNodes);
    setEdges(validEdges);

    // Never fit view during relationship updates - preserves user's current view
    console.log('🔒 Preserving view during relationship update');
  }, [nodes, deviceDirections, edgeType, setNodes, setEdges]);

  // Handle device selection changes from chip area
  useEffect(() => {
    console.log('🔄 Device selection effect:', {
      deviceCount: devices.length,
      deviceNames: devices.map(d => d.name)
    });
    
    updateCanvasFromChipArea(devices);
  }, [devices, updateCanvasFromChipArea]);

  // Handle topology data changes (relationships)
  useEffect(() => {
    if (!topologyData || !initializedRef.current) {
      if (devices.length > 0) {
        initializedRef.current = true;
      }
      return;
    }

    // Skip if topology data hasn't changed
    if (JSON.stringify(topologyData) === JSON.stringify(lastTopologyRef.current)) {
      console.log('🔒 Skipping topology update - data unchanged');
      return;
    }
    
    lastTopologyRef.current = topologyData;
    updateCanvasRelationships(topologyData);
  }, [topologyData, updateCanvasRelationships, devices.length]);


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
                setManualLayoutLocked(false); // Unlock manual layout
                canvasStateRef.current.isFirstLoad = true; // Allow fitView for layout change
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
                canvasStateRef.current.nodePositions.clear();
                canvasStateRef.current.isFirstLoad = true;
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
                    // Clear all state
                    setNodes([]);
                    setEdges([]);
                    canvasStateRef.current.nodePositions.clear();
                    canvasStateRef.current.isFirstLoad = true;
                    canvasStateRef.current.preserveView = false;
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