import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Alert — inline or toast notification with a title, message and optional action.
 *
 * Pass `position` (or `variant="toast"`) to render it as a fixed toast in a
 * portal; otherwise it renders inline in the flow of the page.
 */
export const ALERT_POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

const DEFAULT_TOAST_POSITION = 'top-right';
const EXIT_FALLBACK_MS = 300;

const CLOSE_ICON = (
  <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.2"
    />
  </svg>
);

const cx = (...values) => values.filter(Boolean).join(' ');

export function Alert({
  icon,
  title,
  message,
  action,
  dismissible = true,
  variant,
  position,
  timeout = 10_000,
  onDismiss,
  className,
}) {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);

  const titleId = useId();
  const messageId = useId();
  const timeoutIdRef = useRef(null);
  const remainingTimeRef = useRef(timeout);
  const timerStartedAtRef = useRef(null);
  const dismissalRequestedRef = useRef(false);
  const settledRef = useRef(false);
  const previousTimeoutRef = useRef(timeout);

  const resolvedVariant = position ? 'toast' : (variant ?? 'inline');
  const resolvedPosition =
    resolvedVariant === 'toast' ? (position ?? DEFAULT_TOAST_POSITION) : undefined;
  const fromBottom = Boolean(resolvedPosition?.startsWith('bottom'));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentHidden(document.hidden);
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (timeoutIdRef.current !== null) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    timerStartedAtRef.current = null;
  }, []);

  const finishExit = useCallback(() => {
    if (settledRef.current) {
      return;
    }

    settledRef.current = true;
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const requestDismiss = useCallback(() => {
    if (dismissalRequestedRef.current) {
      return;
    }

    dismissalRequestedRef.current = true;
    clearTimer();
    setExiting(true);
  }, [clearTimer]);

  const pauseTimer = useCallback(() => {
    if (timeoutIdRef.current === null || timerStartedAtRef.current === null) {
      return;
    }

    const elapsed = Date.now() - timerStartedAtRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    clearTimer();
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    if (timeoutIdRef.current !== null || remainingTimeRef.current <= 0) {
      return;
    }

    timerStartedAtRef.current = Date.now();
    timeoutIdRef.current = window.setTimeout(() => {
      clearTimer();
      requestDismiss();
    }, remainingTimeRef.current);
  }, [clearTimer, requestDismiss]);

  // Re-arm the timer if `timeout` changes after mount.
  useEffect(() => {
    if (previousTimeoutRef.current === timeout) {
      return;
    }

    previousTimeoutRef.current = timeout;
    clearTimer();
    remainingTimeRef.current = timeout;

    if (visible && !exiting && timeout > 0 && !(isHovered || isFocusWithin || isDocumentHidden)) {
      startTimer();
    }
  }, [
    clearTimer,
    exiting,
    isDocumentHidden,
    isFocusWithin,
    isHovered,
    startTimer,
    timeout,
    visible,
  ]);

  useEffect(() => {
    if (!visible || exiting || timeout <= 0) {
      clearTimer();
      return;
    }

    if (isHovered || isFocusWithin || isDocumentHidden) {
      pauseTimer();
      return;
    }

    startTimer();
  }, [
    clearTimer,
    exiting,
    isDocumentHidden,
    isFocusWithin,
    isHovered,
    pauseTimer,
    startTimer,
    timeout,
    visible,
  ]);

  // Safety net in case the exit animation never reports completion.
  useEffect(() => {
    if (!exiting) {
      return undefined;
    }

    const id = window.setTimeout(finishExit, EXIT_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [exiting, finishExit]);

  useEffect(() => clearTimer, [clearTimer]);

  const handleBlurCapture = (event) => {
    const nextFocusedNode = event.relatedTarget;

    if (nextFocusedNode instanceof Node && event.currentTarget.contains(nextFocusedNode)) {
      return;
    }

    setIsFocusWithin(false);
  };

  const handleAnimationEnd = (event) => {
    if (!exiting || event.target !== event.currentTarget) {
      return;
    }

    finishExit();
  };

  const card = visible ? (
    <div
      aria-atomic="true"
      aria-describedby={message ? messageId : undefined}
      aria-labelledby={titleId}
      aria-live="polite"
      className={cx(
        'alert',
        `alert--${resolvedVariant}`,
        resolvedPosition ? `alert--${resolvedPosition}` : undefined,
        fromBottom && 'alert--from-bottom',
        exiting && 'alert--exit',
        className
      )}
      onAnimationEnd={handleAnimationEnd}
      onBlurCapture={handleBlurCapture}
      onFocusCapture={() => setIsFocusWithin(true)}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      role="status"
    >
      {icon ? (
        <div className="alert__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}

      <div className="alert__body">
        <div className="alert__title" id={titleId}>
          {title}
        </div>
        {message ? (
          <div className="alert__message" id={messageId}>
            {message}
          </div>
        ) : null}
        {action ? <div className="alert__action">{action}</div> : null}
      </div>

      {dismissible ? (
        <button
          aria-label="Dismiss alert"
          className="alert__close"
          onClick={requestDismiss}
          type="button"
        >
          {CLOSE_ICON}
        </button>
      ) : null}
    </div>
  ) : null;

  if (resolvedVariant === 'toast') {
    return mounted ? createPortal(card, document.body) : null;
  }

  return card;
}

export default Alert;
