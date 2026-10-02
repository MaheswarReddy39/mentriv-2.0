import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getMyLearningActivity } from '../../services/learning-activity.service.js';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';

const DAY_MS = 86400000;
const TIP_GAP = 8;
const TIP_EDGE = 8;
const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const TYPE_LABELS = {
  class: 'Class',
  assignment: 'Assignment',
  mcq: 'MCQ',
  coding: 'Coding',
};

const parseDateKey = (key) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const formatDateKey = (key) => {
  const [year, month, day] = key.split('-').map(Number);
  return `${MONTH_ABBR[month - 1]} ${day}, ${year}`;
};

const dateKeyOf = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate()
  ).padStart(2, '0')}`;

const levelForCount = (count) => (count >= 4 ? 4 : Math.max(1, count));

const buildGrid = (range) => {
  const start = parseDateKey(range.from);
  const end = parseDateKey(range.to);

  const gridStart = new Date(start);
  gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay());
  const gridEnd = new Date(end);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - gridEnd.getUTCDay()));

  const weeks = [];
  for (let cursor = new Date(gridStart); cursor.getTime() <= gridEnd.getTime(); cursor = new Date(cursor.getTime() + 7 * DAY_MS)) {
    const week = [];
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(cursor.getTime() + i * DAY_MS);
      const time = date.getTime();
      const outside = time < start.getTime() || time > end.getTime();
      week.push({ key: dateKeyOf(date), outside });
    }
    weeks.push(week);
  }
  return weeks;
};

const buildMonthLabels = (weeks) => {
  let previous = null;
  return weeks.map((week) => {
    const first = week.find((cell) => !cell.outside);
    if (!first) return '';
    const [year, month] = first.key.split('-').map(Number);
    const marker = `${year}-${month}`;
    if (marker === previous) return '';
    previous = marker;
    return MONTH_ABBR[month - 1];
  });
};

export default function LearningStreakSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [tip, setTip] = useState(null);
  const [tipPos, setTipPos] = useState(null);
  const tooltipRef = useRef(null);
  const sectionRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyLearningActivity();
      setData(res?.data || null);
    } catch (err) {
      setData(null);
      setError(err.message || 'Failed to load your learning streak');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hideTip = useCallback(() => {
    setTip(null);
    setTipPos(null);
  }, []);

  const positionTip = useCallback(() => {
    const anchor = tip?.anchor;
    const node = tooltipRef.current;
    if (!tip || !anchor || !node) return;
    const rect = anchor.getBoundingClientRect();
    const height = node.offsetHeight;
    const width = node.offsetWidth;
    const spaceAbove = rect.top - TIP_GAP;
    const spaceBelow = window.innerHeight - rect.bottom - TIP_GAP;
    const fitsAbove = spaceAbove >= height + TIP_EDGE;
    const fitsBelow = spaceBelow >= height + TIP_EDGE;
    const above = fitsAbove || (!fitsBelow && spaceAbove >= spaceBelow);
    const y = above ? rect.top - TIP_GAP - height : rect.bottom + TIP_GAP;
    const sectionRect = sectionRef.current?.getBoundingClientRect();
    const half = width / 2 + TIP_EDGE;
    const boundLeft = sectionRect ? Math.max(sectionRect.left, 0) : 0;
    const boundRight = sectionRect
      ? Math.min(sectionRect.right, window.innerWidth)
      : window.innerWidth;
    const minX = boundLeft + half;
    const maxX = boundRight - half;
    const centerX = rect.left + rect.width / 2;
    const x =
      maxX >= minX ? Math.min(Math.max(centerX, minX), maxX) : (boundLeft + boundRight) / 2;
    setTipPos({ x, y });
  }, [tip]);

  useLayoutEffect(() => {
    positionTip();
  }, [positionTip]);

  useEffect(() => {
    if (!tip) return undefined;
    const reposition = () => positionTip();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [tip, positionTip]);

  const dayMap = useMemo(
    () => new Map((data?.days || []).map((day) => [day.date, day])),
    [data]
  );

  const weeks = useMemo(() => (data?.range ? buildGrid(data.range) : []), [data]);
  const monthLabels = useMemo(() => buildMonthLabels(weeks), [weeks]);

  const stats = data?.stats || { totalActiveDays: 0, currentStreak: 0, maxStreak: 0 };

  const showTip = (event, cell) => {
    if (cell.outside) return;
    setTipPos(null);
    setTip({
      key: cell.key,
      day: dayMap.get(cell.key) || null,
      anchor: event.currentTarget,
    });
  };

  const cellClassName = (cell) => {
    if (cell.outside) return 'streak-cell streak-cell-empty';
    const day = dayMap.get(cell.key);
    if (!day || day.count < 1) return 'streak-cell';
    return `streak-cell lvl-${levelForCount(day.count)}`;
  };

  const ariaLabel = `Learning activity heatmap for the last ${data?.range?.days || 365} days. ${stats.totalActiveDays} active days, current streak ${stats.currentStreak} days, longest streak ${stats.maxStreak} days.`;

  return (
    <section
      className="streak-section"
      ref={sectionRef}
      aria-labelledby="learning-streak-heading"
    >
      <div className="section-head">
        <div>
          <h2 id="learning-streak-heading">Learning Streak</h2>
        </div>
        <div className="streak-stats">
          <div className="streak-stat">
            <span className="streak-stat-value">{stats.totalActiveDays}</span>
            <span className="streak-stat-label">Total Active Days</span>
          </div>
          <div className="streak-stat">
            <span className="streak-stat-value">{stats.currentStreak}</span>
            <span className="streak-stat-label">Current Streak</span>
          </div>
          <div className="streak-stat">
            <span className="streak-stat-value">{stats.maxStreak}</span>
            <span className="streak-stat-label">Max Streak</span>
          </div>
        </div>
      </div>

      {loading ? (
        <Loading label="Loading your learning streak..." />
      ) : error ? (
        <ErrorState title="Could not load your streak" message={error} onRetry={load} />
      ) : (
        <>
          <div className="streak-scroll" onScroll={hideTip}>
            <div className="streak-calendar">
              <div className="streak-months" aria-hidden="true">
                {monthLabels.map((label, index) => (
                  <span key={`month-${weeks[index]?.[0]?.key || index}`} className="streak-month-slot">
                    {label ? <span className="streak-month-label">{label}</span> : null}
                  </span>
                ))}
              </div>

              <div className="streak-weeks" role="img" aria-label={ariaLabel}>
                {weeks.map((week, weekIndex) => (
                  <div key={`week-${week[0]?.key || weekIndex}`} className="streak-week">
                    {week.map((cell) => (
                      <span
                        key={cell.key}
                        className={cellClassName(cell)}
                        onMouseEnter={(event) => showTip(event, cell)}
                        onMouseLeave={hideTip}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="streak-legend" aria-hidden="true">
            <span className="text-meta">Less</span>
            <span className="streak-cell" />
            <span className="streak-cell lvl-1" />
            <span className="streak-cell lvl-2" />
            <span className="streak-cell lvl-3" />
            <span className="streak-cell lvl-4" />
            <span className="text-meta">More</span>
          </div>

          {tip ? (
            <div
              ref={tooltipRef}
              className="streak-tooltip"
              role="tooltip"
              style={{
                left: tipPos ? tipPos.x : 0,
                top: tipPos ? tipPos.y : 0,
                transform: 'translateX(-50%)',
                visibility: tipPos ? 'visible' : 'hidden',
              }}
            >
              <p className="streak-tooltip-date">{formatDateKey(tip.key)}</p>
              <p className="streak-tooltip-count">
                {tip.day
                  ? `${tip.day.count} ${tip.day.count === 1 ? 'activity' : 'activities'}`
                  : 'No activity'}
              </p>
              {tip.day && tip.day.types.length > 0 ? (
                <ul className="streak-tooltip-types">
                  {tip.day.types.map((type) => (
                    <li key={type}>{TYPE_LABELS[type] || type}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
