import { Outlet } from 'react-router-dom';
import PublicNavbar from '../components/navigation/PublicNavbar.jsx';
import SiteFooter from '../components/navigation/SiteFooter.jsx';

export default function PublicLayout() {
  return (
    <>
      <PublicNavbar />
      <main style={{ maxWidth: 'var(--container-xl)', margin: '0 auto', padding: 'var(--space-6) var(--space-5)' }}>
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}
