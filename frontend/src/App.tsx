import React, { useState } from 'react';
import { Device } from './services/api';
import { DeviceList } from './components/DeviceInventory/DeviceList';
import { TopologyCanvas } from './components/TopologyCanvas/TopologyCanvas';
import './App.css';

function App() {
  const [selectedDevices, setSelectedDevices] = useState<Device[]>([]);
  const [topologyDevices, setTopologyDevices] = useState<Device[]>([]);
  const [draggedDevice, setDraggedDevice] = useState<Device | null>(null);

  const handleDeviceSelect = (devices: Device[]) => {
    setSelectedDevices(devices);
  };

  const handleDeviceDrag = (device: Device) => {
    setDraggedDevice(device);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedDevice) {
      console.log('Dropped device:', draggedDevice);
      // Add device to topology canvas if not already present
      setTopologyDevices(prev => {
        const isAlreadyPresent = prev.some(d => d.id === draggedDevice.id);
        if (isAlreadyPresent) return prev;
        return [...prev, draggedDevice];
      });
      setDraggedDevice(null);
    }
  };

  const handleDeviceClick = (device: Device) => {
    console.log('Clicked device in topology:', device);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Device Inventory */}
      <div className="w-96 p-4">
        <DeviceList
          onDeviceSelect={handleDeviceSelect}
          onDeviceDrag={handleDeviceDrag}
        />
      </div>

      {/* Right Panel - Topology Canvas */}
      <div 
        className="flex-1 p-4"
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
          <TopologyCanvas 
            devices={topologyDevices}
            onDeviceClick={handleDeviceClick}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}

export default App;