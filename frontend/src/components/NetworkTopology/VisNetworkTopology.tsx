import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Network } from 'vis-network/standalone';
import { DataSet } from 'vis-data/standalone';
import { Device, TopologyNode, TopologyEdge } from '../../services/api';
import { useVisNetwork } from './hooks/useVisNetwork';
import { TopologyControls } from './controls/TopologyControls';
import { getNetworkOptions } from './utils/visConfig';
import { transformToVisData } from './utils/dataTransform';
import './styles/topology.module.css';

interface VisNetworkTopologyProps {
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

export const VisNetworkTopology: React.FC<VisNetworkTopologyProps> = ({
  selectedDevices = [],
  topologyData,
  onClearAll,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [layout, setLayout] = useState<'hierarchical' | 'physics' | 'grid' | 'radial'>('physics');
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [fixedNodes, setFixedNodes] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState<Map<string, Set<string>>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Custom hook for network management
  const { 
    updateNodePositions,
    updateNodeFixed,
  } = useVisNetwork(network);

  // Initialize network
  useEffect(() => {
    if (!containerRef.current) return;

    const options = getNetworkOptions(layout);
    const data = {
      nodes: new DataSet<any>([]),
      edges: new DataSet<any>([]),
    };

    const networkInstance = new Network(containerRef.current, data, options);
    
    // Set up event listeners
    networkInstance.on('selectNode', (params) => {
      setSelectedNodes(params.nodes);
    });

    networkInstance.on('deselectNode', () => {
      setSelectedNodes([]);
    });

    networkInstance.on('doubleClick', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        toggleNodeFixed(nodeId);
      }
    });

    networkInstance.on('oncontext', (params: any) => {
      params.event.preventDefault();
      const nodeId = networkInstance.getNodeAt(params.pointer.DOM);
      if (nodeId) {
        showContextMenu(params.pointer.DOM, nodeId as string);
      }
    });

    networkInstance.on('dragEnd', (params) => {
      if (params.nodes.length > 0) {
        const positions = networkInstance.getPositions(params.nodes);
        updateNodePositions(positions);
      }
    });

    setNetwork(networkInstance);

    return () => {
      networkInstance.destroy();
    };
  }, []);

  // Update network data when topology changes
  useEffect(() => {
    if (!network || !topologyData) return;

    setIsLoading(true);
    const { nodes: visNodes, edges: visEdges } = transformToVisData(
      topologyData.nodes,
      topologyData.edges,
      selectedDevices,
      fixedNodes
    );

    const data = network.body?.data || { nodes: new DataSet([]), edges: new DataSet([]) };
    const nodesDataSet = data.nodes as DataSet<any>;
    const edgesDataSet = data.edges as DataSet<any>;

    nodesDataSet.clear();
    edgesDataSet.clear();
    nodesDataSet.add(visNodes);
    edgesDataSet.add(visEdges);

    // Apply layout if not using physics
    if (layout !== 'physics') {
      applyLayout();
    }

    setIsLoading(false);
  }, [topologyData, network, layout, fixedNodes]);

  // Toggle node fixed position
  const toggleNodeFixed = useCallback((nodeId: string) => {
    const newFixed = new Set(fixedNodes);
    if (newFixed.has(nodeId)) {
      newFixed.delete(nodeId);
      updateNodeFixed(nodeId, false);
    } else {
      newFixed.add(nodeId);
      const position = network?.getPositions([nodeId])[nodeId];
      if (position) {
        updateNodeFixed(nodeId, true, position);
      }
    }
    setFixedNodes(newFixed);
  }, [fixedNodes, network, updateNodeFixed]);

  // Apply layout based on current selection
  const applyLayout = useCallback(() => {
    if (!network) return;

    switch (layout) {
      case 'hierarchical':
        applyHierarchicalLayout();
        break;
      case 'grid':
        applyGridLayout();
        break;
      case 'radial':
        applyRadialLayout();
        break;
      case 'physics':
        // Physics is always on, just restart stabilization
        network.stabilize();
        break;
    }
  }, [network, layout]);

  const applyHierarchicalLayout = () => {
    if (!network) return;
    
    const options = {
      layout: {
        hierarchical: {
          enabled: true,
          direction: 'UD',
          sortMethod: 'directed',
          shakeTowards: 'roots',
          levelSeparation: 150,
          nodeSpacing: 200,
        },
      },
    };
    
    network.setOptions(options);
  };

  const applyGridLayout = () => {
    if (!network) return;
    
    const nodes = network.body.data.nodes as DataSet<any>;
    const nodeIds = nodes.getIds();
    const cols = Math.ceil(Math.sqrt(nodeIds.length));
    const spacing = 250;
    
    const positions: { [key: string]: { x: number; y: number } } = {};
    
    nodeIds.forEach((id, index) => {
      if (!fixedNodes.has(id as string)) {
        const row = Math.floor(index / cols);
        const col = index % cols;
        positions[id as string] = {
          x: col * spacing - (cols * spacing) / 2,
          y: row * spacing - (Math.ceil(nodeIds.length / cols) * spacing) / 2,
        };
      }
    });
    
    network.body.data.nodes.update(
      Object.entries(positions).map(([id, pos]) => ({
        id,
        x: pos.x,
        y: pos.y,
      }))
    );
  };

  const applyRadialLayout = () => {
    if (!network) return;
    
    const nodes = network.body.data.nodes as DataSet<any>;
    const edges = network.body.data.edges as DataSet<any>;
    const nodeIds = nodes.getIds();
    
    // Find central nodes (most connections)
    const connectionCount: { [key: string]: number } = {};
    nodeIds.forEach(id => {
      connectionCount[id as string] = edges.get({
        filter: (edge: any) => edge.from === id || edge.to === id,
      }).length;
    });
    
    const sortedNodes = nodeIds.sort((a, b) => 
      connectionCount[b as string] - connectionCount[a as string]
    );
    
    const positions: { [key: string]: { x: number; y: number } } = {};
    const centerNode = sortedNodes[0] as string;
    
    // Place center node
    if (!fixedNodes.has(centerNode)) {
      positions[centerNode] = { x: 0, y: 0 };
    }
    
    // Place other nodes in circles
    let radius = 200;
    let nodesInRing = 8;
    let currentRing = 0;
    let nodesPlaced = 1;
    
    for (let i = 1; i < sortedNodes.length; i++) {
      const nodeId = sortedNodes[i] as string;
      if (fixedNodes.has(nodeId)) continue;
      
      const angle = (2 * Math.PI * currentRing) / nodesInRing;
      positions[nodeId] = {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      };
      
      currentRing++;
      nodesPlaced++;
      
      if (currentRing >= nodesInRing) {
        radius += 150;
        nodesInRing = Math.floor(2 * Math.PI * radius / 100);
        currentRing = 0;
      }
    }
    
    network.body.data.nodes.update(
      Object.entries(positions).map(([id, pos]) => ({
        id,
        x: pos.x,
        y: pos.y,
      }))
    );
  };

  const showContextMenu = (position: { x: number; y: number }, nodeId: string) => {
    // Context menu will be implemented in the next iteration
    console.log('Context menu for node:', nodeId, 'at position:', position);
  };

  const handleLayoutChange = (newLayout: typeof layout) => {
    setLayout(newLayout);
    if (network) {
      // Reset to physics-based options first
      network.setOptions(getNetworkOptions(newLayout));
      if (newLayout !== 'physics') {
        setTimeout(() => applyLayout(), 100);
      }
    }
  };

  const handleFitView = () => {
    network?.fit({ animation: { duration: 1000, easingFunction: 'easeInOutQuad' } });
  };

  const handleResetPhysics = () => {
    network?.stabilize();
  };

  const handleGroupSelected = () => {
    if (selectedNodes.length < 2) return;
    
    const groupId = `group_${Date.now()}`;
    const newGroups = new Map(groups);
    newGroups.set(groupId, new Set(selectedNodes));
    setGroups(newGroups);
    
    // Visual feedback for grouped nodes
    const nodes = network?.body.data.nodes as DataSet<any>;
    nodes.update(selectedNodes.map(id => ({
      id,
      group: groupId,
      borderWidth: 3,
      borderWidthSelected: 5,
    })));
  };

  return (
    <div className={`vis-network-topology ${className}`}>
      <TopologyControls
        layout={layout}
        onLayoutChange={handleLayoutChange}
        onFitView={handleFitView}
        onResetPhysics={handleResetPhysics}
        onGroupSelected={handleGroupSelected}
        onClearAll={onClearAll}
        selectedCount={selectedNodes.length}
        fixedCount={fixedNodes.size}
        isLoading={isLoading}
      />
      
      <div 
        ref={containerRef} 
        className="vis-network-container"
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      />
      
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">Updating topology...</div>
        </div>
      )}
    </div>
  );
};