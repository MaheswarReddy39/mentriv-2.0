import { thumbClassFor } from '../../utils/course-visuals.js';

export default function CategoryThumb({ category, title }) {
  return (
    <div className={`course-thumb ${thumbClassFor(category, title)}`}>
      <span className="course-thumb-title">{title}</span>
    </div>
  );
}

export { thumbClassFor };
