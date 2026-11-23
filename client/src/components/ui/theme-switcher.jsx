import { useCallback, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

const THEMES = [
  {
    key: 'system',
    icon: Monitor,
    label: 'System theme',
  },
  {
    key: 'light',
    icon: Sun,
    label: 'Light theme',
  },
  {
    key: 'dark',
    icon: Moon,
    label: 'Dark theme',
  },
];

function useControllableState({ prop, defaultProp, onChange }) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultProp);
  const isControlled = prop !== undefined;
  const value = isControlled ? prop : uncontrolledValue;

  const setValue = useCallback(
    (next) => {
      const nextValue = typeof next === 'function' ? next(value) : next;

      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }

      if (nextValue !== value) {
        onChange?.(nextValue);
      }
    },
    [isControlled, onChange, value]
  );

  return [value, setValue];
}

export function ThemeSwitcher({ value, onChange, defaultValue, className = '' }) {
  const [theme, setTheme] = useControllableState({
    prop: value,
    defaultProp: defaultValue,
    onChange,
  });
  const activeIndex = THEMES.findIndex(({ key }) => key === theme);
  const classes = ['theme-switcher', className].filter(Boolean).join(' ');

  return (
    <div className={classes} role="group" aria-label="Theme">
      {activeIndex >= 0 ? (
        <span
          className="theme-switcher-thumb"
          style={{ '--theme-switcher-index': activeIndex }}
          aria-hidden="true"
        />
      ) : null}

      {THEMES.map(({ key, icon: Icon, label }) => {
        const isActive = theme === key;

        return (
          <button
            type="button"
            key={key}
            className={`theme-switcher-btn${isActive ? ' is-active' : ''}`}
            onClick={() => setTheme(key)}
            aria-label={label}
            aria-pressed={isActive}
            title={label}
          >
            <Icon className="theme-switcher-icon" size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

export default ThemeSwitcher;
