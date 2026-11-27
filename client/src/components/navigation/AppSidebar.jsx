import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import LiquidGlassExpandableSidebar from '../ui/liquid-glass-expandable-sidebar.jsx';
import ThemeSwitcher from '../ui/theme-switcher.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { getInitials, resolveActiveId, roleLabels, roleNavigation } from './appNavigation.jsx';

const GLASS = {
  blur: 0,
  edge: 0,
  distortion: 0,
  saturation: 1,
};

function RailFooter({ onLogout }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="app-rail-footer">
      <div className="app-rail-theme">
        <span className="app-rail-theme-label gn-sidebar-label">Theme</span>
        <ThemeSwitcher value={theme} onChange={setTheme} />
      </div>
      <button
        type="button"
        className="app-rail-action app-rail-action-danger"
        onClick={onLogout}
        aria-label="Log out"
        title="Log out"
      >
        <LogOut aria-hidden="true" />
        <span className="gn-sidebar-label">Log out</span>
      </button>
    </div>
  );
}

export default function AppSidebar({
  role = 'student',
  user,
  unreadCount = 0,
  expanded,
  onExpandedChange,
  mobileOpen = false,
  onNavigate,
  onLogout,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const config = roleNavigation[role] ?? roleNavigation.student;
  const labels = roleLabels[role] ?? roleLabels.student;

  const groups = useMemo(
    () => config.groups.map((group) => ({
      ...group,
      items: group.items.map((entry) => (
        entry.id === 'notifications' && unreadCount > 0
          ? {
              ...entry,
              badge: `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`,
              badgeCount: unreadCount,
            }
          : entry
      )),
    })),
    [config, unreadCount]
  );

  const accountActive = Boolean(config.account.id) && location.pathname === config.account.href;
  const activeId = accountActive
    ? config.account.id
    : resolveActiveId(location.pathname, config.groups);

  const name = user?.name || user?.email?.split('@')[0] || labels.fallbackName;
  const account = {
    ...config.account,
    name,
    detail: user?.email || labels.detail,
    initials: getInitials(user?.name, user?.email, labels.initials),
  };

  const handleNavigate = (item, event) => {
    event.preventDefault();
    onNavigate?.();
    navigate(item.href);
  };

  // Hover and keyboard focus open the rail, matching the old sidebar's
  // flex-expand behaviour without a separate toggle control.
  const expand = () => {
    if (!mobileOpen) onExpandedChange?.(true);
  };

  const collapse = (event) => {
    if (mobileOpen) return;
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    onExpandedChange?.(false);
  };

  return (
    <aside
      className={`app-rail${mobileOpen ? ' is-open' : ''}`}
      data-role={role}
      onMouseEnter={expand}
      onMouseLeave={collapse}
      onFocus={expand}
      onBlur={collapse}
    >
      <LiquidGlassExpandableSidebar
        groups={groups}
        activeId={activeId}
        brand="Mentriv"
        brandDetail={config.brandDetail}
        brandIcon={<span className="app-rail-monogram">M</span>}
        account={account}
        expanded={mobileOpen || expanded}
        onNavigate={handleNavigate}
        theme={resolvedTheme}
        glass={GLASS}
        selectionLight={1}
        footer={<RailFooter onLogout={onLogout} />}
      />
    </aside>
  );
}
