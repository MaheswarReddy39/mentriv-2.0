import { useCallback, useEffect, useId, useRef, useState } from 'react';

function ChevronIcon() {
  return (
    <svg
      className="select-menu-caret"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="select-menu-check"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

export default function SelectMenu({
  ariaLabel,
  value,
  options = [],
  onChange,
  className = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const optionRefs = useRef([]);
  const listId = useId();
  const valueId = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const selectedOption = options[selectedIndex] || options[0];
  const activeOption = options[activeIndex];

  const openMenu = useCallback(
    (nextIndex = selectedIndex) => {
      setActiveIndex(nextIndex);
      setOpen(true);
    },
    [selectedIndex]
  );

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const selectOption = (nextValue) => {
    setOpen(false);
    if (nextValue !== value && typeof onChange === 'function') onChange(nextValue);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    const { key } = event;

    if (!open) {
      if (key === 'ArrowDown') {
        event.preventDefault();
        openMenu(selectedIndex);
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        openMenu(options.length - 1);
      } else if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        openMenu();
      }
      return;
    }

    if (key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % options.length);
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + options.length) % options.length);
    } else if (key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (key === 'End') {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (activeOption) selectOption(activeOption.value);
    } else if (key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (key === 'Tab') {
      setOpen(false);
    }
  };

  if (!options.length) return null;

  return (
    <div
      ref={containerRef}
      className={`select-menu${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        ref={buttonRef}
        type="button"
        className="select-menu-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (open) setOpen(false);
          else openMenu();
        }}
        onKeyDown={handleKeyDown}
      >
        <span className="select-menu-value" id={valueId}>
          {selectedOption?.label || ''}
        </span>
        <ChevronIcon />
      </button>

      {open ? (
        <ul
          className="select-menu-list"
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              role="option"
              aria-selected={option.value === value}
              className={`select-menu-option${
                index === activeIndex ? ' is-active' : ''
              }${option.value === value ? ' is-selected' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectOption(option.value)}
            >
              <span>{option.label}</span>
              {option.value === value ? <CheckIcon /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
