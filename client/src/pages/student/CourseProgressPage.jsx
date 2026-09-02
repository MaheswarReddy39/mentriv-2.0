import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCourseProgress } from '../../services/progress.service.js';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import Card from '../../components/common/Card.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';

export default function CourseProgressPage() {
  const { courseId } = useParams();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getCourseProgress(courseId)
      .then((res) => { if (!cancelled) setProgress(res.data.progress); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [courseId]);

  if (loading) return <Loading label="Loading progress…" />;
  if (error && !progress) return <ErrorState message={error} />;

  const pct = progress?.overallPercentage ?? 0;

  return (
    <>
      <Link to={`/courses/${courseId}/learn`} className="back-link">← Back to course</Link>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800 }}>Course Progress</h1>
      <Card style={{ marginTop: 'var(--space-4)' }}>
        <ProgressBar value={pct} label={`${pct}% complete`} />
      </Card>
    </>
  );
}
