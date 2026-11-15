export default function TypingIndicator() {
  return (
    <div className="chatbot-typing" role="status">
      <span className="chatbot-typing-dot" aria-hidden="true" />
      <span className="chatbot-typing-dot" aria-hidden="true" />
      <span className="chatbot-typing-dot" aria-hidden="true" />
      <span className="sr-only">Mentriv AI is typing</span>
    </div>
  );
}
