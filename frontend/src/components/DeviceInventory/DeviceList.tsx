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
  onClearSelection: () => void;
  selectedDevices: Device[];
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  onDeviceSelect,
  onClearSelection,
  selectedDevices: parentSelectedDevices,
  theme = 'light',
  onThemeToggle,
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [allSelectedDeviceObjects, setAllSelectedDeviceObjects] = useState<Device[]>([]);
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

  // Sync local selected devices with parent state
  useEffect(() => {
    const parentDeviceIds = new Set(parentSelectedDevices.map(d => d.id));
    setSelectedDevices(parentDeviceIds);
    setAllSelectedDeviceObjects([...parentSelectedDevices]);
  }, [parentSelectedDevices]);

  // Handle device selection - toggle add/remove from chip area
  const handleDeviceSelect = (device: Device) => {
    const newSelected = new Set(selectedDevices);
    let updatedDeviceObjects = [...allSelectedDeviceObjects];
    
    if (newSelected.has(device.id)) {
      // Remove device
      newSelected.delete(device.id);
      updatedDeviceObjects = updatedDeviceObjects.filter(d => d.id !== device.id);
    } else {
      // Add device
      newSelected.add(device.id);
      updatedDeviceObjects.push(device);
    }
    
    setSelectedDevices(newSelected);
    setAllSelectedDeviceObjects(updatedDeviceObjects);
    
    // Send the complete list of selected devices to parent (not filtered by current search)
    onDeviceSelect(updatedDeviceObjects);
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
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50/30 via-white/50 to-blue-50/20 dark:from-slate-800/30 dark:via-slate-700/50 dark:to-slate-800/20 transition-colors duration-300">
      {/* Enhanced readable header */}
      <div className="border-b border-white/20 dark:border-gray-700/30 bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-800 dark:to-indigo-800 text-white p-6 shadow-lg transition-colors duration-300">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1 text-white drop-shadow-sm">
              Device Inventory
            </h2>
            <p className="text-blue-100 text-sm font-medium">
              Click devices to add to topology
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            {onThemeToggle && (
              <button
                onClick={onThemeToggle}
                className="
                  bg-white/20 dark:bg-white/10 backdrop-blur-sm border border-white/30 dark:border-white/20 
                  rounded-xl p-3 transition-all duration-300 hover:bg-white/30 dark:hover:bg-white/20
                  hover:shadow-lg
                "
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                <span className="text-xl">
                  {theme === 'light' ? '🌙' : '☀️'}
                </span>
              </button>
            )}
            
            {/* Device Count */}
            <div className="bg-white/20 dark:bg-white/10 backdrop-blur-sm border border-white/30 dark:border-white/20 rounded-xl p-4 transition-colors duration-300">
              <div className="text-2xl font-bold text-white drop-shadow-sm">{devices.length}</div>
              <div className="text-xs text-blue-100 font-medium uppercase tracking-wide">devices loaded</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Selected Devices Area */}
      {parentSelectedDevices.length > 0 && (
        <div className="p-4 glass-panel bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border-b border-blue-200/30 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-primary" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
              Selected for Topology ({parentSelectedDevices.length})
            </div>
            <button
              onClick={() => {
                setSelectedDevices(new Set());
                setAllSelectedDeviceObjects([]);
                onClearSelection();
              }}
              className="text-xs text-primary hover:text-gradient-primary font-medium transition-all duration-300 px-2 py-1 rounded-md hover:bg-white/30"
              style={{ fontSize: 'var(--text-xs)' }}
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {parentSelectedDevices.map((device) => (
              <div
                key={device.id}
                className="
                  flex items-center glass-panel border-blue-300/40 
                  bg-gradient-to-r from-blue-100/80 to-indigo-100/80
                  text-primary px-3 py-2 rounded-full
                  font-medium shadow-sm transition-all duration-300
                  hover:from-blue-200/90 hover:to-indigo-200/90 hover:shadow-md
                "
                style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)' }}
              >
                <span className="mr-2 text-sm">{statusIcons[device.status]}</span>
                <span className="truncate max-w-28">{device.name}</span>
                <button
                  onClick={() => {
                    const newSelected = new Set(selectedDevices);
                    newSelected.delete(device.id);
                    setSelectedDevices(newSelected);
                    
                    const updatedDeviceObjects = allSelectedDeviceObjects.filter(d => d.id !== device.id);
                    setAllSelectedDeviceObjects(updatedDeviceObjects);
                    onDeviceSelect(updatedDeviceObjects);
                  }}
                  className="ml-2 text-primary hover:text-red-500 font-bold transition-colors duration-300 w-5 h-5 rounded-full hover:bg-red-100/50 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Search and filters */}
      <div className="p-4 glass-panel bg-white/70 border-b border-gray-100/50 backdrop-blur-sm">
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
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(to right, #3b82f6, #2563eb)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '14px',
                  borderRadius: '8px',
                  border: '1px solid #2563eb',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to right, #2563eb, #1d4ed8)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to right, #3b82f6, #2563eb)';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                Load More
              </button>
            )}
          </div>
        </div>
        
        {/* Enhanced Status bar */}
        <div className="mt-4 flex items-center justify-between" style={{ fontSize: 'var(--text-sm)' }}>
          <div className="text-muted">
            {total === -1 ? (
              <>Showing <span className="text-emphasis">{devices.length}</span> devices{hasMore ? ' (more available)' : ''}</>
            ) : (
              <>Showing <span className="text-emphasis">{devices.length}</span> of <span className="text-emphasis">{total}</span> devices</>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {loading && devices.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="glass-panel px-6 py-4 rounded-xl border border-blue-200/50 backdrop-blur-md">
              <div className="flex items-center space-x-3 text-primary">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium" style={{ fontSize: 'var(--text-base)' }}>Loading devices...</span>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="glass-panel px-6 py-4 rounded-xl border border-red-200/50 bg-red-50/60 backdrop-blur-md">
              <div className="text-red-600 font-medium" style={{ fontSize: 'var(--text-base)' }}>{error}</div>
            </div>
          </div>
        ) : devices.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="glass-panel px-8 py-6 rounded-xl border border-gray-200/30 backdrop-blur-sm">
                <div className="text-muted mb-2" style={{ fontSize: 'var(--text-lg)' }}>No devices found</div>
                <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Try adjusting your search or filters</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-slate-50/20 to-blue-50/10 backdrop-blur-[2px]">
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