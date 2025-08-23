import React, { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Node,
  Edge,
  ConnectionMode,
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
  className?: string;
}

// Device type icons (simple emoji/symbols for now)
const getDeviceIcon = (type: string, deviceName: string) => {
  const name = deviceName.toLowerCase();
  const typeStr = type.toLowerCase();
  
  if (name.includes('cluster') || name.includes('kubernetes')) return '🔷';
  if (name.includes('worker') || name.includes('node')) return '⚙️';
  if (name.includes('router') || typeStr.includes('router')) return '📡';
  if (name.includes('switch') || typeStr.includes('switch')) return '🔀';
  if (name.includes('server') || typeStr.includes('server')) return '🖥️';
  if (name.includes('firewall')) return '🛡️';
  if (name.includes('load') || name.includes('balance')) return '⚖️';
  return '💻'; // Default computer icon
};

// Get status colors for modern styling
const getStatusColors = (status: string) => {
  switch (status) {
    case 'online':
      return {
        border: '#10B981',
        background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
        iconColor: '#059669',
        textColor: '#065F46'
      };
    case 'offline':
      return {
        border: '#EF4444',
        background: 'linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%)',
        iconColor: '#DC2626',
        textColor: '#991B1B'
      };
    case 'warning':
      return {
        border: '#F59E0B',
        background: 'linear-gradient(135deg, #FFFBEB 0%, #FED7AA 100%)',
        iconColor: '#D97706',
        textColor: '#92400E'
      };
    default:
      return {
        border: '#6B7280',
        background: 'linear-gradient(135deg, #F9FAFB 0%, #E5E7EB 100%)',
        iconColor: '#4B5563',
        textColor: '#374151'
      };
  }
};

// Custom Node Component
const CustomDeviceNode = ({ data }: any) => {
  const { label, type, status, ip, deviceName } = data;
  const colors = getStatusColors(status);
  const icon = getDeviceIcon(type, deviceName || label);
  
  return (
    <div
      style={{
        background: colors.background,
        border: `3px solid ${colors.border}`,
        borderRadius: '16px',
        padding: '16px',
        minWidth: '160px',
        maxWidth: '200px',
        boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: '8px'
      }}>
        <span style={{ 
          fontSize: '28px', 
          marginRight: '8px',
          filter: `hue-rotate(${status === 'online' ? '0deg' : status === 'offline' ? '0deg' : '0deg'})`
        }}>
          {icon}
        </span>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: colors.iconColor,
          boxShadow: `0 0 0 2px white, 0 0 8px ${colors.iconColor}40`
        }} />
      </div>
      
      <div style={{
        fontSize: '14px',
        fontWeight: '700',
        color: colors.textColor,
        textAlign: 'center',
        lineHeight: '1.2',
        marginBottom: '6px',
        wordWrap: 'break-word'
      }}>
        {label}
      </div>
      
      {ip && ip !== 'N/A' && (
        <div style={{
          fontSize: '11px',
          color: colors.textColor + '80',
          textAlign: 'center',
          fontFamily: 'monospace',
          backgroundColor: 'rgba(255,255,255,0.7)',
          padding: '2px 6px',
          borderRadius: '4px',
          marginTop: '4px'
        }}>
          {ip}
        </div>
      )}
    </div>
  );
};

export const TopologyFlow: React.FC<TopologyFlowProps> = ({
  devices = [],
  topologyData,
  onDeviceClick,
  className = '',
}) => {
  // Define custom node types
  const nodeTypes = React.useMemo(() => ({
    customDevice: CustomDeviceNode,
  }), []);

  // Convert topology data to React Flow format
  const nodes: Node[] = React.useMemo(() => {
    if (topologyData && topologyData.nodes) {
      return topologyData.nodes.map((node, index) => ({
        id: String(node.id),
        type: 'default',
        position: { 
          x: (index % 3) * 250 + 100,
          y: Math.floor(index / 3) * 200 + 100 
        },
        data: { 
          label: node.label,
        },
      }));
    }
    
    // Fallback for simple device list
    return devices.map((device, index) => ({
      id: device.id,
      type: 'customDevice',
      position: { 
        x: (index % 3) * 250 + 100,
        y: Math.floor(index / 3) * 200 + 100 
      },
      data: { 
        label: device.name,
        type: device.type,
        status: device.status,
        ip: device.ip,
        deviceName: device.name,
      },
    }));
  }, [topologyData, devices]);

  const edges: Edge[] = React.useMemo(() => {
    if (topologyData && topologyData.edges) {
      console.log('EDGE DATA:', topologyData.edges);
      console.log('NODE IDS:', topologyData.nodes.map(n => n.id));
      return topologyData.edges.map((edge, index) => ({
        id: `e${edge.source}-${edge.target}`,
        source: String(edge.source),
        target: String(edge.target),
        style: { stroke: '#FF0000', strokeWidth: 5 },
      }));
    }
    return [];
  }, [topologyData]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (onDeviceClick && topologyData) {
      const nodeData = topologyData.nodes.find(n => String(n.id) === node.id);
      if (nodeData) {
        const device: Device = {
          id: nodeData.id,
          name: nodeData.label,
          ip: nodeData.ip,
          type: nodeData.type,
          status: nodeData.status,
        };
        onDeviceClick(device);
      }
    }
  }, [onDeviceClick, topologyData]);

  return (
    <div className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
      
      {/* Stats display */}
      <div className="absolute bottom-4 left-4 px-3 py-1 bg-white border border-gray-300 rounded-md shadow-sm text-sm text-gray-600">
        {topologyData ? `${nodes.length} nodes, ${edges.length} connections` : `${devices.length} devices`}
      </div>
    </div>
  );
};

export default TopologyFlow;