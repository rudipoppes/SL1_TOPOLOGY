import React from 'react';
import { Device } from '../../services/api';

interface DeviceItemProps {
  device: Device;
  onDragStart: (device: Device) => void;
  isSelected?: boolean;
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
  onDragStart,
  isSelected,
  onSelect,
}) => {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(device)}
      onClick={() => onSelect?.(device)}
      className={`
        group relative flex items-center justify-between p-5 mx-3 my-2 rounded-xl cursor-move
        transition-all duration-300 ease-out transform hover:scale-[1.02]
        ${isSelected 
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 shadow-xl ring-4 ring-blue-100' 
          : 'bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 shadow-md hover:shadow-lg'
        }
      `}
    >
      {/* Status indicator and content */}
      <div className="flex items-center space-x-4 min-w-0 flex-1">
        {/* Status with enhanced styling */}
        <div className="relative">
          <span className="text-3xl drop-shadow-sm">{statusIcons[device.status]}</span>
          {device.status === 'online' && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          )}
        </div>
        
        {/* Device info with proper truncation */}
        <div className="min-w-0 flex-1">
          {/* Device name with tooltip */}
          <div 
            className="font-bold text-gray-900 text-lg truncate group-hover:text-blue-700 transition-colors"
            title={device.name}
            style={{ maxWidth: '280px' }}
          >
            {device.name.length > 25 ? `${device.name.substring(0, 25)}...` : device.name}
          </div>
          
          {/* IP address */}
          <div className="text-sm text-gray-600 font-mono mt-1 flex items-center space-x-2">
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
            <span>{device.ip}</span>
          </div>
        </div>
      </div>
      
      {/* Device type badge */}
      <div className="flex flex-col items-end space-y-1">
        <div 
          className={`
            text-xs font-bold px-3 py-2 rounded-full shadow-sm border-2
            ${isSelected 
              ? 'bg-blue-200 text-blue-800 border-blue-300' 
              : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300'
            }
          `}
        >
          {device.type}
        </div>
        
        {/* Drag indicator */}
        <div className="flex space-x-1 opacity-30 group-hover:opacity-60 transition-opacity">
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        </div>
      </div>
      
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-1 -right-1">
          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg">
            <span className="text-xs font-bold">✓</span>
          </div>
        </div>
      )}
    </div>
  );
};