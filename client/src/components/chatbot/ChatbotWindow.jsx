import ChatbotHeader from './ChatbotHeader.jsx';
import ChatbotMessages from './ChatbotMessages.jsx';
import ChatbotInput from './ChatbotInput.jsx';

export default function ChatbotWindow({ messages, isTyping, isMinimized, onMinimize, onClose, onSend }) {
  return (
    <div className={`chatbot-window${isMinimized ? ' chatbot-window--minimized' : ''}`}>
      <ChatbotHeader onMinimize={onMinimize} onClose={onClose} />
      {!isMinimized && (
        <>
          <ChatbotMessages messages={messages} isTyping={isTyping} />
          <ChatbotInput onSend={onSend} disabled={isTyping} />
        </>
      )}
    </div>
  );
}
