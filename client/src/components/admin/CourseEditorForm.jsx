import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../common/Button.jsx';

const LEVEL_OPTIONS = [
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

function MediaField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  emptyLabel,
  alt,
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const [fileName, setFileName] = useState('');

  const handleChange = (event) => {
    setFileName(event.target.files?.[0]?.name || '');
    onChange(event);
  };

  return (
    <div className="admin-course-editor-field">
      <label className="admin-course-editor-label" htmlFor={id}>
        {label}
      </label>

      <div className="admin-course-editor-media">
        <div
          className={`admin-course-editor-preview${value ? ' has-image' : ''}${
            error ? ' is-invalid' : ''
          }`}
        >
          {value ? (
            <img src={value} alt={alt} />
          ) : (
            <span>{emptyLabel}</span>
          )}
        </div>

        <div className="admin-course-editor-media-control">
          <span
            className={`admin-course-editor-upload${
              error ? ' is-invalid' : ''
            }`}
          >
            <input
              id={id}
              className="admin-course-editor-file"
              type="file"
              accept="image/*"
              onChange={handleChange}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : hintId}
            />
            <span className="admin-course-editor-file-button">
              {value ? 'Replace image' : 'Choose image'}
            </span>
            {fileName ? (
              <span className="admin-course-editor-file-name">{fileName}</span>
            ) : null}
          </span>
          {error ? (
            <span className="admin-course-editor-error" id={errorId}>
              {error}
            </span>
          ) : (
            <span className="admin-course-editor-hint" id={hintId}>
              {hint}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectField({ id, label, value, options, onChange, error }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState('bottom');
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const optionRefs = useRef([]);

  const listId = `${id}-list`;
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const errorId = `${id}-error`;

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
  const activeOption = options[activeIndex];

  const openMenu = (nextIndex = Math.max(0, selectedIndex)) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setPlacement(
        spaceBelow < 240 && spaceAbove > spaceBelow ? 'top' : 'bottom'
      );
    }
    setActiveIndex(nextIndex);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const selectOption = (nextValue) => {
    setOpen(false);
    if (nextValue !== value) onChange(nextValue);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    const { key } = event;

    if (!open) {
      if (key === 'ArrowDown') {
        event.preventDefault();
        openMenu(Math.max(0, selectedIndex));
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        openMenu(options.length - 1);
      }
      return;
    }

    if (key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % options.length);
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(
        (current) => (current - 1 + options.length) % options.length
      );
    } else if (key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (key === 'End') {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (activeOption) selectOption(activeOption.value);
    } else if (key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className="admin-course-editor-field" ref={containerRef}>
      <span className="admin-course-editor-label" id={labelId}>
        {label}
      </span>

      <div className="admin-course-editor-select">
        <button
          ref={buttonRef}
          type="button"
          id={id}
          className={`admin-course-editor-input admin-course-editor-select-button${
            open ? ' is-open' : ''
          }${error ? ' is-invalid' : ''}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={`${labelId} ${valueId}`}
          aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
          onClick={() => {
            if (open) setOpen(false);
            else openMenu();
          }}
          onKeyDown={handleKeyDown}
        >
          <span
            className={`admin-course-editor-select-value${
              selectedOption ? '' : ' is-placeholder'
            }`}
            id={valueId}
          >
            {selectedOption?.label || 'Select a level'}
          </span>
          <svg
            className="admin-course-editor-chevron"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>

        {open ? (
          <ul
            className={`admin-course-editor-select-menu${
              placement === 'top' ? ' is-top' : ''
            }`}
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                role="option"
                aria-selected={option.value === value}
                className={`admin-course-editor-select-option${
                  index === activeIndex ? ' is-active' : ''
                }${option.value === value ? ' is-selected' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option.value)}
              >
                <span>{option.label}</span>
                {option.value === value ? (
                  <svg
                    className="admin-course-editor-select-check"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m3.5 8.5 3 3 6-7" />
                  </svg>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? (
        <span className="admin-course-editor-error" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

export default function CourseEditorForm({
  title,
  backTo,
  backLabel,
  cancelTo,
  submitLabel,
  savingLabel,
  publishNote,
  errorTitle,
  form,
  fieldErrors = {},
  apiError,
  saving,
  onChange,
  onChangeValue,
  onImageChange,
  onSubmit,
}) {
  const baseId = useId();
  const ids = {
    title: `${baseId}-title`,
    description: `${baseId}-description`,
    level: `${baseId}-level`,
    courseImage: `${baseId}-cover`,
    demoVideoUrl: `${baseId}-video-url`,
    demoVideoThumbnail: `${baseId}-video-thumbnail`,
    price: `${baseId}-price`,
    duration: `${baseId}-duration`,
    details: `${baseId}-details-heading`,
    media: `${baseId}-media-heading`,
    pricing: `${baseId}-pricing-heading`,
    publish: `${baseId}-publish-heading`,
  };

  const demoVideoUrl = form.demoVideoUrl.trim();
  const demoVideoUrlValid = isHttpUrl(demoVideoUrl);
  const fieldClass = (field) =>
    `admin-course-editor-input${fieldErrors[field] ? ' is-invalid' : ''}`;

  return (
    <div className="admin-course-editor">
      <header className="admin-course-editor-masthead">
        <Link to={backTo} className="admin-course-editor-back">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 3.5 5.5 8l4.5 4.5" />
          </svg>
          {backLabel}
        </Link>
        <h1 className="admin-course-editor-title">{title}</h1>
      </header>

      <form
        className="admin-course-editor-form"
        onSubmit={onSubmit}
        noValidate
        aria-busy={saving || undefined}
      >
        {apiError ? (
          <div className="admin-course-editor-alert" role="alert">
            <p className="admin-course-editor-alert-title">{errorTitle}</p>
            <p className="admin-course-editor-alert-detail">{apiError}</p>
          </div>
        ) : null}

        <div className="admin-course-editor-layout">
          <div className="admin-course-editor-main">
            <section
              className="admin-course-editor-panel"
              aria-labelledby={ids.details}
            >
              <header className="admin-course-editor-panel-head">
                <h2 className="admin-course-editor-panel-title" id={ids.details}>
                  Course details
                </h2>
              </header>

              <div className="admin-course-editor-panel-body">
                <div className="admin-course-editor-field">
                  <label className="admin-course-editor-label" htmlFor={ids.title}>
                    Course title
                  </label>
                  <input
                    id={ids.title}
                    className={fieldClass('title')}
                    type="text"
                    value={form.title}
                    onChange={onChange('title')}
                    placeholder="e.g. Product Analytics"
                    maxLength={150}
                    aria-invalid={Boolean(fieldErrors.title) || undefined}
                    aria-describedby={
                      fieldErrors.title ? `${ids.title}-error` : undefined
                    }
                  />
                  {fieldErrors.title ? (
                    <span
                      className="admin-course-editor-error"
                      id={`${ids.title}-error`}
                    >
                      {fieldErrors.title}
                    </span>
                  ) : null}
                </div>

                <div className="admin-course-editor-field">
                  <div className="admin-course-editor-label-row">
                    <label
                      className="admin-course-editor-label"
                      htmlFor={ids.description}
                    >
                      Description
                    </label>
                    <span className="admin-course-editor-count">
                      {form.description.length} / 5000
                    </span>
                  </div>
                  <textarea
                    id={ids.description}
                    className={`${fieldClass('description')} admin-course-editor-textarea`}
                    rows={6}
                    value={form.description}
                    onChange={onChange('description')}
                    placeholder="What will students learn?"
                    maxLength={5000}
                    aria-invalid={Boolean(fieldErrors.description) || undefined}
                    aria-describedby={
                      fieldErrors.description
                        ? `${ids.description}-error`
                        : undefined
                    }
                  />
                  {fieldErrors.description ? (
                    <span
                      className="admin-course-editor-error"
                      id={`${ids.description}-error`}
                    >
                      {fieldErrors.description}
                    </span>
                  ) : null}
                </div>

                <SelectField
                  id={ids.level}
                  label="Level"
                  value={form.level}
                  options={LEVEL_OPTIONS}
                  onChange={(nextValue) => onChangeValue('level', nextValue)}
                  error={fieldErrors.level}
                />
              </div>
            </section>

            <section
              className="admin-course-editor-panel"
              aria-labelledby={ids.media}
            >
              <header className="admin-course-editor-panel-head">
                <h2 className="admin-course-editor-panel-title" id={ids.media}>
                  Media
                </h2>
              </header>

              <div className="admin-course-editor-panel-body">
                <MediaField
                  id={ids.courseImage}
                  label="Cover image"
                  value={form.courseImage}
                  onChange={onImageChange('courseImage')}
                  error={fieldErrors.courseImage}
                  hint="JPG or PNG, up to 1.2 MB."
                  emptyLabel="No image selected"
                  alt="Cover image preview"
                />

                <div className="admin-course-editor-divider" />

                <h3 className="admin-course-editor-subhead">Demo video</h3>

                <div className="admin-course-editor-field">
                  <div className="admin-course-editor-label-row">
                    <label
                      className="admin-course-editor-label"
                      htmlFor={ids.demoVideoUrl}
                    >
                      Video URL
                    </label>
                    {demoVideoUrlValid ? (
                      <a
                        className="admin-course-editor-preview-link"
                        href={demoVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open link
                      </a>
                    ) : null}
                  </div>
                  <input
                    id={ids.demoVideoUrl}
                    className={fieldClass('demoVideoUrl')}
                    type="url"
                    value={form.demoVideoUrl}
                    onChange={onChange('demoVideoUrl')}
                    placeholder="https://"
                    inputMode="url"
                    aria-invalid={Boolean(fieldErrors.demoVideoUrl) || undefined}
                    aria-describedby={`${ids.demoVideoUrl}-hint`}
                  />
                  {fieldErrors.demoVideoUrl ? (
                    <span
                      className="admin-course-editor-error"
                      id={`${ids.demoVideoUrl}-hint`}
                    >
                      {fieldErrors.demoVideoUrl}
                    </span>
                  ) : (
                    <span
                      className="admin-course-editor-hint"
                      id={`${ids.demoVideoUrl}-hint`}
                    >
                      YouTube, Google Drive, or a direct video link.
                    </span>
                  )}
                </div>

                <MediaField
                  id={ids.demoVideoThumbnail}
                  label="Video thumbnail"
                  value={form.demoVideoThumbnail}
                  onChange={onImageChange('demoVideoThumbnail')}
                  error={fieldErrors.demoVideoThumbnail}
                  hint="JPG or PNG, up to 1.2 MB."
                  emptyLabel="No thumbnail selected"
                  alt="Video thumbnail preview"
                />
              </div>
            </section>
          </div>

          <aside className="admin-course-editor-side">
            <section
              className="admin-course-editor-panel"
              aria-labelledby={ids.pricing}
            >
              <header className="admin-course-editor-panel-head">
                <h2 className="admin-course-editor-panel-title" id={ids.pricing}>
                  Pricing &amp; length
                </h2>
              </header>

              <div className="admin-course-editor-panel-body">
                <div className="admin-course-editor-field">
                  <label className="admin-course-editor-label" htmlFor={ids.price}>
                    Price (INR)
                  </label>
                  <input
                    id={ids.price}
                    className={fieldClass('price')}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={onChange('price')}
                    placeholder="0"
                    aria-invalid={Boolean(fieldErrors.price) || undefined}
                    aria-describedby={
                      fieldErrors.price ? `${ids.price}-error` : undefined
                    }
                  />
                  {fieldErrors.price ? (
                    <span
                      className="admin-course-editor-error"
                      id={`${ids.price}-error`}
                    >
                      {fieldErrors.price}
                    </span>
                  ) : null}
                </div>

                <div className="admin-course-editor-field">
                  <label
                    className="admin-course-editor-label"
                    htmlFor={ids.duration}
                  >
                    Duration (hours)
                  </label>
                  <input
                    id={ids.duration}
                    className={fieldClass('duration')}
                    type="number"
                    min="0"
                    step="1"
                    value={form.duration}
                    onChange={onChange('duration')}
                    placeholder="0"
                    aria-invalid={Boolean(fieldErrors.duration) || undefined}
                    aria-describedby={
                      fieldErrors.duration ? `${ids.duration}-error` : undefined
                    }
                  />
                  {fieldErrors.duration ? (
                    <span
                      className="admin-course-editor-error"
                      id={`${ids.duration}-error`}
                    >
                      {fieldErrors.duration}
                    </span>
                  ) : null}
                </div>
              </div>
            </section>

            <section
              className="admin-course-editor-panel"
              aria-labelledby={ids.publish}
            >
              <header className="admin-course-editor-panel-head">
                <h2 className="admin-course-editor-panel-title" id={ids.publish}>
                  Publish
                </h2>
              </header>

              <div className="admin-course-editor-publish">
                <p className="admin-course-editor-publish-note">{publishNote}</p>
                <Button
                  type="submit"
                  className="admin-course-editor-submit"
                  loading={saving}
                  disabled={saving}
                >
                  {saving ? savingLabel : submitLabel}
                </Button>
                <Link to={cancelTo} className="admin-course-editor-cancel">
                  Cancel
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </form>
    </div>
  );
}
