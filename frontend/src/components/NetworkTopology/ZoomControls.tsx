import React from 'react';
import { Network } from 'vis-network/standalone';

interface ZoomControlsProps {
  networkRef: React.RefObject<Network | null>;
  theme?: 'light' | 'dark';
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ 
  networkRef, 
  theme = 'light' 
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

  return (
    <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 backdrop-blur-sm">
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
    </div>
  );
};