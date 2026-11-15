import { useEffect, useId } from 'react';
import ChatbotHeader from './ChatbotHeader.jsx';
import ChatbotMessages from './ChatbotMessages.jsx';
import ChatbotInput from './ChatbotInput.jsx';

export default function ChatbotWindow({
  messages,
  isStreaming,
  isMinimized,
  onMinimize,
  onClose,
  onSend,
  onSuggestion,
  onStop,
}) {
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <section
      className={`chatbot-window${isMinimized ? ' chatbot-window--minimized' : ''}`}
      role="dialog"
      aria-labelledby={titleId}
    >
      <ChatbotHeader
        titleId={titleId}
        isMinimized={isMinimized}
        onMinimize={onMinimize}
        onClose={onClose}
      />
      {!isMinimized && (
        <>
          <ChatbotMessages
            messages={messages}
            isStreaming={isStreaming}
            onSuggestion={onSuggestion}
          />
          <ChatbotInput onSend={onSend} onStop={onStop} isStreaming={isStreaming} />
        </>
      )}
    </section>
  );
}
