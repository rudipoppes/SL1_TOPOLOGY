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

// Simple device node - no fancy features that could cause issues
const SimpleDeviceNode = React.memo(({ data }: { data: any }) => {
  return (
    <div
      style={{
        padding: '8px 12px',
        borderRadius: '4px',
        background: '#ffffff',
        border: '2px solid #3b82f6',
        fontSize: '12px',
        fontWeight: 500,
        textAlign: 'center',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0 }}
      />
      <div>{data.label}</div>
      {data.ip && (
        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
          {data.ip}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0 }}
      />
    </div>
  );
});

SimpleDeviceNode.displayName = 'SimpleDeviceNode';

const nodeTypes = { device: SimpleDeviceNode };

// Simple grid layout - no fancy algorithms
const calculateGridPosition = (index: number, columns: number = 4): XYPosition => {
  const SPACING_X = 200;
  const SPACING_Y = 120;
  const START_X = 100;
  const START_Y = 100;
  
  const col = index % columns;
  const row = Math.floor(index / columns);
  
  return {
    x: START_X + (col * SPACING_X),
    y: START_Y + (row * SPACING_Y),
  };
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
          position = calculateGridPosition(index);
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
            position = calculateGridPosition(existingCount);
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
    
  }, [devices, topologyData]);
  
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
  
  // Re-layout button
  const handleRelayout = useCallback(() => {
    const updatedNodes = nodes.map((node, index) => {
      const newPosition = calculateGridPosition(index);
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
        snapGrid={[10, 10]}
        snapToGrid={true}
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
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls position="bottom-right" />
        
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 5,
        }}>
          <button
            onClick={handleRelayout}
            style={{
              padding: '6px 12px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            Re-Layout
          </button>
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