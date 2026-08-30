import { useEffect, useState } from 'react';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import useAuth from '../../hooks/useAuth.js';
import {
  changePassword,
  getCurrentUser,
  updateCurrentUserProfile,
} from '../../services/auth.service.js';

const getSelectedCourse = (user) =>
  user?.selectedCourse?.title ||
  user?.selectedCourseId?.title ||
  user?.course?.title ||
  user?.courseName ||
  'Not selected';

const getStatusLabel = (status) => {
  if (status === 'active' || status === 'accepted') return 'Active';
  if (status === 'pending') return 'Pending';
  if (status === 'rejected') return 'Rejected';
  return status || 'Active';
};

export default function ProfilePage() {
  const { accessToken, setSession, user } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
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
  }, [accessToken, setSession]);

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const mapValidationErrors = (errors) =>
    (errors || []).reduce((acc, error) => {
      const field = error.path || error.param;
      if (field && !acc[field]) acc[field] = error.msg;
      return acc;
    }, {});

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
    if (!form.name.trim()) errors.name = 'Student Name is required';
    if (!form.phone.trim()) errors.phone = 'Mobile Number is required';
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

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordErrors({});

    const errors = {};
    if (!form.currentPassword) errors.currentPassword = 'Current Password is required';
    if (!form.newPassword) errors.newPassword = 'New Password is required';
    if (!form.confirmPassword) errors.confirmPassword = 'Confirm Password is required';
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
      toast.success(response.message || 'Password changed successfully');
    } catch (error) {
      const mappedErrors = mapValidationErrors(error.details);
      setPasswordErrors(mappedErrors);
      toast.error(error.message || 'Unable to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const selectedCourse = getSelectedCourse(profile);
  const status = profile?.status || 'active';

  return (
    <div className="teacher-profile-page fade-in">
      <header className="page-head">
        <div>
          <p className="text-caption">Student</p>
          <h1>Profile</h1>
        </div>
      </header>

      {pageError ? (
        <div className="card" role="alert">
          {pageError}
        </div>
      ) : null}

      {loading ? (
        <section className="card teacher-profile-card" aria-live="polite">
          Loading profile details...
        </section>
      ) : null}

      {!loading ? (
      <section className="card teacher-profile-card" aria-labelledby="student-profile-heading">
        <div className="teacher-card-head">
          <div>
            <p className="text-caption">Profile Details</p>
            <h2 id="student-profile-heading">Profile Details</h2>
          </div>
          {!editing ? (
            <Button type="button" variant="outline" onClick={() => setEditing(true)}>
              Edit Profile
            </Button>
          ) : null}
        </div>

        <form className="teacher-profile-form" onSubmit={handleSave}>
          <div className="teacher-profile-grid">
            {editing ? (
              <>
                <Input
                  label="Student Name"
                  value={form.name}
                  onChange={setField('name')}
                  placeholder="Student name"
                  error={profileErrors.name}
                  disabled={savingProfile}
                />
                <Input
                  label="Mobile Number"
                  value={form.phone}
                  onChange={setField('phone')}
                  placeholder="Mobile number"
                  error={profileErrors.phone}
                  disabled={savingProfile}
                />
              </>
            ) : (
              <>
                <div className="teacher-profile-field">
                  <span>Student Name</span>
                  <strong>{form.name || '-'}</strong>
                </div>
                <div className="teacher-profile-field">
                  <span>Mobile Number</span>
                  <strong>{form.phone || '-'}</strong>
                </div>
              </>
            )}

            <div className="teacher-profile-field">
              <span>Email ID</span>
              <strong>{profile?.email || '-'}</strong>
            </div>
            <div className="teacher-profile-field">
              <span>Selected Course</span>
              <strong>{selectedCourse}</strong>
            </div>
          </div>

          {editing ? (
            <div className="teacher-profile-actions">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={savingProfile}>
                Cancel
              </Button>
              <Button type="submit" loading={savingProfile}>Save Changes</Button>
            </div>
          ) : null}
        </form>
      </section>
      ) : null}

      {!loading ? (
      <section className="card teacher-profile-card" aria-labelledby="student-account-heading">
        <div className="teacher-card-head">
          <div>
            <p className="text-caption">Account Details</p>
            <h2 id="student-account-heading">Account Details</h2>
          </div>
        </div>

        <div className="teacher-profile-grid">
          <div className="teacher-profile-field">
            <span>Role</span>
            <strong>Student</strong>
          </div>
          <div className="teacher-profile-field">
            <span>Account Status</span>
            <Badge status={status}>{getStatusLabel(status)}</Badge>
          </div>
          <div className="teacher-profile-field">
            <span>Selected Course</span>
            <strong>{selectedCourse}</strong>
          </div>
        </div>
      </section>
      ) : null}

      {!loading ? (
      <section className="card teacher-profile-security" aria-labelledby="student-security-heading">
        <div>
          <p className="text-caption">Change Password</p>
          <h2 id="student-security-heading">Change Password</h2>
        </div>

        <form className="teacher-profile-form" onSubmit={handlePasswordSubmit}>
          <div className="teacher-profile-grid">
            <Input
              label="Current Password"
              type="password"
              value={form.currentPassword}
              onChange={setField('currentPassword')}
              placeholder="Current password"
              error={passwordErrors.currentPassword}
              disabled={changingPassword}
            />
            <Input
              label="New Password"
              type="password"
              value={form.newPassword}
              onChange={setField('newPassword')}
              placeholder="New password"
              error={passwordErrors.newPassword}
              disabled={changingPassword}
            />
            <Input
              label="Confirm Password"
              type="password"
              value={form.confirmPassword}
              onChange={setField('confirmPassword')}
              placeholder="Confirm password"
              error={passwordErrors.confirmPassword}
              disabled={changingPassword}
            />
          </div>

          <div className="teacher-profile-actions">
            <Button type="submit" loading={changingPassword}>Change Password</Button>
          </div>
        </form>
      </section>
      ) : null}
    </div>
  );
}
