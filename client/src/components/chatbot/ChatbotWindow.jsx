import ChatbotHeader from './ChatbotHeader.jsx';
import ChatbotMessages from './ChatbotMessages.jsx';
import ChatbotInput from './ChatbotInput.jsx';

export default function ChatbotWindow({ messages, isStreaming, isMinimized, onMinimize, onClose, onSend, onSuggestion }) {
  return (
    <div className={`chatbot-window${isMinimized ? ' chatbot-window--minimized' : ''}`}>
      <ChatbotHeader onMinimize={onMinimize} onClose={onClose} />
      {!isMinimized && (
        <>
          <ChatbotMessages messages={messages} isStreaming={isStreaming} onSuggestion={onSuggestion} />
          <ChatbotInput onSend={onSend} disabled={isStreaming} />
        </>
      )}
    </div>
  );
}
