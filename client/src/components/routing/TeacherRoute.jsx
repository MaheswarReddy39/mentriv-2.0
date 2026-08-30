import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import { isAdminRole, isStudentRole, isTeacherRole } from '../../constants/roles.js';
import Loading from '../common/Loading.jsx';

export default function TeacherRoute() {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isStudentRole(role)) return <Navigate to="/dashboard" replace />;
  if (isAdminRole(role)) return <Navigate to="/admin" replace />;
  if (!isTeacherRole(role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
