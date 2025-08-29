import React from 'react';

interface TopologyControlsProps {
  layout: 'hierarchical' | 'physics' | 'grid' | 'radial';
  onLayoutChange: (layout: 'hierarchical' | 'physics' | 'grid' | 'radial') => void;
  onFitView: () => void;
  onResetPhysics: () => void;
  onGroupSelected: () => void;
  onClearAll?: () => void;
  selectedCount: number;
  fixedCount: number;
  isLoading: boolean;
}

export const TopologyControls: React.FC<TopologyControlsProps> = ({
  layout,
  onLayoutChange,
  onFitView,
  onResetPhysics,
  onGroupSelected,
  onClearAll,
  selectedCount,
  fixedCount,
  isLoading,
}) => {
  const layouts = [
    { id: 'physics' as const, name: 'Physics', icon: '⚛️', description: 'Force-directed layout' },
    { id: 'hierarchical' as const, name: 'Hierarchy', icon: '🌳', description: 'Tree-like structure' },
    { id: 'grid' as const, name: 'Grid', icon: '⚏', description: 'Organized grid' },
    { id: 'radial' as const, name: 'Radial', icon: '🎯', description: 'Hub and spoke' },
  ];

  return (
    <div className="topology-controls">
      {/* Main Control Panel */}
      <div className="control-panel">
        {/* Layout Controls */}
        <div className="control-group">
          <h3 className="control-title">Layout</h3>
          <div className="layout-buttons">
            {layouts.map((layoutOption) => (
              <button
                key={layoutOption.id}
                onClick={() => onLayoutChange(layoutOption.id)}
                className={`layout-button ${layout === layoutOption.id ? 'active' : ''}`}
                title={layoutOption.description}
                disabled={isLoading}
              >
                <span className="layout-icon">{layoutOption.icon}</span>
                <span className="layout-name">{layoutOption.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* View Controls */}
        <div className="control-group">
          <h3 className="control-title">View</h3>
          <div className="view-controls">
            <button
              onClick={onFitView}
              className="control-button primary"
              title="Fit all nodes in view"
              disabled={isLoading}
            >
              <span className="button-icon">🔍</span>
              <span>Fit View</span>
            </button>
            
            <button
              onClick={onResetPhysics}
              className="control-button secondary"
              title="Reset physics simulation"
              disabled={isLoading || layout !== 'physics'}
            >
              <span className="button-icon">🔄</span>
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Selection Controls */}
        <div className="control-group">
          <h3 className="control-title">Selection</h3>
          <div className="selection-controls">
            <button
              onClick={onGroupSelected}
              className="control-button tertiary"
              title="Group selected nodes"
              disabled={isLoading || selectedCount < 2}
            >
              <span className="button-icon">📦</span>
              <span>Group ({selectedCount})</span>
            </button>
            
            {onClearAll && (
              <button
                onClick={onClearAll}
                className="control-button danger"
                title="Clear all nodes from canvas"
                disabled={isLoading}
              >
                <span className="button-icon">🗑️</span>
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Display */}
        <div className="control-group">
          <h3 className="control-title">Status</h3>
          <div className="status-display">
            <div className="status-item">
              <span className="status-icon">📍</span>
              <span className="status-text">
                {fixedCount} Fixed
              </span>
            </div>
            <div className="status-item">
              <span className="status-icon">✨</span>
              <span className="status-text">
                {selectedCount} Selected
              </span>
            </div>
            {isLoading && (
              <div className="status-item loading">
                <span className="status-icon spinner">⚪</span>
                <span className="status-text">Loading...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="floating-actions">
        <button
          onClick={onFitView}
          className="fab primary"
          title="Fit to view"
          disabled={isLoading}
        >
          🔍
        </button>
        
        <button
          onClick={onResetPhysics}
          className="fab secondary"
          title="Reset physics"
          disabled={isLoading || layout !== 'physics'}
        >
          🔄
        </button>
      </div>

      {/* Quick Help */}
      <div className="quick-help">
        <div className="help-item">
          <kbd>Double-click</kbd> node to pin/unpin
        </div>
        <div className="help-item">
          <kbd>Right-click</kbd> node for context menu
        </div>
        <div className="help-item">
          <kbd>Ctrl</kbd> + <kbd>Click</kbd> to multi-select
        </div>
      </div>

      <style jsx>{`
        .topology-controls {
          position: absolute;
          top: 20px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          z-index: 1000;
        }

        .control-panel {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.2);
          min-width: 280px;
        }

        .control-group {
          margin-bottom: 24px;
        }

        .control-group:last-child {
          margin-bottom: 0;
        }

        .control-title {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .layout-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .layout-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 8px;
          border-radius: 12px;
          border: 2px solid transparent;
          background: rgba(0, 0, 0, 0.05);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
        }

        .layout-button:hover {
          background: rgba(102, 126, 234, 0.1);
          border-color: rgba(102, 126, 234, 0.3);
          transform: translateY(-2px);
        }

        .layout-button.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: #667eea;
          color: white;
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }

        .layout-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .layout-icon {
          font-size: 20px;
          margin-bottom: 6px;
        }

        .layout-name {
          font-size: 11px;
        }

        .view-controls,
        .selection-controls {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .control-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: rgba(0, 0, 0, 0.05);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
          font-weight: 500;
          color: #4b5563;
        }

        .control-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .control-button.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .control-button.primary:hover {
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }

        .control-button.secondary {
          background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
          color: white;
        }

        .control-button.tertiary {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .control-button.danger {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .control-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .button-icon {
          font-size: 16px;
        }

        .status-display {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #6b7280;
        }

        .status-item.loading .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .status-icon {
          font-size: 14px;
        }

        .floating-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .fab {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 20px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
        }

        .fab.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .fab.secondary {
          background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
          color: white;
        }

        .fab:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2);
        }

        .fab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .quick-help {
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(20px);
          border-radius: 12px;
          padding: 16px;
          color: white;
          font-size: 12px;
        }

        .help-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .help-item:last-child {
          margin-bottom: 0;
        }

        kbd {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
          font-family: monospace;
        }

        @media (max-width: 768px) {
          .topology-controls {
            top: 10px;
            right: 10px;
          }

          .control-panel {
            min-width: 240px;
            padding: 16px;
          }

          .layout-buttons {
            grid-template-columns: 1fr;
          }

          .quick-help {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};