import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionMode,
  MarkerType,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Device, TopologyNode, TopologyEdge } from '../../services/api';

interface TopologyFlowProps {
  devices?: Device[];
  topologyData?: {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
  };
  onDeviceClick?: (device: Device) => void;
  onRemoveDevice?: (deviceId: string) => void;
  className?: string;
}

// Modern device type detection with better icons
const getDeviceIcon = (type: string, deviceName: string) => {
  const name = deviceName.toLowerCase();
  const typeStr = type.toLowerCase();
  
  // Kubernetes/Container platforms
  if (name.includes('kubernetes') || name.includes('k8s')) return '☸️';
  if (name.includes('docker')) return '🐳';
  
  // Office/Locations
  if (name.includes('office')) return '🏢';
  if (name.includes('pam')) return '🔐';
  
  // Network devices
  if (name.includes('router') || typeStr.includes('router')) return '🔀';
  if (name.includes('switch') || typeStr.includes('switch')) return '🔌';
  if (name.includes('firewall')) return '🛡️';
  if (name.includes('load') || name.includes('balance')) return '⚖️';
  
  // Servers/Workers
  if (name.includes('worker')) return '⚙️';
  if (name.includes('server') || typeStr.includes('server')) return '🖥️';
  if (name.includes('cluster')) return '🔷';
  
  // Default for IP addresses or unknown
  if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) return '📡';
  return '💻';
};

// Modern status colors
const getStatusStyle = (status: string = 'unknown') => {
  switch (status) {
    case 'online':
      return {
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        shadow: '0 0 20px rgba(16, 185, 129, 0.4)',
      };
    case 'offline':
      return {
        background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        shadow: '0 0 20px rgba(239, 68, 68, 0.4)',
      };
    case 'warning':
      return {
        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        shadow: '0 0 20px rgba(245, 158, 11, 0.4)',
      };
    default:
      return {
        background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
        shadow: '0 0 20px rgba(107, 114, 128, 0.3)',
      };
  }
};

// Modern Compact Node Component
const ModernDeviceNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  const { label, type, status, ip, deviceName, onRemove } = data;
  const icon = getDeviceIcon(type || '', deviceName || label);
  const statusStyle = getStatusStyle(status);
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Remove button */}
      {isHovered && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg z-50"
          style={{ fontSize: '10px' }}
        >
          ✕
        </button>
      )}
      
      {/* Main node container */}
      <div
        style={{
          background: 'white',
          border: selected ? '3px solid #3B82F6' : '2px solid #E5E7EB',
          borderRadius: '12px',
          padding: '8px 12px',
          minWidth: '120px',
          maxWidth: '160px',
          boxShadow: selected 
            ? '0 10px 25px -5px rgba(59, 130, 246, 0.3)' 
            : isHovered 
              ? statusStyle.shadow
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
        }}
      >
        {/* Status indicator dot */}
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
          style={{
            background: statusStyle.background,
            boxShadow: `0 0 0 2px white, ${statusStyle.shadow}`,
          }}
        />
        
        {/* Icon and name */}
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '20px' }}>{icon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-xs text-gray-800 truncate">
              {label}
            </div>
            {ip && ip !== 'N/A' && (
              <div className="text-[10px] text-gray-500 font-mono truncate">
                {ip}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Hover tooltip */}
      {isHovered && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
          {type || 'Device'} • {status || 'Unknown'}
        </div>
      )}
    </div>
  );
};

// Edge styles are now defined inline in the edge objects

// Unused for now but kept for future animation features
// const animatedEdgeStyles = {
//   stroke: '#3B82F6',
//   strokeWidth: 2.5,
//   strokeDasharray: '5 5',
//   animation: 'dashdraw 0.5s linear infinite',
// };

// Layout algorithm for better node positioning
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const nodeMap = new Map<string, Node>();
  nodes.forEach(node => nodeMap.set(node.id, node));
  
  // Find root nodes (nodes with no incoming edges)
  const rootNodes = nodes.filter(node => 
    !edges.some(edge => edge.target === node.id)
  );
  
  // Find leaf nodes (nodes with no outgoing edges)
  const leafNodes = nodes.filter(node =>
    !edges.some(edge => edge.source === node.id)
  );
  
  // Calculate positions
  const centerX = 400;
  const centerY = 300;
  const radius = 200;
  
  nodes.forEach((node, index) => {
    if (rootNodes.includes(node)) {
      // Place root nodes at the top
      const xOffset = (index - rootNodes.length / 2) * 180;
      node.position = { x: centerX + xOffset, y: 100 };
    } else if (leafNodes.includes(node)) {
      // Place leaf nodes at the bottom
      const xOffset = (index - leafNodes.length / 2) * 180;
      node.position = { x: centerX + xOffset, y: 500 };
    } else {
      // Arrange other nodes in a circle
      const angle = (index / nodes.length) * 2 * Math.PI;
      node.position = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    }
  });
  
  return { nodes, edges };
};

// Inner component that uses ReactFlow hooks
const TopologyFlowInner: React.FC<TopologyFlowProps> = ({
  devices = [],
  topologyData,
  onDeviceClick,
  onRemoveDevice,
  className = '',
}) => {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [_selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Convert topology data to React Flow format
  useEffect(() => {
    let flowNodes: Node[] = [];
    let flowEdges: Edge[] = [];

    if (topologyData && topologyData.nodes.length > 0) {
      // Use topology data if available
      console.log('📊 Topology nodes:', topologyData.nodes);
      console.log('🔗 Topology edges:', topologyData.edges);
      
      // Use node.label as the ID since that's what appears to be the actual identifier
      flowNodes = topologyData.nodes.map((node) => ({
        id: node.label || String(node.id), // Use label as ID since that's the actual device name
        type: 'modernDevice',
        position: { x: 0, y: 0 }, // Will be calculated by layout
        data: { 
          label: node.label,
          type: node.type,
          status: 'online',
          onRemove: onRemoveDevice ? () => onRemoveDevice(node.label || String(node.id)) : undefined,
        },
      }));

      flowEdges = topologyData.edges.map((edge) => {
        // Map edge source/target to use labels instead of IDs
        const sourceNode = topologyData.nodes.find(n => n.id === edge.source);
        const targetNode = topologyData.nodes.find(n => n.id === edge.target);
        const sourceId = sourceNode?.label || String(edge.source);
        const targetId = targetNode?.label || String(edge.target);
        
        console.log(`Edge: ${sourceId} -> ${targetId}`);
        
        return {
          id: `edge-${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          type: 'default',  // Change to default type
          animated: false,
          style: {
            stroke: '#3B82F6',
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
            color: '#3B82F6',
          },
          zIndex: 1000,  // Ensure edges are on top
        };
      });
    } else if (devices.length > 0) {
      // Fallback for simple device list
      flowNodes = devices.map((device) => ({
        id: device.id,
        type: 'modernDevice',
        position: { x: 0, y: 0 }, // Will be calculated by layout
        data: { 
          label: device.name,
          type: device.type,
          status: device.status,
          ip: device.ip,
          deviceName: device.name,
          onRemove: onRemoveDevice ? () => onRemoveDevice(device.id) : undefined,
        },
      }));
    }

    // Apply layout
    if (flowNodes.length > 0) {
      console.log('🎯 Final flowNodes:', flowNodes);
      console.log('🎯 Final flowEdges:', flowEdges);
      
      const layouted = getLayoutedElements(flowNodes, flowEdges);
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      
      console.log('✅ Set nodes:', layouted.nodes);
      console.log('✅ Set edges:', layouted.edges);
      
      // Fit view after a short delay
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
      }, 100);
    }
  }, [topologyData, devices, setNodes, setEdges, reactFlowInstance, onRemoveDevice]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
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

  // Custom node types
  const nodeTypes = React.useMemo(() => ({
    modernDevice: ModernDeviceNode,
  }), []);

  // Layout options
  const onLayout = useCallback((_layoutType?: string) => {
    const layoutedElements = getLayoutedElements([...nodes], [...edges]);
    setNodes(layoutedElements.nodes);
    setEdges(layoutedElements.edges);
    
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
    }, 100);
  }, [nodes, edges, setNodes, setEdges, reactFlowInstance]);

  return (
    <div className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'default',
          animated: false,
          style: {
            stroke: '#3B82F6',
            strokeWidth: 2,
          },
        }}
      >
        {/* Clean background without dots */}
        <Background color="#F3F4F6" gap={0} />
        
        {/* Modern controls */}
        <Controls 
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          position="bottom-right"
        />
        
        {/* Minimap with custom styling */}
        <MiniMap 
          nodeColor={(node) => {
            const status = node.data?.status || 'unknown';
            switch(status) {
              case 'online': return '#10B981';
              case 'offline': return '#EF4444';
              case 'warning': return '#F59E0B';
              default: return '#6B7280';
            }
          }}
          nodeStrokeWidth={3}
          pannable
          zoomable
          style={{
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
          }}
        />
        
        {/* Custom control panel */}
        <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-3 space-y-2">
          <div className="text-xs font-semibold text-gray-700 mb-2">Layout Options</div>
          <button
            onClick={() => onLayout('circular')}
            className="block w-full text-left px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded transition-colors"
          >
            🔄 Auto Layout
          </button>
          <button
            onClick={() => reactFlowInstance.fitView({ padding: 0.2, duration: 800 })}
            className="block w-full text-left px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded transition-colors"
          >
            🎯 Fit View
          </button>
          {nodes.length > 0 && (
            <button
              onClick={() => {
                setNodes([]);
                setEdges([]);
              }}
              className="block w-full text-left px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors"
            >
              🗑️ Clear Canvas
            </button>
          )}
        </Panel>
        
        {/* Stats panel */}
        <Panel position="top-right" className="bg-white rounded-lg shadow-lg px-4 py-2">
          <div className="text-xs text-gray-600">
            <span className="font-semibold">{nodes.length}</span> nodes • 
            <span className="font-semibold ml-1">{edges.length}</span> connections
          </div>
        </Panel>
      </ReactFlow>
      
      {/* Add animation styles */}
      <style>{`
        @keyframes dashdraw {
          from { stroke-dashoffset: 10; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
};

// Wrapper component with ReactFlowProvider
export const ModernTopologyFlow: React.FC<TopologyFlowProps> = (props) => {
  return (
    <ReactFlowProvider>
      <TopologyFlowInner {...props} />
    </ReactFlowProvider>
  );
};

export default ModernTopologyFlow;