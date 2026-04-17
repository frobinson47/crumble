import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Loader2, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastId = 0;

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
  loading: Loader2,
};

const VARIANT_STYLES = {
  success: 'bg-success-soft border-sage-dark/20 text-brown',
  error: 'bg-error-soft border-error/20 text-brown',
  info: 'bg-terracotta-50 border-terracotta/20 text-brown',
  warning: 'bg-warning-soft border-warning/20 text-brown',
  loading: 'bg-surface-raised border-cream-dark text-brown',
};

const ICON_STYLES = {
  success: 'text-success',
  error: 'text-error',
  info: 'text-terracotta',
  warning: 'text-warning',
  loading: 'text-warm-gray animate-spin',
};

function Toast({ toast: t, onDismiss }) {
  const Icon = ICONS[t.variant] || ICONS.info;
  const [exiting, setExiting] = React.useState(false);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(t.id), 150);
  }, [t.id, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        flex items-center gap-2.5 px-4 py-3 min-h-[48px] max-w-[480px] min-w-[280px]
        rounded-xl border shadow-warm-lg
        ${VARIANT_STYLES[t.variant] || VARIANT_STYLES.info}
        ${exiting ? 'opacity-0 translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100'}
      `}
      style={{
        animation: exiting ? 'toast-out 150ms ease forwards' : 'toast-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        transition: 'opacity 150ms, transform 150ms',
      }}
    >
      <Icon size={18} className={`shrink-0 ${ICON_STYLES[t.variant] || ''}`} />
      <span className="flex-1 text-sm font-medium">{t.message}</span>
      {t.action && (
        <button
          onClick={() => { t.action.onClick(); handleDismiss(); }}
          className="shrink-0 text-sm font-bold text-terracotta hover:bg-terracotta-50 px-2 py-1 rounded-lg transition-colors"
        >
          {t.action.label}
        </button>
      )}
      {t.variant !== 'loading' && (
        <button
          onClick={handleDismiss}
          className="shrink-0 text-warm-gray hover:text-brown transition-colors p-0.5"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const addToast = useCallback((variant, message, options = {}) => {
    const id = ++toastId;
    const duration = options.duration ?? (variant === 'loading' ? null : 4000);

    setToasts(prev => {
      const next = [...prev, { id, variant, message, action: options.action }];
      return next.slice(-3); // max 3 visible
    });

    if (duration) {
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    }

    return id;
  }, [dismiss]);

  const toast = useCallback((message, options) => addToast('info', message, options), [addToast]);
  toast.success = (message, options) => addToast('success', message, options);
  toast.error = (message, options) => addToast('error', message, options);
  toast.info = (message, options) => addToast('info', message, options);
  toast.warning = (message, options) => addToast('warning', message, options);
  toast.loading = (message, options) => addToast('loading', message, { ...options, duration: null });
  toast.dismiss = dismiss;

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col-reverse gap-2 items-center pointer-events-none"
          style={{ bottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}
        >
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <Toast toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
