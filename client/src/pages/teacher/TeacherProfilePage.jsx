import { useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import useAuth from '../../hooks/useAuth.js';

const getAssignedCourse = (user) =>
  user?.selectedCourse?.title ||
  user?.assignedCourse?.title ||
  user?.course?.title ||
  'Not assigned';

const getStatusLabel = (status) => {
  if (status === 'active' || status === 'accepted') return 'Active';
  return status || 'Active';
};

export default function TeacherProfilePage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleCancel = () => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
    });
    setEditing(false);
  };

  const handleSave = (event) => {
    event.preventDefault();
    setEditing(false);
  };

  const status = user?.status || 'active';
  const assignedCourse = getAssignedCourse(user);

  return (
    <div className="teacher-profile-page fade-in">
      <header className="page-head">
        <div>
          <p className="text-caption">Teacher</p>
          <h1>Profile</h1>
        </div>
      </header>

      <section className="card teacher-profile-card" aria-labelledby="teacher-profile-heading">
        <div className="teacher-card-head">
          <div>
            <p className="text-caption">Teacher profile card</p>
            <h2 id="teacher-profile-heading">Teacher Profile</h2>
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
                  label="Teacher Name"
                  value={form.name}
                  onChange={setField('name')}
                  placeholder="Teacher name"
                />
                <Input
                  label="Mobile Number"
                  value={form.phone}
                  onChange={setField('phone')}
                  placeholder="Mobile number"
                />
              </>
            ) : (
              <>
                <div className="teacher-profile-field">
                  <span>Teacher Name</span>
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
              <strong>{user?.email || '-'}</strong>
            </div>
            <div className="teacher-profile-field">
              <span>Assigned Course</span>
              <strong>{assignedCourse}</strong>
            </div>
            <div className="teacher-profile-field">
              <span>Account Status</span>
              <Badge status={status}>{getStatusLabel(status)}</Badge>
            </div>
          </div>

          {editing ? (
            <div className="teacher-profile-actions">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          ) : null}
        </form>
      </section>

      <section className="card teacher-profile-security" aria-labelledby="teacher-security-heading">
        <div>
          <p className="text-caption">Security</p>
          <h2 id="teacher-security-heading">Security</h2>
        </div>
        <Link to="/forgot-password" className="btn btn-outline">
          Change Password
        </Link>
      </section>
    </div>
  );
}
