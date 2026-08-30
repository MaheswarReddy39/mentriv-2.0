import { useEffect, useMemo, useState } from 'react';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Input from '../../components/common/Input.jsx';
import Loading from '../../components/common/Loading.jsx';
import Select from '../../components/common/Select.jsx';
import Textarea from '../../components/common/Textarea.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import { listAdminCourses } from '../../services/course.service.js';
import {
  createAdminNotification,
  listAdminNotifications,
} from '../../services/notification.service.js';

const AUDIENCES = [
  { value: 'all', label: 'All' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Teachers' },
];

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) : '-';

const getCourseTitle = (notification, courses) => {
  const courseId = notification.course?.id || notification.courseId;
  if (!courseId) return 'All Courses';
  return notification.course?.title || courses.find((course) => course.id === courseId)?.title || 'Selected Course';
};

export default function AdminNotificationsPage() {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    message: '',
    audience: 'all',
    courseId: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [courses, setCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const loadPageData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [coursesRes, notificationsRes] = await Promise.all([
        listAdminCourses({ limit: 100 }),
        listAdminNotifications({ limit: 20 }).catch(() => ({ data: { notifications: [] } })),
      ]);
      setCourses(coursesRes?.data?.courses || []);
      setNotifications(notificationsRes?.data?.notifications || []);
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const sortedNotifications = useMemo(
    () => [...notifications].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    ),
    [notifications]
  );

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = 'Notification Title is required';
    if (!form.message.trim()) errors.message = 'Notification Message is required';
    if (!form.audience) errors.audience = 'Send To is required';
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await createAdminNotification({
        title: form.title.trim(),
        message: form.message.trim(),
        audience: form.audience,
        courseId: form.courseId || undefined,
      });

      const created = response?.data?.notification;
      if (created) {
        const course = courses.find((item) => item.id === created.courseId);
        setNotifications((current) => [
          { ...created, course: course ? { id: course.id, title: course.title } : undefined },
          ...current,
        ]);
      } else {
        await loadPageData();
      }

      setForm({ title: '', message: '', audience: 'all', courseId: '' });
      setFieldErrors({});
      toast.success('Notification published successfully.');
    } catch (err) {
      const errorsFromApi = {};
      (err.details || []).forEach((detail) => {
        if (detail.path) errorsFromApi[detail.path] = detail.msg;
      });
      setFieldErrors(errorsFromApi);
      toast.error(err.message || 'Could not publish notification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-notifications-page">
      <header className="admin-students-header">
        <div>
          <h1>Notifications</h1>
          <p>Create and manage notifications</p>
        </div>
      </header>

      {loading ? (
        <Loading label="Loading notifications..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadPageData} />
      ) : (
        <>
          <Card variant="admin-notification-form-card">
            <form className="admin-notification-form" onSubmit={handleSubmit}>
              <Input
                label="Notification Title"
                value={form.title}
                onChange={setField('title')}
                placeholder="Enter notification title"
                error={fieldErrors.title}
              />
              <Textarea
                label="Notification Message"
                value={form.message}
                onChange={setField('message')}
                placeholder="Write notification message"
                error={fieldErrors.message}
              />
              <div className="admin-notification-form-grid">
                <Select
                  label="Send To"
                  value={form.audience}
                  onChange={setField('audience')}
                  error={fieldErrors.audience}
                >
                  {AUDIENCES.map((audience) => (
                    <option key={audience.value} value={audience.value}>
                      {audience.label}
                    </option>
                  ))}
                </Select>
                <Select label="Select Course" value={form.courseId} onChange={setField('courseId')}>
                  <option value="">All Courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="admin-notification-actions">
                <Button type="submit" loading={submitting} disabled={submitting}>
                  Publish Notification
                </Button>
              </div>
            </form>
          </Card>

          <section className="admin-notification-list-section" aria-labelledby="existing-notifications-heading">
            <div className="section-head">
              <div>
                <p className="text-caption">History</p>
                <h2 id="existing-notifications-heading">Existing Notifications</h2>
              </div>
            </div>

            {sortedNotifications.length === 0 ? (
              <EmptyState title="No notifications" message="Published notifications will appear here." />
            ) : (
              <div className="admin-notification-list">
                {sortedNotifications.map((notification) => (
                  <Card key={notification.id} variant="admin-notification-card">
                    <div>
                      <h3>{notification.title}</h3>
                      <p>{notification.message}</p>
                    </div>
                    <div className="admin-notification-meta">
                      <Badge status={notification.audience || notification.type || 'info'}>
                        {notification.audience || 'Audience'}
                      </Badge>
                      <span>{getCourseTitle(notification, courses)}</span>
                      <span>{formatDate(notification.createdAt)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
