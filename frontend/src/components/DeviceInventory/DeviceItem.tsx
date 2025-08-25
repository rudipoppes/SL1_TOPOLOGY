import React from 'react';
import { Device } from '../../services/api';

interface DeviceItemProps {
  device: Device;
  onSelect?: (device: Device) => void;
}

const statusIcons = {
  online: '🟢',
  offline: '🔴',
  warning: '🟡',
  unknown: '⚪',
};

export const DeviceItem: React.FC<DeviceItemProps> = ({
  device,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect?.(device)}
      className="
        group relative flex items-center justify-between p-2 mx-3 mb-1 rounded-lg cursor-pointer
        transition-all duration-200 ease-out transform hover:scale-[1.01]
        bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md
      "
    >
      {/* Status indicator and content */}
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        {/* Status with enhanced styling */}
        <div className="relative flex-shrink-0">
          <span className="text-lg drop-shadow-sm">{statusIcons[device.status]}</span>
          {device.status === 'online' && (
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          )}
        </div>
        
        {/* Device info with proper truncation */}
        <div className="min-w-0 flex-1">
          {/* Device name with tooltip */}
          <div 
            className="font-semibold text-gray-900 text-sm truncate group-hover:text-blue-700 transition-colors"
            title={device.name}
          >
            {device.name.length > 45 ? `${device.name.substring(0, 45)}...` : device.name}
          </div>
          
          {/* IP address */}
          <div className="text-xs text-gray-600 font-mono mt-0.5 flex items-center space-x-1.5">
            <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
            <span>{device.ip}</span>
          </div>
        </div>
      </div>
      
      {/* Device type badge */}
      <div className="flex flex-col items-end space-y-0.5">
        <div className="text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm border bg-gray-100 text-gray-600 border-gray-200">
          {device.type}
        </div>
        
        {/* Selection indicator dots */}
        <div className="flex space-x-0.5 opacity-20 group-hover:opacity-40 transition-opacity mt-1">
          <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
          <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
          <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
        </div>
      </div>
      
      {/* No selection indicator - selection is invisible in main list */}
    </div>
  );
};