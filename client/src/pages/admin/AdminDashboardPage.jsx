import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { listAnnouncements } from '../../services/announcement.service.js';
import { listAdminCourses } from '../../services/course.service.js';
import { listEnrollments } from '../../services/enrollment.service.js';
import { listNotifications } from '../../services/notification.service.js';
import { listPayments } from '../../services/payment.service.js';
import { listStudents } from '../../services/student.service.js';
import { listTeachers } from '../../services/admin-teacher.service.js';
import { getStoredUser } from '../../utils/token-storage.js';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-IN');

const ANNOUNCEMENT_TYPE_LABELS = {
  general: 'General update',
  class: 'Class update',
  assignment: 'Assignment',
  payment: 'Payment',
  system: 'System update',
};

const ANNOUNCEMENT_AUDIENCE_LABELS = {
  all: 'Everyone',
  students: 'Students',
  admins: 'Admins',
};

const STATUS_TONES = {
  active: 'success',
  approved: 'success',
  verified: 'success',
  completed: 'success',
  passed: 'success',
  pending: 'warning',
  submitted: 'warning',
  in_progress: 'info',
  rejected: 'danger',
  cancelled: 'danger',
  failed: 'danger',
  late: 'danger',
  draft: 'neutral',
  inactive: 'neutral',
};

const QUICK_LINKS = [
  { to: '/admin/courses/new', label: 'Create a course' },
  { to: '/admin/payments', label: 'Review payments' },
  { to: '/admin/announcements/new', label: 'Post an announcement' },
  { to: '/admin/enrollments', label: 'Manage enrollments' },
  { to: '/admin/submissions', label: 'Review submissions' },
];

const getStatusTone = (status) => STATUS_TONES[status] || 'neutral';

const formatStatus = (status) =>
  String(status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value, options = { day: 'numeric', month: 'short' }) => {
  const date = toDate(value);
  return date ? date.toLocaleDateString('en-IN', options) : '';
};

const formatRelativeDate = (value) => {
  const date = toDate(value);
  if (!date) return '';

  const startOfDay = (input) =>
    new Date(input.getFullYear(), input.getMonth(), input.getDate()).getTime();
  const dayDiff = Math.round(
    (startOfDay(new Date()) - startOfDay(date)) / (1000 * 60 * 60 * 24)
  );

  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  return formatDate(date);
};

const getDateParts = (value) => {
  const date = toDate(value);
  if (!date) return { day: '—', month: '' };
  return {
    day: date.toLocaleDateString('en-IN', { day: '2-digit' }),
    month: date.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
  };
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getTotal = (response, key, fallbackKey) =>
  response?.data?.[key] ?? response?.data?.pagination?.[fallbackKey || 'totalItems'] ?? 0;

function ArrowUpRightIcon() {
  return (
    <svg
      className="admin-home-arrow"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 11 11 5" />
      <path d="M6 5h5v5" />
    </svg>
  );
}

function ArrowRightIcon({ className = 'admin-home-arrow' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8h10" />
      <path d="m9 4 4 4-4 4" />
    </svg>
  );
}

function EnrollmentIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6.5" cy="5" r="2.5" />
      <path d="M2 13.5c0-2.2 1.8-4 4.5-4s4.5 1.8 4.5 4" />
      <path d="M12.5 5.5v4M10.5 7.5h4" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1.75" y="3.5" width="12.5" height="9" rx="2" />
      <path d="M1.75 6.25h12.5" />
      <path d="M4.5 10h3" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      className="admin-home-select-chevron"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="admin-home-select-check"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

function CourseFilter({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const optionRefs = useRef([]);
  const labelId = useId();
  const listId = useId();
  const valueId = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value)
  );
  const selectedOption = options[selectedIndex] || options[0];
  const activeOption = options[activeIndex];

  const openMenu = useCallback(
    (nextIndex = selectedIndex) => {
      setActiveIndex(nextIndex);
      setOpen(true);
    },
    [selectedIndex]
  );

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const selectOption = (nextValue) => {
    setOpen(false);
    if (nextValue !== value) onChange(nextValue);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    const { key } = event;

    if (!open) {
      if (key === 'ArrowDown') {
        event.preventDefault();
        openMenu(selectedIndex);
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        openMenu(options.length - 1);
      }
      return;
    }

    if (key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % options.length);
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + options.length) % options.length);
    } else if (key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (key === 'End') {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (activeOption) selectOption(activeOption.id);
    } else if (key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className="admin-home-filter" ref={containerRef}>
      <span className="admin-home-filter-label" id={labelId}>
        {label}
      </span>
      <button
        ref={buttonRef}
        type="button"
        className={`admin-home-select${open ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${labelId} ${valueId}`}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        onClick={() => {
          if (open) setOpen(false);
          else openMenu();
        }}
        onKeyDown={handleKeyDown}
      >
        <span className="admin-home-select-value" id={valueId}>
          {selectedOption?.title || 'All Courses'}
        </span>
        <ChevronDownIcon />
      </button>

      {open ? (
        <ul className="admin-home-select-menu" id={listId} role="listbox" aria-labelledby={labelId}>
          {options.map((option, index) => (
            <li
              key={option.id}
              id={`${listId}-${index}`}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              role="option"
              aria-selected={option.id === value}
              className={`admin-home-select-option${
                index === activeIndex ? ' is-active' : ''
              }${option.id === value ? ' is-selected' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectOption(option.id)}
            >
              <span>{option.title}</span>
              {option.id === value ? <CheckIcon /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="admin-home-skeleton" role="status">
      <span className="sr-only">Loading dashboard...</span>
      <div className="admin-home-skeleton-metrics" aria-hidden="true">
        <div className="skeleton admin-home-skeleton-revenue" />
        <div className="admin-home-skeleton-metric-grid">
          {[0, 1, 2, 3].map((item) => (
            <div className="skeleton admin-home-skeleton-tile" key={item} />
          ))}
        </div>
      </div>
      <div className="admin-home-skeleton-columns" aria-hidden="true">
        <div className="skeleton admin-home-skeleton-panel" />
        <div className="skeleton admin-home-skeleton-panel" />
      </div>
      <div
        className="admin-home-skeleton-columns admin-home-skeleton-columns--lower"
        aria-hidden="true"
      >
        <div className="skeleton admin-home-skeleton-panel" />
        <div className="skeleton admin-home-skeleton-panel" />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const storedUser = getStoredUser();
  const adminName = storedUser?.name?.trim() || '';
  const firstName = adminName.split(/\s+/)[0] || '';
  const [courseFilter, setCourseFilter] = useState('all');
  const [dashboard, setDashboard] = useState({
    courses: [],
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalRevenue: 0,
    verifiedPaymentCount: 0,
    announcement: null,
    announcements: [],
    notifications: [],
    activity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const courseScopedParams = courseFilter === 'all' ? {} : { courseId: courseFilter };
      const [
        coursesRes,
        studentsRes,
        teachersRes,
        enrollmentsRes,
        paymentsRes,
        announcementsRes,
        notificationsRes,
      ] = await Promise.all([
        listAdminCourses({ limit: 50 }),
        listStudents({ courseId: courseFilter, level: 'all' }).catch(() => null),
        listTeachers({ courseId: courseFilter }).catch(() => null),
        listEnrollments(courseScopedParams).catch(() => null),
        listPayments({ status: 'verified', ...courseScopedParams }).catch(() => null),
        listAnnouncements({ status: 'published', limit: 5 }).catch(() => null),
        listNotifications({ limit: 5 }).catch(() => null),
      ]);

      const courses = coursesRes?.data?.courses || [];
      const payments = paymentsRes?.data?.payments || [];
      const announcements = announcementsRes?.data?.announcements || [];
      const notifications = notificationsRes?.data?.notifications || [];
      const enrollments = enrollmentsRes?.data?.enrollments || [];
      const selectedCourse = courses.find((course) => course.id === courseFilter) || null;

      const activity = [
        ...enrollments.slice(0, 3).map((enrollment) => ({
          id: `enrollment-${enrollment.id}`,
          kind: 'enrollment',
          person: enrollment.user?.name || 'A student',
          subject: enrollment.course?.title || 'a course',
          date: enrollment.enrolledAt,
          status: enrollment.status,
        })),
        ...payments.slice(0, 2).map((payment) => ({
          id: `payment-${payment.id}`,
          kind: 'payment',
          person: payment.user?.name || 'A student',
          subject: payment.course?.title || 'a course',
          amount: currencyFormatter.format(Number(payment.amount || 0)),
          date: payment.verifiedAt || payment.submittedAt,
          status: payment.status,
        })),
      ]
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
        .slice(0, 5);

      setDashboard({
        courses,
        selectedCourse,
        totalStudents: getTotal(studentsRes, 'totalStudents'),
        totalTeachers: getTotal(teachersRes, 'totalTeachers'),
        totalCourses:
          courseFilter === 'all' ? getTotal(coursesRes, 'totalItems') || courses.length : 1,
        totalEnrollments: getTotal(enrollmentsRes, 'totalItems'),
        totalRevenue: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        verifiedPaymentCount: payments.length,
        announcement: announcements[0] || null,
        announcements,
        notifications,
        activity,
      });
    } catch (err) {
      setError(err.message || 'Failed to load admin dashboard.');
    } finally {
      setLoading(false);
    }
  }, [courseFilter]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const courseOptions = useMemo(
    () => [
      { id: 'all', title: 'All Courses' },
      ...dashboard.courses.map((course) => ({ id: course.id, title: course.title })),
    ],
    [dashboard.courses]
  );

  const stats = [
    {
      label: 'Enrollments',
      value: numberFormatter.format(dashboard.totalEnrollments),
      note: courseFilter === 'all' ? 'Across all courses' : 'In this course',
    },
    {
      label: 'Students',
      value: numberFormatter.format(dashboard.totalStudents),
      note: 'Across the platform',
    },
    {
      label: 'Teachers',
      value: numberFormatter.format(dashboard.totalTeachers),
      note: 'Across the platform',
    },
    {
      label: 'Courses',
      value: numberFormatter.format(dashboard.totalCourses),
      note: courseFilter === 'all' ? 'In the catalog' : 'In this view',
    },
  ];

  const announcement = dashboard.announcement;
  const announcementType = ANNOUNCEMENT_TYPE_LABELS[announcement?.type] || 'General update';
  const announcementAudience = ANNOUNCEMENT_AUDIENCE_LABELS[announcement?.audience] || '';
  const announcementDate = formatDate(announcement?.publishedAt || announcement?.createdAt, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const activityScope =
    dashboard.selectedCourse?.title ||
    (courseFilter === 'all' ? 'All courses' : 'Selected course');

  return (
    <div className="admin-home">
      <header className="admin-home-masthead">
        <h1 className="admin-home-title">
          {getGreeting()}
          {firstName ? `, ${firstName}` : ''}.
        </h1>

        <CourseFilter
          label="Course view"
          value={courseFilter}
          options={courseOptions}
          onChange={setCourseFilter}
        />
      </header>

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="admin-home-error">
          <ErrorState message={error} onRetry={loadDashboard} />
        </div>
      ) : (
        <>
          <section className="admin-home-metrics" aria-label="Academy at a glance">
            <article className="admin-home-revenue">
              <p className="admin-home-revenue-label">Verified revenue</p>
              <p className="admin-home-revenue-value">
                {currencyFormatter.format(dashboard.totalRevenue)}
              </p>
              <div className="admin-home-revenue-foot">
                <p>
                  {dashboard.verifiedPaymentCount > 0
                    ? `From ${dashboard.verifiedPaymentCount} recent verified ${
                        dashboard.verifiedPaymentCount === 1 ? 'payment' : 'payments'
                      }`
                    : 'No verified payments yet'}
                </p>
                <Link to="/admin/payments" className="admin-home-revenue-link">
                  Review payments
                  <ArrowUpRightIcon />
                </Link>
              </div>
            </article>

            <div className="admin-home-metric-grid">
              {stats.map((stat) => (
                <article className="admin-home-metric" key={stat.label}>
                  <p className="admin-home-metric-label">{stat.label}</p>
                  <p className="admin-home-metric-value">{stat.value}</p>
                  <p className="admin-home-metric-note">{stat.note}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-home-live-grid" aria-label="Announcement and inbox">
            <article className="admin-home-dispatch">
              {announcement ? (
                <>
                  <div className="admin-home-dispatch-top">
                    <span
                      className={`announcement-type announcement-type--${announcement.type || 'general'}`}
                    >
                      {announcementType}
                    </span>
                  </div>
                  <div className="admin-home-dispatch-main">
                    <h2>{announcement.title}</h2>
                    <p>{announcement.content}</p>
                  </div>
                  {dashboard.announcements.length > 1 ? (
                    <div className="admin-home-dispatch-more">
                      <ul>
                        {dashboard.announcements.slice(1, 4).map((item) => (
                          <li key={item.id}>
                            <time dateTime={item.publishedAt || item.createdAt}>
                              {formatDate(item.publishedAt || item.createdAt)}
                            </time>
                            <h3>{item.title}</h3>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="admin-home-dispatch-foot">
                    <p>
                      {announcementDate}
                      {announcementAudience ? (
                        <>
                          <span aria-hidden="true"> · </span>
                          {announcementAudience}
                        </>
                      ) : null}
                    </p>
                    <Link to="/admin/announcements">
                      Manage announcements
                      <ArrowRightIcon />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="admin-home-dispatch-main">
                  <h2>No announcements yet</h2>
                  <p>
                    Publish an update to keep learners and teachers in the loop. It will be
                    featured here.
                  </p>
                  <Link to="/admin/announcements/new" className="admin-home-dispatch-cta">
                    Write an announcement
                    <ArrowRightIcon />
                  </Link>
                </div>
              )}
            </article>

            <article className="admin-home-panel admin-home-inbox" aria-labelledby="admin-inbox-heading">
              <header className="admin-home-panel-head">
                <h2 id="admin-inbox-heading">Recent notifications</h2>
                <Link to="/admin/notifications" className="admin-home-panel-link">
                  View all
                  <ArrowRightIcon />
                </Link>
              </header>

              {dashboard.notifications.length === 0 ? (
                <EmptyState
                  title="Inbox clear"
                  message="New admin notifications will show up here."
                />
              ) : (
                <ul className="admin-home-notification-list">
                  {dashboard.notifications.map((notification) => (
                    <li
                      className={`admin-home-notification${
                        notification.isRead ? '' : ' is-unread'
                      }`}
                      key={notification.id}
                    >
                      <div className="admin-home-notification-top">
                        <h3>
                          {notification.isRead ? null : (
                            <span className="sr-only">Unread: </span>
                          )}
                          {notification.title}
                        </h3>
                        <time dateTime={notification.createdAt}>
                          {formatRelativeDate(notification.createdAt)}
                        </time>
                      </div>
                      <p>{notification.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>

          <section className="admin-home-lower-grid" aria-label="Activity and shortcuts">
            <article
              className="admin-home-panel admin-home-activity"
              aria-labelledby="admin-activity-heading"
            >
              <header className="admin-home-panel-head admin-home-activity-head">
                <h2 id="admin-activity-heading">Recent activity</h2>
                <span className="admin-home-scope" title={activityScope}>
                  {activityScope}
                </span>
              </header>

              {dashboard.activity.length === 0 ? (
                <EmptyState
                  title="No recent activity"
                  message="New enrollments and verified payments will show up here."
                />
              ) : (
                <ol className="admin-home-activity-list">
                  {dashboard.activity.map((item) => {
                    const dateParts = getDateParts(item.date);
                    const statusTone = getStatusTone(item.status);

                    return (
                      <li className="admin-home-activity-row" key={item.id}>
                        <time className="admin-home-activity-date" dateTime={item.date || undefined}>
                          <span className="admin-home-activity-day">{dateParts.day}</span>
                          <span className="admin-home-activity-month">{dateParts.month}</span>
                        </time>
                        <span
                          className={`admin-home-activity-icon admin-home-tone--${statusTone}`}
                          aria-hidden="true"
                        >
                          {item.kind === 'payment' ? <PaymentIcon /> : <EnrollmentIcon />}
                        </span>
                        <div className="admin-home-activity-main">
                          <h3>{item.person}</h3>
                          {item.kind === 'payment' ? (
                            <p>
                              Paid <strong>{item.amount}</strong> for <span>{item.subject}</span>
                            </p>
                          ) : (
                            <p>
                              Enrolled in <span>{item.subject}</span>
                            </p>
                          )}
                        </div>
                        <span
                          className={`admin-home-status admin-home-tone--${statusTone}`}
                        >
                          {formatStatus(item.status)}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}

              <footer className="admin-home-activity-foot">
                <Link to="/admin/enrollments">
                  All enrollments
                  <ArrowRightIcon />
                </Link>
                <Link to="/admin/payments">
                  All payments
                  <ArrowRightIcon />
                </Link>
              </footer>
            </article>

            <aside className="admin-home-shortcuts" aria-labelledby="admin-shortcuts-heading">
              <header className="admin-home-shortcuts-head">
                <h2 id="admin-shortcuts-heading">Quick actions</h2>
              </header>
              <nav className="admin-home-shortcut-list" aria-label="Admin shortcuts">
                {QUICK_LINKS.map((item) => (
                  <Link className="admin-home-shortcut" to={item.to} key={item.to}>
                    <span>{item.label}</span>
                    <ArrowRightIcon className="admin-home-shortcut-arrow" />
                  </Link>
                ))}
              </nav>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
