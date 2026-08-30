import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Textarea from '../../components/common/Textarea.jsx';
import Select from '../../components/common/Select.jsx';
import Card from '../../components/common/Card.jsx';

export default function AnnouncementFormPage() {
  const { announcementId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', content: '', type: 'general',
    audience: 'all', status: 'draft',
  });

  return (
    <>
      <div className="page-head fade-in">
        <h1>{announcementId ? 'Edit Announcement' : 'New Announcement'}</h1>
        <Link to="/admin/announcements" className="back-link">â† Back</Link>
      </div>

      <Card className="fade-in">
        <form onSubmit={async (e) => { e.preventDefault(); navigate('/admin/announcements'); }}>
          <Input label="Title" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Textarea label="Content" value={form.content || ''} onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))} rows={5} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Select label="Type" value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="general">General</option><option value="class">Class</option>
              <option value="assignment">Assignment</option><option value="payment">Payment</option>
              <option value="system">System</option>
            </Select>
            <Select label="Audience" value={form.audience} onChange={(e) => setForm(f => ({ ...f, audience: e.target.value }))}>
              <option value="all">All</option><option value="students">Students</option><option value="admins">Admins</option>
            </Select>
          </div>

          <Select label="Status" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
          </Select>

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
            <Button type="submit">{announcementId ? 'Save Changes' : 'Create'}</Button>
            <Link to="/admin/announcements"><Button variant="ghost">Cancel</Button></Link>
          </div>
        </form>
      </Card>
    </>
  );
}
