import React, { useState } from 'react';
import { configService } from '../../services/config';

interface DepthSelectorProps {
  globalDepth: number;
  onDepthChange: (depth: number) => void;
  hasCanvasItems?: boolean;
  selectedNodesCount?: number;
  onDrawItems?: (pendingDepth: number) => void;
  className?: string;
  theme?: 'light' | 'dark';
}

export const DepthSelector: React.FC<DepthSelectorProps> = ({
  globalDepth,
  onDepthChange,
  hasCanvasItems = false,
  selectedNodesCount = 0,
  onDrawItems,
  className = '',
  theme = 'light',
}) => {
  const [isChanging, setIsChanging] = useState(false);
  const [pendingDepth, setPendingDepth] = useState(globalDepth);
  const maxDepth = configService.getTopologyConfig().controls.maxDepth;

  // Update pending depth when global depth changes
  React.useEffect(() => {
    setPendingDepth(globalDepth);
  }, [globalDepth]);

  const handleDepthChange = async (newDepth: number) => {
    if (newDepth < 1 || newDepth > maxDepth) return;
    
    if (hasCanvasItems) {
      // When canvas has items, just update pending depth
      setPendingDepth(newDepth);
    } else {
      // When canvas is empty, apply depth change immediately
      if (newDepth === globalDepth) return;
      setIsChanging(true);
      try {
        await onDepthChange(newDepth);
      } finally {
        setTimeout(() => setIsChanging(false), 500);
      }
    }
  };

  const handleDrawItems = () => {
    if (onDrawItems && hasCanvasItems && selectedNodesCount > 0 && pendingDepth !== globalDepth) {
      setIsChanging(true);
      onDrawItems(pendingDepth);
      setTimeout(() => setIsChanging(false), 500);
    }
  };

  const displayDepth = hasCanvasItems ? pendingDepth : globalDepth;
  const canDecrease = displayDepth > 1 && !isChanging;
  const canIncrease = displayDepth < maxDepth && !isChanging;
  
  const hasChanges = hasCanvasItems && pendingDepth !== globalDepth;
  const canDrawItems = hasCanvasItems && selectedNodesCount > 0 && hasChanges && !isChanging;

  const themeClasses = theme === 'dark' 
    ? 'bg-slate-800/90 border-slate-600 text-slate-200' 
    : 'bg-white/90 border-slate-200 text-slate-700';

  return (
    <div className={`glass-panel p-3 rounded-xl border backdrop-blur-md ${themeClasses} ${className}`}>
      <div className="flex items-center space-x-3">
        {/* Label */}
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full animate-pulse-subtle"></div>
          <span className="text-sm font-medium">Depth</span>
        </div>

        {/* Rolling number controls */}
        <div className="flex items-center bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded-lg border border-slate-200 dark:border-slate-500 overflow-hidden">
          {/* Decrease button */}
          <button
            onClick={() => handleDepthChange(displayDepth - 1)}
            disabled={!canDecrease}
            className={`
              px-3 py-2 transition-all duration-200 font-mono text-sm font-bold
              ${canDecrease 
                ? 'hover:bg-red-100 hover:text-red-600 text-slate-600 dark:text-slate-300 dark:hover:bg-red-900/30 dark:hover:text-red-400 cursor-pointer transform hover:scale-110' 
                : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
              }
              ${theme === 'dark' ? 'hover:bg-slate-600/50' : 'hover:bg-slate-200/50'}
            `}
            title={`Decrease depth to ${displayDepth - 1}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7-7m0 0l-7 7m7-7v18" />
            </svg>
          </button>

          {/* Depth display */}
          <div className={`
            px-4 py-2 min-w-[3rem] text-center relative
            ${isChanging ? 'animate-pulse' : ''}
            ${theme === 'dark' ? 'bg-slate-600/30' : 'bg-white/60'}
            border-x border-slate-200 dark:border-slate-500
          `}>
            <span className={`
              text-lg font-bold font-mono tracking-wider transition-all duration-300
              ${isChanging ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-slate-800 dark:text-slate-200'}
              ${hasChanges ? 'text-orange-600 dark:text-orange-400' : ''}
            `}>
              {displayDepth}
            </span>
            
            {/* Animated dots during change */}
            {isChanging && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Increase button */}
          <button
            onClick={() => handleDepthChange(displayDepth + 1)}
            disabled={!canIncrease}
            className={`
              px-3 py-2 transition-all duration-200 font-mono text-sm font-bold
              ${canIncrease 
                ? 'hover:bg-green-100 hover:text-green-600 text-slate-600 dark:text-slate-300 dark:hover:bg-green-900/30 dark:hover:text-green-400 cursor-pointer transform hover:scale-110' 
                : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
              }
              ${theme === 'dark' ? 'hover:bg-slate-600/50' : 'hover:bg-slate-200/50'}
            `}
            title={`Increase depth to ${displayDepth + 1}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7 7m0 0l7-7m-7 7V3" />
            </svg>
          </button>
        </div>

        {/* Depth level indicator */}
        <div className="flex items-center space-x-1">
          {Array.from({ length: maxDepth }, (_, i) => (
            <div
              key={i}
              className={`
                w-2 h-2 rounded-full transition-all duration-300
                ${i < displayDepth 
                  ? 'bg-gradient-to-r from-blue-400 to-indigo-500 shadow-sm' 
                  : 'bg-slate-300 dark:bg-slate-600'
                }
                ${hasChanges && i < displayDepth ? 'ring-2 ring-orange-400 ring-opacity-50' : ''}
              `}
              title={`Level ${i + 1}${i < globalDepth ? ' (active)' : ''}`}
            />
          ))}
        </div>

        {/* Draw Items button - only show when canvas has items */}
        {hasCanvasItems && (
          <button
            onClick={handleDrawItems}
            disabled={!canDrawItems}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center space-x-2
              ${canDrawItems
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transform hover:scale-105 cursor-pointer'
                : 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60'
              }
            `}
            title={
              selectedNodesCount === 0 
                ? 'Select nodes on canvas to apply depth changes'
                : hasChanges 
                  ? `Apply depth ${displayDepth} to ${selectedNodesCount} selected node${selectedNodesCount > 1 ? 's' : ''}`
                  : 'No depth changes to apply'
            }
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Draw Items</span>
            {selectedNodesCount > 0 && (
              <span className="bg-white/20 px-2 py-1 rounded-full text-xs font-bold">
                {selectedNodesCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Helper text */}
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
        {isChanging ? (
          <span className="text-blue-600 dark:text-blue-400 animate-pulse">
            🔄 Updating topology...
          </span>
        ) : hasCanvasItems ? (
          <span>
            {hasChanges ? (
              <span className="text-orange-600 dark:text-orange-400">
                📝 Depth {displayDepth} pending • Select nodes and press "Draw Items"
              </span>
            ) : (
              <span>
                🎯 Select {selectedNodesCount} node{selectedNodesCount !== 1 ? 's' : ''} • Depth {displayDepth} of {maxDepth}
              </span>
            )}
          </span>
        ) : (
          <span>
            Level {displayDepth} of {maxDepth} • {displayDepth === 1 ? 'Direct connections' : `${displayDepth}-level deep`}
          </span>
        )}
      </div>
    </div>
  );
};