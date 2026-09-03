// export default function ChatbotButton({ isOpen, onClick }) {
//   return (
//     <button
//       type="button"
//       className={`chatbot-fab${isOpen ? ' chatbot-fab--open' : ''}`}
//       onClick={onClick}
//       aria-label={isOpen ? 'Close chat' : 'Open chat'}
//     >
//       {isOpen ? (
//         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//           <line x1="18" y1="6" x2="6" y2="18" />
//           <line x1="6" y1="6" x2="18" y2="18" />
//         </svg>
//       ) : (
//         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//           <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
//         </svg>
//       )}
//     </button>
//   );
// }
export default function ChatbotButton({ isOpen, onClick }) {
  if (isOpen) {
    return null;
  }

  return (
    <button
      type="button"
      className="chatbot-fab"
      onClick={onClick}
      aria-label="Open chat"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}