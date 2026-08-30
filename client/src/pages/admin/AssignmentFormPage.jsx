import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Textarea from '../../components/common/Textarea.jsx';
import Select from '../../components/common/Select.jsx';
import Card from '../../components/common/Card.jsx';

export default function AssignmentFormPage() {
  const { assignmentId } = useParams();
  const isEdit = Boolean(assignmentId);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', description: '', instructions: '',
    dueDate: '', maxMarks: 100, status: 'draft',
  });
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <>
      <div className="page-head fade-in">
        <h1>{isEdit ? 'Edit Assignment' : 'New Assignment'}</h1>
        <Link to="/admin/assignments" className="back-link">â† Back</Link>
      </div>
      <Card className="fade-in">
        <form onSubmit={async (e) => { e.preventDefault(); navigate('/admin/assignments'); }}>
          <Input label="Title" value={form.title} onChange={set('title')} required />
          <Textarea label="Description" value={form.description || ''} onChange={set('description')} rows={3} />
          <Textarea label="Instructions" value={form.instructions || ''} onChange={set('instructions')} rows={4} />
          <Input label="Due Date" type="date" value={form.dueDate || ''} onChange={set('dueDate')} />
          <Input label="Max Marks" type="number" min="0" value={form.maxMarks ?? 100} onChange={(e) => setForm(f => ({ ...f, maxMarks: Number(e.target.value) }))} />
          <Select label="Status" value={form.status} onChange={set('status')}>
            <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
          </Select>
          <Button type="submit" style={{ marginTop: 'var(--space-4)' }}>{isEdit ? 'Save' : 'Create'}</Button>
        </form>
      </Card>
    </>
  );
}
