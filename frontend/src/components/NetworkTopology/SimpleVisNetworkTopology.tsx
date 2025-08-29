import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network/standalone';
import { DataSet } from 'vis-data/standalone';
import { Device, TopologyNode, TopologyEdge } from '../../services/api';
import { DeviceRelationshipModal } from './DeviceRelationshipModal';
import { ZoomControls } from './ZoomControls';
import styles from './SimpleTopology.module.css';
// Import vis-network CSS for navigation buttons
import 'vis-network/dist/dist/vis-network.min.css';

interface SimpleVisNetworkTopologyProps {
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
  theme?: 'light' | 'dark';
}

const getDeviceIcon = (type: string): string => {
  const lowerType = type?.toLowerCase() || '';
  
  if (lowerType.includes('router')) return '🔀';
  if (lowerType.includes('switch')) return '🔌';
  if (lowerType.includes('server')) return '🖥️';
  if (lowerType.includes('firewall')) return '🛡️';
  if (lowerType.includes('load')) return '⚖️';
  if (lowerType.includes('storage')) return '💾';
  if (lowerType.includes('database')) return '🗄️';
  
  return '📡';
};

const getNodeStatus = (node: any): 'online' | 'offline' | 'warning' => {
  if (node.status === 'online' || node.state === '0') return 'online';
  if (node.status === 'offline' || node.state === '2') return 'offline';
  if (node.status === 'warning' || node.state === '1') return 'warning';
  return 'online';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return '#10b981';
    case 'offline': return '#ef4444';
    case 'warning': return '#f59e0b';
    default: return '#6b7280';
  }
};

const getThemeColors = (theme: 'light' | 'dark' = 'light') => {
  if (theme === 'dark') {
    return {
      nodeBackground: '#374151',
      nodeBorder: '#6b7280',
      nodeText: '#f9fafb',
      nodeStroke: '#1f2937',
      highlightBackground: '#4b5563',
      highlightBorder: '#818cf8',
      edgeColor: '#4b5563',
      edgeHighlight: '#818cf8',
      edgeHover: '#818cf8',
    };
  } else {
    return {
      nodeBackground: '#ffffff',
      nodeBorder: '#e5e7eb',
      nodeText: '#1f2937',
      nodeStroke: '#ffffff',
      highlightBackground: '#f9fafb',
      highlightBorder: '#667eea',
      edgeColor: '#cbd5e0',
      edgeHighlight: '#667eea',
      edgeHover: '#667eea',
    };
  }
};

export const SimpleVisNetworkTopology: React.FC<SimpleVisNetworkTopologyProps> = ({
  selectedDevices,
  topologyData,
  deviceDirections,
  onDirectionChange,
  onClearAll,
  className = '',
  theme = 'light',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesDataSetRef = useRef<DataSet<any> | null>(null);
  const edgesDataSetRef = useRef<DataSet<any> | null>(null);
  const [layout, setLayout] = useState<'hierarchical' | 'physics' | 'grid'>('physics');
  const [forceRedraw, setForceRedraw] = useState(false);
  const nodePositionCounter = useRef({ x: 100, y: 100 });
  
  // Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    nodeId: string;
    nodeName: string;
    nodeType?: string;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    nodeId: '',
    nodeName: '',
    nodeType: undefined,
  });

  // Initialize network once
  useEffect(() => {
    if (!containerRef.current || networkRef.current) return;

    // Initialize empty datasets
    const nodesDataSet = new DataSet([]);
    const edgesDataSet = new DataSet([]);
    nodesDataSetRef.current = nodesDataSet;
    edgesDataSetRef.current = edgesDataSet;

    const data = {
      nodes: nodesDataSet,
      edges: edgesDataSet,
    };

    const options = {
      physics: {
        enabled: false, // Always disable physics for static positioning
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        multiselect: true,
        dragView: true,
        zoomView: true,
        dragNodes: true, // Allow manual dragging
        navigationButtons: false, // Disable built-in navigation buttons - we have custom ones
        keyboard: true, // Enable keyboard shortcuts
      },
      nodes: {
        chosen: true,
      },
      edges: {
        chosen: true,
        length: 200, // Default edge length
        smooth: {
          enabled: true,
          type: 'continuous',
          roundness: 0.2,
        },
      },
      configure: {
        enabled: false,
      },
    };

    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    // No stabilization needed - physics is always disabled

    // Add click event listener for node clicks
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0] as string;
        const currentNode = nodesDataSetRef.current?.get(nodeId);
        
        if (currentNode && containerRef.current) {
          // Get canvas position relative to container
          const containerRect = containerRef.current.getBoundingClientRect();
          const canvasPosition = network.canvasToDOM(params.pointer.canvas);
          
          // Calculate modal position relative to viewport
          const modalPosition = {
            x: containerRect.left + canvasPosition.x,
            y: containerRect.top + canvasPosition.y,
          };

          setModalState({
            isOpen: true,
            position: modalPosition,
            nodeId: nodeId,
            nodeName: currentNode.nodeData?.name || nodeId,
            nodeType: currentNode.nodeData?.type,
          });
        }
      }
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
        nodesDataSetRef.current = null;
        edgesDataSetRef.current = null;
      }
    };
  }, []); // Initialize network only once - theme changes handled via CSS

  // Handle data updates with static positioning
  useEffect(() => {
    if (!networkRef.current || !nodesDataSetRef.current || !edgesDataSetRef.current) return;

    // If force redraw is requested (layout change), clear everything
    if (forceRedraw) {
      console.log('Force redraw requested - clearing canvas');
      nodesDataSetRef.current.clear();
      edgesDataSetRef.current.clear();
      setForceRedraw(false);
      // Reset position counter for layout changes
      nodePositionCounter.current = { x: 100, y: 100 };
    }

    // Transform new data to vis-network format with static positioning
    const themeColors = getThemeColors(theme);
    const newVisNodes = topologyData?.nodes.map(node => {
      const status = getNodeStatus(node);
      const icon = getDeviceIcon(node.type || '');
      const statusColor = getStatusColor(status);
      const direction = deviceDirections?.get(node.id) || 'children';
      
      // Add direction indicator to label
      const directionIcon = direction === 'parents' ? '🔼' : 
                           direction === 'both' ? '🔄' : '🔽';
      const directionLabel = `${icon}\n${node.label || node.id}\n${directionIcon}`;

      return {
        id: node.id,
        label: directionLabel,
        title: `${node.label || node.id} (${node.type || 'Unknown'})\nDirection: ${direction}`,
        color: {
          background: themeColors.nodeBackground,
          border: statusColor,
          highlight: {
            background: themeColors.highlightBackground,
            border: themeColors.highlightBorder,
          },
        },
        borderWidth: 2,
        borderWidthSelected: 4,
        shape: 'box',
        shapeProperties: {
          borderRadius: 12,
        },
        font: {
          size: 14,
          face: 'Inter, system-ui, sans-serif',
          color: themeColors.nodeText,
          strokeWidth: 2,
          strokeColor: themeColors.nodeStroke,
        },
        margin: {
          top: 10,
          right: 15,
          bottom: 10,
          left: 15,
        },
        shadow: {
          enabled: true,
          color: theme === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)',
          size: 15,
          x: 0,
          y: 5,
        },
        widthConstraint: {
          minimum: 140,
          maximum: 200,
        },
        nodeData: {
          name: node.label || node.id,
          type: node.type,
          direction: direction,
        },
      };
    }) || [];

    const newVisEdges = topologyData?.edges.map((edge, index) => ({
      id: `edge-${edge.source}-${edge.target}-${index}`,
      from: edge.source,
      to: edge.target,
      arrows: {
        to: {
          enabled: true,
          type: 'arrow',
          scaleFactor: 1.0,
        },
      },
      color: {
        color: themeColors.edgeColor,
        highlight: themeColors.edgeHighlight,
        hover: themeColors.edgeHover,
      },
      width: 2,
      length: 200, // Minimum edge length
      smooth: {
        enabled: true,
        type: 'continuous',
        roundness: 0.2,
      },
    })) || [];

    // Get current positions from the network (includes manual drag positions)
    const currentPositions = new Map();
    const allCurrentNodeIds = nodesDataSetRef.current.getIds();
    
    // Get actual positions from network (this includes manual drag updates)
    if (allCurrentNodeIds.length > 0) {
      const networkPositions = networkRef.current?.getPositions(allCurrentNodeIds as string[]);
      if (networkPositions) {
        Object.entries(networkPositions).forEach(([nodeId, position]) => {
          currentPositions.set(nodeId, { x: position.x, y: position.y });
          console.log(`STATIC: Current position for ${nodeId}:`, position);
        });
      }
    }

    // Get current node and edge IDs
    const currentNodeIds = new Set(allCurrentNodeIds);
    const currentEdgeIds = new Set(edgesDataSetRef.current.getIds());
    const newNodeIds = new Set(newVisNodes.map(n => n.id));
    const newEdgeIds = new Set(newVisEdges.map(e => e.id));

    // Remove nodes that are no longer present (simple removal)
    const nodesToRemove = Array.from(currentNodeIds).filter(id => !newNodeIds.has(id as string));
    if (nodesToRemove.length > 0) {
      console.log('STATIC: Removing nodes without movement:', nodesToRemove);
      nodesDataSetRef.current.remove(nodesToRemove);
    }

    // Remove edges that are no longer present
    const edgesToRemove = Array.from(currentEdgeIds).filter(id => !newEdgeIds.has(id as string));
    if (edgesToRemove.length > 0) {
      console.log('STATIC: Removing edges without movement:', edgesToRemove);
      edgesDataSetRef.current.remove(edgesToRemove);
    }

    // Process nodes: preserve existing positions, assign new positions to new nodes
    const nodesToUpdate = newVisNodes.map(node => {
      const existingPosition = currentPositions.get(node.id);
      if (existingPosition) {
        // Existing node - preserve exact position
        console.log(`STATIC: Preserving position for existing node ${node.id}`);
        return {
          ...node,
          x: existingPosition.x,
          y: existingPosition.y,
        };
      } else {
        // New node - assign static position with much better spacing
        const newPosition = {
          x: nodePositionCounter.current.x,
          y: nodePositionCounter.current.y,
        };
        // Increment position for next new node with balanced spacing
        nodePositionCounter.current.x += 280;
        if (nodePositionCounter.current.x > 1000) {
          nodePositionCounter.current.x = 100;
          nodePositionCounter.current.y += 220;
        }
        
        console.log(`STATIC: Assigning position to new node ${node.id}:`, newPosition);
        return {
          ...node,
          x: newPosition.x,
          y: newPosition.y,
        };
      }
    });

    // Update nodes (existing keep position, new get static position)
    if (nodesToUpdate.length > 0) {
      console.log('STATIC: Updating nodes with preserved/static positions');
      nodesDataSetRef.current.update(nodesToUpdate);
    }

    // Update edges
    if (newVisEdges.length > 0) {
      console.log('STATIC: Updating edges');
      edgesDataSetRef.current.update(newVisEdges);
    }

  }, [topologyData, deviceDirections, forceRedraw, theme]);

  // Handle layout changes by enabling physics temporarily
  useEffect(() => {
    if (!networkRef.current || !forceRedraw) return;

    console.log(`Applying layout: ${layout}`);
    
    if (layout === 'hierarchical') {
      // Apply proper hierarchical layout using Sugiyama-style layered approach
      const nodes = nodesDataSetRef.current?.get() as any[];
      if (nodes && nodes.length > 0) {
        const selectedNodeIds = new Set(selectedDevices?.map(d => d.id) || []);
        const edges = topologyData?.edges || [];
        
        // Phase 1: Build adjacency maps for DAG structure
        const childrenMap = new Map<string, string[]>();
        const parentsMap = new Map<string, string[]>();
        
        edges.forEach(edge => {
          // Build parent -> children mapping
          if (!childrenMap.has(edge.source)) {
            childrenMap.set(edge.source, []);
          }
          childrenMap.get(edge.source)!.push(edge.target);
          
          // Build child -> parents mapping  
          if (!parentsMap.has(edge.target)) {
            parentsMap.set(edge.target, []);
          }
          parentsMap.get(edge.target)!.push(edge.source);
        });
        
        // Phase 2: Proper layer assignment using topological approach
        const nodeLevels = new Map<string, number>();
        const inDegree = new Map<string, number>();
        
        // Initialize in-degrees
        nodes.forEach(node => {
          inDegree.set(node.id, parentsMap.get(node.id)?.length || 0);
        });
        
        // Find nodes with no parents (top level)
        const topLevelNodes: string[] = [];
        nodes.forEach(node => {
          if (inDegree.get(node.id) === 0) {
            topLevelNodes.push(node.id);
          }
        });
        
        // If no natural top level exists, use selected nodes as roots
        const rootNodes = topLevelNodes.length > 0 ? topLevelNodes : Array.from(selectedNodeIds);
        
        // Assign levels using modified topological sort
        const queue: {id: string, level: number}[] = [];
        rootNodes.forEach(id => {
          queue.push({id, level: 0});
          nodeLevels.set(id, 0);
        });
        
        while (queue.length > 0) {
          const {id, level} = queue.shift()!;
          const children = childrenMap.get(id) || [];
          
          children.forEach(childId => {
            const currentLevel = nodeLevels.get(childId);
            const newLevel = level + 1;
            
            // Assign child to deepest level encountered (handles DAG structure)
            if (currentLevel === undefined || newLevel > currentLevel) {
              nodeLevels.set(childId, newLevel);
              queue.push({id: childId, level: newLevel});
            }
          });
        }
        
        // Phase 3: Group nodes by hierarchical level
        const levelGroups = new Map<number, string[]>();
        nodeLevels.forEach((level, nodeId) => {
          if (!levelGroups.has(level)) {
            levelGroups.set(level, []);
          }
          levelGroups.get(level)!.push(nodeId);
        });
        
        // Phase 4: Calculate positions with proper parent centering
        const levelSpacing = 250;
        const nodeSpacing = 400; // Increased from 300 to prevent overlap
        const minNodeSpacing = 220; // Increased from 150 to ensure no overlap
        const hierarchyNodes: any[] = [];
        const nodePositions = new Map<string, {x: number, y: number}>();
        
        // Sort levels from top to bottom
        const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
        
        // Process each level
        sortedLevels.forEach(level => {
          const nodesAtLevel = levelGroups.get(level)!;
          const levelY = level * levelSpacing + 100; // Y position for this level
          
          if (level === 0 || sortedLevels.indexOf(level) === 0) {
            // Top level - distribute evenly
            const totalWidth = (nodesAtLevel.length - 1) * nodeSpacing;
            const startX = -totalWidth / 2;
            
            nodesAtLevel.forEach((nodeId, index) => {
              const x = startX + (index * nodeSpacing);
              nodePositions.set(nodeId, {x, y: levelY});
            });
          } else {
            // Lower levels - position based on parent centering
            const positionedNodes = new Set<string>();
            const nodeXPositions = new Map<string, number>();
            
            // First pass: position nodes based on their parents
            nodesAtLevel.forEach(nodeId => {
              const parents = parentsMap.get(nodeId) || [];
              if (parents.length > 0) {
                // Calculate center point of all parents
                let parentXSum = 0;
                let validParents = 0;
                
                parents.forEach(parentId => {
                  const parentPos = nodePositions.get(parentId);
                  if (parentPos) {
                    parentXSum += parentPos.x;
                    validParents++;
                  }
                });
                
                if (validParents > 0) {
                  const centerX = parentXSum / validParents;
                  nodeXPositions.set(nodeId, centerX);
                  positionedNodes.add(nodeId);
                }
              }
            });
            
            // Second pass: position remaining nodes and resolve collisions
            const unpositionedNodes = nodesAtLevel.filter(id => !positionedNodes.has(id));
            
            // Sort positioned nodes by X coordinate
            const sortedPositioned = Array.from(positionedNodes).sort((a, b) => {
              return nodeXPositions.get(a)! - nodeXPositions.get(b)!;
            });
            
            // Resolve collisions and set final positions
            let currentX = -1000; // Start from left
            
            [...sortedPositioned, ...unpositionedNodes].forEach(nodeId => {
              let desiredX = nodeXPositions.get(nodeId);
              
              if (desiredX === undefined) {
                // Unpositioned node - place after last positioned node
                desiredX = currentX + nodeSpacing;
              } else {
                // Positioned node - ensure minimum spacing
                desiredX = Math.max(desiredX, currentX + minNodeSpacing);
              }
              
              nodePositions.set(nodeId, {x: desiredX, y: levelY});
              currentX = desiredX;
            });
          }
        });
        
        // Phase 5: Re-center parents above their children (Reingold-Tilford principle)
        sortedLevels.slice(0, -1).forEach(level => { // All levels except the last
          const nodesAtLevel = levelGroups.get(level)!;
          
          nodesAtLevel.forEach(nodeId => {
            const children = childrenMap.get(nodeId) || [];
            if (children.length > 0) {
              // Find leftmost and rightmost child positions
              let minChildX = Infinity;
              let maxChildX = -Infinity;
              
              children.forEach(childId => {
                const childPos = nodePositions.get(childId);
                if (childPos) {
                  minChildX = Math.min(minChildX, childPos.x);
                  maxChildX = Math.max(maxChildX, childPos.x);
                }
              });
              
              if (minChildX !== Infinity) {
                // Center parent above children
                const centerX = (minChildX + maxChildX) / 2;
                const currentPos = nodePositions.get(nodeId);
                if (currentPos) {
                  nodePositions.set(nodeId, {x: centerX, y: currentPos.y});
                }
              }
            }
          });
        });
        
        // Phase 6: Convert to vis-network format and center on canvas
        const allPositions = Array.from(nodePositions.values());
        const minX = Math.min(...allPositions.map(p => p.x));
        const maxX = Math.max(...allPositions.map(p => p.x));
        const centerOffset = 500 - (minX + maxX) / 2; // Center on canvas
        
        nodePositions.forEach((pos, nodeId) => {
          hierarchyNodes.push({
            id: nodeId,
            x: pos.x + centerOffset,
            y: pos.y,
          });
        });
        
        // Apply the calculated positions
        if (hierarchyNodes.length > 0) {
          nodesDataSetRef.current?.update(hierarchyNodes);
          console.log('Advanced hierarchical layout applied with proper parent centering');
          console.log(`Processed ${hierarchyNodes.length} nodes across ${sortedLevels.length} levels`);
        }
      }
    } else if (layout === 'physics') {
      // Enable physics temporarily for natural layout with better spacing
      networkRef.current.setOptions({
        physics: { 
          enabled: true,
          barnesHut: {
            gravitationalConstant: -6000, // Reduced from -8000 for less attraction
            centralGravity: 0.2, // Reduced from 0.3 for less central pull
            springLength: 250, // Increased from 200 for longer connections
            springConstant: 0.03, // Reduced from 0.04 for softer springs
            damping: 0.09,
            avoidOverlap: 1, // Add overlap avoidance
          },
        },
        layout: { hierarchical: { enabled: false } },
      });
      
      // Disable physics after stabilization
      setTimeout(() => {
        if (networkRef.current) {
          networkRef.current.setOptions({ physics: { enabled: false } });
          console.log('Physics layout applied - physics disabled for static positioning');
        }
      }, 3000);
    } else {
      // Grid layout - keep physics disabled, arrange in grid pattern
      const nodes = nodesDataSetRef.current?.get() as any[];
      if (nodes && nodes.length > 0) {
        const gridSize = Math.ceil(Math.sqrt(nodes.length));
        const spacing = 400; // Much larger spacing to prevent overlap
        
        const gridNodes = nodes.map((node, index) => ({
          id: node.id,
          x: (index % gridSize) * spacing + 100,
          y: Math.floor(index / gridSize) * spacing + 100,
        }));
        
        nodesDataSetRef.current?.update(gridNodes);
        console.log('Grid layout applied with static positions');
      }
    }
  }, [layout, forceRedraw]);

  const handleLayoutChange = (newLayout: typeof layout) => {
    console.log(`STATIC: Layout change requested: ${newLayout}`);
    setLayout(newLayout);
    setForceRedraw(true); // This will trigger layout change
  };


  const handleDirectionSelect = (direction: 'parents' | 'children' | 'both') => {
    if (onDirectionChange && modalState.nodeId) {
      onDirectionChange(direction, modalState.nodeId);
    }
  };

  const handleModalClose = () => {
    setModalState(prev => ({
      ...prev,
      isOpen: false,
    }));
  };

  return (
    <div className={`${styles.simpleVisNetworkTopology} ${className}`}>
      {/* Integrated Controls Panel */}
      <ZoomControls 
        networkRef={networkRef} 
        theme={theme}
        layout={layout}
        onLayoutChange={handleLayoutChange}
        onClearAll={onClearAll}
      />
      
      <div 
        ref={containerRef} 
        className={styles.visContainer}
      />

      {/* Device Relationship Modal */}
      <DeviceRelationshipModal
        isOpen={modalState.isOpen}
        position={modalState.position}
        nodeId={modalState.nodeId}
        nodeName={modalState.nodeName}
        nodeType={modalState.nodeType}
        currentDirection={deviceDirections?.get(modalState.nodeId) || 'children'}
        onDirectionSelect={handleDirectionSelect}
        onClose={handleModalClose}
      />
    </div>
  );
};