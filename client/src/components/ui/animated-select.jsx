import { useCallback, useEffect, useId, useRef, useState } from 'react';

/**
 * AnimatedSelect — an action/account menu that expands from its trigger with a
 * staggered item reveal. Ported to this app's stack (JSX + design tokens),
 * with keyboard support and outside-click handling.
 */
const cx = (...values) => values.filter(Boolean).join(' ');

function ChevronIcon({ open }) {
  return (
    <svg
      aria-hidden="true"
      className={cx('animated-select__chevron', open && 'is-open')}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path d="M6 9.5 12 15.5 18 9.5" />
    </svg>
  );
}

export default function AnimatedSelect({
  placeholder = 'Select action',
  options = [],
  className,
  width = 192,
  itemHeight = 40,
  itemGap = 4,
  triggerHeight = 44,
  showSelectedValue = true,
  ariaLabel = 'Select an option',
  onSelect,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const itemRefs = useRef([]);
  const openWithKeyboardRef = useRef(false);
  const menuId = useId();

  const closeMenu = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMenu, isOpen]);

  // Move focus into the menu for keyboard users; pointer users keep context.
  useEffect(() => {
    if (isOpen && openWithKeyboardRef.current) {
      itemRefs.current[0]?.focus();
    }
  }, [isOpen]);

  const handleSelect = (option) => {
    setSelected(option);
    setIsOpen(false);
    triggerRef.current?.focus();
    onSelect?.(option);
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (isOpen) {
        itemRefs.current[0]?.focus();
        return;
      }
      openWithKeyboardRef.current = true;
      setIsOpen(true);
    }
  };

  const handleMenuKeyDown = (event) => {
    const count = options.length;
    if (!count) {
      return;
    }

    const index = itemRefs.current.indexOf(document.activeElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      itemRefs.current[(index + 1) % count]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      itemRefs.current[(index - 1 + count) % count]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      itemRefs.current[count - 1]?.focus();
    } else if (event.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const menuHeight = (itemHeight + itemGap) * options.length + itemGap;
  const current = showSelectedValue ? selected : null;

  return (
    <div
      className={cx('animated-select', isOpen && 'is-open', className)}
      ref={rootRef}
      style={{ width, '--as-trigger': `${triggerHeight}px` }}
    >
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="animated-select__trigger"
        onClick={() => {
          openWithKeyboardRef.current = false;
          setIsOpen((open) => !open);
        }}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
        type="button"
      >
        <span className="animated-select__value">
          {current ? (
            <>
              <current.icon aria-hidden="true" className="animated-select__value-icon" />
              <span className="animated-select__value-label">{current.label}</span>
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronIcon open={isOpen} />
      </button>

      <div
        aria-hidden="true"
        className="animated-select__panel"
        style={{ height: isOpen ? menuHeight : 0 }}
      />

      <div
        aria-label={ariaLabel}
        className="animated-select__menu"
        id={menuId}
        onKeyDown={handleMenuKeyDown}
        role="menu"
        style={{ height: menuHeight }}
      >
        {options.map((option, index) => {
          const y = itemGap + index * (itemHeight + itemGap);
          return (
            <button
              className={cx(
                'animated-select__item',
                option.danger && 'animated-select__item--danger'
              )}
              key={option.id}
              onClick={() => handleSelect(option)}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              role="menuitem"
              style={{
                height: itemHeight,
                transitionDelay: isOpen
                  ? `${index * 45}ms`
                  : `${(options.length - 1 - index) * 20}ms`,
                '--as-y': `${y}px`,
              }}
              tabIndex={isOpen ? 0 : -1}
              type="button"
            >
              <option.icon aria-hidden="true" className="animated-select__item-icon" />
              <span className="animated-select__item-label">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
