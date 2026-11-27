import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import Alert from './Alert.jsx';

const ToastContext = createContext(null);

let nextToastId = 1;

const TOAST_ICONS = {
  success: <CheckCircle2 aria-hidden="true" />,
  error: <AlertCircle aria-hidden="true" />,
  warning: <AlertTriangle aria-hidden="true" />,
  info: <Info aria-hidden="true" />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (type, message, { duration = 4000, description } = {}) => {
      const id = nextToastId;
      nextToastId += 1;
      const timeout = Number.isFinite(duration) && duration > 0 ? duration : 0;
      setToasts((current) => [
        ...current,
        { id, type, message, description, timeout },
      ]);
      return id;
    },
    []
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
      <div className="alert-stack" role="region" aria-label="Notifications">
        {toasts.map((toast) => (
          <Alert
            key={toast.id}
            className={`alert--${toast.type}`}
            icon={TOAST_ICONS[toast.type]}
            message={toast.description}
            onDismiss={() => dismiss(toast.id)}
            timeout={toast.timeout}
            title={toast.message}
          />
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
