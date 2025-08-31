import React, { useState, useRef, useEffect } from 'react';
import { Device, TopologyResponse, apiService } from './services/api';
import { DeviceList } from './components/DeviceInventory/DeviceList';
import { VisControlledTopology } from './components/TopologyCanvas/VisControlledTopology';
import { configService } from './services/config';
import { useTheme } from './hooks/useTheme';
import { SimpleAuthProvider } from './contexts/SimpleAuthContext';
import { SimpleProtectedRoute } from './components/Auth/SimpleProtectedRoute';
import './App.css';

function AppContent() {
  const [selectedDevices, setSelectedDevices] = useState<Device[]>([]);
  const [topologyDevices, setTopologyDevices] = useState<Device[]>([]);
  const [topologyData, setTopologyData] = useState<TopologyResponse['topology'] | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);
  const [loadingTopology, setLoadingTopology] = useState(false);
  const [deviceDirections, setDeviceDirections] = useState<Map<string, 'parents' | 'children' | 'both'>>(new Map());
  const [deviceDepths, setDeviceDepths] = useState<Map<string, number>>(new Map());
  const [globalDepth, setGlobalDepth] = useState<number>(configService.getTopologyConfig().controls.defaultDepth);
  const defaultDirection = configService.getTopologyConfig().controls.defaultDirection as 'parents' | 'children' | 'both';
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const handleDeviceSelect = async (devices: Device[]) => {
    setSelectedDevices(devices);
    console.log('Selected devices changed:', devices.map(d => d.name));
    
    // Update topology to match chip area (selected devices)
    setTopologyDevices(devices);
    
    // Clean up settings for devices that are no longer selected
    const selectedDeviceIds = new Set(devices.map(d => d.id));
    const newDirections = new Map<string, 'parents' | 'children' | 'both'>();
    const newDepths = new Map<string, number>();
    
    // Only keep settings for devices that are still selected, and add new devices
    deviceDirections.forEach((direction, deviceId) => {
      if (selectedDeviceIds.has(deviceId)) {
        newDirections.set(deviceId, direction);
      }
    });
    deviceDepths.forEach((depth, deviceId) => {
      if (selectedDeviceIds.has(deviceId)) {
        newDepths.set(deviceId, depth);
      }
    });
    
    // Add new devices with default settings
    devices.forEach(device => {
      if (!newDirections.has(device.id)) {
        newDirections.set(device.id, defaultDirection);
      }
      if (!newDepths.has(device.id)) {
        newDepths.set(device.id, globalDepth);
        console.log('🆕 Adding new device to depth map:', device.id, 'with depth:', globalDepth);
      }
    });
    
    setDeviceDirections(newDirections);
    setDeviceDepths(newDepths);
    
    // Handle topology updates intelligently - DON'T rebuild everything
    // Identify new devices vs existing devices
    const currentTopologyDeviceIds = new Set(topologyDevices.map(d => d.id));
    const newDevices = devices.filter(device => !currentTopologyDeviceIds.has(device.id));
    const removedDeviceIds = topologyDevices
      .filter(device => !devices.some(d => d.id === device.id))
      .map(device => device.id);
    
    if (removedDeviceIds.length > 0) {
      // Remove devices and their relationships from topology
      setTopologyData(prevTopology => {
        if (!prevTopology) return null;
        
        // Remove nodes that belong to removed devices and their relationships
        const nodesToRemove = new Set<string>();
        
        // Find all nodes connected to removed devices
        removedDeviceIds.forEach(removedDeviceId => {
          const reachableNodes = findNodesWithinDepth(
            removedDeviceId,
            10, // Large depth to find all connected nodes
            'both',
            prevTopology.edges
          );
          reachableNodes.forEach(nodeId => nodesToRemove.add(nodeId));
        });
        
        const keptNodes = prevTopology.nodes.filter(node => 
          !nodesToRemove.has(node.id)
        );
        const keptEdges = prevTopology.edges.filter(edge => 
          !nodesToRemove.has(edge.source) && !nodesToRemove.has(edge.target)
        );
        
        console.log(`🗑️ Removed ${nodesToRemove.size} nodes for ${removedDeviceIds.length} devices`);
        
        return {
          nodes: keptNodes,
          edges: keptEdges
        };
      });
    }
    
    if (newDevices.length > 0) {
      // Only add new devices incrementally - PRESERVES existing topology
      console.log('🆕 Adding new devices incrementally:', newDevices.map(d => d.name));
      await fetchIncrementalTopologyDataWithDirections(newDevices);
    } else if (removedDeviceIds.length === 0 && devices.length === 0) {
      // Clear all topology if no devices selected
      setTopologyData(null);
    }
  };


  const handleClearAll = () => {
    console.log('Clearing all topology data');
    setTopologyDevices([]);
    setTopologyData(null);
    setSelectedDevices([]);
    // Clear device-specific settings so new placements use current global settings
    setDeviceDirections(new Map());
    setDeviceDepths(new Map());
  };

  // Handler for sidebar depth selector - only updates the default depth setting
  const handleGlobalDepthChange = (depth: number) => {
    console.log('🔄 Setting default depth to:', depth);
    setGlobalDepth(depth);
    // Do NOT refresh topology - only update the default for new device placements
  };

  // Helper function to find all nodes reachable from a root node within given depth
  const findNodesWithinDepth = (
    rootNodeId: string, 
    maxDepth: number, 
    direction: 'parents' | 'children' | 'both',
    allEdges: any[]
  ): Set<string> => {
    const reachableNodes = new Set<string>();
    const visited = new Set<string>();
    
    const traverse = (nodeId: string, currentDepth: number) => {
      if (currentDepth > maxDepth || visited.has(nodeId)) {
        return;
      }
      
      visited.add(nodeId);
      reachableNodes.add(nodeId);
      
      if (currentDepth < maxDepth) {
        // Find connected nodes based on direction
        allEdges.forEach(edge => {
          if (direction === 'children' || direction === 'both') {
            // Traverse children (outgoing edges)
            if (edge.source === nodeId && !visited.has(edge.target)) {
              traverse(edge.target, currentDepth + 1);
            }
          }
          if (direction === 'parents' || direction === 'both') {
            // Traverse parents (incoming edges)
            if (edge.target === nodeId && !visited.has(edge.source)) {
              traverse(edge.source, currentDepth + 1);
            }
          }
        });
      }
    };
    
    traverse(rootNodeId, 0);
    return reachableNodes;
  };

  const handleDepthChange = async (depth: number, deviceId?: string) => {
    if (deviceId) {
      // Change depth for specific device - UPDATE its portion of the topology
      
      // Update device depths Map synchronously
      const updatedDeviceDepths = new Map(deviceDepths.set(deviceId, depth));
      setDeviceDepths(updatedDeviceDepths);
      
      // Find the device in current topology data
      const deviceInTopology = topologyData?.nodes.find(n => n.id === deviceId);
      if (deviceInTopology) {
        setLoadingTopology(true);
        try {
          const deviceDirection = deviceDirections.get(deviceId) || defaultDirection;
          const response = await apiService.getTopology({
            deviceIds: [deviceId],
            deviceDirections: { [deviceId]: deviceDirection },
            deviceDepths: { [deviceId]: depth }
          });
          
          // PROPER topology reduction and merge logic
          setTopologyData(prevTopology => {
            if (!prevTopology) return response.topology;
            
            // Step 1: Find all nodes that were previously reachable from this device
            const oldReachableNodes = findNodesWithinDepth(
              deviceId,
              10, // Use large depth to find all previously connected nodes
              deviceDirection,
              prevTopology.edges
            );
            
            // Step 2: Find nodes that should remain after the depth change
            const newReachableNodes = new Set(response.topology.nodes.map(n => n.id));
            
            // Step 3: Identify nodes to remove (previously reachable but not in new result)
            const nodesToRemove = new Set<string>();
            oldReachableNodes.forEach(nodeId => {
              if (!newReachableNodes.has(nodeId) && nodeId !== deviceId) {
                nodesToRemove.add(nodeId);
              }
            });
            
            // Step 4: Filter out nodes that should be removed
            const keptNodes = prevTopology.nodes.filter(node => 
              !nodesToRemove.has(node.id)
            );
            
            // Step 5: Filter out edges that connect to removed nodes
            const keptEdges = prevTopology.edges.filter(edge => 
              !nodesToRemove.has(edge.source) && !nodesToRemove.has(edge.target)
            );
            
            // Step 6: Add new nodes (that weren't already in the topology)
            const existingNodeIds = new Set(keptNodes.map(n => n.id));
            const newNodes = response.topology.nodes.filter(node => 
              !existingNodeIds.has(node.id)
            );
            
            // Step 7: Add new edges (that weren't already in the topology)
            const existingEdgeKeys = new Set(keptEdges.map(edge => `${edge.source}-${edge.target}`));
            const newEdges = response.topology.edges.filter(edge => 
              !existingEdgeKeys.has(`${edge.source}-${edge.target}`)
            );
            
            console.log(`🔧 Topology reduction: Removed ${nodesToRemove.size} nodes, added ${newNodes.length} nodes`);
            
            return {
              nodes: [...keptNodes, ...newNodes],
              edges: [...keptEdges, ...newEdges]
            };
          });
        } catch (error) {
          console.error('❌ Failed to fetch individual device topology:', error);
        } finally {
          setLoadingTopology(false);
        }
      } else {
        console.warn('Device not found in topology:', deviceId);
      }
    } else {
      // Global depth change with topology refresh (used for modal-based changes)
      console.log('🔄 Changing global depth to:', depth);
      setGlobalDepth(depth);
      const newDepths = new Map<string, number>();
      topologyDevices.forEach(device => {
        newDepths.set(device.id, depth);
      });
      setDeviceDepths(newDepths);
      
      // Refresh topology with updated global depth
      await fetchTopologyDataWithDeviceDirections(topologyDevices);
    }
  };

  const handleDirectionChange = async (direction: 'parents' | 'children' | 'both', deviceId?: string) => {
    if (deviceId) {
      // Change direction for specific device - UPDATE its portion of the topology
      console.log('🔄 Changing direction for device:', deviceId, 'to:', direction);
      setDeviceDirections(prev => new Map(prev.set(deviceId, direction)));
      
      // Find the device in current topology data
      const deviceInTopology = topologyData?.nodes.find(n => n.id === deviceId);
      if (deviceInTopology) {
        // DON'T add to chip area - device is already on canvas
        // The chip area should only show devices dragged from inventory
        // Devices on canvas being modified shouldn't be added to selection
        
        // IMPORTANT: Fetch the updated device topology and MERGE with existing
        setLoadingTopology(true);
        try {
          const deviceDepth = deviceDepths.get(deviceId) || globalDepth;
          const response = await apiService.getTopology({
            deviceIds: [deviceId],
            deviceDirections: { [deviceId]: direction },
            deviceDepths: { [deviceId]: deviceDepth }
          });
          
          // MERGE the new device topology with existing topology
          setTopologyData(prevTopology => {
            if (!prevTopology) return response.topology;
            
            // Keep nodes that are not in the new device's tree from previous topology
            const keptNodes = prevTopology.nodes.filter(node => {
              return !response.topology.nodes.some(newNode => newNode.id === node.id);
            });
            
            // Keep edges that don't match new edges
            const keptEdges = prevTopology.edges.filter(edge => {
              return !response.topology.edges.some(newEdge => 
                (newEdge.source === edge.source && newEdge.target === edge.target)
              );
            });
            
            // Combine kept nodes/edges with new ones
            return {
              nodes: [...keptNodes, ...response.topology.nodes],
              edges: [...keptEdges, ...response.topology.edges]
            };
          });
        } catch (error) {
          console.error('❌ Failed to fetch individual device topology:', error);
        } finally {
          setLoadingTopology(false);
        }
      } else {
        console.warn('Device not found in topology:', deviceId);
      }
    } else {
      // Global direction change (fallback for compatibility)
      console.log('🔄 Changing global direction to:', direction);
      const newDirections = new Map<string, 'parents' | 'children' | 'both'>();
      topologyDevices.forEach(device => {
        newDirections.set(device.id, direction);
      });
      setDeviceDirections(newDirections);
      
      // Refresh topology with updated global directions (no clearing needed with proper merge logic)
      await fetchTopologyDataWithDeviceDirections(topologyDevices);
    }
  };



  const fetchTopologyDataWithDeviceDirections = async (devices: Device[]) => {
    if (devices.length === 0) {
      setTopologyData(null);
      return;
    }

    setLoadingTopology(true);
    try {
      // Create device directions and depths objects
      const deviceDirectionsObj: { [deviceId: string]: 'parents' | 'children' | 'both' } = {};
      const deviceDepthsObj: { [deviceId: string]: number } = {};
      devices.forEach(device => {
        deviceDirectionsObj[device.id] = deviceDirections.get(device.id) || defaultDirection;
        deviceDepthsObj[device.id] = deviceDepths.get(device.id) || globalDepth;
      });

      
      const response = await apiService.getTopology({
        deviceIds: devices.map(d => d.id),
        deviceDirections: deviceDirectionsObj,
        deviceDepths: deviceDepthsObj
      });
      
      console.log('📊 Topology data received:', response.topology);
      
      // Ensure ALL selected devices appear on canvas, even if they have no relationships
      const deviceNodes = devices.map(device => ({
        id: device.id,
        label: device.name,
        type: device.type,
        status: device.status,
        ip: device.ip
      }));
      
      // Merge API nodes with selected device nodes (avoid duplicates)
      const existingNodeIds = new Set(response.topology.nodes.map(n => n.id));
      const missingDeviceNodes = deviceNodes.filter(node => !existingNodeIds.has(node.id));
      
      const completeTopology = {
        nodes: [...response.topology.nodes, ...missingDeviceNodes],
        edges: response.topology.edges
      };
      
      
      // Use merging logic to prevent canvas view resets and phantom edges
      setTopologyData(prevTopology => {
        if (!prevTopology) {
          return completeTopology;
        }
        
        // For direction changes, we want to REPLACE edges but preserve node positions
        // The new completeTopology already contains all devices that should be visible
        return completeTopology;
      });
    } catch (error) {
      console.error('❌ Failed to fetch topology with device directions:', error);
      // Create simple topology with just the devices (no relationships)
      setTopologyData({
        nodes: devices.map(device => ({
          id: device.id,
          label: device.name,
          type: device.type,
          status: device.status,
          ip: device.ip
        })),
        edges: [] // No relationships when API fails
      });
    } finally {
      setLoadingTopology(false);
    }
  };

  const fetchIncrementalTopologyDataWithDirections = async (newDevices: Device[]) => {
    if (newDevices.length === 0) return;

    setLoadingTopology(true);
    try {
      // Create device directions and depths objects for new devices only
      const deviceDirectionsObj: { [deviceId: string]: 'parents' | 'children' | 'both' } = {};
      const deviceDepthsObj: { [deviceId: string]: number } = {};
      newDevices.forEach(device => {
        deviceDirectionsObj[device.id] = deviceDirections.get(device.id) || defaultDirection;
        deviceDepthsObj[device.id] = deviceDepths.get(device.id) || globalDepth;
      });

      console.log('🔄 Fetching INCREMENTAL topology with per-device directions and depths:', {
        directions: deviceDirectionsObj,
        depths: deviceDepthsObj
      });
      
      const response = await apiService.getTopology({
        deviceIds: newDevices.map(d => d.id),
        depth: globalDepth,
        deviceDirections: deviceDirectionsObj,
        deviceDepths: deviceDepthsObj
      });
      
      console.log('📊 Incremental topology data received:', response.topology);
      
      // Merge with existing topology data instead of replacing
      setTopologyData(prevTopology => {
        if (!prevTopology) {
          return response.topology;
        }
        
        // Ensure the new devices are always included
        const newDeviceNodes = newDevices.map(device => ({
          id: device.id,
          label: device.name,
          type: device.type,
          status: device.status,
          ip: device.ip
        }));
        
        // Merge nodes (avoid duplicates by ID)
        const existingNodeIds = new Set(prevTopology.nodes.map(n => n.id));
        const apiNodes = response.topology.nodes.filter(n => !existingNodeIds.has(n.id));
        const missingDeviceNodes = newDeviceNodes.filter(n => !existingNodeIds.has(n.id));
        
        const allNewNodes = [...apiNodes];
        missingDeviceNodes.forEach(deviceNode => {
          if (!allNewNodes.some(n => n.id === deviceNode.id)) {
            allNewNodes.push(deviceNode);
          }
        });
        
        const mergedNodes = [...prevTopology.nodes, ...allNewNodes];
        
        // Merge edges with STRICT validation against current node set
        const mergedNodeIds = new Set([...prevTopology.nodes.map(n => n.id), ...allNewNodes.map(n => n.id)]);
        
        // CRITICAL: Filter existing edges to only include those with valid nodes in current set
        const validExistingEdges = prevTopology.edges.filter(edge => 
          mergedNodeIds.has(edge.source) && mergedNodeIds.has(edge.target)
        );
        
        // Filter new edges for duplicates and validate against current node set  
        const existingEdgeKeys = new Set(validExistingEdges.map(e => `${e.source}-${e.target}`));
        const validNewEdges = response.topology.edges.filter(e => {
          const hasValidNodes = mergedNodeIds.has(e.source) && mergedNodeIds.has(e.target);
          const isNotDuplicate = !existingEdgeKeys.has(`${e.source}-${e.target}`);
          return hasValidNodes && isNotDuplicate;
        });
        
        const mergedEdges = [...validExistingEdges, ...validNewEdges];
        
        console.log('🔍 PHANTOM PREVENTION in merge:', {
          prevEdges: prevTopology.edges.length,
          validExistingEdges: validExistingEdges.length,
          newApiEdges: response.topology.edges.length,
          validNewEdges: validNewEdges.length,
          finalMergedEdges: mergedEdges.length,
          removedInvalidEdges: prevTopology.edges.length - validExistingEdges.length
        });
        
        console.log('🔄 Merged topology with per-device directions:', {
          prevNodes: prevTopology.nodes.length,
          newApiNodes: apiNodes.length,
          newDeviceNodes: allNewNodes.length,
          totalNodes: mergedNodes.length,
          prevEdges: prevTopology.edges.length,
          newEdges: validNewEdges.length,
          totalEdges: mergedEdges.length
        });
        
        return {
          nodes: mergedNodes,
          edges: mergedEdges
        };
      });
      
    } catch (error) {
      console.error('❌ Failed to fetch incremental topology with device directions:', error);
      
      // Fallback: add just the new devices as nodes without relationships
      setTopologyData(prevTopology => {
        const newNodes = newDevices.map(device => ({
          id: device.id,
          label: device.name,
          type: device.type,
          status: device.status,
          ip: device.ip
        }));
        
        if (!prevTopology) {
          return { nodes: newNodes, edges: [] };
        }
        
        const existingNodeIds = new Set(prevTopology.nodes.map(n => n.id));
        const filteredNewNodes = newNodes.filter(n => !existingNodeIds.has(n.id));
        
        return {
          nodes: [...prevTopology.nodes, ...filteredNewNodes],
          edges: prevTopology.edges
        };
      });
    } finally {
      setLoadingTopology(false);
    }
  };

  // Legacy function - kept for potential future compatibility  
  const fetchTopologyData = async (devices: Device[], direction?: 'parents' | 'children' | 'both') => {
    // Legacy function - now redirects to per-device approach
    const newDirections = new Map<string, 'parents' | 'children' | 'both'>();
    const newDepths = new Map<string, number>();
    devices.forEach(device => {
      newDirections.set(device.id, direction || defaultDirection);
      newDepths.set(device.id, globalDepth);
    });
    setDeviceDirections(newDirections);
    setDeviceDepths(newDepths);
    return fetchTopologyDataWithDeviceDirections(devices);
  };


  // Legacy function - kept for potential future compatibility
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchIncrementalTopologyData = async (newDevices: Device[], direction?: 'parents' | 'children' | 'both') => {
    // Legacy function - now redirects to per-device approach
    newDevices.forEach(device => {
      setDeviceDirections(prev => new Map(prev.set(device.id, direction || defaultDirection)));
      setDeviceDepths(prev => new Map(prev.set(device.id, globalDepth)));
    });
    return fetchIncrementalTopologyDataWithDirections(newDevices);
  };

  // Reference legacy functions to avoid TS unused variable errors
  void fetchTopologyData;
  void fetchIncrementalTopologyData;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX;
    if (newWidth >= 320 && newWidth <= 800) {
      setLeftPanelWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <div ref={containerRef} className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-100/30 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 transition-colors duration-300">
      {/* Resizable Left Panel - Device Inventory */}
      <div 
        className="glass-panel flex-shrink-0 border-r border-white/20 animate-slide-in"
        style={{ width: `${leftPanelWidth}px` }}
      >
        <DeviceList
          onDeviceSelect={handleDeviceSelect}
          onClearSelection={handleClearAll}
          selectedDevices={selectedDevices}
          theme={theme}
          onThemeToggle={toggleTheme}
          globalDepth={globalDepth}
          onDepthChange={handleGlobalDepthChange}
        />
      </div>

      {/* Modern Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`
          w-1 hover:w-2 bg-gradient-to-b from-slate-200/60 to-slate-300/60 
          hover:from-blue-400/80 hover:to-blue-500/80 cursor-col-resize 
          transition-all duration-300 ease-out backdrop-blur-sm
          ${isResizing ? 'w-2 from-blue-500/90 to-blue-600/90 shadow-lg shadow-blue-500/20' : ''}
        `}
        style={{
          background: isResizing 
            ? 'linear-gradient(to bottom, rgb(59 130 246 / 0.9), rgb(37 99 235 / 0.9))' 
            : undefined,
        }}
      />

      {/* Right Panel - Topology Canvas */}
      <div className="flex-1 p-6 bg-gradient-to-br from-slate-50/50 via-white/30 to-blue-50/40 dark:from-slate-700/50 dark:via-slate-600/30 dark:to-slate-700/40 animate-slide-in transition-colors duration-300" style={{ animationDelay: '100ms' }}>
        {topologyDevices.length === 0 ? (
          <div className="h-full glass-panel rounded-2xl flex items-center justify-center border border-white/30 animate-scale-in hover-lift" style={{ animationDelay: '200ms' }}>
            <div className="text-center text-slate-600">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-2xl animate-pulse-subtle"></div>
                <svg
                  className="relative w-20 h-20 mx-auto text-slate-400 transition-transform duration-300 hover:scale-110"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 bg-gradient-to-r from-slate-700 to-slate-600 bg-clip-text text-transparent transition-all duration-300 hover:from-blue-600 hover:to-indigo-600">
                Select a device to build topology
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed transition-colors duration-300 hover:text-slate-600">
                Click on devices in the inventory to add them to the topology visualization
              </p>
            </div>
          </div>
        ) : (
          <div className="relative h-full animate-scale-in" style={{ animationDelay: '200ms' }}>
            {loadingTopology && (
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 glass-panel px-4 py-3 rounded-xl border border-blue-200/50 backdrop-blur-md animate-slide-in animate-glow">
                <div className="flex items-center space-x-3 text-blue-700">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-medium">Loading topology...</span>
                </div>
              </div>
            )}
            <VisControlledTopology 
              devices={topologyDevices}
              selectedDevices={selectedDevices}
              topologyData={topologyData}
              deviceDirections={deviceDirections}
              deviceDepths={deviceDepths}
              globalDepth={globalDepth}
              onDirectionChange={handleDirectionChange}
              onDepthChange={handleDepthChange}
              onClearAll={handleClearAll}
              className="h-full"
              theme={theme}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  // Port-based authentication detection
  const isProductionPort = window.location.port === '4000';
  
  if (isProductionPort) {
    return (
      <SimpleAuthProvider>
        <SimpleProtectedRoute>
          <AppContent />
        </SimpleProtectedRoute>
      </SimpleAuthProvider>
    );
  }
  
  // Development port 3000 - no authentication
  return <AppContent />;
}

export default App;