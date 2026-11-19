import { useEffect, useRef, useState } from 'react';

const EXIT_DURATION = 180;

export default function Modal({ open, onClose, title, footer, width = 520, children }) {
  const modalRef = useRef(null);
  const [visible, setVisible] = useState(open);
  const [closing, setClosing] = useState(false);

  // Keep the dialog mounted briefly so its exit animation can play.
  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
      return undefined;
    }

    if (!visible) return undefined;

    setClosing(true);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const timer = window.setTimeout(
      () => {
        setVisible(false);
        setClosing(false);
      },
      reduceMotion ? 0 : EXIT_DURATION
    );

    return () => window.clearTimeout(timer);
    // `visible` is intentionally omitted: this effect should react to `open`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!visible) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [visible, onClose]);

  if (!open && !visible) return null;

  return (
    <div
      className={`modal-overlay${closing ? ' is-closing' : ''}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className={`modal${closing ? ' is-closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: width }}
        tabIndex={-1}
        ref={modalRef}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
