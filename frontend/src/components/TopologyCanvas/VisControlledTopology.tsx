import React from 'react';
import { Device, TopologyResponse } from '../../services/api';
import { SimpleVisNetworkTopology } from '../NetworkTopology/SimpleVisNetworkTopology';
import styles from './VisControlled.module.css';

interface VisControlledTopologyProps {
  devices?: Device[];
  selectedDevices?: Device[];
  topologyData?: TopologyResponse['topology'] | null;
  deviceDirections?: Map<string, 'parents' | 'children' | 'both'>;
  onDirectionChange?: (direction: 'parents' | 'children' | 'both', deviceId: string) => void;
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
  onDirectionChange,
  onAddDeviceToSelection,
  onClearAll,
  className = '',
  theme = 'light',
}) => {
  if (!topologyData || (!topologyData.nodes.length && !selectedDevices.length)) {
    return (
      <div className={`${styles.controlledTopologyEmpty} ${className}`}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎯</div>
          <h3 className={styles.emptyTitle}>Ready for Topology Visualization</h3>
          <p className={styles.emptyDescription}>
            Drag devices from the left panel to this canvas to start building your network topology.
          </p>
          <div className={styles.emptyFeatures}>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>🖱️</span>
              <span>Drag & drop devices</span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>🔗</span>
              <span>Automatic relationships</span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>📍</span>
              <span>Pin nodes in place</span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>🎨</span>
              <span>Multiple layouts</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.controlledTopology} ${className}`}>
      <SimpleVisNetworkTopology
        devices={devices}
        selectedDevices={selectedDevices}
        topologyData={topologyData}
        deviceDirections={deviceDirections}
        onDirectionChange={onDirectionChange}
        onAddDeviceToSelection={onAddDeviceToSelection}
        onClearAll={onClearAll}
        className={styles.visNetworkWrapper}
        theme={theme}
      />
    </div>
  );
};