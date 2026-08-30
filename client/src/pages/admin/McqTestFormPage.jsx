import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Textarea from '../../components/common/Textarea.jsx';
import Select from '../../components/common/Select.jsx';
import Card from '../../components/common/Card.jsx';

export default function McqTestFormPage() {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', description: '', duration: 30, passingScore: 50,
    status: 'draft', questions: [],
  });

  const updateQuestion = (idx, field, value) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => (i === idx ? { ...q, [field]: value } : q)),
    }));
  };

  return (
    <>
      <div className="page-head fade-in">
        <h1>{testId ? 'Edit MCQ Test' : 'New MCQ Test'}</h1>
        <Link to="/admin/mcq-tests" className="back-link">← Back</Link>
      </div>

      <Card className="fade-in">
        <form onSubmit={async (e) => { e.preventDefault(); navigate('/admin/mcq-tests'); }}>
          <Input label="Title" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Textarea label="Description" value={form.description || ''} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Input label="Duration (min)" type="number" min="0" value={form.duration ?? 0} onChange={(e) => setForm(f => ({ ...f, duration: Number(e.target.value) }))} />
            <Input label="Passing Score (%)" type="number" min="0" max="100" value={form.passingScore ?? 50} onChange={(e) => setForm(f => ({ ...f, passingScore: Number(e.target.value) }))} />
          </div>

          <Select label="Status" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
          </Select>

          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
            <Button type="submit">{testId ? 'Save Changes' : 'Create Test'}</Button>
            <Link to="/admin/mcq-tests"><Button variant="ghost">Cancel</Button></Link>
          </div>
        </form>
      </Card>
    </>
  );
}
