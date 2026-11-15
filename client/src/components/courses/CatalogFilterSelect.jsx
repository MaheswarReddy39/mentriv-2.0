import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MENU_GAP = 8;
const MENU_VIEWPORT_GUTTER = 12;
const MENU_MAX_HEIGHT = 320;
const MENU_MIN_WIDTH = 232;

export default function CatalogFilterSelect({
  id,
  labelledBy,
  value,
  options,
  onChange,
  allLabel,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);

  const items = [{ value: '', label: allLabel, isReset: true }, ...options];
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value)
  );
  const selectedLabel = items[selectedIndex]?.label ?? allLabel;
  const menuId = `${id}-menu`;
  const valueId = `${id}-value`;
  const optionId = (index) => `${id}-option-${index}`;

  const positionMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom - MENU_VIEWPORT_GUTTER - MENU_GAP;
    const spaceAbove = rect.top - MENU_VIEWPORT_GUTTER - MENU_GAP;
    const contentHeight = menuRef.current?.scrollHeight || 300;
    const desiredHeight = Math.min(contentHeight, MENU_MAX_HEIGHT);
    const openUp = desiredHeight > spaceBelow && spaceAbove > spaceBelow;
    const available = Math.max(openUp ? spaceAbove : spaceBelow, 168);
    const maxHeight = Math.min(MENU_MAX_HEIGHT, available);
    const width = Math.max(rect.width, MENU_MIN_WIDTH);
    const left = Math.min(
      Math.max(rect.left, MENU_VIEWPORT_GUTTER),
      Math.max(MENU_VIEWPORT_GUTTER, viewportWidth - width - MENU_VIEWPORT_GUTTER)
    );
    const top = openUp
      ? Math.max(MENU_VIEWPORT_GUTTER, rect.top - Math.min(desiredHeight, maxHeight) - MENU_GAP)
      : Math.min(
          rect.bottom + MENU_GAP,
          viewportHeight - MENU_VIEWPORT_GUTTER - maxHeight
        );

    setPlacement({ top, left, width, maxHeight, openUp });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;

    positionMenu();
    const handleReflow = () => positionMenu();
    window.addEventListener('resize', handleReflow);
    window.addEventListener('scroll', handleReflow, true);

    return () => {
      window.removeEventListener('resize', handleReflow);
      window.removeEventListener('scroll', handleReflow, true);
    };
  }, [open, positionMenu]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      if (menuRef.current?.contains(event.target)) return;
      setOpen(false);
      setPlacement(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.focus({ preventScroll: true });
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const openMenu = (index = selectedIndex) => {
    setActiveIndex(index);
    positionMenu();
    setOpen(true);
  };

  const closeMenu = ({ restoreFocus = true } = {}) => {
    setOpen(false);
    setPlacement(null);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  };

  const selectItem = (index) => {
    const item = items[index];
    if (!item) return;
    onChange?.(item.value);
    closeMenu();
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu(event.key === 'ArrowUp' ? items.length - 1 : selectedIndex);
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      openMenu(event.key === 'End' ? items.length - 1 : selectedIndex);
    }
  };

  const handleMenuKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, items.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(items.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectItem(activeIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    } else if (event.key === 'Tab') {
      closeMenu();
    }
  };

  return (
    <>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className="catalog-filter-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-labelledby={`${labelledBy} ${valueId}`}
        onClick={() => {
          if (open) closeMenu({ restoreFocus: false });
          else openMenu();
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span id={valueId} className="catalog-filter-value">
          {selectedLabel}
        </span>
        <svg className="catalog-filter-chevron" viewBox="0 0 20 20" aria-hidden="true">
          <path d="m5.5 8 4.5 4.5L14.5 8" />
        </svg>
      </button>

      {open && placement
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              className={`catalog-menu${placement.openUp ? ' catalog-menu-up' : ''}`}
              style={{
                top: placement.top,
                left: placement.left,
                width: placement.width,
                maxHeight: placement.maxHeight,
              }}
              role="listbox"
              aria-labelledby={labelledBy}
              aria-activedescendant={optionId(activeIndex)}
              tabIndex={-1}
              onKeyDown={handleMenuKeyDown}
            >
              {items.map((item, index) => (
                <Fragment key={item.value || 'all'}>
                  {index === 1 ? <div className="catalog-menu-divider" role="presentation" /> : null}
                  <div
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    id={optionId(index)}
                    role="option"
                    aria-selected={item.value === value}
                    data-reset={item.isReset ? 'true' : undefined}
                    className={`catalog-menu-option${
                      index === activeIndex ? ' is-active' : ''
                    }${item.value === value ? ' is-selected' : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectItem(index)}
                  >
                    <span className="catalog-menu-label">{item.label}</span>
                    {item.value === value ? (
                      <svg className="catalog-menu-check" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="m3.5 8.5 3 3 6-7" />
                      </svg>
                    ) : null}
                  </div>
                </Fragment>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
