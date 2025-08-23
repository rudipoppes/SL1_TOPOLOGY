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

// Define custom node styles based on device status
const getNodeStyle = (status: string) => {
  const baseStyle = {
    padding: '10px',
    borderRadius: '8px',
    border: '2px solid',
    background: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    minWidth: '100px',
    textAlign: 'center' as const,
  };

  switch (status) {
    case 'online':
      return {
        ...baseStyle,
        borderColor: '#059669',
        background: '#10B981',
        color: 'white',
      };
    case 'offline':
      return {
        ...baseStyle,
        borderColor: '#DC2626',
        background: '#EF4444',
        color: 'white',
      };
    case 'warning':
      return {
        ...baseStyle,
        borderColor: '#D97706',
        background: '#F59E0B',
        color: 'white',
      };
    default:
      return {
        ...baseStyle,
        borderColor: '#4B5563',
        background: '#6B7280',
        color: 'white',
      };
  }
};

export const TopologyFlow: React.FC<TopologyFlowProps> = ({
  devices = [],
  topologyData,
  onDeviceClick,
  className = '',
}) => {
  // Convert topology data to React Flow format
  const nodes: Node[] = React.useMemo(() => {
    if (topologyData && topologyData.nodes) {
      return topologyData.nodes.map((node, index) => ({
        id: String(node.id),
        type: 'default',
        position: { 
          x: (index % 3) * 200 + 100, // Simple grid layout 
          y: Math.floor(index / 3) * 150 + 100 
        },
        data: { 
          label: (
            <div style={getNodeStyle(node.status)}>
              <div>{node.label}</div>
              <div style={{ fontSize: '10px', marginTop: '4px' }}>
                {node.ip}
              </div>
            </div>
          )
        },
        style: {
          background: 'transparent',
          border: 'none',
        },
      }));
    }
    
    // Fallback for simple device list
    return devices.map((device, index) => ({
      id: device.id,
      type: 'default',
      position: { 
        x: (index % 3) * 200 + 100,
        y: Math.floor(index / 3) * 150 + 100 
      },
      data: { 
        label: (
          <div style={getNodeStyle(device.status)}>
            <div>{device.name}</div>
            <div style={{ fontSize: '10px', marginTop: '4px' }}>
              {device.ip}
            </div>
          </div>
        )
      },
      style: {
        background: 'transparent',
        border: 'none',
      },
    }));
  }, [topologyData, devices]);

  const edges: Edge[] = React.useMemo(() => {
    if (topologyData && topologyData.edges) {
      return topologyData.edges.map((edge, index) => ({
        id: `edge-${index}`,
        source: String(edge.source),
        target: String(edge.target),
        type: 'default',
        style: {
          stroke: '#9CA3AF',
          strokeWidth: 2,
        },
        markerEnd: {
          type: 'arrowclosed',
          color: '#9CA3AF',
        },
      }));
    }
    return [];
  }, [topologyData]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
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