import React from 'react';
import { Device, TopologyResponse } from '../../services/api';
import { SimpleVisNetworkTopology } from '../NetworkTopology/SimpleVisNetworkTopology';
import styles from './VisControlled.module.css';

interface VisControlledTopologyProps {
  devices?: Device[];
  selectedDevices?: Device[];
  topologyData?: TopologyResponse['topology'] | null;
  deviceDirections?: Map<string, 'parents' | 'children' | 'both'>;
  deviceDepths?: Map<string, number>;
  globalDepth?: number;
  onDirectionChange?: (direction: 'parents' | 'children' | 'both', deviceId: string) => void;
  onDepthChange?: (depth: number, deviceId?: string) => void;
  onAddDeviceToSelection?: (device: Device) => void;
  onClearAll?: () => void;
  className?: string;
  theme?: 'light' | 'dark';
}

export const VisControlledTopology: React.FC<VisControlledTopologyProps> = ({
  devices = [],
  selectedDevices = [],
  topologyData = null,
  deviceDirections = new Map(),
  deviceDepths = new Map(),
  globalDepth = 2,
  onDirectionChange,
  onDepthChange,
  onAddDeviceToSelection,
  onClearAll,
  className = '',
  theme = 'light',
}) => {
  // Always render the topology component, even when empty
  // This provides a consistent canvas without the "Ready for Topology" message

  return (
    <div className={`${styles.controlledTopology} ${className}`}>
      <SimpleVisNetworkTopology
        devices={devices}
        selectedDevices={selectedDevices}
        topologyData={topologyData || undefined}
        deviceDirections={deviceDirections}
        deviceDepths={deviceDepths}
        globalDepth={globalDepth}
        onDirectionChange={onDirectionChange}
        onDepthChange={onDepthChange}
        onAddDeviceToSelection={onAddDeviceToSelection}
        onClearAll={onClearAll}
        className={styles.visNetworkWrapper}
        theme={theme}
      />
    </div>
  );
};