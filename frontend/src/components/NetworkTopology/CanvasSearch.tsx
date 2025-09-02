import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';

interface CanvasSearchProps {
  onSearch: (searchTerm: string) => void;
  theme?: 'light' | 'dark';
  isVisible?: boolean;
  onClose?: () => void;
}

export interface CanvasSearchRef {
  focus: () => void;
  clear: () => void;
}

export const CanvasSearch = forwardRef<CanvasSearchRef, CanvasSearchProps>(({
  onSearch,
  theme = 'light',
  isVisible = false,
  onClose,
}, ref) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef?.focus();
    },
    clear: () => {
      setSearchTerm('');
    }
  }));

  // Auto-focus when becoming visible
  useEffect(() => {
    if (isVisible && inputRef) {
      inputRef.focus();
    }
  }, [isVisible, inputRef]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, onSearch]);

  // Handle Escape key to close search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  const handleClose = () => {
    setSearchTerm('');
    onClose?.();
  };

  if (!isVisible) {
    return null;
  }

  const themeClasses = theme === 'dark' 
    ? 'bg-gray-800/95 border-gray-600 text-gray-100 placeholder-gray-400'
    : 'bg-white/95 border-gray-300 text-gray-700 placeholder-gray-500';

  const focusClasses = theme === 'dark'
    ? 'focus:border-purple-400 focus:ring-purple-900/30'
    : 'focus:border-blue-400 focus:ring-blue-100';

  return (
    <div className="absolute top-4 right-4 z-50 animate-fade-in">
      <div className={`
        flex items-center gap-2 p-3 rounded-xl border-2 backdrop-blur-sm
        shadow-xl transition-all duration-300 min-w-[280px]
        ${themeClasses}
      `}>
        {/* Search Icon */}
        <div className="flex-shrink-0">
          <svg
            className={`w-5 h-5 transition-colors ${
              searchTerm 
                ? (theme === 'dark' ? 'text-purple-400' : 'text-blue-500')
                : (theme === 'dark' ? 'text-gray-500' : 'text-gray-400')
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Search Input */}
        <input
          ref={setInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search canvas by name..."
          className={`
            flex-1 bg-transparent outline-none
            ${focusClasses}
          `}
          autoComplete="off"
        />

        {/* Clear Button */}
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className={`
              flex-shrink-0 w-6 h-6 rounded-full transition-all duration-200
              flex items-center justify-center
              ${theme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-200' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-500 hover:text-gray-700'
              }
            `}
            title="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Close Button */}
        <button
          onClick={handleClose}
          className={`
            flex-shrink-0 w-6 h-6 rounded-full transition-all duration-200
            flex items-center justify-center
            ${theme === 'dark' 
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-200' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-500 hover:text-gray-700'
            }
          `}
          title="Close search (Esc)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search Results Counter */}
      {searchTerm && (
        <div className={`
          mt-2 text-xs text-center py-1 px-3 rounded-lg backdrop-blur-sm
          ${theme === 'dark' 
            ? 'bg-gray-800/80 text-gray-300 border border-gray-600/50' 
            : 'bg-white/80 text-gray-600 border border-gray-200/50'
          }
        `}>
          Press Esc to clear search
        </div>
      )}
    </div>
  );
});

// Add CSS animation class if not already available
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
`;

if (!document.head.querySelector('[data-canvas-search-styles]')) {
  style.setAttribute('data-canvas-search-styles', 'true');
  document.head.appendChild(style);
}