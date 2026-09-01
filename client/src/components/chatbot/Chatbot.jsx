import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import ChatbotButton from './ChatbotButton.jsx';
import ChatbotWindow from './ChatbotWindow.jsx';

const VISIBLE_PATHS = ['/', '/courses', '/announcements', '/dashboard', '/teacher', '/teacher/dashboard'];

let nextId = 1;

const MOCK_RESPONSES = [
  "I'm Mentriv AI! I can help you with questions about our courses, enrollment, schedules, and more.",
  'The MERN Stack course is currently available for Rs. 499 and lasts 2 months.',
  'To enroll, simply visit the Courses page, select a course, and click Enroll. You will need to complete registration and wait for admin approval.',
  'Classes run on flexible time slots: 6:00-7:30 PM, 8:00-9:30 PM, or 8:30-10:00 PM depending on availability.',
  'Mentriv provides one-to-one mentorship alongside structured course learning. Teachers and faculty serve as mentors.',
  'You can contact support via email at maheswarreddygondireddy12@gmail.com or call/WhatsApp at 9550441728 (8 AM - 9 PM).',
];

function getMockResponse() {
  return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
}

export default function Chatbot() {
  const { pathname } = useLocation();
  const isVisible = VISIBLE_PATHS.includes(pathname);

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const handleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const handleSend = useCallback((text) => {
    const userMsg = { id: nextId++, sender: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const botMsg = { id: nextId++, sender: 'bot', text: getMockResponse() };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 600);
  }, []);

  if (!isVisible) return null;

  return (
    <>
      {isOpen && (
        <ChatbotWindow
          messages={messages}
          isTyping={isTyping}
          isMinimized={isMinimized}
          onMinimize={handleMinimize}
          onClose={handleClose}
          onSend={handleSend}
        />
      )}
      <ChatbotButton isOpen={isOpen} onClick={handleToggle} />
    </>
  );
}
