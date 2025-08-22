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
        flex items-center justify-between p-4 border-2 rounded-lg cursor-move
        hover:bg-gray-50 hover:shadow-md transition-all duration-200
        ${isSelected 
          ? 'border-blue-600 bg-blue-100 shadow-lg ring-2 ring-blue-200' 
          : 'border-gray-200 hover:border-gray-300'
        }
      `}
    >
      <div className="flex items-center space-x-4">
        <span className="text-2xl">{statusIcons[device.status]}</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900 text-base truncate">{device.name}</div>
          <div className="text-sm text-gray-600 font-mono">{device.ip}</div>
        </div>
      </div>
      <div className="text-sm font-medium text-gray-700 bg-gray-200 px-3 py-1.5 rounded-full whitespace-nowrap">
        {device.type}
      </div>
    </div>
  );
};