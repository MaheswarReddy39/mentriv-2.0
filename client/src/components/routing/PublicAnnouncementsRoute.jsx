import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import { isAdminRole, isStudentRole } from '../../constants/roles.js';
import Loading from '../common/Loading.jsx';

// Announcements are public for guests. Signed-in users are sent to the
// announcements view inside their own dashboard so they never drop out of it.
export default function PublicAnnouncementsRoute() {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return <Loading />;

  if (isAuthenticated) {
    if (isAdminRole(role)) return <Navigate to="/admin/announcements" replace />;
    if (isStudentRole(role)) return <Navigate to="/student/announcements" replace />;
  }

  return <Outlet />;
}
