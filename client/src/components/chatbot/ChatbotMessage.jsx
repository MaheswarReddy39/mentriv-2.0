import Markdown from 'react-markdown';

export default function ChatbotMessage({ message }) {
  const isUser = message.sender === 'user';

  if (!isUser && message.error) {
    return (
      <div className="chatbot-error" role="alert">
        <svg
          className="chatbot-error-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="7.5" x2="12" y2="13" />
          <circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none" />
        </svg>
        <div className="chatbot-error-content">
          <p className="chatbot-error-title">No response</p>
          <p className="chatbot-error-body">{message.text}</p>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="chatbot-msg chatbot-msg--user">
        <div className="chatbot-msg-bubble">{message.text}</div>
      </div>
    );
  }

  return (
    <div className="chatbot-msg chatbot-msg--bot">
      <div className="chatbot-msg-bubble">
        <Markdown>{message.text}</Markdown>
      </div>
    </div>
  );
}
