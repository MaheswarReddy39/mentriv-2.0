export default function TypingIndicator() {
  return (
    <div className="chatbot-msg chatbot-msg--bot">
      <div className="chatbot-msg-avatar">M</div>
      <div className="chatbot-msg-bubble">
        <div className="chatbot-typing">
          <span className="chatbot-typing-dot" />
          <span className="chatbot-typing-dot" />
          <span className="chatbot-typing-dot" />
        </div>
      </div>
    </div>
  );
}
