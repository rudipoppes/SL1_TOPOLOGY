import React, { useEffect, useRef } from 'react';
import styles from './DeviceRelationshipModal.module.css';

interface DeviceRelationshipModalProps {
  isOpen: boolean;
  position: { x: number; y: number };
  nodeId: string;
  nodeName: string;
  nodeType?: string;
  currentDirection: 'parents' | 'children' | 'both';
  onDirectionSelect: (direction: 'parents' | 'children' | 'both') => void;
  onClose: () => void;
}

const directionOptions = [
  {
    value: 'parents' as const,
    label: 'Show Parents',
    icon: '🔼',
    description: 'Display parent devices',
    color: '#3b82f6', // Blue
  },
  {
    value: 'children' as const,
    label: 'Show Children', 
    icon: '🔽',
    description: 'Display child devices',
    color: '#10b981', // Green
  },
  {
    value: 'both' as const,
    label: 'Show Both',
    icon: '🔄',
    description: 'Display parents and children',
    color: '#8b5cf6', // Purple
  },
];

export const DeviceRelationshipModal: React.FC<DeviceRelationshipModalProps> = ({
  isOpen,
  position,
  nodeId,
  nodeName,
  nodeType,
  currentDirection,
  onDirectionSelect,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Calculate modal position to stay within viewport
  const calculatePosition = () => {
    if (!modalRef.current) return position;

    const modalRect = modalRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    // Ensure modal stays within viewport horizontally
    if (x + 280 > viewportWidth) { // 280px = modal width + padding
      x = viewportWidth - 290;
    }
    if (x < 10) {
      x = 10;
    }

    // Ensure modal stays within viewport vertically
    if (y + 220 > viewportHeight) { // 220px = modal height + padding
      y = viewportHeight - 230;
    }
    if (y < 10) {
      y = 10;
    }

    return { x, y };
  };

  const finalPosition = calculatePosition();

  const handleDirectionClick = (direction: 'parents' | 'children' | 'both') => {
    onDirectionSelect(direction);
    onClose();
  };

  const getDeviceTypeIcon = (type?: string) => {
    if (!type) return '📡';
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('router')) return '🔀';
    if (lowerType.includes('switch')) return '🔌';
    if (lowerType.includes('server')) return '🖥️';
    if (lowerType.includes('firewall')) return '🛡️';
    if (lowerType.includes('load')) return '⚖️';
    if (lowerType.includes('storage')) return '💾';
    if (lowerType.includes('database')) return '🗄️';
    
    return '📡';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={styles.modal}
        style={{
          left: `${finalPosition.x}px`,
          top: `${finalPosition.y}px`,
        }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.deviceInfo}>
            <span className={styles.deviceIcon}>{getDeviceTypeIcon(nodeType)}</span>
            <div className={styles.deviceDetails}>
              <h3 className={styles.deviceName}>{nodeName}</h3>
              {nodeType && (
                <p className={styles.deviceType}>{nodeType}</p>
              )}
            </div>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <p className={styles.instruction}>
            Choose which relationships to display:
          </p>
          
          <div className={styles.options}>
            {directionOptions.map((option) => (
              <button
                key={option.value}
                className={`${styles.option} ${
                  currentDirection === option.value ? styles.currentOption : ''
                }`}
                onClick={() => handleDirectionClick(option.value)}
                style={{
                  '--option-color': option.color,
                } as React.CSSProperties}
              >
                <div className={styles.optionIcon}>{option.icon}</div>
                <div className={styles.optionContent}>
                  <div className={styles.optionLabel}>{option.label}</div>
                  <div className={styles.optionDescription}>{option.description}</div>
                </div>
                {currentDirection === option.value && (
                  <div className={styles.currentIndicator}>Current</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.hint}>
            💡 Click outside to cancel • Press ESC to close
          </p>
        </div>
      </div>
    </>
  );
};