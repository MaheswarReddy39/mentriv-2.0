import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import AuthProvider from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './components/feedback/Toast.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ThemeProvider>
      <ToastProvider>
        <ErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  </BrowserRouter>
);
