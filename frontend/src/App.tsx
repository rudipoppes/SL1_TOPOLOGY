import React, { useState, useRef, useEffect } from 'react';
import { Device, TopologyResponse, apiService } from './services/api';
import { DeviceList } from './components/DeviceInventory/DeviceList';
import { VisControlledTopology } from './components/TopologyCanvas/VisControlledTopology';
import { configService } from './services/config';
import { useTheme } from './hooks/useTheme';
import './App.css';

function App() {
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
  const defaultDepth = configService.getTopologyConfig().controls.defaultDepth;
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const handleDeviceSelect = async (devices: Device[]) => {
    setSelectedDevices(devices);
    console.log('Selected devices changed:', devices.map(d => d.name));
    
    // Update topology to match chip area (selected devices)
    setTopologyDevices(devices);
    
    // Set default directions and depths for all new devices
    const newDirections = new Map(deviceDirections);
    const newDepths = new Map(deviceDepths);
    devices.forEach(device => {
      if (!newDirections.has(device.id)) {
        newDirections.set(device.id, defaultDirection);
      }
      if (!newDepths.has(device.id)) {
        newDepths.set(device.id, globalDepth);
      }
    });
    setDeviceDirections(newDirections);
    setDeviceDepths(newDepths);
    
    // Fetch topology data with per-device directions
    await fetchTopologyDataWithDeviceDirections(devices);
  };


  const handleClearAll = () => {
    console.log('Clearing all topology data');
    setTopologyDevices([]);
    setTopologyData(null);
    setSelectedDevices([]);
  };

  const handleDepthChange = async (depth: number, deviceId?: string) => {
    if (deviceId) {
      // Change depth for specific device
      console.log('🔄 Changing depth for device:', deviceId, 'to:', depth);
      setDeviceDepths(prev => new Map(prev.set(deviceId, depth)));
      
      // Find the device in current topology data
      const deviceInTopology = topologyData?.nodes.find(n => n.id === deviceId);
      if (deviceInTopology) {
        // Create a Device object from the topology node
        const deviceToAdd: Device = {
          id: deviceInTopology.id,
          name: deviceInTopology.label,
          ip: deviceInTopology.ip || '',
          type: deviceInTopology.type || 'Unknown',
          status: deviceInTopology.status || 'unknown'
        };
        
        // Add device to selected devices (chip area) if not already there
        const isAlreadySelected = selectedDevices.some(d => d.id === deviceId);
        if (!isAlreadySelected) {
          console.log('➕ Adding device to selection:', deviceToAdd.name);
          setSelectedDevices(prev => [...prev, deviceToAdd]);
          setTopologyDevices(prev => [...prev, deviceToAdd]);
        }
        
        // Use incremental fetch to get new relationships for this specific device
        await fetchIncrementalTopologyDataWithDirections([deviceToAdd]);
      } else {
        console.warn('Device not found in topology:', deviceId);
      }
    } else {
      // Global depth change
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
      // Change direction for specific device
      console.log('🔄 Changing direction for device:', deviceId, 'to:', direction);
      setDeviceDirections(prev => new Map(prev.set(deviceId, direction)));
      
      // Find the device in current topology data
      const deviceInTopology = topologyData?.nodes.find(n => n.id === deviceId);
      if (deviceInTopology) {
        // Create a Device object from the topology node
        const deviceToAdd: Device = {
          id: deviceInTopology.id,
          name: deviceInTopology.label,
          ip: deviceInTopology.ip || '',
          type: deviceInTopology.type || 'Unknown',
          status: deviceInTopology.status || 'unknown'
        };
        
        // Add device to selected devices (chip area) if not already there
        const isAlreadySelected = selectedDevices.some(d => d.id === deviceId);
        if (!isAlreadySelected) {
          console.log('➕ Adding device to selection:', deviceToAdd.name);
          setSelectedDevices(prev => [...prev, deviceToAdd]);
          setTopologyDevices(prev => [...prev, deviceToAdd]);
        }
        
        // Use incremental fetch to get new relationships for this specific device
        await fetchIncrementalTopologyDataWithDirections([deviceToAdd]);
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
        deviceDepthsObj[device.id] = deviceDepths.get(device.id) || defaultDepth;
      });

      console.log('🔍 Fetching topology with per-device directions and depths:', {
        directions: deviceDirectionsObj,
        depths: deviceDepthsObj
      });
      
      const response = await apiService.getTopology({
        deviceIds: devices.map(d => d.id),
        depth: globalDepth,
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
      
      console.log('📊 Complete topology with per-device directions:', completeTopology);
      
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
        deviceDepthsObj[device.id] = deviceDepths.get(device.id) || defaultDepth;
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
          onDepthChange={(depth: number) => handleDepthChange(depth)}
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
              <div className="absolute top-6 left-6 z-10 glass-panel px-4 py-3 rounded-xl border border-blue-200/50 backdrop-blur-md animate-slide-in animate-glow">
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

export default App;