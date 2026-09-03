export default function ChatbotHeader({ onMinimize, onClose }) {
  return (
    <div className="chatbot-header">
      <div className="chatbot-header-avatar">M</div>
      <div className="chatbot-header-info">
        <p className="chatbot-header-title">Mentriv AI</p>
        <p className="chatbot-header-subtitle">Ask anything about Mentriv</p>
      </div>
      <div className="chatbot-header-actions">
        <button
          type="button"
          className="chatbot-header-btn"
          onClick={onMinimize}
          aria-label="Minimize chat"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          type="button"
          className="chatbot-header-btn"
          onClick={onClose}
          aria-label="Close chat"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
