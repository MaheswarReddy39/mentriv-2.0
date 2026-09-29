import { useTheme } from '../../context/ThemeContext.jsx';

const SUN_ICON = (
  <svg className="sidebar-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MOON_ICON = (
  <svg className="sidebar-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export default function ThemeToggle({ collapsed }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  if (collapsed) {
    return (
      <div className="sidebar-theme-toggle" role="radiogroup" aria-label="Theme selection">
        <div className="sidebar-theme-icons">
          <button
            type="button"
            className={`sidebar-theme-icon-btn${!isDark ? ' active' : ''}`}
            onClick={() => setTheme('light')}
            aria-pressed={!isDark}
            aria-label="Switch to light mode"
            title="Light mode"
          >
            {SUN_ICON}
          </button>
          <button
            type="button"
            className={`sidebar-theme-icon-btn${isDark ? ' active' : ''}`}
            onClick={() => setTheme('dark')}
            aria-pressed={isDark}
            aria-label="Switch to dark mode"
            title="Dark mode"
          >
            {MOON_ICON}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar-theme-toggle" role="radiogroup" aria-label="Theme selection">
      <div className="sidebar-theme-pill">
        <button
          type="button"
          className={`sidebar-theme-option${!isDark ? ' active' : ''}`}
          onClick={() => setTheme('light')}
          aria-pressed={!isDark}
          aria-label="Switch to light mode"
          title="Light mode"
        >
          {SUN_ICON}
          <span className="sidebar-link-label">Light</span>
        </button>
        <button
          type="button"
          className={`sidebar-theme-option${isDark ? ' active' : ''}`}
          onClick={() => setTheme('dark')}
          aria-pressed={isDark}
          aria-label="Switch to dark mode"
          title="Dark mode"
        >
          {MOON_ICON}
          <span className="sidebar-link-label">Dark</span>
        </button>
      </div>
    </div>
  );
}