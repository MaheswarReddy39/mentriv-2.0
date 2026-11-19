import { useLocation } from 'react-router-dom';

/**
 * Re-mounts its subtree when the pathname changes so the shared
 * `route-view` entrance animation replays on navigation.
 */
export default function PageTransition({ children }) {
  const { pathname } = useLocation();

  return (
    <div className="route-view" key={pathname}>
      {children}
    </div>
  );
}
