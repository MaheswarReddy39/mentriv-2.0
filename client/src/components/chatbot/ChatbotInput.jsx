import { useRef, useState } from 'react';

const MAX_COMPOSER_HEIGHT = 120;

export default function ChatbotInput({ onSend, onStop, isStreaming }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  const resize = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;

    onSend(trimmed);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  return (
    <form className="chatbot-composer" onSubmit={handleSubmit}>
      <div className="chatbot-composer-field">
        <div className="chatbot-input-shell">
          <textarea
            ref={textareaRef}
            className="chatbot-input"
            rows={1}
            placeholder="Ask Mentriv AI..."
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              resize();
            }}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            aria-label="Ask Mentriv AI"
          />
        </div>
        {isStreaming ? (
          <button
            key="stop"
            type="button"
            className="chatbot-stop"
            onClick={onStop}
            aria-label="Stop generating response"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="8" y="8" width="8" height="8" rx="1.5" fill="currentColor" />
            </svg>
            Stop
          </button>
        ) : (
          <button
            key="send"
            type="submit"
            className="chatbot-send"
            disabled={!value.trim()}
            aria-label="Send message"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
