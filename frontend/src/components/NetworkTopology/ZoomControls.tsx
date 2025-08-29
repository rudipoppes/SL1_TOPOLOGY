import React from 'react';
import { Network } from 'vis-network/standalone';

interface ZoomControlsProps {
  networkRef: React.RefObject<Network | null>;
  theme?: 'light' | 'dark';
  // Layout controls
  layout?: 'hierarchical' | 'physics' | 'grid';
  onLayoutChange?: (layout: 'hierarchical' | 'physics' | 'grid') => void;
  onClearAll?: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ 
  networkRef, 
  theme = 'light',
  layout = 'physics',
  onLayoutChange,
  onClearAll
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

  const baseButtonClass = `
    w-10 h-10 rounded-lg border transition-all duration-300 
    flex items-center justify-center font-bold text-lg
    hover:scale-110 hover:shadow-lg active:scale-95
  `;

  const layoutButtonClass = `
    px-3 py-2 rounded-lg border transition-all duration-300 
    flex items-center justify-center font-medium text-sm
    hover:scale-105 hover:shadow-lg active:scale-95 whitespace-nowrap
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
          className={`${baseButtonClass} ${themeClasses}`}
          title="Zoom In"
        >
          +
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className={`${baseButtonClass} ${themeClasses}`}
          title="Zoom Out"
        >
          −
        </button>

        {/* Separator line */}
        <div className={`h-px my-1 ${
          theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
        }`} />

        {/* Fit View */}
        <button
          onClick={handleFitView}
          className={`${baseButtonClass} ${themeClasses} text-sm`}
          title="Fit View"
        >
          ⊡
        </button>

        {/* Reset View */}
        <button
          onClick={handleReset}
          className={`${baseButtonClass} ${themeClasses} text-sm`}
          title="Reset View"
        >
          ⌂
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
            className={`${layoutButtonClass} ${
              layout === 'physics' ? activeLayoutClass : layoutThemeClasses
            }`}
            title="Physics Layout"
          >
            ⚛️ Physics
          </button>

          {/* Hierarchical Layout */}
          <button
            onClick={() => onLayoutChange('hierarchical')}
            className={`${layoutButtonClass} ${
              layout === 'hierarchical' ? activeLayoutClass : layoutThemeClasses
            }`}
            title="Hierarchical Layout"
          >
            🌳 Hierarchy
          </button>

          {/* Grid Layout */}
          <button
            onClick={() => onLayoutChange('grid')}
            className={`${layoutButtonClass} ${
              layout === 'grid' ? activeLayoutClass : layoutThemeClasses
            }`}
            title="Grid Layout"
          >
            ⚏ Grid
          </button>

          {/* Clear Button */}
          {onClearAll && (
            <>
              <div className={`h-px my-1 ${
                theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
              }`} />
              <button
                onClick={onClearAll}
                className={`${layoutButtonClass} ${dangerClass}`}
                title="Clear All"
              >
                🗑️ Clear
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};