import React, { useState, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Device, apiService } from '../../services/api';
import { configService } from '../../services/config';
import { DeviceItem } from './DeviceItem';
import { DeviceSearch } from './DeviceSearch';
import { DeviceFilters } from './DeviceFilters';

interface DeviceListProps {
  onDeviceSelect: (devices: Device[]) => void;
  onDeviceDrag: (device: Device) => void;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  onDeviceSelect,
  onDeviceDrag,
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
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = devicesConfig.itemsPerPage;

  // Fetch devices
  const fetchDevices = useCallback(async (reset = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const currentOffset = reset ? 0 : offset;
      const response = await apiService.getDevices({
        search: searchTerm,
        type: selectedType || undefined,
        status: selectedStatus || undefined,
        limit,
        offset: currentOffset,
      });
      
      if (reset) {
        setDevices(response.devices);
      } else {
        setDevices((prev) => [...prev, ...response.devices]);
      }
      
      setAvailableTypes(response.filters.availableTypes);
      setHasMore(response.pagination.hasMore);
      setTotal(response.pagination.total);
      setOffset(currentOffset + limit);
    } catch (err) {
      setError('Failed to fetch devices');
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedType, selectedStatus, offset]);

  // Initial load
  useEffect(() => {
    fetchDevices(true);
  }, [searchTerm, selectedType, selectedStatus]);

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
      <div style={style} className="px-4 py-2">
        <DeviceItem
          device={device}
          onDragStart={onDeviceDrag}
          isSelected={selectedDevices.has(device.id)}
          onSelect={handleDeviceSelect}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Device Inventory</h2>
        
        <div className="space-y-3">
          <DeviceSearch onSearch={setSearchTerm} />
          <DeviceFilters
            types={availableTypes}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            onClearFilters={handleClearFilters}
          />
        </div>
        
        <div className="mt-3 text-sm text-gray-600">
          Showing {devices.length} of {total} devices
          {selectedDevices.size > 0 && ` (${selectedDevices.size} selected)`}
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
          <List
            height={600}
            itemCount={devices.length}
            itemSize={80}
            width="100%"
          >
            {Row}
          </List>
        )}
      </div>

      {hasMore && !loading && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => fetchDevices(false)}
            className="w-full py-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            Load More...
          </button>
        </div>
      )}
    </div>
  );
};