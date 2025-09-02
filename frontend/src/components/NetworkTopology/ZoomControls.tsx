import React from 'react';
import { Network } from 'vis-network/standalone';

interface ZoomControlsProps {
  networkRef: React.RefObject<Network | null>;
  theme?: 'light' | 'dark';
  // Layout controls
  layout?: 'hierarchical' | 'physics' | 'grid';
  onLayoutChange?: (layout: 'hierarchical' | 'physics' | 'grid', selectedOnly?: boolean) => void;
  // Lock controls
  isLocked?: boolean;
  onToggleLock?: () => void;
  // Selection controls
  selectedCount?: number;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onLockAllSelected?: () => void;
  selectedLockState?: 'none' | 'partial' | 'all';
  // Search controls
  onOpenSearch?: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ 
  networkRef, 
  theme = 'light',
  layout = 'physics',
  onLayoutChange,
  isLocked = false,
  onToggleLock,
  selectedCount = 0,
  onSelectAll,
  onClearSelection,
  onLockAllSelected,
  selectedLockState = 'none',
  onOpenSearch
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

        {/* Search Canvas */}
        {onOpenSearch && (
          <>
            {/* Separator line */}
            <div className={`h-px my-1 ${
              theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
            }`} />
            
            <button
              onClick={onOpenSearch}
              className={`${uniformButtonClass} ${themeClasses}`}
              title="Search Canvas (Ctrl+K)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </>
        )}
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
              <circle cx="12" cy="3" r="1"/>
              <circle cx="12" cy="21" r="1"/>
              <circle cx="21" cy="12" r="1"/>
              <circle cx="3" cy="12" r="1"/>
            </svg>
          </button>

          {/* Hierarchical Layout - All Nodes */}
          <button
            onClick={() => onLayoutChange('hierarchical', false)}
            className={`${uniformButtonClass} ${
              layout === 'hierarchical' ? activeLayoutClass : layoutThemeClasses
            }`}
            title="Hierarchical Layout (All)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
            </svg>
          </button>

          {/* Grid Layout - All Nodes */}
          <button
            onClick={() => onLayoutChange('grid', false)}
            className={`${uniformButtonClass} ${
              layout === 'grid' ? activeLayoutClass : layoutThemeClasses
            }`}
            title="Grid Layout (All)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
            </svg>
          </button>


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
              {isLocked ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
                </svg>
              )}
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
            className={`${uniformButtonClass} ${layoutThemeClasses} text-xs relative`}
            title="Physics Layout (Selected)"
            style={{ fontSize: '9px', padding: '6px' }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
              <circle cx="12" cy="3" r="1"/>
              <circle cx="12" cy="21" r="1"/>
              <circle cx="21" cy="12" r="1"/>
              <circle cx="3" cy="12" r="1"/>
            </svg>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white text-[6px] flex items-center justify-center text-white font-bold">✓</div>
          </button>

          {/* Hierarchical Layout - Selected Only */}
          <button
            onClick={() => onLayoutChange('hierarchical', true)}
            className={`${uniformButtonClass} ${layoutThemeClasses} text-xs relative`}
            title="Hierarchical Layout (Selected)"
            style={{ fontSize: '9px', padding: '6px' }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
            </svg>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white text-[6px] flex items-center justify-center text-white font-bold">✓</div>
          </button>

          {/* Grid Layout - Selected Only */}
          <button
            onClick={() => onLayoutChange('grid', true)}
            className={`${uniformButtonClass} ${layoutThemeClasses} text-xs relative`}
            title="Grid Layout (Selected)"
            style={{ fontSize: '9px', padding: '6px' }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
            </svg>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white text-[6px] flex items-center justify-center text-white font-bold">✓</div>
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
      {selectedCount > 0 && (onClearSelection || onLockAllSelected) && (
        <div className={`flex flex-col gap-1 p-2 rounded-xl border ${
          theme === 'dark' 
            ? 'bg-gray-800/90 border-gray-600' 
            : 'bg-white/90 border-gray-200'
        } shadow-xl`}>
          
          {/* Lock/Unlock Selected Nodes */}
          {onLockAllSelected && (
            <button
              onClick={onLockAllSelected}
              className={`${uniformButtonClass} ${layoutThemeClasses}`}
              title={
                selectedLockState === 'all' 
                  ? `Unlock ${selectedCount} selected node${selectedCount > 1 ? 's' : ''}` 
                  : selectedLockState === 'partial'
                  ? `Lock remaining ${selectedCount} selected node${selectedCount > 1 ? 's' : ''}`
                  : `Lock ${selectedCount} selected node${selectedCount > 1 ? 's' : ''}`
              }
            >
              <span className="text-xs font-bold">
                {selectedLockState === 'all' ? 'UNLK' : 'LOCK'}
              </span>
            </button>
          )}
          
          {/* Remove Selected Nodes */}
          {onClearSelection && (
            <button
              onClick={onClearSelection}
              className={`${uniformButtonClass} ${layoutThemeClasses}`}
              title="Remove Selected Nodes and Their Topology"
            >
              <span className="text-xs font-bold">REM</span>
            </button>
          )}
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