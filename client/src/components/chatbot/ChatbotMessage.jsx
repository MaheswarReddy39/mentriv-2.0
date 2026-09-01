export default function ChatbotMessage({ message }) {
  const isUser = message.sender === 'user';

  return (
    <div className={`chatbot-msg chatbot-msg--${isUser ? 'user' : 'bot'}`}>
      <div className="chatbot-msg-avatar">
        {isUser ? 'U' : 'M'}
      </div>
      <div className="chatbot-msg-bubble">
        {message.text}
      </div>
    </div>
  );
}
