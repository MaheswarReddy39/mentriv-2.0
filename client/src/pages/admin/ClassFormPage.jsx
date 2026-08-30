import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getClassById } from '../../services/class.service.js';
import { updateClass } from '../../services/class.service.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Textarea from '../../components/common/Textarea.jsx';
import Select from '../../components/common/Select.jsx';
import Card from '../../components/common/Card.jsx';
import Loading from '../../components/common/Loading.jsx';

export default function ClassFormPage() {
  const { classId } = useParams();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getClassById(classId).then((res) => {
      setForm(res.data.lesson);
    }).catch(() => setForm({ title: '', status: 'draft' }));
  }, [classId]);

  if (!form) return <Loading label="Loading…" />;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <>
      <div className="page-head fade-in">
        <h1>Edit Class</h1>
        <Link to="/admin/classes" className="back-link">← Back</Link>
      </div>
      <Card className="fade-in">
        <form onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await updateClass(classId, {
              title: form.title, description: form.description,
              videoUrl: form.videoUrl, thumbnail: form.thumbnail,
              duration: Number(form.duration), module: form.module,
              order: Number(form.order), status: form.status,
            });
          } finally { setSaving(false); }
        }}>
          <Input label="Title" value={form.title} onChange={set('title')} required />
          <Textarea label="Description" value={form.description || ''} onChange={set('description')} rows={3} />
          <Input label="Video URL" value={form.videoUrl || ''} onChange={set('videoUrl')} />
          <Input label="Thumbnail URL" value={form.thumbnail || ''} onChange={set('thumbnail')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Input label="Duration (min)" type="number" min="0" value={form.duration ?? 0} onChange={set('duration')} />
            <Select label="Status" value={form.status} onChange={set('status')}>
              <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
            </Select>
          </div>
          <Button type="submit" loading={saving} style={{ marginTop: 'var(--space-4)' }}>Save Changes</Button>
        </form>
      </Card>
    </>
  );
}
