import React, { useState, useRef, useEffect } from 'react';
import { Device, TopologyResponse, apiService } from './services/api';
import { DeviceList } from './components/DeviceInventory/DeviceList';
import { EnterpriseTopologyFlow } from './components/TopologyCanvas/EnterpriseTopologyFlow';
import { configService } from './services/config';
import './App.css';

function App() {
  const [selectedDevices, setSelectedDevices] = useState<Device[]>([]);
  const [topologyDevices, setTopologyDevices] = useState<Device[]>([]);
  const [topologyData, setTopologyData] = useState<TopologyResponse['topology'] | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);
  const [loadingTopology, setLoadingTopology] = useState(false);
  const [topologyDirection, setTopologyDirection] = useState<'parents' | 'children' | 'both'>(
    configService.getTopologyConfig().controls.defaultDirection as 'parents' | 'children' | 'both'
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDeviceSelect = async (devices: Device[]) => {
    setSelectedDevices(devices);
    console.log('Selected devices changed:', devices.map(d => d.name));
    
    // Update topology to match chip area (selected devices)
    setTopologyDevices(devices);
    
    // Fetch topology data for selected devices
    await fetchTopologyData(devices);
  };


  const handleClearAll = () => {
    console.log('Clearing all topology data');
    setTopologyDevices([]);
    setTopologyData(null);
    setSelectedDevices([]);
  };

  const handleDirectionChange = async (direction: 'parents' | 'children' | 'both') => {
    console.log('🔄 Changing topology direction to:', direction);
    setTopologyDirection(direction);
    // Refresh topology with new direction
    if (topologyDevices.length > 0) {
      await fetchTopologyData(topologyDevices, direction);
    }
  };

  const handleAddDeviceToSelection = async (device: Device) => {
    console.log('🎯 Adding device to selection from context menu:', device.name);
    
    // Check if device is already selected
    const isAlreadySelected = selectedDevices.some(d => d.name === device.name);
    if (isAlreadySelected) {
      console.log('Device already in chip area, skipping add');
      return;
    }
    
    // Add device to selected devices
    const updatedDevices = [...selectedDevices, device];
    setSelectedDevices(updatedDevices);
    setTopologyDevices(updatedDevices);
    
    // Fetch incremental topology data for ONLY the new device
    await fetchIncrementalTopologyData([device], topologyDirection);
  };

  const fetchTopologyData = async (devices: Device[], direction?: 'parents' | 'children' | 'both') => {
    if (devices.length === 0) {
      setTopologyData(null);
      return;
    }

    setLoadingTopology(true);
    try {
      const currentDirection = direction || topologyDirection;
      console.log('🔍 Fetching topology for devices:', devices.map(d => d.name), 'Direction:', currentDirection);
      const response = await apiService.getTopology({
        deviceIds: devices.map(d => d.id),
        depth: 1,
        direction: currentDirection
      });
      
      console.log('📊 Topology data received:', response.topology);
      setTopologyData(response.topology);
    } catch (error) {
      console.error('❌ Failed to fetch topology - topology API may not be available:', error);
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

  const fetchIncrementalTopologyData = async (newDevices: Device[], direction?: 'parents' | 'children' | 'both') => {
    if (newDevices.length === 0) return;

    setLoadingTopology(true);
    try {
      const currentDirection = direction || topologyDirection;
      console.log('🔄 Fetching INCREMENTAL topology for devices:', newDevices.map(d => d.name), 'Direction:', currentDirection);
      
      const response = await apiService.getTopology({
        deviceIds: newDevices.map(d => d.id),
        depth: 1,
        direction: currentDirection
      });
      
      console.log('📊 Incremental topology data received:', response.topology);
      
      // Merge with existing topology data instead of replacing
      setTopologyData(prevTopology => {
        if (!prevTopology) {
          // If no existing topology, just use the new data
          return response.topology;
        }
        
        // Merge nodes (avoid duplicates by ID)
        const existingNodeIds = new Set(prevTopology.nodes.map(n => n.id));
        const newNodes = response.topology.nodes.filter(n => !existingNodeIds.has(n.id));
        const mergedNodes = [...prevTopology.nodes, ...newNodes];
        
        // Merge edges (avoid duplicates by source-target combination)
        const existingEdgeKeys = new Set(prevTopology.edges.map(e => `${e.source}-${e.target}`));
        const newEdges = response.topology.edges.filter(e => !existingEdgeKeys.has(`${e.source}-${e.target}`));
        const mergedEdges = [...prevTopology.edges, ...newEdges];
        
        console.log('🔄 Merged topology:', {
          prevNodes: prevTopology.nodes.length,
          newNodes: newNodes.length,
          totalNodes: mergedNodes.length,
          prevEdges: prevTopology.edges.length,
          newEdges: newEdges.length,
          totalEdges: mergedEdges.length
        });
        
        return {
          nodes: mergedNodes,
          edges: mergedEdges
        };
      });
      
    } catch (error) {
      console.error('❌ Failed to fetch incremental topology:', error);
      
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
        
        // Merge with existing, avoiding duplicates
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
    <div ref={containerRef} className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Resizable Left Panel - Device Inventory */}
      <div 
        className="bg-white shadow-xl border-r border-gray-200 flex-shrink-0"
        style={{ width: `${leftPanelWidth}px` }}
      >
        <DeviceList
          onDeviceSelect={handleDeviceSelect}
          onClearSelection={handleClearAll}
          selectedDevices={selectedDevices}
        />
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`
          w-1 hover:w-2 bg-gray-300 hover:bg-blue-400 cursor-col-resize transition-all duration-150
          ${isResizing ? 'w-2 bg-blue-500' : ''}
        `}
        style={{
          backgroundColor: isResizing ? '#3b82f6' : undefined,
        }}
      />

      {/* Right Panel - Topology Canvas */}
      <div className="flex-1 p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50">
        {topologyDevices.length === 0 ? (
          <div className="h-full bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/50 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
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
              <p className="text-lg font-medium mb-2">Select a device to build topology</p>
              <p className="text-sm">Click on devices in the inventory to add them to the topology</p>
            </div>
          </div>
        ) : (
          <div className="relative h-full">
            {loadingTopology && (
              <div className="absolute top-4 left-4 z-10 bg-blue-100 text-blue-800 px-3 py-2 rounded-lg shadow-md">
                🔄 Loading topology...
              </div>
            )}
            <EnterpriseTopologyFlow 
              devices={topologyDevices}
              selectedDevices={selectedDevices}
              topologyData={topologyData || undefined}
              onClearAll={handleClearAll}
              currentDirection={topologyDirection}
              onDirectionChange={handleDirectionChange}
              onAddDeviceToSelection={handleAddDeviceToSelection}
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;