import React, { useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  Position,
  Handle,
  BackgroundVariant,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Device, TopologyNode, TopologyEdge } from '../../services/api';
// import dagre from 'dagre'; // Not used anymore

// CRITICAL: Define node types OUTSIDE component to prevent re-renders
const DeviceNode = React.memo(({ data }: { data: any }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'online': return '#10b981';
      case 'offline': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555', width: 8, height: 8 }}
      />
      <div
        style={{
          padding: '10px 15px',
          borderRadius: '8px',
          background: '#fff',
          border: `2px solid ${getStatusColor()}`,
          minWidth: '120px',
          fontSize: '12px',
          fontWeight: 500,
          textAlign: 'center',
          // CRITICAL: Prevent sub-pixel rendering
          transform: 'translate3d(0,0,0)',
          willChange: 'transform',
        }}
      >
        <div style={{ marginBottom: '4px' }}>{data.label}</div>
        {data.ip && (
          <div style={{ fontSize: '10px', color: '#6b7280' }}>{data.ip}</div>
        )}
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: getStatusColor(),
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            border: '2px solid #fff',
          }}
        />
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555', width: 8, height: 8 }}
      />
    </>
  );
});

DeviceNode.displayName = 'DeviceNode';

// CRITICAL: Define node types object OUTSIDE component
const nodeTypes = {
  device: DeviceNode,
};

// Dagre layout for automatic positioning - DISABLED
// const dagreGraph = new dagre.graphlib.Graph();
// dagreGraph.setDefaultEdgeLabel(() => ({}));

// const nodeWidth = 150;
// const nodeHeight = 60;

const getLayoutedElements = (nodes: Node[], edges: Edge[], _direction = 'TB') => {
  // Simple grid layout instead of dagre
  nodes.forEach((node, index) => {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const col = index % cols;
    const row = Math.floor(index / cols);
    node.position = {
      x: Math.round(100 + col * 200),
      y: Math.round(100 + row * 150),
    };
  });

  return { nodes, edges };
};

interface StableTopologyFlowProps {
  devices?: Device[];
  topologyData?: {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
  };
  onDirectionChange?: (direction: 'parents' | 'children' | 'both', deviceId: string) => void;
  className?: string;
}

const StableTopologyFlowInner: React.FC<StableTopologyFlowProps> = ({
  devices = [],
  topologyData,
  onDirectionChange,
  className = '',
}) => {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const isInitialized = useRef(false);

  // CRITICAL: Use custom handlers to prevent unnecessary re-renders
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Filter out dimension updates that can cause drift
      const filteredChanges = changes.filter(change => {
        if (change.type === 'dimensions') {
          return false; // Ignore dimension changes
        }
        return true;
      });
      
      setNodes((nds) => applyNodeChanges(filteredChanges, nds));
    },
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );

  // Process devices and topology data
  useEffect(() => {
    if (!devices.length && !topologyData) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    const processedNodeIds = new Set<string>();

    // Add devices from selection
    devices.forEach((device) => {
      if (!processedNodeIds.has(device.id)) {
        allNodes.push({
          id: device.id,
          type: 'device',
          position: { x: 0, y: 0 }, // Will be positioned by layout
          data: {
            label: device.name,
            status: device.status,
            ip: device.ip,
            type: device.type,
          },
        });
        processedNodeIds.add(device.id);
      }
    });

    // Add nodes from topology data
    if (topologyData) {
      topologyData.nodes.forEach((node) => {
        if (!processedNodeIds.has(node.id)) {
          allNodes.push({
            id: node.id,
            type: 'device',
            position: { x: 0, y: 0 }, // Will be positioned by layout
            data: {
              label: node.label,
              status: node.status,
              ip: node.ip,
              type: node.type,
            },
          });
          processedNodeIds.add(node.id);
        }
      });

      // Add edges
      topologyData.edges.forEach((edge, index) => {
        allEdges.push({
          id: `edge-${edge.source}-${edge.target}-${index}`,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: '#94a3b8',
            strokeWidth: 2,
          },
        });
      });
    }

    // Apply layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      allNodes,
      allEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    // Fit view after layout
    if (!isInitialized.current && layoutedNodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
        isInitialized.current = true;
      }, 100);
    }
  }, [devices, topologyData, setNodes, setEdges, reactFlowInstance]);

  // Context menu for loading relationships
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      
      const menu = document.createElement('div');
      menu.style.position = 'absolute';
      menu.style.left = `${event.clientX}px`;
      menu.style.top = `${event.clientY}px`;
      menu.style.background = 'white';
      menu.style.border = '1px solid #e2e8f0';
      menu.style.borderRadius = '8px';
      menu.style.padding = '8px';
      menu.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
      menu.style.zIndex = '9999';

      const options = [
        { label: 'Load Parent Devices', direction: 'parents' as const },
        { label: 'Load Child Devices', direction: 'children' as const },
        { label: 'Load Both', direction: 'both' as const },
      ];

      options.forEach((option) => {
        const button = document.createElement('button');
        button.textContent = option.label;
        button.style.display = 'block';
        button.style.width = '100%';
        button.style.padding = '8px 12px';
        button.style.textAlign = 'left';
        button.style.border = 'none';
        button.style.background = 'transparent';
        button.style.cursor = 'pointer';
        button.style.fontSize = '14px';
        button.onmouseover = () => {
          button.style.background = '#f1f5f9';
        };
        button.onmouseout = () => {
          button.style.background = 'transparent';
        };
        button.onclick = () => {
          if (onDirectionChange) {
            onDirectionChange(option.direction, node.id);
          }
          document.body.removeChild(menu);
        };
        menu.appendChild(button);
      });

      document.body.appendChild(menu);

      // Remove menu on click outside
      const handleClickOutside = () => {
        if (document.body.contains(menu)) {
          document.body.removeChild(menu);
        }
        document.removeEventListener('click', handleClickOutside);
      };
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
    },
    [onDirectionChange]
  );

  return (
    <div className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeContextMenu={onNodeContextMenu}
        nodeTypes={nodeTypes}
        // CRITICAL: Settings to prevent drift
        fitView={false}
        nodeOrigin={[0.5, 0.5]}
        nodeDragThreshold={5}
        minZoom={0.5}
        maxZoom={2}
        snapToGrid={true}
        snapGrid={[10, 10]}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnScroll={false}
        selectionOnDrag={false}
        panOnDrag={true}
        preventScrolling={false}
        autoPanOnConnect={false}
        autoPanOnNodeDrag={false}
        disableKeyboardA11y={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls position="bottom-right" />
        
        <Panel position="top-left">
          <button
            onClick={() => {
              const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges);
              setNodes(layoutedNodes);
              setTimeout(() => {
                reactFlowInstance.fitView({ padding: 0.2 });
              }, 50);
            }}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Auto Layout
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const StableTopologyFlow: React.FC<StableTopologyFlowProps> = (props) => {
  return (
    <ReactFlowProvider>
      <StableTopologyFlowInner {...props} />
    </ReactFlowProvider>
  );
};

export default StableTopologyFlow;