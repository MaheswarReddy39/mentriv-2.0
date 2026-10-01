export const PRACTICE_LEVELS = ['Beginner', 'Medium', 'Advanced'];

export const LEVEL_BADGE_CLASS = {
  Beginner: 'badge-success',
  Medium: 'badge-warning',
  Advanced: 'badge-danger',
};

const LEVEL_RANK = { Beginner: 0, Medium: 1, Advanced: 2 };

export const levelRank = (level) =>
  LEVEL_RANK[level] === undefined ? PRACTICE_LEVELS.length : LEVEL_RANK[level];

const SEPARATOR = ' · ';

export const encodeDescription = (topic, level) => {
  const cleanTopic = String(topic || '').trim();
  const cleanLevel = level && PRACTICE_LEVELS.includes(level) ? level : '';
  if (!cleanTopic) return cleanLevel;
  return cleanLevel ? `${cleanLevel}${SEPARATOR}${cleanTopic}` : cleanTopic;
};

export const decodeDescription = (description) => {
  const value = String(description || '').trim();
  if (!value) return { level: '', topic: '' };
  if (PRACTICE_LEVELS.includes(value)) return { level: value, topic: '' };
  const separatorIndex = value.indexOf(SEPARATOR);
  if (separatorIndex === -1) return { level: '', topic: value };
  const possibleLevel = value.slice(0, separatorIndex).trim();
  if (!PRACTICE_LEVELS.includes(possibleLevel)) return { level: '', topic: value };
  return {
    level: possibleLevel,
    topic: value.slice(separatorIndex + SEPARATOR.length).trim(),
  };
};
