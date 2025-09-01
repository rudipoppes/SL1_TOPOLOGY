import React, { useState, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Device, apiService } from '../../services/api';
import { configService } from '../../services/config';
import { DeviceItem } from './DeviceItem';
import { DeviceSearch } from './DeviceSearch';
import { LogoutButton } from '../Auth/LogoutButton';


interface DeviceListProps {
  onDeviceSelect: (devices: Device[]) => void;
  onClearSelection: () => void;
  selectedDevices: Device[];
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
  globalDepth?: number;
  onDepthChange?: (depth: number) => void;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  onDeviceSelect,
  onClearSelection,
  selectedDevices: parentSelectedDevices,
  theme = 'light',
  onThemeToggle,
  globalDepth = 2,
  onDepthChange,
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [allSelectedDeviceObjects, setAllSelectedDeviceObjects] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  
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
      
      const response = await apiService.getDevices({
        search: searchTerm,
        limit,
        cursor: currentCursor || undefined,
      });
      
      
      if (reset) {
        setDevices(response.devices);
      } else {
        // Add new devices to the list
        setDevices((prev) => {
          const existingIds = new Set(prev.map(d => d.id));
          const newDevices = response.devices.filter(d => !existingIds.has(d.id));
          return [...prev, ...newDevices];
        });
      }
      
      setHasMore(response.pagination.hasMore);
      setNextCursor(response.pagination.nextCursor || null);
      setTotal(response.pagination.total);
      
    } catch (err) {
      setError('Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, limit, nextCursor]);

  
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

  // Clear search
  const handleClearSearch = () => {
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
      {/* Clean header with integrated controls */}
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              {onThemeToggle && (
                <button
                  onClick={onThemeToggle}
                  className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-200 hover:scale-105"
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                  <span className="text-lg">
                    {theme === 'light' ? '🌙' : '☀️'}
                  </span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Logout Button - Only shows on port 4000 */}
              <LogoutButton variant="menu" />
            </div>
          </div>
          
          {/* Search and controls row */}
          <div className="space-y-4">
            <DeviceSearch onSearch={setSearchTerm} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                {total === -1 ? (
                  <>Showing <span className="font-medium text-slate-800 dark:text-slate-200">{devices.length}</span> devices{hasMore ? ' (more available)' : ''}</>
                ) : (
                  <>Showing <span className="font-medium text-slate-800 dark:text-slate-200">{devices.length}</span> of <span className="font-medium text-slate-800 dark:text-slate-200">{total}</span> devices</>
                )}
                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-200"
                  >
                    Clear Search
                  </button>
                )}
              </div>
              {hasMore && !loading && (
                <button
                  onClick={() => fetchDevices(false)}
                  className="group flex items-center justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium text-sm rounded-lg border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-200"
                >
                  <svg className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Load More</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Selected Devices Area */}
      {parentSelectedDevices.length > 0 && (
        <div className="p-4 glass-panel bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border-b border-blue-200/30 backdrop-blur-sm rounded-xl mx-2 my-2">
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

      {/* Default Depth Selector - placed between load and search */}
      {onDepthChange && (
        <div className="px-4 py-3 glass-panel bg-white/70 dark:bg-slate-800/70 border-b border-gray-100/50 dark:border-slate-600/50 backdrop-blur-sm rounded-xl mx-2 my-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Default depth for initial placement</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onDepthChange(Math.max(1, globalDepth - 1))}
                disabled={globalDepth <= 1}
                className={`
                  w-6 h-6 rounded border flex items-center justify-center text-xs font-bold transition-all duration-200
                  ${globalDepth > 1 
                    ? 'bg-red-500 hover:bg-red-600 text-white border-red-500 cursor-pointer' 
                    : 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
                  }
                `}
              >
                -
              </button>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200 min-w-[2rem] text-center">
                {globalDepth}
              </span>
              <button
                onClick={() => onDepthChange(Math.min(5, globalDepth + 1))}
                disabled={globalDepth >= 5}
                className={`
                  w-6 h-6 rounded border flex items-center justify-center text-xs font-bold transition-all duration-200
                  ${globalDepth < 5 
                    ? 'bg-green-500 hover:bg-green-600 text-white border-green-500 cursor-pointer' 
                    : 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
                  }
                `}
              >
                +
              </button>
              <div className="flex items-center space-x-1 ml-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className={`
                      w-1.5 h-1.5 rounded-full transition-all duration-300
                      ${i < globalDepth ? 'bg-blue-500' : 'bg-gray-300'}
                    `}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200/30 dark:border-slate-600/30">
            <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
              Click devices to add to topology
            </p>
          </div>
        </div>
      )}


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