import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-brown/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal content */}
      <div
        className={`
          relative bg-white rounded-2xl shadow-xl
          w-full ${sizeClasses[size] || sizeClasses.md}
          max-h-[90vh] overflow-y-auto
          p-6
        `}
      >
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h2 className="text-xl font-bold text-brown">{title}</h2>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-warm-gray hover:bg-cream-dark transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center ml-auto"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
