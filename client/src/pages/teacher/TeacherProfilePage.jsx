import { useCallback, useEffect, useState } from 'react';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Input from '../../components/common/Input.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import useAuth from '../../hooks/useAuth.js';
import {
  changePassword,
  getCurrentUser,
  updateCurrentUserProfile,
} from '../../services/auth.service.js';

const EMPTY = '—';

const getSelectedCourse = (user) =>
  user?.selectedCourse?.title ||
  user?.selectedCourseId?.title ||
  user?.assignedCourse?.title ||
  user?.course?.title ||
  user?.courseName ||
  '';

const getStatusLabel = (status) => {
  if (status === 'active' || status === 'accepted') return 'Active';
  if (status === 'pending') return 'Pending';
  if (status === 'rejected') return 'Rejected';
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Active';
};

const isPositiveStatus = (status) => status === 'active' || status === 'accepted';

const formatMemberSince = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const filled = (value) => (value && String(value).trim() ? String(value).trim() : EMPTY);

function ArrowIcon() {
  return (
    <svg
      className="teacher-profile-arrow"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function ProfileSkeleton() {
  return (
    <div className="teacher-profile-skeleton" role="status">
      <span className="sr-only">Loading profile…</span>
      <div className="teacher-profile-skeleton-panel" aria-hidden="true">
        <div className="teacher-profile-skeleton-head">
          <span className="skeleton teacher-profile-skeleton-title" />
        </div>
        {[0, 1, 2, 3, 4].map((row) => (
          <div className="teacher-profile-skeleton-row" key={row}>
            <span className="skeleton teacher-profile-skeleton-label" />
            <span className="skeleton teacher-profile-skeleton-value" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeacherProfilePage() {
  const { accessToken, setSession, user } = useAuth();
  const toast = useToast();

  const [view, setView] = useState('main');
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [pageError, setPageError] = useState('');
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setPageError('');
    getCurrentUser()
      .then((response) => {
        if (cancelled) return;
        const nextUser = response.data.user;
        setProfile(nextUser);
        setSession(accessToken, nextUser);
        setForm((current) => ({
          ...current,
          name: nextUser?.name || '',
          phone: nextUser?.phone || '',
        }));
      })
      .catch((error) => {
        if (cancelled) return;
        setPageError(error.message || 'Unable to load profile details');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, setSession, reloadKey]);

  const retryLoad = useCallback(() => setReloadKey((key) => key + 1), []);

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const mapValidationErrors = (errors) =>
    (errors || []).reduce((acc, error) => {
      const field = error.path || error.param;
      if (field && !acc[field]) acc[field] = error.msg || error.message;
      return acc;
    }, {});

  const startEditing = () => {
    setForm((current) => ({
      ...current,
      name: profile?.name || '',
      phone: profile?.phone || '',
    }));
    setProfileErrors({});
    setEditing(true);
  };

  const handleCancel = () => {
    setForm((current) => ({
      ...current,
      name: profile?.name || '',
      phone: profile?.phone || '',
    }));
    setProfileErrors({});
    setEditing(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setProfileErrors({});

    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.phone.trim()) errors.phone = 'Mobile number is required';
    if (Object.keys(errors).length) {
      setProfileErrors(errors);
      return;
    }

    setSavingProfile(true);
    try {
      const response = await updateCurrentUserProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
      });
      const nextUser = response.data.user;
      setProfile(nextUser);
      setSession(accessToken, nextUser);
      setEditing(false);
      toast.success(response.message || 'Profile updated successfully');
    } catch (error) {
      const mappedErrors = mapValidationErrors(error.details);
      setProfileErrors(mappedErrors);
      toast.error(error.message || 'Unable to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const openPasswordView = () => {
    setPasswordErrors({});
    setView('password');
  };

  const closePasswordView = () => {
    setPasswordErrors({});
    setForm((current) => ({
      ...current,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }));
    setView('main');
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordErrors({});

    const errors = {};
    if (!form.currentPassword) errors.currentPassword = 'Current password is required';
    if (!form.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (form.newPassword.length < 8 || form.newPassword.length > 72) {
      errors.newPassword = 'Use between 8 and 72 characters';
    }
    if (!form.confirmPassword) errors.confirmPassword = 'Confirm the new password';
    if (form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (Object.keys(errors).length) {
      setPasswordErrors(errors);
      return;
    }

    setChangingPassword(true);
    try {
      const response = await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      const nextUser = response.data.user;
      setProfile(nextUser);
      setSession(response.data.accessToken, nextUser);
      setForm((current) => ({
        ...current,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setView('main');
      toast.success(response.message || 'Password changed successfully');
    } catch (error) {
      const mappedErrors = mapValidationErrors(error.details);
      setPasswordErrors(mappedErrors);
      toast.error(error.message || 'Unable to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const status = profile?.status || 'active';
  const statusPositive = isPositiveStatus(status);
  const displayName = filled(profile?.name);
  const assignedCourse = getSelectedCourse(profile);
  const memberSince = formatMemberSince(profile?.createdAt);

  const inlineInput = (field, label, extraProps = {}) => (
    <>
      <input
        className="input teacher-profile-input"
        value={form[field]}
        onChange={setField(field)}
        aria-label={label}
        aria-invalid={Boolean(profileErrors[field]) || undefined}
        disabled={savingProfile}
        {...extraProps}
      />
      {profileErrors[field] ? (
        <span className="field-error-text">{profileErrors[field]}</span>
      ) : null}
    </>
  );

  const factsList = (
    <dl className="teacher-profile-facts">
      <div className={`teacher-profile-fact${editing ? ' is-editable' : ''}`}>
        <dt>Name</dt>
        <dd>{editing ? inlineInput('name', 'Name', { autoComplete: 'name' }) : displayName}</dd>
      </div>
      <div className="teacher-profile-fact">
        <dt>Email</dt>
        <dd>{filled(profile?.email)}</dd>
      </div>
      <div className={`teacher-profile-fact${editing ? ' is-editable' : ''}`}>
        <dt>Mobile</dt>
        <dd>
          {editing
            ? inlineInput('phone', 'Mobile number', { type: 'tel', autoComplete: 'tel' })
            : filled(profile?.phone)}
        </dd>
      </div>
      <div className="teacher-profile-fact">
        <dt>Course</dt>
        <dd>{filled(assignedCourse)}</dd>
      </div>
      <div className="teacher-profile-fact">
        <dt>Member since</dt>
        <dd>{memberSince || EMPTY}</dd>
      </div>
      {!statusPositive ? (
        <div className="teacher-profile-fact">
          <dt>Status</dt>
          <dd className="teacher-profile-value is-pending">{getStatusLabel(status)}</dd>
        </div>
      ) : null}
    </dl>
  );

  return (
    <div className="teacher-profile fade-in">
      {view === 'password' ? (
        <>
          <button type="button" className="teacher-profile-back" onClick={closePasswordView}>
            <span aria-hidden="true">&larr;</span> Back to profile
          </button>

          <section className="teacher-profile-detail" aria-labelledby="teacher-profile-password-heading">
            <h1 className="teacher-profile-detail-title" id="teacher-profile-password-heading">
              Change password
            </h1>
            <p className="teacher-profile-detail-note">
              Use 8 to 72 characters. You will stay signed in on this device.
            </p>

            <form className="teacher-profile-form" onSubmit={handlePasswordSubmit} noValidate>
              <div className="teacher-profile-form-grid is-single">
                <Input
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  value={form.currentPassword}
                  onChange={setField('currentPassword')}
                  error={passwordErrors.currentPassword}
                  disabled={changingPassword}
                />
                <Input
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  value={form.newPassword}
                  onChange={setField('newPassword')}
                  error={passwordErrors.newPassword}
                  disabled={changingPassword}
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={setField('confirmPassword')}
                  error={passwordErrors.confirmPassword}
                  disabled={changingPassword}
                />
              </div>

              <div className="teacher-profile-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closePasswordView}
                  disabled={changingPassword}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={changingPassword}>
                  Update password
                </Button>
              </div>
            </form>
          </section>
        </>
      ) : (
        <>
          <header className="teacher-profile-masthead">
            <h1 className="teacher-profile-title">Profile</h1>
            {!loading && !pageError && !editing ? (
              <button type="button" className="teacher-profile-action" onClick={startEditing}>
                Edit details
              </button>
            ) : null}
          </header>

          {pageError ? (
            <div className="teacher-profile-state">
              <ErrorState
                title="Failed to load profile"
                message={pageError}
                onRetry={retryLoad}
              />
            </div>
          ) : loading ? (
            <ProfileSkeleton />
          ) : (
            <>
              <section className="teacher-profile-panel" aria-labelledby="teacher-profile-details-heading">
                <header className="teacher-profile-panel-head">
                  <h2 id="teacher-profile-details-heading">Details</h2>
                </header>

                {editing ? (
                  <form className="teacher-profile-form" onSubmit={handleSave} noValidate>
                    {factsList}
                    <div className="teacher-profile-actions">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={savingProfile}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" loading={savingProfile}>
                        Save changes
                      </Button>
                    </div>
                  </form>
                ) : (
                  factsList
                )}
              </section>

              <section className="teacher-profile-panel" aria-labelledby="teacher-profile-security-heading">
                <header className="teacher-profile-panel-head">
                  <h2 id="teacher-profile-security-heading">Security</h2>
                </header>

                <ol className="teacher-profile-list">
                  <li>
                    <button type="button" className="teacher-profile-row" onClick={openPasswordView}>
                      <span className="teacher-profile-row-title">Password</span>
                      <span className="teacher-profile-row-side">
                        <ArrowIcon />
                      </span>
                    </button>
                  </li>
                </ol>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
