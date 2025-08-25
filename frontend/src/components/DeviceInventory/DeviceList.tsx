import React, { useState, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Device, apiService } from '../../services/api';
import { configService } from '../../services/config';
import { DeviceItem } from './DeviceItem';
import { DeviceSearch } from './DeviceSearch';
import { DeviceFilters } from './DeviceFilters';

const statusIcons = {
  online: '🟢',
  offline: '🔴', 
  warning: '🟡',
  unknown: '⚪',
};

interface DeviceListProps {
  onDeviceSelect: (devices: Device[]) => void;
  selectedDevices: Device[];
}

export const DeviceList: React.FC<DeviceListProps> = ({
  onDeviceSelect,
  selectedDevices: parentSelectedDevices,
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  
  // Pagination - use config
  const devicesConfig = configService.getDevicesConfig();
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const limit = devicesConfig.itemsPerPage;

  // Fetch devices
  const fetchDevices = useCallback(async (reset = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const currentCursor = reset ? null : nextCursor;
      console.log('📡 Fetching devices with cursor:', currentCursor ? 'next page' : 'first page');
      
      const response = await apiService.getDevices({
        search: searchTerm,
        type: selectedType || undefined,
        status: selectedStatus || undefined,
        limit,
        cursor: currentCursor || undefined,
      });
      
      console.log('📊 Received devices:', response.devices.length);
      
      if (reset) {
        setDevices(response.devices);
      } else {
        // Add new devices to the list
        setDevices((prev) => {
          const existingIds = new Set(prev.map(d => d.id));
          const newDevices = response.devices.filter(d => !existingIds.has(d.id));
          console.log('New unique devices:', newDevices.length);
          return [...prev, ...newDevices];
        });
      }
      
      setAvailableTypes(response.filters.availableTypes);
      setHasMore(response.pagination.hasMore);
      setNextCursor(response.pagination.nextCursor || null);
      setTotal(response.pagination.total);
      
    } catch (err) {
      setError('Failed to fetch devices');
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedType, selectedStatus, limit, nextCursor]);

  // Initial load and reset when filters change (but NOT search term)
  useEffect(() => {
    setNextCursor(null); // Reset cursor when filters change
    fetchDevices(true);
  }, [selectedType, selectedStatus]);
  
  // Separate effect for search term to maintain selection
  useEffect(() => {
    setNextCursor(null);
    fetchDevices(true);
  }, [searchTerm]);

  // Handle device selection
  const handleDeviceSelect = (device: Device) => {
    const newSelected = new Set(selectedDevices);
    if (newSelected.has(device.id)) {
      newSelected.delete(device.id);
    } else {
      newSelected.add(device.id);
    }
    setSelectedDevices(newSelected);
    
    const selectedDeviceList = devices.filter((d) => newSelected.has(d.id));
    onDeviceSelect(selectedDeviceList);
  };

  // Clear filters
  const handleClearFilters = () => {
    setSelectedType(null);
    setSelectedStatus(null);
    setSearchTerm('');
  };

  // Row renderer for virtual list
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const device = devices[index];
    if (!device) return null;
    
    return (
      <div style={style}>
        <DeviceItem
          device={device}
          onSelect={handleDeviceSelect}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white to-gray-50">
      {/* Modern header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Device Inventory</h2>
            <p className="text-blue-100 text-sm">Drag devices to build topology</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="text-2xl font-bold">{devices.length}</div>
            <div className="text-xs text-blue-100">devices</div>
          </div>
        </div>
      </div>
      
      {/* Selected Devices Area */}
      {parentSelectedDevices.length > 0 && (
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <div className="text-sm font-medium text-blue-800 mb-2">
            Selected for Topology
          </div>
          <div className="flex flex-wrap gap-2">
            {parentSelectedDevices.map((device) => (
              <div
                key={device.id}
                className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium"
              >
                <span className="mr-1">{statusIcons[device.status]}</span>
                <span className="truncate max-w-32">{device.name}</span>
                <button
                  onClick={() => {
                    const newSelected = new Set(selectedDevices);
                    newSelected.delete(device.id);
                    setSelectedDevices(newSelected);
                    const newList = devices.filter(d => newSelected.has(d.id));
                    onDeviceSelect(newList);
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-800 font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and filters with modern styling */}
      <div className="p-4 bg-white border-b border-gray-100 shadow-sm">
        <div className="space-y-4">
          <DeviceSearch onSearch={setSearchTerm} />
          <div className="flex items-center justify-between">
            <DeviceFilters
              types={availableTypes}
              selectedType={selectedType}
              onTypeChange={setSelectedType}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              onClearFilters={handleClearFilters}
            />
            {hasMore && !loading && (
              <button
                onClick={() => fetchDevices(false)}
                className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
              >
                Load More
              </button>
            )}
          </div>
        </div>
        
        {/* Status bar */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-gray-600">
            {total === -1 ? (
              <>Showing <span className="font-semibold text-gray-900">{devices.length}</span> devices{hasMore ? ' (more available)' : ''}</>
            ) : (
              <>Showing <span className="font-semibold text-gray-900">{devices.length}</span> of <span className="font-semibold text-gray-900">{total}</span> devices</>
            )}
          </div>
          {selectedDevices.size > 0 && (
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
              {selectedDevices.size} selected
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {loading && devices.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading devices...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-500">{error}</div>
          </div>
        ) : devices.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">No devices found</div>
          </div>
        ) : (
          <div className="bg-gray-50/30">
            <List
              height={window.innerHeight - 280}
              itemCount={devices.length}
              itemSize={60}
              width="100%"
            >
              {Row}
            </List>
          </div>
        )}
      </div>

    </div>
  );
};