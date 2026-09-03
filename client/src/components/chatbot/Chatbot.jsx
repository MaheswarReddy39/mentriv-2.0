import { useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { API_BASE_URL, API_PREFIX } from '../../constants/api.js';
import ChatbotButton from './ChatbotButton.jsx';
import ChatbotWindow from './ChatbotWindow.jsx';

const VISIBLE_PATHS = ['/', '/courses', '/announcements', '/dashboard', '/teacher', '/teacher/dashboard'];

let nextId = 1;

export default function Chatbot() {
  const { pathname } = useLocation();
  const isVisible = VISIBLE_PATHS.includes(pathname);

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(null);

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
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const handleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const handleSend = useCallback(async (text) => {
    const userMsg = { id: nextId++, sender: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const errorMsg = data?.message || 'Chatbot is temporarily unavailable. Please try again later.';
        setMessages((prev) => [...prev, { id: nextId++, sender: 'bot', text: errorMsg }]);
        setIsStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentText = '';
      let botMsgId = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            var eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') continue;

            let data;
            try {
              data = JSON.parse(raw);
            } catch {
              continue;
            }

            if (eventType === 'token' && data.content) {
              currentText += data.content;
              if (botMsgId === null) {
                botMsgId = nextId++;
                setMessages((prev) => [...prev, { id: botMsgId, sender: 'bot', text: currentText }]);
              } else {
                const id = botMsgId;
                setMessages((prev) =>
                  prev.map((m) => (m.id === id ? { ...m, text: currentText } : m))
                );
              }
            } else if (eventType === 'done') {
              if (botMsgId === null && currentText) {
                setMessages((prev) => [...prev, { id: nextId++, sender: 'bot', text: currentText }]);
              }
            } else if (eventType === 'error') {
              const errorMsg = data.message || 'Chatbot is temporarily unavailable. Please try again later.';
              if (botMsgId === null) {
                setMessages((prev) => [...prev, { id: nextId++, sender: 'bot', text: errorMsg }]);
              } else {
                setMessages((prev) => [
                  ...prev.filter((m) => m.id !== botMsgId),
                  { id: botMsgId, sender: 'bot', text: errorMsg },
                ]);
              }
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          { id: nextId++, sender: 'bot', text: 'Chatbot is temporarily unavailable. Please try again later.' },
        ]);
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const handleSuggestion = useCallback(
    (text) => {
      if (!isStreaming) handleSend(text);
    },
    [isStreaming, handleSend],
  );

  if (!isVisible) return null;

  return (
    <>
      {isOpen && (
        <ChatbotWindow
          messages={messages}
          isStreaming={isStreaming}
          isMinimized={isMinimized}
          onMinimize={handleMinimize}
          onClose={handleClose}
          onSend={handleSend}
          onSuggestion={handleSuggestion}
        />
      )}
      <ChatbotButton isOpen={isOpen} onClick={handleToggle} />
    </>
  );
}
