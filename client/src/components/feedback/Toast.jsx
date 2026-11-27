import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

let nextToastId = 1;

const CLOSE_ICON = (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="m4.6 4.6 6.8 6.8M11.4 4.6l-6.8 6.8" />
  </svg>
);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) =>
      current.map((toast) =>
        toast.id === id && !toast.exiting ? { ...toast, exiting: true } : toast
      )
    );
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 180);
  }, []);

  const showToast = useCallback(
    (type, message, { duration = 4000, description } = {}) => {
      const id = nextToastId;
      nextToastId += 1;
      setToasts((current) => [
        ...current,
        { id, type, message, description, duration },
      ]);
      timersRef.current.set(
        id,
        setTimeout(() => dismiss(id), duration)
      );
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      success: (message, options) => showToast('success', message, options),
      error: (message, options) => showToast('error', message, { duration: 6000, ...options }),
      warning: (message, options) => showToast('warning', message, options),
      info: (message, options) => showToast('info', message, options),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}${toast.exiting ? ' toast-exit' : ''}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            <div className="toast-content">
              <p className="toast-title">{toast.message}</p>
              {toast.description ? (
                <p className="toast-description">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
            >
              {CLOSE_ICON}
            </button>
            {Number.isFinite(toast.duration) && toast.duration > 0 ? (
              <span
                className="toast-progress"
                style={{ animationDuration: `${toast.duration}ms` }}
                aria-hidden="true"
              />
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider');
  }
  return context;
}
