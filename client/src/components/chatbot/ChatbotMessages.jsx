import { useEffect, useRef } from 'react';
import ChatbotMessage from './ChatbotMessage.jsx';
import TypingIndicator from './TypingIndicator.jsx';

export default function ChatbotMessages({ messages, isStreaming, onSuggestion }) {
  const listRef = useRef(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    list.scrollTo({ top: list.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [messages, isStreaming]);

  const suggestions = [
    'What courses are available?',
    'How does enrollment work?',
    'Where can I find my schedule?',
  ];

  const lastMessage = messages[messages.length - 1];
  const showTyping = isStreaming && (!lastMessage || lastMessage.sender === 'user');

  return (
    <div className="chatbot-messages" ref={listRef} role="log" aria-label="Conversation">
      {messages.length === 0 && !isStreaming && (
        <div className="chatbot-welcome">
          <h3>How can I help?</h3>
          <p>Ask about courses, enrollment, or your schedule.</p>
          <div className="chatbot-suggestions">
            {suggestions.map((text) => (
              <button
                key={text}
                type="button"
                className="chatbot-suggestion"
                onClick={() => onSuggestion?.(text)}
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      )}
      {messages.map((msg) => (
        <ChatbotMessage key={msg.id} message={msg} />
      ))}
      {showTyping && <TypingIndicator />}
    </div>
  );
}
