import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { getAchievements } from '../../services/achievement.service.js';

const CATEGORY_ORDER = ['learning', 'assignments', 'practice', 'performance', 'streak'];

const CATEGORY_LABEL = {
  learning: 'Learning',
  assignments: 'Assignments',
  practice: 'Practice',
  performance: 'Performance',
  streak: 'Streak',
};

const categoryLabel = (category) => CATEGORY_LABEL[category] || 'Other';

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

function ArrowIcon() {
  return (
    <svg
      className="student-achievements-arrow"
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

function AchievementsSkeleton() {
  return (
    <div className="student-achievements-skeleton" role="status">
      <span className="sr-only">Loading achievements…</span>
      {[0, 1].map((panel) => (
        <div className="student-achievements-skeleton-panel" key={panel} aria-hidden="true">
          <div className="student-achievements-skeleton-head">
            <span className="skeleton student-achievements-skeleton-title" />
            <span className="skeleton student-achievements-skeleton-count" />
          </div>
          {[0, 1, 2].map((row) => (
            <div className="student-achievements-skeleton-row" key={row}>
              <div className="student-achievements-skeleton-copy">
                <span className="skeleton student-achievements-skeleton-line" />
                <span className="skeleton student-achievements-skeleton-meta" />
              </div>
              <span className="skeleton student-achievements-skeleton-pill" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function AchievementsPage() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState(null);

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
    setSelectedId(null);
    setReloadKey((key) => key + 1);
  }, []);

  const achievements = useMemo(() => data?.achievements || [], [data]);
  const total = achievements.length;
  const unlocked = achievements.filter((entry) => entry.status === 'unlocked').length;
  const completionPct = total > 0 ? Math.round((unlocked / total) * 100) : 0;

  const groups = useMemo(() => {
    const known = CATEGORY_ORDER.map((category) => ({
      category,
      label: categoryLabel(category),
      items: achievements.filter((entry) => entry.category === category),
    }));

    const extras = [...new Set(achievements.map((entry) => entry.category))]
      .filter((category) => !CATEGORY_ORDER.includes(category))
      .map((category) => ({
        category,
        label: categoryLabel(category),
        items: achievements.filter((entry) => entry.category === category),
      }));

    return [...known, ...extras].filter((group) => group.items.length > 0);
  }, [achievements]);

  const selected = selectedId
    ? achievements.find((entry) => entry.id === selectedId) || null
    : null;

  const mastheadStat = (() => {
    if (loadError) {
      return {
        value: <span className="student-achievements-stat-value">—</span>,
        bar: null,
      };
    }
    if (!data) {
      return {
        value: <span className="skeleton student-achievements-stat-skeleton" aria-hidden="true" />,
        bar: null,
      };
    }
    return {
      value: (
        <span className="student-achievements-stat-value">
          {unlocked}
          <span className="student-achievements-stat-total"> / {total}</span>
        </span>
      ),
      bar: (
        <span className="student-achievements-bar" aria-hidden="true">
          <span style={{ width: `${completionPct}%` }} />
        </span>
      ),
    };
  })();

  if (selected) {
    const isUnlocked = selected.status === 'unlocked';
    const pct = progressPct(selected);
    const remaining = Math.max(0, Number(selected.target || 0) - Number(selected.current || 0));

    return (
      <div className="student-achievements fade-in">
        <button
          type="button"
          className="student-achievements-back"
          onClick={() => setSelectedId(null)}
        >
          ← Back to achievements
        </button>

        <section
          className="student-achievements-detail"
          aria-labelledby="student-achievements-detail-title"
        >
          <p className="student-achievements-eyebrow">
            {[categoryLabel(selected.category), isUnlocked ? 'Unlocked' : 'Locked']
              .filter(Boolean)
              .join(' · ')}
          </p>
          <h1 id="student-achievements-detail-title">{selected.title}</h1>
          {selected.description ? (
            <p className="student-achievements-detail-copy">{selected.description}</p>
          ) : null}

          <dl className="student-achievements-facts">
            <div>
              <dt>Requirement</dt>
              <dd>{selected.requirement || '—'}</dd>
            </div>
            <div>
              <dt>Progress</dt>
              <dd>
                {selected.current ?? 0} / {selected.target ?? 0}
              </dd>
            </div>
            <div>
              <dt>Unlocked</dt>
              <dd>{isUnlocked ? formatDate(selected.unlockedAt) || '—' : 'Not yet'}</dd>
            </div>
          </dl>

          <div className="student-achievements-meter">
            <div className="student-achievements-meter-head">
              <span className="student-achievements-meter-label">
                {isUnlocked ? 'Complete' : 'In progress'}
              </span>
              <span className="student-achievements-meter-value">{pct}%</span>
            </div>
            <span className="student-achievements-bar" aria-hidden="true">
              <span style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
            </span>
          </div>

          {!isUnlocked && remaining > 0 ? (
            <p className="student-achievements-note">
              {remaining} more to unlock.
            </p>
          ) : null}

          <div className="student-achievements-actions">
            <Button type="button" variant="outline" onClick={() => navigate('/progress')}>
              Open progress
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="student-achievements fade-in">
      <header className="student-achievements-masthead">
        <div className="student-achievements-head">
          <h1 className="student-achievements-title">Achievements</h1>
        </div>

        <div className="student-achievements-stat">
          <span className="student-achievements-stat-label">Unlocked</span>
          {mastheadStat.value}
          {mastheadStat.bar}
        </div>
      </header>

      {loadError ? (
        <div className="student-achievements-state">
          <ErrorState title="Failed to load your achievements" message={loadError} onRetry={retryLoad} />
        </div>
      ) : !data ? (
        <AchievementsSkeleton />
      ) : total === 0 ? (
        <div className="student-achievements-state">
          <EmptyState
            title="No achievements yet"
            message="Milestones appear here as you complete classes, assignments and practice sets."
          />
        </div>
      ) : (
        groups.map((group) => {
          const groupUnlocked = group.items.filter((entry) => entry.status === 'unlocked').length;

          return (
            <section
              className="student-achievements-panel"
              key={group.category}
              aria-labelledby={`student-achievements-${group.category}`}
            >
              <header className="student-achievements-panel-head">
                <h2 id={`student-achievements-${group.category}`}>{group.label}</h2>
                <span className="student-achievements-panel-count">
                  {groupUnlocked} of {group.items.length} unlocked
                </span>
              </header>

              <ol className="student-achievements-list">
                {group.items.map((achievement) => {
                  const isUnlocked = achievement.status === 'unlocked';
                  const pct = progressPct(achievement);

                  return (
                    <li key={achievement.id}>
                      <button
                        type="button"
                        className="student-achievements-row"
                        onClick={() => setSelectedId(achievement.id)}
                        aria-label={`${achievement.title}. ${achievement.requirement || ''} ${
                          isUnlocked
                            ? 'Unlocked.'
                            : `${achievement.current ?? 0} of ${achievement.target ?? 0}.`
                        } View details.`}
                      >
                        <span className="student-achievements-row-main">
                          <span className="student-achievements-row-title">{achievement.title}</span>
                          <span className="student-achievements-row-meta">{achievement.requirement}</span>
                          {isUnlocked ? null : (
                            <span className="student-achievements-row-track" aria-hidden="true">
                              <span style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                            </span>
                          )}
                        </span>
                        <span className="student-achievements-row-side">
                          <span
                            className={`student-achievements-status ${
                              isUnlocked ? 'is-positive' : 'is-idle'
                            }`}
                          >
                            {isUnlocked
                              ? 'Unlocked'
                              : `${achievement.current ?? 0} / ${achievement.target ?? 0}`}
                          </span>
                          {isUnlocked && achievement.unlockedAt ? (
                            <span className="student-achievements-row-date">
                              {formatDate(achievement.unlockedAt)}
                            </span>
                          ) : null}
                        </span>
                        <ArrowIcon />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })
      )}
    </div>
  );
}
