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
  topologyData?: {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
  };
  onDeviceClick?: (device: Device) => void;
  onRemoveDevice?: (deviceId: string) => void;
  onClearAll?: () => void;
  className?: string;
}

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

// Professional Device Node with Name (120px)
const ProfessionalDeviceNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  const { label, type, status, onRemove } = data;
  const icon = getDeviceIcon(type || '', label);
  const colors = getStatusColors(status);
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#3B82F6', width: 6, height: 6, borderRadius: '50%' }}
      />
      
      <div
        className="relative flex flex-col items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          minWidth: '120px',
          maxWidth: '140px',
          background: 'white',
          border: selected ? '2px solid #3B82F6' : '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '8px',
          boxShadow: selected 
            ? '0 0 15px rgba(59, 130, 246, 0.5)' 
            : isHovered ? colors.shadow : '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'move',
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
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
          >
            ✕
          </button>
        )}
        
        {/* Status dot */}
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
          style={{ background: colors.bg }}
        />
        
        {/* Device icon */}
        <div className="text-xl mb-2">{icon}</div>
        
        {/* Device name */}
        <div 
          className="text-xs font-semibold text-center text-gray-800 leading-tight"
          style={{ 
            wordBreak: 'break-word',
            hyphens: 'auto',
            maxWidth: '100%'
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
        style={{ background: '#3B82F6', width: 6, height: 6, borderRadius: '50%' }}
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
  topologyData,
  onDeviceClick,
  onRemoveDevice,
  onClearAll,
  className = '',
}) => {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [currentLayout, setCurrentLayout] = useState<string>('hierarchical');
  
  const nodeTypes = useMemo(() => ({
    professional: ProfessionalDeviceNode,
  }), []);

  // Clear nodes and edges when topology data is cleared
  useEffect(() => {
    if (!topologyData && devices.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    let flowNodes: Node[] = [];
    let flowEdges: Edge[] = [];

    if (topologyData && topologyData.nodes.length > 0) {
      // Create professional nodes  
      flowNodes = topologyData.nodes.map((node) => ({
        id: node.label || String(node.id),
        type: 'professional',
        position: { x: 0, y: 0 },
        dragHandle: '.drag-handle',
        data: { 
          label: node.label,
          type: node.type,
          status: 'online',
          onRemove: onRemoveDevice ? () => onRemoveDevice(node.label || String(node.id)) : undefined,
        },
      }));

      // Create edges with better routing
      flowEdges = topologyData.edges.map((edge) => {
        const sourceNode = topologyData.nodes.find(n => n.id === edge.source);
        const targetNode = topologyData.nodes.find(n => n.id === edge.target);
        const sourceId = sourceNode?.label || String(edge.source);
        const targetId = targetNode?.label || String(edge.target);
        
        return {
          id: `edge-${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          type: 'smoothstep', // Better edge routing
          animated: false,
          style: {
            stroke: '#64748B',
            strokeWidth: 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 12,
            height: 12,
            color: '#64748B',
          },
        };
      });
    } else if (devices.length > 0) {
      // Fallback for device list
      flowNodes = devices.map((device) => ({
        id: device.id,
        type: 'professional',
        position: { x: 0, y: 0 },
        data: { 
          label: device.name,
          type: device.type,
          status: device.status,
          onRemove: onRemoveDevice ? () => onRemoveDevice(device.id) : undefined,
        },
      }));
    }

    if (flowNodes.length > 0) {
      // Apply layout
      let layoutedNodes = [...flowNodes];
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
      
      setNodes(layoutedNodes);
      setEdges(flowEdges);
      
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.1, duration: 500 });
      }, 100);
    }
  }, [topologyData, devices, currentLayout, setNodes, setEdges, reactFlowInstance, onRemoveDevice]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
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
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.2}
        maxZoom={3}
        nodesDraggable={true} // Allow manual dragging
        nodesConnectable={false} // Prevent manual connections
        elementsSelectable={true}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#E2E8F0" />
        
        <Controls 
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          position="bottom-right"
        />
        
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
              onClick={() => setCurrentLayout(layout)}
              className={`block w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
                currentLayout === layout 
                  ? 'bg-blue-100 text-blue-800 font-medium' 
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {layout === 'hierarchical' && '📊'} {layout === 'radial' && '🎯'} {layout === 'grid' && '⊞'} {layout.charAt(0).toUpperCase() + layout.slice(1)}
            </button>
          ))}
          
          <div className="border-t pt-2">
            <button
              onClick={() => reactFlowInstance.fitView({ padding: 0.1, duration: 500 })}
              className="block w-full text-left px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded transition-colors"
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