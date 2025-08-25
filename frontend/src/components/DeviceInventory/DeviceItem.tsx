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
        mx-3 mb-3 p-4 rounded-xl transition-all duration-300 ease-out
        glass-panel border-white/30 hover:border-white/50
        transform hover:scale-[1.02] hover:shadow-xl
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
        
        {/* Enhanced device info */}
        <div className="min-w-0 flex-1 ml-4">
          {/* Modern device name */}
          <div 
            className="font-semibold text-base text-emphasis truncate group-hover:text-gradient-primary transition-all duration-300"
            title={device.name}
            style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)' }}
          >
            {device.name.length > 40 ? `${device.name.substring(0, 40)}...` : device.name}
          </div>
          
          {/* Enhanced IP address */}
          <div className="flex items-center mt-2 text-muted font-mono" style={{ fontSize: 'var(--text-sm)' }}>
            <div className="w-2 h-2 bg-gradient-to-br from-blue-400/60 to-blue-500/60 rounded-full mr-2 shadow-sm"></div>
            <span className="tracking-wide">{device.ip}</span>
          </div>
        </div>
      </div>
      
      {/* Modern device type badge */}
      <div className="flex flex-col items-end space-y-2">
        <div className="
          px-3 py-1.5 rounded-lg backdrop-blur-sm border
          bg-gradient-to-r from-blue-50/80 to-indigo-50/80
          border-blue-200/50 text-primary shadow-sm
          font-medium transition-all duration-300
          group-hover:from-blue-100/90 group-hover:to-indigo-100/90
          group-hover:border-blue-300/60 group-hover:shadow-md
        " style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)' }}>
          {device.type}
        </div>
        
        {/* Modern interaction indicator */}
        <div className="flex space-x-1 opacity-30 group-hover:opacity-60 transition-all duration-300">
          <div className="w-1 h-1 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full transform group-hover:scale-110"></div>
          <div className="w-1 h-1 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full transform group-hover:scale-110 transition-transform delay-75"></div>
          <div className="w-1 h-1 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full transform group-hover:scale-110 transition-transform delay-150"></div>
        </div>
      </div>
      
      {/* No selection indicator - selection is invisible in main list */}
    </div>
  );
};