import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  LayoutDashboard,
  LogOut,
  Megaphone,
  User,
} from 'lucide-react';
import AnimatedSelect from '../ui/animated-select.jsx';
import { getInitials } from './appNavigation.jsx';

const LOGOUT_OPTION = { id: 'logout', label: 'Log Out', icon: LogOut, danger: true };

const ACCOUNT_OPTIONS = {
  student: [
    { id: 'profile', label: 'Profile Settings', icon: User, href: '/profile' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    {
      id: 'progress',
      label: 'Progress',
      icon: ChartNoAxesColumnIncreasing,
      href: '/progress',
    },
    { id: 'notifications', label: 'Notifications', icon: Bell, href: '/notifications' },
    LOGOUT_OPTION,
  ],
  teacher: [
    { id: 'profile', label: 'Profile Settings', icon: User, href: '/teacher/profile' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/teacher' },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      href: '/teacher/notifications',
    },
    LOGOUT_OPTION,
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
    { id: 'courses', label: 'Courses', icon: BookOpen, href: '/admin/courses' },
    {
      id: 'announcements',
      label: 'Announcements',
      icon: Megaphone,
      href: '/admin/announcements',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      href: '/admin/notifications',
    },
    LOGOUT_OPTION,
  ],
};

export default function AccountMenu({ role = 'student', user, onLogout }) {
  const navigate = useNavigate();
  const options = ACCOUNT_OPTIONS[role] ?? ACCOUNT_OPTIONS.student;
  const name = user?.name || user?.email?.split('@')[0] || 'Account';
  const initials = getInitials(user?.name, user?.email, 'A');

  const handleSelect = (option) => {
    if (option.id === 'logout') {
      onLogout?.();
      return;
    }

    navigate(option.href);
  };

  return (
    <div className="app-topbar-account">
      <AnimatedSelect
        ariaLabel="Account menu"
        itemHeight={42}
        onSelect={handleSelect}
        options={options}
        placeholder={
          <span className="account-trigger">
            <span className="account-trigger__avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="account-trigger__name">{name}</span>
          </span>
        }
        showSelectedValue={false}
        triggerHeight={44}
        width={244}
      />
    </div>
  );
}
