import React, { useEffect, useRef, useState } from 'react';
import styles from './DeviceRelationshipModal.module.css';

interface DeviceRelationshipModalProps {
  isOpen: boolean;
  position: { x: number; y: number };
  nodeId: string;
  nodeName: string;
  nodeType?: string;
  currentDirection: 'parents' | 'children' | 'both';
  currentDepth?: number;
  maxDepth?: number;
  isNodeLocked?: boolean;
  onDirectionSelect: (direction: 'parents' | 'children' | 'both') => void;
  onDepthChange?: (depth: number) => void;
  onLockToggle?: () => void;
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
  nodeName,
  nodeType,
  currentDirection,
  currentDepth = 2,
  maxDepth = 5,
  isNodeLocked = false,
  onDirectionSelect,
  onDepthChange,
  onLockToggle,
  onClose,
}) => {
  
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedDepth, setSelectedDepth] = useState(currentDepth);

  // Reset selected depth when modal opens with new depth
  useEffect(() => {
    if (isOpen) {
      setSelectedDepth(currentDepth);
    }
  }, [isOpen, currentDepth]);

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
    // Always apply the selected depth when direction is clicked
    
    // Always apply the depth, even if it matches current depth
    // This ensures the user's selected depth is properly applied
    if (onDepthChange) {
      onDepthChange(selectedDepth);
    }
    onDirectionSelect(direction);
    onClose();
  };

  const handleDepthChange = (newDepth: number) => {
    if (newDepth >= 1 && newDepth <= maxDepth) {
      setSelectedDepth(newDepth);
      // Don't close the modal, just update the local state
    }
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
          {/* Depth Controls Section - moved to top */}
          {onDepthChange && (
            <>
              <div className={styles.depthControls} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '8px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '6px',
                border: '1px solid #e2e8f0'
              }}>
                <button
                  className={styles.depthButton}
                  onClick={() => handleDepthChange(selectedDepth - 1)}
                  disabled={selectedDepth <= 1}
                  style={{
                    background: selectedDepth > 1 ? '#ef4444' : '#cbd5e1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: selectedDepth > 1 ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease'
                  }}
                  title={`Decrease to depth ${selectedDepth - 1}`}
                >
                  -
                </button>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flex: 1,
                  justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: selectedDepth !== currentDepth ? '#f97316' : '#1e293b' }}>
                    {selectedDepth}
                  </span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {Array.from({ length: maxDepth }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: i < selectedDepth ? '#3b82f6' : '#cbd5e1',
                          transition: 'all 0.2s ease'
                        }}
                        title={`Level ${i + 1}${i < selectedDepth ? ' (active)' : ''}`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  className={styles.depthButton}
                  onClick={() => handleDepthChange(selectedDepth + 1)}
                  disabled={selectedDepth >= maxDepth}
                  style={{
                    background: selectedDepth < maxDepth ? '#10b981' : '#cbd5e1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: selectedDepth < maxDepth ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease'
                  }}
                  title={`Increase to depth ${selectedDepth + 1}`}
                >
                  +
                </button>
              </div>
              <p style={{ 
                fontSize: '10px', 
                color: '#64748b', 
                textAlign: 'center', 
                marginTop: '4px',
                marginBottom: '0',
                fontStyle: 'italic'
              }}>
                {selectedDepth === 1 ? 'Direct connections only' : `${selectedDepth}-level deep relationships`}
              </p>
              <div className={styles.divider} style={{ margin: '8px 0', borderTop: '1px solid #e5e7eb' }} />
            </>
          )}

          {/* Direction Options */}
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
                </div>
                {currentDirection === option.value && (
                  <div className={styles.currentIndicator}>Current</div>
                )}
              </button>
            ))}
          </div>

          {/* Lock/Unlock Node Section */}
          {onLockToggle && (
            <>
              <div className={styles.divider} style={{ margin: '8px 0', borderTop: '1px solid #e5e7eb' }} />
              <button
                className={styles.option}
                onClick={() => {
                  onLockToggle();
                  onClose();
                }}
                style={{
                  '--option-color': isNodeLocked ? '#ef4444' : '#22c55e',
                  marginTop: '8px',
                } as React.CSSProperties}
              >
                <div className={styles.optionIcon}>{isNodeLocked ? '🔒' : '🔓'}</div>
                <div className={styles.optionContent}>
                  <div className={styles.optionLabel}>
                    {isNodeLocked ? 'Unlock Node' : 'Lock Node'}
                  </div>
                </div>
                {isNodeLocked && (
                  <div className={styles.currentIndicator} style={{ background: '#ef4444' }}>Locked</div>
                )}
              </button>
            </>
          )}
        </div>

      </div>
    </>
  );
};