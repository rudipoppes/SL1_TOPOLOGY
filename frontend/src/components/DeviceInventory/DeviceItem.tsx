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
        flex items-center justify-between p-3 border rounded-lg cursor-move
        hover:bg-gray-50 transition-colors
        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
      `}
    >
      <div className="flex items-center space-x-3">
        <span className="text-xl">{statusIcons[device.status]}</span>
        <div>
          <div className="font-medium text-gray-900">{device.name}</div>
          <div className="text-sm text-gray-500">{device.ip}</div>
        </div>
      </div>
      <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
        {device.type}
      </div>
    </div>
  );
};