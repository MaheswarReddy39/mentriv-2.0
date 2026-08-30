const STATUS_VARIANTS = {
  active: 'success',
  approved: 'success',
  verified: 'success',
  published: 'success',
  completed: 'success',
  passed: 'success',
  pending: 'warning',
  submitted: 'warning',
  unread: 'accent',
  late: 'danger',
  in_progress: 'info',
  draft: 'neutral',
  rejected: 'danger',
  cancelled: 'danger',
  failed: 'danger',
  inactive: 'neutral',
  archived: 'neutral',
};

export default function Badge({ status, children }) {
  const key = String(status || '').toLowerCase();
  const variant = STATUS_VARIANTS[key] || 'neutral';
  const label = children ?? key.replace(/_/g, ' ');

  return (
    <span className={`badge badge-${variant}`}>
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
}
