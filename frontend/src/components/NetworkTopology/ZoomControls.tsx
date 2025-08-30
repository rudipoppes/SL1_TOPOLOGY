import React from 'react';
import { Network } from 'vis-network/standalone';

interface ZoomControlsProps {
  networkRef: React.RefObject<Network | null>;
  theme?: 'light' | 'dark';
  // Layout controls
  layout?: 'hierarchical' | 'physics' | 'grid';
  onLayoutChange?: (layout: 'hierarchical' | 'physics' | 'grid', selectedOnly?: boolean) => void;
  onClearAll?: () => void;
  // Lock controls
  isLocked?: boolean;
  onToggleLock?: () => void;
  // Selection controls
  selectedCount?: number;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ 
  networkRef, 
  theme = 'light',
  layout = 'physics',
  onLayoutChange,
  onClearAll,
  isLocked = false,
  onToggleLock,
  selectedCount = 0,
  onSelectAll,
  onClearSelection
}) => {
  const handleZoomIn = () => {
    if (networkRef.current) {
      const currentScale = networkRef.current.getScale();
      networkRef.current.moveTo({
        scale: currentScale * 1.2, // Zoom in by 20%
        animation: { duration: 300, easingFunction: 'easeInOutQuad' }
      });
    }
  };

  const handleZoomOut = () => {
    if (networkRef.current) {
      const currentScale = networkRef.current.getScale();
      networkRef.current.moveTo({
        scale: currentScale * 0.8, // Zoom out by 20%
        animation: { duration: 300, easingFunction: 'easeInOutQuad' }
      });
    }
  };

  const handleFitView = () => {
    if (networkRef.current) {
      networkRef.current.fit({ 
        animation: { duration: 500, easingFunction: 'easeInOutQuad' } 
      });
    }
  };

  const handleReset = () => {
    if (networkRef.current) {
      networkRef.current.moveTo({
        position: { x: 0, y: 0 },
        scale: 1,
        animation: { duration: 500, easingFunction: 'easeInOutQuad' }
      });
    }
  };

  // Export functions
  const handleExportPNG = () => {
    if (networkRef.current) {
      // Get canvas via DOM query since vis-network doesn't expose getCanvas in TypeScript
      const canvas = (networkRef.current as any).canvas?.frame?.canvas;
      if (canvas) {
        const link = document.createElement('a');
        link.download = 'topology-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        alert('Canvas not available for export');
      }
    }
  };

  const handleExportJPEG = () => {
    if (networkRef.current) {
      // Get canvas via DOM query since vis-network doesn't expose getCanvas in TypeScript
      const canvas = (networkRef.current as any).canvas?.frame?.canvas;
      if (canvas) {
        const link = document.createElement('a');
        link.download = 'topology-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.jpg';
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
      } else {
        alert('Canvas not available for export');
      }
    }
  };

  const handleExportSVG = () => {
    if (networkRef.current) {
      try {
        // Get network data
        const nodes = (networkRef.current as any).body.data.nodes;
        const edges = (networkRef.current as any).body.data.edges;
        const positions = networkRef.current.getPositions();
        
        if (!nodes || !edges || !positions) {
          alert('Network data not available for SVG export');
          return;
        }
        
        // Calculate bounding box
        const nodePositions = Object.values(positions) as { x: number; y: number }[];
        const minX = Math.min(...nodePositions.map(p => p.x)) - 100;
        const maxX = Math.max(...nodePositions.map(p => p.x)) + 100;
        const minY = Math.min(...nodePositions.map(p => p.y)) - 100;
        const maxY = Math.max(...nodePositions.map(p => p.y)) + 100;
        const width = maxX - minX;
        const height = maxY - minY;
        
        // Start SVG content
        let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .node-text { font-family: Inter, Arial, sans-serif; font-size: 14px; text-anchor: middle; }
      .edge-line { stroke: #848484; stroke-width: 2; }
      .node-rect { stroke: #333; stroke-width: 2; rx: 12; }
    </style>
  </defs>
  <g id="edges">`;
        
        // Add edges
        if (edges._data) {
          Object.values(edges._data).forEach((edge: any) => {
            const fromPos = positions[edge.from];
            const toPos = positions[edge.to];
            if (fromPos && toPos) {
              svg += `
    <line x1="${fromPos.x}" y1="${fromPos.y}" x2="${toPos.x}" y2="${toPos.y}" class="edge-line"/>`;
            }
          });
        }
        
        svg += `
  </g>
  <g id="nodes">`;
        
        // Add nodes
        if (nodes._data) {
          Object.values(nodes._data).forEach((node: any) => {
            const pos = positions[node.id];
            if (pos) {
              const nodeWidth = 120;
              const nodeHeight = 60;
              const x = pos.x - nodeWidth/2;
              const y = pos.y - nodeHeight/2;
              
              // Node background
              svg += `
    <rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" 
          fill="#ffffff" class="node-rect"/>`;
          
              // Node text (handle multiline)
              const lines = (node.label || node.id || '').split('\n');
              const textY = pos.y - (lines.length - 1) * 7;
              lines.forEach((line: string, index: number) => {
                svg += `
    <text x="${pos.x}" y="${textY + index * 14}" class="node-text">${escapeXml(line)}</text>`;
              });
            }
          });
        }
        
        svg += `
  </g>
</svg>`;
        
        // Download SVG
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const link = document.createElement('a');
        link.download = 'topology-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.svg';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
        
      } catch (error) {
        console.error('SVG export error:', error);
        alert('SVG export failed. Try PNG or JPEG export instead.');
      }
    }
  };
  
  // Helper function to escape XML characters
  const escapeXml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const handleExportHTML = () => {
    if (networkRef.current) {
      const canvas = (networkRef.current as any).canvas?.frame?.canvas;
      if (canvas) {
        const dataURL = canvas.toDataURL('image/png');
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Network Topology Export</title>
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        .container { text-align: center; }
        .timestamp { color: #666; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Network Topology</h1>
        <img src="${dataURL}" alt="Network Topology" style="max-width: 100%; height: auto;" />
        <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>
    </div>
</body>
</html>`;
        
        const blob = new Blob([html], { type: 'text/html' });
        const link = document.createElement('a');
        link.download = 'topology-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.html';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      } else {
        alert('Canvas not available for export');
      }
    }
  };

  const uniformButtonClass = `
    w-10 h-10 rounded-lg border transition-all duration-300 
    flex items-center justify-center font-medium text-sm
    hover:scale-110 hover:shadow-lg active:scale-95
  `;

  const themeClasses = theme === 'dark' 
    ? `
      bg-gray-800 border-gray-600 text-gray-100
      hover:bg-gray-700 hover:border-gray-500
      shadow-lg shadow-black/20
    `
    : `
      bg-white border-gray-300 text-gray-700
      hover:bg-gray-50 hover:border-gray-400
      shadow-lg shadow-black/10
    `;

  const layoutThemeClasses = theme === 'dark' 
    ? `
      bg-gray-800 border-gray-600 text-gray-100
      hover:bg-gray-700 hover:border-gray-500
      shadow-lg shadow-black/20
    `
    : `
      bg-white border-gray-300 text-gray-700
      hover:bg-gray-50 hover:border-gray-400
      shadow-lg shadow-black/10
    `;

  const activeLayoutClass = theme === 'dark'
    ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/25'
    : 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/25';

  const dangerClass = 'bg-orange-500 border-orange-400 text-white hover:bg-orange-600 shadow-orange-500/25';

  return (
    <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 backdrop-blur-sm">
      {/* Zoom Controls */}
      <div className={`flex flex-col gap-1 p-2 rounded-xl border ${
        theme === 'dark' 
          ? 'bg-gray-800/90 border-gray-600' 
          : 'bg-white/90 border-gray-200'
      } shadow-xl`}>
        
        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className={`${uniformButtonClass} ${themeClasses}`}
          title="Zoom In"
        >
          <span className="text-lg font-bold">+</span>
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className={`${uniformButtonClass} ${themeClasses}`}
          title="Zoom Out"
        >
          <span className="text-lg font-bold">−</span>
        </button>

        {/* Separator line */}
        <div className={`h-px my-1 ${
          theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
        }`} />

        {/* Fit View */}
        <button
          onClick={handleFitView}
          className={`${uniformButtonClass} ${themeClasses}`}
          title="Fit View"
        >
          <span className="text-base">⊡</span>
        </button>

        {/* Reset View */}
        <button
          onClick={handleReset}
          className={`${uniformButtonClass} ${themeClasses}`}
          title="Reset View"
        >
          <span className="text-base">⌂</span>
        </button>
      </div>

      {/* Layout Controls - All Canvas */}
      {onLayoutChange && (
        <div className={`flex flex-col gap-1 p-2 rounded-xl border ${
          theme === 'dark' 
            ? 'bg-gray-800/90 border-gray-600' 
            : 'bg-white/90 border-gray-200'
        } shadow-xl`}>
          
          {/* Physics Layout - All Nodes */}
          <button
            onClick={() => onLayoutChange('physics', false)}
            className={`${uniformButtonClass} ${
              layout === 'physics' ? activeLayoutClass : layoutThemeClasses
            }`}
            title="Physics Layout (All)"
          >
            <span className="text-base">⚛️</span>
          </button>

          {/* Hierarchical Layout - All Nodes */}
          <button
            onClick={() => onLayoutChange('hierarchical', false)}
            className={`${uniformButtonClass} ${
              layout === 'hierarchical' ? activeLayoutClass : layoutThemeClasses
            }`}
            title="Hierarchical Layout (All)"
          >
            <span className="text-base">🌳</span>
          </button>

          {/* Grid Layout - All Nodes */}
          <button
            onClick={() => onLayoutChange('grid', false)}
            className={`${uniformButtonClass} ${
              layout === 'grid' ? activeLayoutClass : layoutThemeClasses
            }`}
            title="Grid Layout (All)"
          >
            <span className="text-base">⚏</span>
          </button>

          {/* Clear Button */}
          {onClearAll && (
            <>
              <div className={`h-px my-1 ${
                theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
              }`} />
              <button
                onClick={onClearAll}
                className={`${uniformButtonClass} ${dangerClass}`}
                title="Clear All"
              >
                <span className="text-base">🗑️</span>
              </button>
            </>
          )}

          {/* Lock/Unlock Button */}
          {onToggleLock && (
            <button
              onClick={onToggleLock}
              className={`${uniformButtonClass} ${
                isLocked 
                  ? 'bg-red-500 border-red-400 text-white hover:bg-red-600 shadow-red-500/25'
                  : layoutThemeClasses
              }`}
              title={isLocked ? "Unlock Canvas" : "Lock Canvas"}
            >
              <span className="text-base">{isLocked ? '🔒' : '🔓'}</span>
            </button>
          )}
        </div>
      )}

      {/* Layout Controls - Selected Items Only */}
      {selectedCount > 0 && onLayoutChange && (
        <div className={`flex flex-col gap-1 p-2 rounded-xl border ${
          theme === 'dark' 
            ? 'bg-gray-800/90 border-gray-600' 
            : 'bg-white/90 border-gray-200'
        } shadow-xl`}>
          
          {/* Physics Layout - Selected Only */}
          <button
            onClick={() => onLayoutChange('physics', true)}
            className={`${uniformButtonClass} ${layoutThemeClasses} text-xs`}
            title="Physics Layout (Selected)"
            style={{ fontSize: '9px', padding: '6px' }}
          >
            <span>⚛️✓</span>
          </button>

          {/* Hierarchical Layout - Selected Only */}
          <button
            onClick={() => onLayoutChange('hierarchical', true)}
            className={`${uniformButtonClass} ${layoutThemeClasses} text-xs`}
            title="Hierarchical Layout (Selected)"
            style={{ fontSize: '9px', padding: '6px' }}
          >
            <span>🌳✓</span>
          </button>

          {/* Grid Layout - Selected Only */}
          <button
            onClick={() => onLayoutChange('grid', true)}
            className={`${uniformButtonClass} ${layoutThemeClasses} text-xs`}
            title="Grid Layout (Selected)"
            style={{ fontSize: '9px', padding: '6px' }}
          >
            <span>⚏✓</span>
          </button>
        </div>
      )}

      {/* Selection Controls - Only show when nodes are selected or Select All is available */}
      {(onSelectAll && selectedCount === 0) && (
        <div className={`flex flex-col gap-1 p-2 rounded-xl border ${
          theme === 'dark' 
            ? 'bg-gray-800/90 border-gray-600' 
            : 'bg-white/90 border-gray-200'
        } shadow-xl`}>
          
          {/* Select All - only when no nodes selected */}
          <button
            onClick={onSelectAll}
            className={`${uniformButtonClass} ${layoutThemeClasses}`}
            title="Select All Nodes"
          >
            <span className="text-xs font-bold">ALL</span>
          </button>
        </div>
      )}

      {/* Selection Management - Only show when nodes are selected */}
      {selectedCount > 0 && onClearSelection && (
        <div className={`flex flex-col gap-1 p-2 rounded-xl border ${
          theme === 'dark' 
            ? 'bg-gray-800/90 border-gray-600' 
            : 'bg-white/90 border-gray-200'
        } shadow-xl`}>
          
          {/* Clear Selection */}
          <button
            onClick={onClearSelection}
            className={`${uniformButtonClass} ${layoutThemeClasses}`}
            title="Clear Selection"
          >
            <span className="text-xs font-bold">CLR</span>
          </button>
        </div>
      )}
      
      {/* Export Controls */}
      <div className={`flex flex-col gap-1 p-2 rounded-xl border ${
        theme === 'dark' 
          ? 'bg-gray-800/90 border-gray-600' 
          : 'bg-white/90 border-gray-200'
      } shadow-xl`}>
        
        {/* Export PNG */}
        <button
          onClick={handleExportPNG}
          className={`${uniformButtonClass} ${themeClasses}`}
          title="Export as PNG"
        >
          <span className="text-xs font-bold">PNG</span>
        </button>

        {/* Export JPEG */}
        <button
          onClick={handleExportJPEG}
          className={`${uniformButtonClass} ${themeClasses}`}
          title="Export as JPEG"
        >
          <span className="text-xs font-bold">JPG</span>
        </button>

        {/* Separator line */}
        <div className={`h-px my-1 ${
          theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
        }`} />

        {/* Export HTML */}
        <button
          onClick={handleExportHTML}
          className={`${uniformButtonClass} ${themeClasses}`}
          title="Export as HTML"
        >
          <span className="text-xs font-bold">HTML</span>
        </button>

        {/* Export SVG */}
        <button
          onClick={handleExportSVG}
          className={`${uniformButtonClass} ${themeClasses}`}
          title="Export as SVG"
        >
          <span className="text-xs font-bold">SVG</span>
        </button>
      </div>
    </div>
  );
};