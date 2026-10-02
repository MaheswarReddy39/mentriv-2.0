import { useCallback, useEffect, useState } from 'react';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import Modal from '../../components/common/Modal.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import { getAchievements } from '../../services/achievement.service.js';

const ICON_PATHS = {
  learning: (
    <>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </>
  ),
  assignments: (
    <>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>
  ),
  practice: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  streak: (
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  ),
  performance: (
    <>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
};

const CATEGORY_META = {
  learning: { label: 'Learning', color: 'var(--indigo)' },
  assignments: { label: 'Assignments', color: 'var(--teal)' },
  practice: { label: 'Practice', color: 'var(--amber)' },
  streak: { label: 'Streak', color: 'var(--coral)' },
  performance: { label: 'Performance', color: 'var(--indigo)' },
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'learning', label: 'Learning' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'practice', label: 'Practice' },
  { id: 'streak', label: 'Streak' },
  { id: 'performance', label: 'Performance' },
];

const metaFor = (category) =>
  CATEGORY_META[category] || { label: category || 'Achievement', color: 'var(--indigo)' };

const Icon = ({ name, size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {ICON_PATHS[name] || ICON_PATHS.trophy}
  </svg>
);

const IconCircle = ({
  name,
  size = 44,
  background = 'var(--color-surface-muted)',
  color = 'var(--text-secondary)',
}) => (
  <span
    aria-hidden="true"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      background,
      color,
    }}
  >
    <Icon name={name} size={Math.round(size * 0.5)} />
  </span>
);

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

const progressPct = (achievement) =>
  achievement.target > 0
    ? Math.round((achievement.current / achievement.target) * 100)
    : 0;

const cardButtonStyle = {
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  color: 'inherit',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
  minHeight: '210px',
  width: '100%',
};

const detailRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
  alignItems: 'center',
};

export default function AchievementsPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selected, setSelected] = useState(null);

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoadError(null);

    (async () => {
      try {
        const res = await getAchievements();
        if (!cancelled) setData(res?.data || null);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load your achievements');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retryLoad = useCallback(() => {
    setData(null);
    setLoadError(null);
    setSelected(null);
    setReloadKey((key) => key + 1);
  }, []);

  const achievements = data?.achievements || [];
  const recent = data?.recentUnlocked || [];
  const featured = recent[0] || null;

  const summary = data
    ? [
        { label: 'Achievements Unlocked', value: String(data.unlocked), className: 'stat-teal' },
        { label: 'Achievements Remaining', value: String(data.remaining), className: 'stat-amber' },
        {
          label: 'Completion %',
          value: `${data.completionPercentage}%`,
          className: 'stat-indigo',
        },
      ]
    : [];

  const filtered =
    activeCategory === 'all'
      ? achievements
      : achievements.filter((entry) => entry.category === activeCategory);

  const filteredLocked = filtered.filter((entry) => entry.status === 'locked');

  return (
    <div className="admin-dashboard fade-in">
      <header className="admin-dashboard-header">
        <div>
          <h1>Achievements</h1>
          <p className="admin-welcome">
            Track your learning milestones and unlock new achievements
          </p>
        </div>
      </header>

      {loadError ? (
        <ErrorState
          title="Failed to load your achievements"
          message={loadError}
          onRetry={retryLoad}
        />
      ) : data === null ? (
        <Loading label="Loading achievements…" />
      ) : (
        <>
          {/* Summary cards */}
          <section
            aria-label="Achievement summary"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-3)',
            }}
          >
            {summary.map((item) => (
              <Card key={item.label}>
                <p className={`admin-stat-value ${item.className}`}>{item.value}</p>
                <p className="admin-stat-label">{item.label}</p>
              </Card>
            ))}
          </section>

          {/* Featured / Latest achievement */}
          {featured ? (
            <section aria-label="Latest achievement">
              <div
                className="card"
                style={{
                  display: 'flex',
                  gap: 'var(--space-5)',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  border: '1px solid rgba(79, 70, 229, 0.28)',
                  background:
                    'linear-gradient(150deg, rgba(79, 70, 229, 0.10), rgba(20, 184, 166, 0.06) 55%, var(--surface))',
                }}
              >
                <IconCircle name="trophy" size={72} background="var(--indigo)" color="#fff" />
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <p className="text-meta uppercase" style={{ margin: '0 0 var(--space-2)' }}>
                    Latest Achievement
                  </p>
                  <h2 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-h3)' }}>
                    {featured.title}
                  </h2>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--text-secondary)', margin: '0 0 var(--space-2)' }}
                  >
                    {featured.description}
                  </p>
                  <p className="text-meta" style={{ margin: 0 }}>
                    Unlocked on {formatDate(featured.unlockedAt)}
                  </p>
                </div>
                <div>
                  <Badge status="completed">Unlocked</Badge>
                </div>
              </div>
            </section>
          ) : null}

          {/* Category filters */}
          <section
            aria-label="Category filters"
            style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}
          >
            {FILTERS.map((filter) => (
              <Button
                key={filter.id}
                variant={activeCategory === filter.id ? 'primary' : 'outline'}
                size="sm"
                aria-pressed={activeCategory === filter.id}
                onClick={() => setActiveCategory(filter.id)}
              >
                {filter.label}
              </Button>
            ))}
          </section>

          {/* Achievement grid */}
          <section className="admin-quick-actions" aria-labelledby="grid-heading">
            <div className="section-head">
              <div>
                <h2 id="grid-heading">All Achievements</h2>
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                title="No achievements here yet"
                message="Achievements in this category will appear here once you earn them."
              />
            ) : (
              <div className="student-classes-grid">
                {filtered.map((achievement) => {
                  const isLocked = achievement.status === 'locked';
                  const meta = metaFor(achievement.category);

                  return (
                    <button
                      key={achievement.id}
                      type="button"
                      className="card"
                      style={cardButtonStyle}
                      aria-label={`View details for ${achievement.title}`}
                      onClick={() => setSelected(achievement)}
                    >
                      <IconCircle
                        name={isLocked ? 'lock' : achievement.category}
                        color={isLocked ? 'var(--text-tertiary)' : meta.color}
                      />
                      <p
                        className="text-meta uppercase"
                        style={{ margin: 0, color: 'var(--text-tertiary)' }}
                      >
                        {meta.label}
                      </p>
                      <h3 style={{ margin: 0, fontSize: 'var(--font-size-h4)' }}>
                        {achievement.title}
                      </h3>
                      <p
                        className="text-sm"
                        style={{ color: 'var(--text-secondary)', margin: 0 }}
                      >
                        {achievement.description}
                      </p>

                      <div style={{ marginTop: 'auto', display: 'grid', gap: 'var(--space-2)' }}>
                        {isLocked ? (
                          <>
                            <p className="text-meta" style={{ margin: 0 }}>
                              {achievement.requirement}
                            </p>
                            <div style={detailRowStyle}>
                              <span className="text-meta">Progress</span>
                              <span
                                className="text-meta"
                                style={{ fontWeight: 600, color: 'var(--text)' }}
                              >
                                {achievement.current}/{achievement.target}
                              </span>
                            </div>
                            <ProgressBar value={progressPct(achievement)} />
                            <div>
                              <Badge status="inactive">Locked</Badge>
                            </div>
                          </>
                        ) : (
                          <div style={detailRowStyle}>
                            <Badge status="completed">Unlocked</Badge>
                            <span className="text-meta">
                              {formatDate(achievement.unlockedAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Locked achievements */}
          {filteredLocked.length > 0 ? (
            <section className="admin-quick-actions" aria-labelledby="locked-heading">
              <div className="section-head">
                <div>
                  <h2 id="locked-heading">Locked Achievements</h2>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {filteredLocked.map((achievement) => (
                  <Card key={achievement.id}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 'var(--space-4)',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <IconCircle name="lock" size={40} color="var(--text-tertiary)" />
                      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                        <h3 className="text-h4" style={{ margin: '0 0 var(--space-1)' }}>
                          {achievement.title}
                        </h3>
                        <p
                          className="text-sm"
                          style={{ color: 'var(--text-secondary)', margin: 0 }}
                        >
                          {achievement.requirement}
                        </p>
                      </div>
                      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                        <div style={{ ...detailRowStyle, marginBottom: 'var(--space-2)' }}>
                          <span className="text-meta">Progress</span>
                          <span
                            className="text-meta"
                            style={{ fontWeight: 600, color: 'var(--text)' }}
                          >
                            {achievement.current}/{achievement.target}
                          </span>
                        </div>
                        <ProgressBar value={progressPct(achievement)} />
                      </div>
                      <Badge status="inactive">Locked</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {/* Recent achievements */}
          {recent.length > 0 ? (
            <section className="admin-quick-actions" aria-labelledby="recent-heading">
              <div className="section-head">
                <div>
                  <h2 id="recent-heading">Recent Achievements</h2>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {recent.map((achievement) => {
                  const meta = metaFor(achievement.category);
                  return (
                    <Card key={achievement.id}>
                      <div
                        style={{
                          display: 'flex',
                          gap: 'var(--space-3)',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <IconCircle name={achievement.category} size={40} color={meta.color} />
                        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                          <h3 className="text-h4" style={{ margin: '0 0 var(--space-1)' }}>
                            {achievement.title}
                          </h3>
                          <p className="text-meta" style={{ margin: 0 }}>
                            {meta.label} · {formatDate(achievement.unlockedAt)}
                          </p>
                        </div>
                        <Badge status="completed">Unlocked</Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ) : null}
        </>
      )}

      {/* Achievement detail modal */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? selected.title : ''}
      >
        {selected ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <IconCircle
                  name={selected.status === 'locked' ? 'lock' : selected.category}
                  size={64}
                  color={
                    selected.status === 'locked'
                      ? 'var(--text-tertiary)'
                      : metaFor(selected.category).color
                  }
                />
              </div>
              <p style={{ margin: 'var(--space-3) 0 0' }}>{selected.description}</p>
            </div>

            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              <div style={detailRowStyle}>
                <span className="text-meta">Requirement</span>
                <span style={{ fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>
                  {selected.requirement}
                </span>
              </div>

              <div>
                <div style={{ ...detailRowStyle, marginBottom: 'var(--space-2)' }}>
                  <span className="text-meta">Progress</span>
                  <span className="text-meta" style={{ fontWeight: 600, color: 'var(--text)' }}>
                    {selected.current}/{selected.target}
                  </span>
                </div>
                <ProgressBar value={progressPct(selected)} />
              </div>

              <div style={detailRowStyle}>
                <span className="text-meta">Status</span>
                {selected.status === 'locked' ? (
                  <Badge status="inactive">Locked</Badge>
                ) : (
                  <Badge status="completed">Unlocked</Badge>
                )}
              </div>

              <div style={detailRowStyle}>
                <span className="text-meta">Unlocked date</span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {selected.unlockedAt ? formatDate(selected.unlockedAt) : 'Not yet unlocked'}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
