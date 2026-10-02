export const TASK_TYPES = [
  'Coding Problem',
  'Frontend Task',
  'Backend / API Task',
  'React Task',
  'MERN Task',
];

export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export const TASK_STATUSES = ['draft', 'published', 'archived'];

export const CODING_LEVEL_BADGE_CLASS = {
  Beginner: 'badge-success',
  Intermediate: 'badge-warning',
  Advanced: 'badge-danger',
};

const TYPE_SECTIONS = {
  'Coding Problem': 'coding',
  'Frontend Task': 'frontend',
  'React Task': 'frontend',
  'Backend / API Task': 'backend',
  'MERN Task': 'mern',
};

export const sectionForTaskType = (taskType) => TYPE_SECTIONS[taskType] || 'coding';
