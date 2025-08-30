import React from 'react';
import { Network } from 'vis-network/standalone';

interface ZoomControlsProps {
  networkRef: React.RefObject<Network | null>;
  theme?: 'light' | 'dark';
  // Layout controls
  layout?: 'hierarchical' | 'physics' | 'grid';
  onLayoutChange?: (layout: 'hierarchical' | 'physics' | 'grid') => void;
  onClearAll?: () => void;
  // Lock controls
  isLocked?: boolean;
  onToggleLock?: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ 
  networkRef, 
  theme = 'light',
  layout = 'physics',
  onLayoutChange,
  onClearAll,
  isLocked = false,
  onToggleLock
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
    // Note: vis-network doesn't directly support SVG export
    // This is a placeholder for future implementation
    alert('SVG export not yet implemented. Use PNG or JPEG for now.');
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

      {/* Layout Controls */}
      {onLayoutChange && (
        <div className={`flex flex-col gap-1 p-2 rounded-xl border ${
          theme === 'dark' 
            ? 'bg-gray-800/90 border-gray-600' 
            : 'bg-white/90 border-gray-200'
        } shadow-xl`}>
          
          {/* Physics Layout */}
          <button
            onClick={() => onLayoutChange('physics')}
            className={`${uniformButtonClass} ${
              layout === 'physics' ? activeLayoutClass : layoutThemeClasses
            }`}
            title="Physics Layout"
          >
            <span className="text-base">⚛️</span>
          </button>

          {/* Hierarchical Layout */}
          <button
            onClick={() => onLayoutChange('hierarchical')}
            className={`${uniformButtonClass} ${
              layout === 'hierarchical' ? activeLayoutClass : layoutThemeClasses
            }`}
            title="Hierarchical Layout"
          >
            <span className="text-base">🌳</span>
          </button>

          {/* Grid Layout */}
          <button
            onClick={() => onLayoutChange('grid')}
            className={`${uniformButtonClass} ${
              layout === 'grid' ? activeLayoutClass : layoutThemeClasses
            }`}
            title="Grid Layout"
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

        {/* Export SVG (placeholder) */}
        <button
          onClick={handleExportSVG}
          className={`${uniformButtonClass} ${themeClasses} opacity-50`}
          title="Export as SVG (Coming Soon)"
        >
          <span className="text-xs font-bold">SVG</span>
        </button>
      </div>
    </div>
  );
};