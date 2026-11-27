import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import AppSidebar from './components/navigation/AppSidebar.jsx';
import AccountMenu from './components/navigation/AccountMenu.jsx';
import Alert from './components/feedback/Alert.jsx';
import { ToastProvider, useToast } from './components/feedback/Toast.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import './styles/global.css';
import './styles/theme-switcher.css';

const params = new URLSearchParams(window.location.search);
const view = params.get('view') ?? 'sidebars';
const state = params.get('state') ?? 'expanded';
const role = params.get('role') ?? 'student';
const theme = params.get('theme') ?? 'light';

localStorage.setItem('theme', theme);

const USERS = {
  student: { name: 'Harsh Sharma', email: 'harsh.sharma@mentriv.dev' },
  teacher: { name: 'Rohan Mehta', email: 'rohan.mehta@mentriv.dev' },
  admin: { name: 'Priya Nair', email: 'priya.nair@mentriv.dev' },
};

const ROLES = ['admin', 'teacher', 'student'];

const labStyles = `
  html, body { margin: 0; padding: 0; }
  .lab { min-height: 100vh; background: var(--bg); font-family: var(--font-body); }
  .lab--sidebars { display: flex; align-items: flex-start; justify-content: center; gap: 24px; }
  .lab--sidebars.is-collapsed { gap: 56px; }
  .lab--stack { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 48px 16px; }
  .lab--stack .alert { width: 430px; max-width: 100%; }
  .lab--empty { min-height: 100vh; }
  .lab--dropdowns { display: flex; flex-direction: column; align-items: center; padding-top: 96px; }
  .lab__col { display: flex; flex-direction: column; gap: 10px; width: 244px; }
  .lab__caption { color: var(--text-tertiary); font: 700 11px/1 var(--font-body); letter-spacing: 0.14em; text-transform: uppercase; text-align: center; }
`;

function Sidebars() {
  return (
    <div className={`lab lab--sidebars${state === 'collapsed' ? ' is-collapsed' : ''}`}>
      {ROLES.map((item) => (
        <AppSidebar
          expanded={state !== 'collapsed'}
          key={item}
          mobileOpen={false}
          onExpandedChange={() => {}}
          onLogout={() => {}}
          onNavigate={() => {}}
          role={item}
          user={USERS[item]}
        />
      ))}
    </div>
  );
}

const ALERTS = [
  {
    className: 'alert--success',
    icon: <CheckCircle2 />,
    title: 'Changes saved',
    message: 'Your latest updates are now live for the team.',
  },
  {
    className: 'alert--error',
    icon: <AlertCircle />,
    title: 'Could not save changes',
    message: 'The request could not be completed. Please try again.',
  },
  {
    className: 'alert--warning',
    icon: <AlertTriangle />,
    title: 'Time is running out',
    message: 'Your assignment closes in five minutes.',
  },
  {
    className: 'alert--info',
    icon: <Info />,
    title: 'New material available',
    message: 'A new lesson was added to your Physics course.',
  },
];

function Alerts() {
  return (
    <div className="lab lab--stack">
      {ALERTS.map((item) => (
        <Alert
          className={item.className}
          icon={item.icon}
          key={item.className}
          message={item.message}
          timeout={0}
          title={item.title}
        />
      ))}
    </div>
  );
}

function ToastShowcase() {
  const toast = useToast();

  useEffect(() => {
    toast.success('Changes saved', {
      description: 'Your latest updates are now live for the team.',
      duration: 0,
    });
    toast.error('Could not save changes', {
      description: 'Please check your connection and try again.',
      duration: 0,
    });
    toast.warning('Time is running out', {
      description: 'Your assignment closes in five minutes.',
      duration: 0,
    });
    toast.info('New material available', {
      description: 'A new lesson was added to your Physics course.',
      duration: 0,
    });
  }, [toast]);

  return <div className="lab lab--empty" />;
}

function Dropdowns() {
  return (
    <div className="lab lab--dropdowns">
      <div className="lab__col">
        <span className="lab__caption">{role}</span>
        <AccountMenu onLogout={() => {}} role={role} user={USERS[role]} />
      </div>
    </div>
  );
}

function Screen() {
  if (view === 'alerts') {
    return <Alerts />;
  }

  if (view === 'toasts') {
    return (
      <ToastProvider>
        <ToastShowcase />
      </ToastProvider>
    );
  }

  if (view === 'dropdowns') {
    return <Dropdowns />;
  }

  return <Sidebars />;
}

createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <BrowserRouter>
      <style>{labStyles}</style>
      <Screen />
    </BrowserRouter>
  </ThemeProvider>
);
