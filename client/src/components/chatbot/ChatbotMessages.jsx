import { useEffect, useRef } from 'react';
import ChatbotMessage from './ChatbotMessage.jsx';
import TypingIndicator from './TypingIndicator.jsx';

export default function ChatbotMessages({ messages, isTyping }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="chatbot-messages">
      {messages.length === 0 && !isTyping && (
        <div className="chatbot-welcome">
          <div className="chatbot-welcome-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3>Hi there!</h3>
          <p>I&apos;m Mentriv AI. How can I help you today?</p>
          <div className="chatbot-suggestions">
            <button type="button" className="chatbot-suggestion" tabIndex={-1}>
              What courses does Mentriv offer?
            </button>
            <button type="button" className="chatbot-suggestion" tabIndex={-1}>
              How do I enroll?
            </button>
            <button type="button" className="chatbot-suggestion" tabIndex={-1}>
              What is the class schedule?
            </button>
          </div>
        </div>
      )}
      {messages.map((msg) => (
        <ChatbotMessage key={msg.id} message={msg} />
      ))}
      {isTyping && <TypingIndicator />}
      <div ref={endRef} />
    </div>
  );
}
