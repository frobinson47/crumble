import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimate(true));
      });
      document.body.style.overflow = 'hidden';
    } else if (visible) {
      setAnimate(false);
      const timer = setTimeout(() => {
        setVisible(false);
        document.body.style.overflow = '';
        // Restore focus to the element that opened the modal
        if (previousFocusRef.current && previousFocusRef.current.focus) {
          previousFocusRef.current.focus();
        }
      }, 200);
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Auto-focus the close button when modal opens
  useEffect(() => {
    if (visible && modalRef.current) {
      const closeBtn = modalRef.current.querySelector('[aria-label="Close"]');
      if (closeBtn) closeBtn.focus();
    }
  }, [visible]);

  // Focus trap + Escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key !== 'Tab' || !modalRef.current) return;

    const focusable = modalRef.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!visible) return null;

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
        className={`absolute inset-0 bg-brown/50 backdrop-blur-sm transition-opacity duration-200 ${
          animate ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal content */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId.current : undefined}
        className={`
          relative bg-surface rounded-2xl shadow-xl
          w-full ${sizeClasses[size] || sizeClasses.md}
          max-h-[90vh] overflow-y-auto
          p-6
          transition-all duration-200
          ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `}
      >
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h2 id={titleId.current} className="text-xl font-bold text-brown">{title}</h2>
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
