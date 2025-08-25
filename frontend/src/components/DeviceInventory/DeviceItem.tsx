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
        group relative flex items-center justify-between cursor-pointer
        mx-2 mb-2 p-3 rounded-lg transition-all duration-300 ease-out
        glass-panel border-white/30 hover:border-white/50
        transform hover:scale-[1.01] hover:shadow-lg
        backdrop-blur-md
      "
    >
      {/* Status indicator and content */}
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        {/* Enhanced status indicator */}
        <div className="relative flex-shrink-0 p-2 rounded-lg bg-white/40 backdrop-blur-sm border border-white/20">
          <span className="text-lg filter drop-shadow-md">{statusIcons[device.status]}</span>
          {device.status === 'online' && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-green-400 to-green-500 rounded-full animate-pulse shadow-lg"></div>
          )}
        </div>
        
        {/* Compact device info */}
        <div className="min-w-0 flex-1 ml-3">
          {/* Device name - more compact */}
          <div 
            className="font-medium text-sm text-emphasis truncate group-hover:text-gradient-primary transition-all duration-300"
            title={device.name}
          >
            {device.name.length > 35 ? `${device.name.substring(0, 35)}...` : device.name}
          </div>
          
          {/* Compact IP address */}
          <div className="flex items-center mt-1 text-muted font-mono text-xs">
            <div className="w-1.5 h-1.5 bg-gradient-to-br from-blue-400/60 to-blue-500/60 rounded-full mr-2"></div>
            <span className="tracking-wide">{device.ip}</span>
          </div>
        </div>
      </div>
      
      {/* Compact device type badge */}
      <div className="flex flex-col items-end space-y-1">
        <div className="
          px-2 py-1 rounded-md backdrop-blur-sm border
          bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/60 dark:to-indigo-900/60
          border-blue-200/50 dark:border-blue-700/50 text-primary dark:text-blue-200
          text-xs font-medium transition-all duration-300
          group-hover:from-blue-100/90 group-hover:to-indigo-100/90 dark:group-hover:from-blue-800/70 dark:group-hover:to-indigo-800/70
          group-hover:border-blue-300/60 dark:group-hover:border-blue-600/60
        ">
          {device.type}
        </div>
      </div>
      
      {/* No selection indicator - selection is invisible in main list */}
    </div>
  );
};