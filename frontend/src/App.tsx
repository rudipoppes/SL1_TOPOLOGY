import React, { useState, useRef, useEffect } from 'react';
import { Device, TopologyResponse, apiService } from './services/api';
import { DeviceList } from './components/DeviceInventory/DeviceList';
import { TopologyCanvas } from './components/TopologyCanvas/TopologyCanvas';
import './App.css';

function App() {
  const [selectedDevices, setSelectedDevices] = useState<Device[]>([]);
  const [topologyDevices, setTopologyDevices] = useState<Device[]>([]);
  const [topologyData, setTopologyData] = useState<TopologyResponse['topology'] | null>(null);
  const [draggedDevice, setDraggedDevice] = useState<Device | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);
  const [loadingTopology, setLoadingTopology] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDeviceSelect = (devices: Device[]) => {
    setSelectedDevices(devices);
    // Future: Could be used for batch operations
    console.log('Selected devices:', selectedDevices.length, '→', devices.length);
  };

  const handleDeviceDrag = (device: Device) => {
    setDraggedDevice(device);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedDevice) {
      console.log('Dropped device:', draggedDevice);
      
      // Add device to topology devices if not already present
      const updatedDevices = topologyDevices.some(d => d.id === draggedDevice.id) 
        ? topologyDevices 
        : [...topologyDevices, draggedDevice];
      
      setTopologyDevices(updatedDevices);
      
      // Fetch topology data for all devices on canvas
      await fetchTopologyData(updatedDevices);
      
      setDraggedDevice(null);
    }
  };

  const fetchTopologyData = async (devices: Device[]) => {
    if (devices.length === 0) {
      setTopologyData(null);
      return;
    }

    setLoadingTopology(true);
    try {
      console.log('🔍 Fetching topology for devices:', devices.map(d => d.name));
      const response = await apiService.getTopology({
        deviceIds: devices.map(d => d.id),
        depth: 1,
        direction: 'both'
      });
      
      console.log('📊 Topology data received:', response.topology);
      setTopologyData(response.topology);
    } catch (error) {
      console.error('❌ Failed to fetch topology:', error);
      // Keep existing topology data on error
    } finally {
      setLoadingTopology(false);
    }
  };

  const handleDeviceClick = (device: Device) => {
    console.log('Clicked device in topology:', device);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
          onDeviceDrag={handleDeviceDrag}
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
      <div 
        className="flex-1 p-6"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {topologyDevices.length === 0 ? (
          <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center">
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
              <p className="text-lg font-medium mb-2">Drag devices here to build topology</p>
              <p className="text-sm">Select devices from the inventory and drag them onto this canvas</p>
            </div>
          </div>
        ) : (
          <div className="relative h-full">
            {loadingTopology && (
              <div className="absolute top-4 left-4 z-10 bg-blue-100 text-blue-800 px-3 py-2 rounded-lg shadow-md">
                🔄 Loading topology...
              </div>
            )}
            <TopologyCanvas 
              devices={topologyDevices}
              topologyData={topologyData}
              onDeviceClick={handleDeviceClick}
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;