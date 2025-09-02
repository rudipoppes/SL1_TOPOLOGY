import React from 'react';
import { Device } from '../../services/api';

interface DeletionConfirmationModalProps {
  isOpen: boolean;
  selectedNodeNames: string[];
  affectedDevices: Device[];
  onConfirm: (option: 'complete' | 'preserve' | 'cancel') => void;
  onClose: () => void;
}

export const DeletionConfirmationModal: React.FC<DeletionConfirmationModalProps> = ({
  isOpen,
  selectedNodeNames,
  affectedDevices,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-600 max-w-md w-full mx-4 animate-scale-in">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 14.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Confirm Deletion
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                This action will affect selected devices
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">
              Removing: <span className="font-bold">{selectedNodeNames.join(', ')}</span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              This will affect <span className="font-bold text-amber-600 dark:text-amber-400">
                {affectedDevices.length} selected device{affectedDevices.length > 1 ? 's' : ''}
              </span> in the downstream topology:
            </p>
            <div className="flex flex-wrap gap-2">
              {affectedDevices.map((device) => (
                <span
                  key={device.id}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                >
                  {device.name}
                </span>
              ))}
            </div>
          </div>

          <div className="text-sm text-slate-600 dark:text-slate-400">
            Choose how to proceed:
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-0 space-y-3">
          {/* Option 1: Complete Removal */}
          <button
            onClick={() => onConfirm('complete')}
            className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/70 transition-colors">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-medium text-red-800 dark:text-red-200">Remove Everything</div>
                <div className="text-sm text-red-600 dark:text-red-400">Delete nodes and unselect affected devices</div>
              </div>
            </div>
            <svg className="w-5 h-5 text-red-400 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Option 2: Preserve Selected Devices */}
          <button
            onClick={() => onConfirm('preserve')}
            className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/70 transition-colors">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-medium text-blue-800 dark:text-blue-200">Keep Selected Devices</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Preserve affected devices and their topology</div>
              </div>
            </div>
            <svg className="w-5 h-5 text-blue-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Option 3: Cancel */}
          <button
            onClick={() => onConfirm('cancel')}
            className="w-full flex items-center justify-center gap-3 p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all duration-200"
          >
            <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="font-medium text-slate-700 dark:text-slate-300">Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
};