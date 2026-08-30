const CATEGORY_THUMBS = {
  'web development': 'thumb-indigo',
  'data science': 'thumb-teal',
};

export function thumbClassFor(category, title) {
  const mapped = CATEGORY_THUMBS[String(category || '').toLowerCase()];
  if (mapped) return mapped;

  const variants = ['thumb-coral', 'thumb-violet'];
  const hash = String(title || '')
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return variants[hash % variants.length];
}
