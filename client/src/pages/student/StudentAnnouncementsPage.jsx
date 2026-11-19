import { Link } from 'react-router-dom';
import AnnouncementsPage from '../public/AnnouncementsPage.jsx';

export default function StudentAnnouncementsPage() {
  return (
    <div className="student-announcements fade-in">
      <AnnouncementsPage
        embedded
        emptyAction={
          <Link className="announcements-state-link" to="/my-courses">
            View my courses
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
        }
      />
    </div>
  );
}
