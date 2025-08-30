import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network/standalone';
import { DataSet } from 'vis-data/standalone';
import { Device, TopologyNode, TopologyEdge } from '../../services/api';
import { DeviceRelationshipModal } from './DeviceRelationshipModal';
import { ZoomControls } from './ZoomControls';
import { DepthSelector } from './DepthSelector';
import { configService } from '../../services/config';
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
  deviceDepths?: Map<string, number>;
  globalDepth?: number;
  onDirectionChange?: (direction: 'parents' | 'children' | 'both', deviceId: string) => void;
  onDepthChange?: (depth: number, deviceId?: string) => void;
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
  deviceDepths,
  globalDepth = 2,
  onDirectionChange,
  onDepthChange,
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
  const [isLocked, setIsLocked] = useState(false); // Canvas lock state
  const [lockedNodes, setLockedNodes] = useState<Set<string>>(new Set()); // Individual node locks
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false); // Drag selection state
  const [selectionBox, setSelectionBox] = useState<{ 
    startX: number; 
    startY: number; 
    currentX: number; 
    currentY: number; 
    isVisible: boolean;
  }>({
    startX: 0, 
    startY: 0, 
    currentX: 0, 
    currentY: 0, 
    isVisible: false
  });
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
        multiselect: true, // Enable multiselect for ctrl+click
        dragView: true, // Enable canvas panning with normal drag
        zoomView: true,
        dragNodes: true, // Allow manual dragging of nodes
        navigationButtons: false, // Disable built-in navigation buttons - we have custom ones
        keyboard: true, // Enable keyboard shortcuts
        selectConnectedEdges: false, // Don't select edges when selecting nodes
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

    // Listen for selection changes from vis-network
    network.on('select', (params) => {
      const selectedNodes = new Set(params.nodes as string[]);
      // Only update if the selection actually changed
      if (selectedNodes.size !== selectedNodeIds.size || 
          !Array.from(selectedNodes).every(id => selectedNodeIds.has(id))) {
        console.log(`🔄 Vis-network selection changed: ${selectedNodes.size} nodes`);
        setSelectedNodeIds(selectedNodes);
      }
    });

    // Add click event listener for node clicks and selection
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0] as string;
        const currentNode = nodesDataSetRef.current?.get(nodeId);
        const shiftPressed = params.event.srcEvent?.shiftKey;
        
        if (shiftPressed) {
          // Shift+click - open context menu
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
        } else {
          // Normal click - vis-network will handle selection including ctrl+click
          // We don't need to do anything here, the 'select' event will update our state
        }
      } else {
        // Click on empty canvas - clear selection
        const emptySelection = new Set<string>();
        setSelectedNodeIds(emptySelection);
        syncSelectionWithNetwork(emptySelection);
      }
    });



    // Add keyboard event handler for shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+L or Cmd+L to lock/unlock selected nodes
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        const selectedNodes = network.getSelectedNodes();
        if (selectedNodes.length > 0) {
          selectedNodes.forEach(nodeId => {
            toggleNodeLock(nodeId as string);
          });
          console.log(`🔒 Toggled lock for ${selectedNodes.length} node(s)`);
        }
      }
      
      // Ctrl+A or Cmd+A to select all nodes
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        selectAllNodes();
      }
      
      // Escape to clear selection
      if (event.key === 'Escape') {
        clearSelection();
      }
      
      // Delete to clear selected nodes (demonstration - just clears selection in this case)
      if (event.key === 'Delete' && selectedNodeIds.size > 0) {
        event.preventDefault();
        console.log(`⚠️ Delete pressed with ${selectedNodeIds.size} nodes selected (no action taken)`);
        // Could implement node deletion here if needed
      }
    };

    // Add drag selection functionality
    const handleMouseDown = (event: MouseEvent) => {
      // Start drag selection with normal click+drag on empty canvas (no modifier keys)
      // Shift+drag will be handled by vis-network for canvas panning
      if (!event.shiftKey && !event.ctrlKey && !event.metaKey && event.button === 0) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const startX = event.clientX - rect.left;
          const startY = event.clientY - rect.top;
          
          // Check if click is on empty canvas (not on a node)
          const nodesAtPosition = network.getNodeAt({ x: startX, y: startY });
          
          if (!nodesAtPosition) {
            setIsSelecting(true);
            setSelectionBox({
              startX,
              startY,
              currentX: startX,
              currentY: startY,
              isVisible: true
            });
            
            // Prevent default dragging behavior
            event.preventDefault();
            event.stopPropagation();
          }
        }
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isSelecting && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const currentX = event.clientX - rect.left;
        const currentY = event.clientY - rect.top;
        
        setSelectionBox(prev => ({
          ...prev,
          currentX,
          currentY
        }));
      }
    };

    const handleMouseUp = () => {
      if (isSelecting) {
        // Calculate final selection area
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const { startX, startY, currentX, currentY } = selectionBox;
          
          // Define selection rectangle bounds
          const minX = Math.min(startX, currentX);
          const maxX = Math.max(startX, currentX);
          const minY = Math.min(startY, currentY);
          const maxY = Math.max(startY, currentY);
          
          // Find nodes within selection rectangle
          const allNodes = nodesDataSetRef.current?.get() as any[];
          const nodesInSelection: string[] = [];
          
          if (allNodes) {
            allNodes.forEach(node => {
              if (node.x !== undefined && node.y !== undefined) {
                // Convert node position to DOM coordinates
                const domPos = network.canvasToDOM({ x: node.x, y: node.y });
                
                // Check if node is within selection rectangle
                if (domPos.x >= minX && domPos.x <= maxX && 
                    domPos.y >= minY && domPos.y <= maxY) {
                  nodesInSelection.push(node.id);
                }
              }
            });
          }
          
          // Update selection
          const newSelection = new Set(selectedNodeIds);
          nodesInSelection.forEach(nodeId => newSelection.add(nodeId));
          setSelectedNodeIds(newSelection);
          syncSelectionWithNetwork(newSelection);
        }
        
        // Reset selection state
        setIsSelecting(false);
        setSelectionBox(prev => ({ ...prev, isVisible: false }));
      }
    };

    // Attach mouse event listeners
    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      container.addEventListener('mousedown', handleMouseDown);
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseup', handleMouseUp);
      // Make container focusable for keyboard events
      container.setAttribute('tabindex', '0');
    }

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
        nodesDataSetRef.current = null;
        edgesDataSetRef.current = null;
      }
      // Clean up event listeners
      if (container) {
        container.removeEventListener('keydown', handleKeyDown);
        container.removeEventListener('mousedown', handleMouseDown);
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseup', handleMouseUp);
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
      const isLocked = lockedNodes.has(node.id);
      const isSelected = selectedNodeIds.has(node.id);
      
      // Add direction indicator, lock indicator, and selection indicator to label
      const directionIcon = direction === 'parents' ? '🔼' : 
                           direction === 'both' ? '🔄' : '🔽';
      const lockIcon = isLocked ? '🔒' : '';
      const selectionIcon = isSelected ? '✓' : '';
      const directionLabel = `${icon}${lockIcon}${selectionIcon}\n${node.label || node.id}\n${directionIcon}`;

      return {
        id: node.id,
        label: directionLabel,
        title: `${node.label || node.id} (${node.type || 'Unknown'})\nDirection: ${direction}${isLocked ? '\nStatus: Locked' : ''}${isSelected ? '\nSelected' : ''}`,
        color: {
          background: isSelected 
            ? (theme === 'dark' ? '#312e81' : '#e0e7ff')  // Dark purple for dark theme, light blue for light theme
            : themeColors.nodeBackground,
          border: isLocked 
            ? '#ef4444' 
            : (isSelected 
                ? (theme === 'dark' ? '#6366f1' : '#3b82f6') // Indigo for dark theme, blue for light theme
                : statusColor
              ),
          highlight: {
            background: isSelected 
              ? (theme === 'dark' ? '#3730a3' : '#c7d2fe') // Darker purple/blue based on theme
              : themeColors.highlightBackground,
            border: isLocked 
              ? '#dc2626' 
              : (isSelected 
                  ? (theme === 'dark' ? '#4f46e5' : '#2563eb') // Theme-appropriate selection colors
                  : themeColors.highlightBorder
                ),
          },
        },
        fixed: isLocked ? { x: true, y: true } : false, // Apply locked state
        borderWidth: isLocked ? 3 : 2, // Thicker border for locked nodes
        borderWidthSelected: isLocked ? 5 : 4, // Even thicker when selected
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

  }, [topologyData, deviceDirections, forceRedraw, theme, selectedNodeIds, lockedNodes]);

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

  const handleLayoutChange = (newLayout: typeof layout, selectedOnly: boolean = false) => {
    console.log(`STATIC: Layout change requested: ${newLayout}${selectedOnly ? ' (selected nodes only)' : ''}`);
    setLayout(newLayout);
    
    // Store selective layout preference for the effect
    if (selectedOnly && selectedNodeIds.size > 0) {
      // Apply layout to selected nodes only
      applyLayoutToSelectedNodes(newLayout);
    } else {
      // Apply layout to all nodes (existing behavior)
      setForceRedraw(true);
    }
  };

  // Apply layout only to selected nodes
  const applyLayoutToSelectedNodes = (layoutType: typeof layout) => {
    if (!networkRef.current || selectedNodeIds.size === 0) return;

    const selectedNodesArray = Array.from(selectedNodeIds);
    const allNodes = nodesDataSetRef.current?.get() as any[];
    const selectedNodesData = allNodes?.filter(node => selectedNodeIds.has(node.id));

    if (!selectedNodesData || selectedNodesData.length === 0) return;

    console.log(`Applying ${layoutType} layout to ${selectedNodesData.length} selected nodes`);

    if (layoutType === 'hierarchical') {
      // Apply hierarchical layout to selected nodes only
      applySelectiveHierarchicalLayout(selectedNodesData);
    } else if (layoutType === 'physics') {
      // Apply physics layout to selected nodes only
      applySelectivePhysicsLayout(selectedNodesArray);
    } else if (layoutType === 'grid') {
      // Apply grid layout to selected nodes only
      applySelectiveGridLayout(selectedNodesData);
    }
  };

  // Selective layout implementation functions
  const applySelectiveHierarchicalLayout = (selectedNodes: any[]) => {
    if (selectedNodes.length === 0) return;
    
    const selectedNodeIds = new Set(selectedNodes.map(node => node.id));
    const edges = topologyData?.edges || [];
    
    // Build adjacency maps for selected nodes only
    const childrenMap = new Map<string, string[]>();
    const parentsMap = new Map<string, string[]>();
    
    edges.forEach(edge => {
      // Only consider edges between selected nodes
      if (selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)) {
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
      }
    });
    
    // Determine hierarchical levels for selected nodes
    const nodeLevels = new Map<string, number>();
    const processedNodes = new Set<string>();
    
    // Find root nodes (nodes with no parents in selected set)
    const rootNodes = selectedNodes.filter(node => !parentsMap.has(node.id));
    
    // If no clear hierarchy, arrange horizontally as before
    if (rootNodes.length === selectedNodes.length) {
      const startX = selectedNodes[0].x || 0;
      const startY = selectedNodes[0].y || 0;
      const spacing = 400;

      const updatedNodes = selectedNodes.map((node, index) => ({
        id: node.id,
        x: startX + (index * spacing),
        y: startY,
      }));

      nodesDataSetRef.current?.update(updatedNodes);
      console.log(`Applied horizontal layout to ${selectedNodes.length} nodes (no hierarchy detected)`);
      return;
    }
    
    // Assign levels using BFS approach
    const queue: Array<{nodeId: string, level: number}> = [];
    
    // Start with root nodes at level 0
    rootNodes.forEach(node => {
      nodeLevels.set(node.id, 0);
      processedNodes.add(node.id);
      queue.push({ nodeId: node.id, level: 0 });
    });
    
    // Process remaining nodes level by level
    while (queue.length > 0) {
      const { nodeId, level } = queue.shift()!;
      const children = childrenMap.get(nodeId) || [];
      
      children.forEach(childId => {
        if (selectedNodeIds.has(childId) && !processedNodes.has(childId)) {
          const childLevel = level + 1;
          nodeLevels.set(childId, childLevel);
          processedNodes.add(childId);
          queue.push({ nodeId: childId, level: childLevel });
        }
      });
    }
    
    // Group nodes by level
    const levelGroups = new Map<number, string[]>();
    nodeLevels.forEach((level, nodeId) => {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(nodeId);
    });
    
    // Calculate positions
    const levelSpacing = 300; // Vertical spacing between levels
    const nodeSpacing = 400; // Horizontal spacing between nodes
    const startX = selectedNodes[0].x || 0;
    const startY = selectedNodes[0].y || 0;
    
    const updatedNodes: any[] = [];
    
    levelGroups.forEach((nodeIds, level) => {
      const levelY = startY + (level * levelSpacing);
      const totalWidth = (nodeIds.length - 1) * nodeSpacing;
      const levelStartX = startX - (totalWidth / 2);
      
      nodeIds.forEach((nodeId, index) => {
        const x = levelStartX + (index * nodeSpacing);
        updatedNodes.push({
          id: nodeId,
          x: x,
          y: levelY,
        });
      });
    });
    
    nodesDataSetRef.current?.update(updatedNodes);
    console.log(`Applied hierarchical layout to ${selectedNodes.length} nodes across ${levelGroups.size} levels`);
  };

  const applySelectivePhysicsLayout = (selectedNodeIds: string[]) => {
    if (selectedNodeIds.length === 0) return;

    // Apply physics only to selected nodes by temporarily enabling physics
    // and constraining it to selected nodes
    if (networkRef.current) {
      // Get current positions of non-selected nodes to preserve them
      const allNodeIds = nodesDataSetRef.current?.getIds() as string[];
      const nonSelectedIds = allNodeIds.filter(id => !selectedNodeIds.includes(id));
      const preservedPositions: any[] = [];

      // Store positions of non-selected nodes
      nonSelectedIds.forEach(nodeId => {
        const node = nodesDataSetRef.current?.get(nodeId);
        if (node && node.x !== undefined && node.y !== undefined) {
          preservedPositions.push({
            id: nodeId,
            x: node.x,
            y: node.y,
            fixed: { x: true, y: true } // Fix non-selected nodes
          });
        }
      });

      // Fix non-selected nodes in place
      if (preservedPositions.length > 0) {
        nodesDataSetRef.current?.update(preservedPositions);
      }

      // Enable physics temporarily
      networkRef.current.setOptions({
        physics: { 
          enabled: true,
          barnesHut: {
            gravitationalConstant: -4000,
            centralGravity: 0.1,
            springLength: 200,
            springConstant: 0.05,
            damping: 0.09,
            avoidOverlap: 1,
          },
        }
      });

      // Disable physics after a short time and unfix non-selected nodes
      setTimeout(() => {
        if (networkRef.current) {
          networkRef.current.setOptions({ physics: { enabled: false } });
          
          // Unfix non-selected nodes (restore their original fixed state)
          const restoredNodes = preservedPositions.map(node => ({
            id: node.id,
            fixed: false // Restore to unfixed state
          }));
          
          if (restoredNodes.length > 0) {
            nodesDataSetRef.current?.update(restoredNodes);
          }
          
          console.log(`Applied selective physics layout to ${selectedNodeIds.length} nodes`);
        }
      }, 2000);
    }
  };

  const applySelectiveGridLayout = (selectedNodes: any[]) => {
    if (selectedNodes.length === 0) return;

    // Arrange selected nodes in a grid pattern
    const gridSize = Math.ceil(Math.sqrt(selectedNodes.length));
    const spacing = 200;
    
    // Use the center of selected nodes as reference point
    const centerX = selectedNodes.reduce((sum, node) => sum + (node.x || 0), 0) / selectedNodes.length;
    const centerY = selectedNodes.reduce((sum, node) => sum + (node.y || 0), 0) / selectedNodes.length;
    
    const startX = centerX - ((gridSize - 1) * spacing) / 2;
    const startY = centerY - ((Math.ceil(selectedNodes.length / gridSize) - 1) * spacing) / 2;

    const updatedNodes = selectedNodes.map((node, index) => ({
      id: node.id,
      x: startX + ((index % gridSize) * spacing),
      y: startY + (Math.floor(index / gridSize) * spacing),
    }));

    nodesDataSetRef.current?.update(updatedNodes);
    console.log(`Applied selective grid layout to ${selectedNodes.length} nodes`);
  };

  // Lock/unlock canvas functions
  const lockCanvas = () => {
    if (networkRef.current) {
      networkRef.current.setOptions({
        interaction: {
          dragNodes: false,
          dragView: false,
          zoomView: false,
          selectable: false,
        }
      });
      setIsLocked(true);
      console.log('Canvas locked - all interactions disabled');
    }
  };

  const unlockCanvas = () => {
    if (networkRef.current) {
      networkRef.current.setOptions({
        interaction: {
          dragNodes: true,
          dragView: true,
          zoomView: true,
          selectable: true,
        }
      });
      setIsLocked(false);
      console.log('Canvas unlocked - all interactions enabled');
    }
  };

  const toggleCanvasLock = () => {
    if (isLocked) {
      unlockCanvas();
    } else {
      lockCanvas();
    }
  };

  // Individual node lock/unlock functions
  const lockNode = (nodeId: string) => {
    if (nodesDataSetRef.current) {
      // Get current node to preserve other properties
      const currentNode = nodesDataSetRef.current.get(nodeId);
      if (currentNode) {
        // Update node with locked state and red border
        nodesDataSetRef.current.update({
          id: nodeId,
          fixed: { x: true, y: true },
          borderWidth: 3,
          color: {
            ...currentNode.color,
            border: '#ef4444', // Red border for locked
            highlight: {
              ...(currentNode.color?.highlight || {}),
              border: '#dc2626' // Darker red when selected
            }
          }
        });
      }
      setLockedNodes(prev => new Set(prev.add(nodeId)));
      console.log(`🔒 Node ${nodeId} locked`);
    }
  };

  const unlockNode = (nodeId: string) => {
    if (nodesDataSetRef.current) {
      // Get current node to restore original color
      const currentNode = nodesDataSetRef.current.get(nodeId);
      if (currentNode) {
        // Determine original status color
        const status = topologyData?.nodes.find(n => n.id === nodeId)?.status || 'active';
        const statusColor = getStatusColor(status);
        const themeColors = getThemeColors();
        
        // Update node with unlocked state and original border
        nodesDataSetRef.current.update({
          id: nodeId,
          fixed: false,
          borderWidth: 2,
          color: {
            ...currentNode.color,
            border: statusColor, // Restore original border color
            highlight: {
              ...(currentNode.color?.highlight || {}),
              border: themeColors.highlightBorder // Restore original highlight
            }
          }
        });
      }
      setLockedNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
      console.log(`🔓 Node ${nodeId} unlocked`);
    }
  };

  const toggleNodeLock = (nodeId: string) => {
    if (lockedNodes.has(nodeId)) {
      unlockNode(nodeId);
    } else {
      lockNode(nodeId);
    }
  };

  const handleDirectionSelect = (direction: 'parents' | 'children' | 'both') => {
    if (onDirectionChange && modalState.nodeId) {
      onDirectionChange(direction, modalState.nodeId);
    }
  };

  const handleDeviceDepthChange = (depth: number) => {
    if (onDepthChange && modalState.nodeId) {
      onDepthChange(depth, modalState.nodeId);
    }
  };

  const handleDrawSelectedItems = (pendingDepth: number) => {
    if (onDepthChange && selectedNodeIds.size > 0) {
      // Apply pending depth to all selected nodes by calling onDepthChange for each
      const selectedNodes = Array.from(selectedNodeIds);
      console.log(`🎯 Applying depth ${pendingDepth} to ${selectedNodes.length} selected nodes:`, selectedNodes);
      
      // For each selected node, trigger depth change
      selectedNodes.forEach(nodeId => {
        onDepthChange(pendingDepth, nodeId);
      });
    }
  };

  const handleNodeLockToggle = () => {
    if (modalState.nodeId) {
      toggleNodeLock(modalState.nodeId);
    }
  };

  const handleModalClose = () => {
    setModalState(prev => ({
      ...prev,
      isOpen: false,
    }));
  };

  // Synchronize our custom selection with vis-network's internal selection
  const syncSelectionWithNetwork = (nodeIds: Set<string>) => {
    if (networkRef.current) {
      const idsArray = Array.from(nodeIds);
      networkRef.current.setSelection({
        nodes: idsArray,
        edges: []
      });
      console.log(`🔄 Synced selection with vis-network: ${idsArray.length} nodes`);
    }
  };

  // Selection management functions
  const selectAllNodes = () => {
    const allNodeIds = nodesDataSetRef.current?.getIds() as string[];
    if (allNodeIds) {
      const newSelection = new Set(allNodeIds);
      setSelectedNodeIds(newSelection);
      syncSelectionWithNetwork(newSelection);
      console.log(`✅ Selected all ${allNodeIds.length} nodes`);
    }
  };

  const clearSelection = () => {
    const emptySelection = new Set<string>();
    setSelectedNodeIds(emptySelection);
    syncSelectionWithNetwork(emptySelection);
    console.log('🗑️ Cleared node selection');
  };

  const getSelectedNodesCount = () => {
    return selectedNodeIds.size;
  };

  return (
    <div className={`${styles.simpleVisNetworkTopology} ${className}`}>
      {/* Controls Header */}
      <div className="absolute top-4 left-4 flex items-start space-x-4 z-20">
        {/* Depth Selector */}
        {onDepthChange && (
          <DepthSelector
            globalDepth={globalDepth}
            onDepthChange={onDepthChange}
            hasCanvasItems={!!(topologyData && topologyData.nodes && topologyData.nodes.length > 0)}
            selectedNodesCount={selectedNodeIds.size}
            onDrawItems={handleDrawSelectedItems}
            theme={theme}
          />
        )}
        
        {/* Integrated Controls Panel */}
        <ZoomControls 
          networkRef={networkRef} 
          theme={theme}
          layout={layout}
          onLayoutChange={handleLayoutChange}
          onClearAll={onClearAll}
          isLocked={isLocked}
          onToggleLock={toggleCanvasLock}
          selectedCount={getSelectedNodesCount()}
          onSelectAll={selectAllNodes}
          onClearSelection={clearSelection}
        />
      </div>
      
      <div 
        ref={containerRef} 
        className={`${styles.visContainer} ${isLocked ? styles.locked : ''}`}
      />

      {/* Selection Rectangle Overlay */}
      {selectionBox.isVisible && (
        <div
          className={styles.selectionRectangle}
          style={{
            position: 'absolute',
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.currentX - selectionBox.startX),
            height: Math.abs(selectionBox.currentY - selectionBox.startY),
            border: '2px dashed #3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        />
      )}

      {/* Device Relationship Modal */}
      <DeviceRelationshipModal
        isOpen={modalState.isOpen}
        position={modalState.position}
        nodeId={modalState.nodeId}
        nodeName={modalState.nodeName}
        nodeType={modalState.nodeType}
        currentDirection={deviceDirections?.get(modalState.nodeId) || 'children'}
        currentDepth={deviceDepths?.get(modalState.nodeId) || globalDepth}
        maxDepth={configService.getTopologyConfig().controls.maxDepth}
        isNodeLocked={lockedNodes.has(modalState.nodeId)}
        onDirectionSelect={handleDirectionSelect}
        onDepthChange={onDepthChange ? handleDeviceDepthChange : undefined}
        onLockToggle={handleNodeLockToggle}
        onClose={handleModalClose}
      />
    </div>
  );
};