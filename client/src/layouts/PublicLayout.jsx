import { Outlet } from 'react-router-dom';
import PublicNavbar from '../components/navigation/PublicNavbar.jsx';
import SiteFooter from '../components/navigation/SiteFooter.jsx';
import PageTransition from '../components/common/PageTransition.jsx';

export default function PublicLayout() {
  return (
    <>
      <PublicNavbar />
      <main className="public-layout-main">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <SiteFooter />
    </>
  );
}
