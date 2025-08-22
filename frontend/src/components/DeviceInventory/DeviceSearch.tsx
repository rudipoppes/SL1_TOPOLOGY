import React, { useState, useEffect } from 'react';

interface DeviceSearchProps {
  onSearch: (searchTerm: string) => void;
  placeholder?: string;
}

export const DeviceSearch: React.FC<DeviceSearchProps> = ({
  onSearch,
  placeholder = 'Search by name or IP...',
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, onSearch]);

  return (
    <div className="relative group">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 pl-12 pr-4 border-2 border-gray-200 rounded-xl 
                   focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 
                   transition-all duration-200 text-gray-700 placeholder-gray-400
                   group-hover:border-gray-300 bg-gray-50 focus:bg-white"
      />
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
        <svg
          className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors"
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
      
      {/* Clear button when there's text */}
      {searchTerm && (
        <button
          onClick={() => setSearchTerm('')}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full 
                     bg-gray-300 hover:bg-gray-400 text-gray-600 hover:text-gray-800 
                     transition-all duration-200 flex items-center justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};