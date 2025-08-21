import React from 'react';

interface DeviceFiltersProps {
  types: string[];
  selectedType: string | null;
  onTypeChange: (type: string | null) => void;
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
  onClearFilters: () => void;
}

const statuses = [
  { value: 'online', label: 'Online', color: 'text-green-600' },
  { value: 'offline', label: 'Offline', color: 'text-red-600' },
  { value: 'warning', label: 'Warning', color: 'text-yellow-600' },
  { value: 'unknown', label: 'Unknown', color: 'text-gray-600' },
];

export const DeviceFilters: React.FC<DeviceFiltersProps> = ({
  types,
  selectedType,
  onTypeChange,
  selectedStatus,
  onStatusChange,
  onClearFilters,
}) => {
  return (
    <div className="flex items-center space-x-3">
      <select
        value={selectedType || ''}
        onChange={(e) => onTypeChange(e.target.value || null)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Types</option>
        {types.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <select
        value={selectedStatus || ''}
        onChange={(e) => onStatusChange(e.target.value || null)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Status</option>
        {statuses.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>

      {(selectedType || selectedStatus) && (
        <button
          onClick={onClearFilters}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
};