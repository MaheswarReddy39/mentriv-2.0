export default function ChatbotHeader({ titleId, isMinimized, onMinimize, onClose }) {
  return (
    <header className="chatbot-header">
      <p className="chatbot-header-title" id={titleId}>
        Mentriv AI
      </p>
      <div className="chatbot-header-actions">
        <button
          type="button"
          className="chatbot-header-btn"
          onClick={onMinimize}
          aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
          aria-expanded={!isMinimized}
        >
          {isMinimized ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 15 12 9 18 15" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="chatbot-header-btn"
          onClick={onClose}
          aria-label="Close chat"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  );
}
