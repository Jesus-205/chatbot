import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Square, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Trash2, 
  Copy, 
  Check, 
  Bot, 
  User, 
  Sparkles 
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { playChime } from '../utils/audio';
import { getApiUrl } from '../config';

const SUGGESTIONS = [
  { icon: '💼', text: '¿Qué servicios ofrecen?' },
  { icon: '⏰', text: '¿Cuáles son los horarios de atención?' },
  { icon: '📞', text: '¿Cómo puedo contactar a un asesor?' },
  { icon: '🤖', text: 'Cuéntame sobre ti y tus capacidades' },
];

export default function ChatbotWidget({ isOpen, setIsOpen }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom(isGenerating ? 'auto' : 'smooth');
  }, [messages, isGenerating]);

  // Show invitation tooltip after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) {
        setShowTooltip(true);
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Handle open/close
  const toggleChat = () => {
    if (!isOpen) {
      setIsOpen(true);
      setHasUnread(false);
      setShowTooltip(false);
      setTimeout(() => {
        textareaRef.current?.focus();
        scrollToBottom('auto');
      }, 150);
    } else {
      setIsOpen(false);
    }
  };

  // Adjust textarea height on change
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() && !isGenerating) {
        sendMessage(inputValue);
      }
    }
  };

  // Safe markdown render
  const renderMarkdown = (content) => {
    try {
      const rawHtml = marked.parse(content || '');
      return { __html: DOMPurify.sanitize(rawHtml) };
    } catch {
      return { __html: DOMPurify.sanitize(content || '') };
    }
  };

  // Copy assistant message
  const handleCopy = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  // Clear chat
  const handleClearChat = () => {
    if (messages.length === 0) return;
    if (window.confirm('¿Deseas reiniciar la conversación y borrar los mensajes actuales?')) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setMessages([]);
      setIsGenerating(false);
    }
  };

  // Stop generating
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Send message
  const sendMessage = async (textToSend) => {
    const cleanText = textToSend.trim();
    if (!cleanText || isGenerating) return;

    // Reset input
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    playChime('send', isSoundEnabled);

    // Append user message
    const userMessage = { role: 'user', content: cleanText, time: getCurrentTime() };
    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);

    // Prepare assistant placeholder message
    const botPlaceholder = { role: 'assistant', content: '', time: getCurrentTime() };
    setMessages([...updatedHistory, botPlaceholder]);
    setIsGenerating(true);

    abortControllerRef.current = new AbortController();

    try {
      // Build conversation payload
      const payloadMessages = updatedHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(getApiUrl('/api/chat/stream'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.delta) {
              accumulatedText += parsed.delta;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  content: accumulatedText,
                };
                return next;
              });
            } else if (parsed.error) {
              accumulatedText += `\n\n⚠️ *${parsed.error}*`;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  content: accumulatedText,
                };
                return next;
              });
            }
          } catch {
            // Ignore non-json SSE lines
          }
        }
      }

      playChime('receive', isSoundEnabled);

    } catch (err) {
      if (err.name === 'AbortError') {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: (next[next.length - 1]?.content || '') + ' *(Respuesta interrumpida)*',
          };
          return next;
        });
      } else {
        console.error('Chat error:', err);
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: `⚠️ **Error de conexión:** No se pudo completar la consulta con el servidor backend (${err.message}).`,
          };
          return next;
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chatbot-widget-container">
      {/* Tooltip de sugerencia / bienvenida */}
      {showTooltip && !isOpen && (
        <div 
          className="chat-invitation-tooltip"
          onClick={toggleChat}
          role="button"
          tabIndex={0}
        >
          <div className="invitation-text">
            <strong>¿Tienes dudas?</strong>
            <span>Chatea en vivo con Zuri IA</span>
          </div>
          <button 
            className="invitation-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
            aria-label="Cerrar sugerencia"
          >
            ✕
          </button>
        </div>
      )}

      {/* Burbuja Flotante de Chat (FAB) */}
      <button 
        className={`chat-bubble-btn ${isOpen ? 'is-active' : ''}`}
        onClick={toggleChat}
        aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
        aria-expanded={isOpen}
      >
        <span className="bubble-icon icon-chat">
          <MessageSquare size={28} />
        </span>
        <span className="bubble-icon icon-close">
          <X size={26} strokeWidth={2.5} />
        </span>

        {hasUnread && !isOpen && (
          <span className="unread-badge">1</span>
        )}
        {!isOpen && <span className="pulse-ring"></span>}
      </button>

      {/* Ventana del Chatbot */}
      {isOpen && (
        <div 
          className={`chat-window ${isExpanded ? 'is-expanded' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Ventana de chat"
        >
          {/* Header */}
          <header className="chat-header">
            <div className="bot-profile">
              <div className="avatar-container">
                <div className="avatar-circle">
                  <Bot size={22} />
                </div>
                <span className="online-indicator"></span>
              </div>
              <div className="bot-info">
                <h2 className="bot-name">Zuri AI</h2>
                <span className="bot-status">En línea · Open WebUI</span>
              </div>
            </div>

            <div className="chat-header-actions">
              <button 
                className="header-action-btn"
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                title={isSoundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
                style={{ opacity: isSoundEnabled ? 1 : 0.4 }}
              >
                {isSoundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
              </button>

              <button 
                className="header-action-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Restaurar tamaño' : 'Maximizar'}
              >
                {isExpanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>

              <button 
                className="header-action-btn"
                onClick={handleClearChat}
                title="Limpiar conversación"
                disabled={messages.length === 0}
              >
                <Trash2 size={17} />
              </button>

              <button 
                className="header-action-btn"
                onClick={() => setIsOpen(false)}
                title="Minimizar chat"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          {/* Cuerpo de Mensajes */}
          <div className="chat-messages-container" tabIndex={0}>
            {messages.length === 0 && (
              <div className="welcome-box">
                <div className="welcome-icon">👋</div>
                <h3>¡Hola! Soy Zuri</h3>
                <p>
                  Tu asistente virtual con inteligencia artificial. Puedes hacerme preguntas o seleccionar una sugerencia:
                </p>

                <div className="suggestions-grid">
                  {SUGGESTIONS.map((item, index) => (
                    <button 
                      key={index}
                      className="suggestion-chip"
                      onClick={() => sendMessage(item.text)}
                    >
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className={`message-row ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="message-avatar">
                    <Bot size={15} />
                  </div>
                )}

                <div className="message-content-wrapper">
                  <div 
                    className="message-bubble"
                    dangerouslySetInnerHTML={renderMarkdown(msg.content)}
                  />
                  <div className="message-meta">
                    <span>{msg.time}</span>
                    {msg.role === 'assistant' && msg.content && (
                      <button 
                        className="btn-copy-msg"
                        onClick={() => handleCopy(msg.content, index)}
                        title="Copiar respuesta"
                      >
                        {copiedIndex === index ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isGenerating && messages[messages.length - 1]?.content === '' && (
              <div className="typing-indicator">
                <div className="typing-bubble">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
                <span className="typing-label">Zuri está respondiendo...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer de Entrada */}
          <footer className="chat-footer">
            <form 
              className="chat-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(inputValue);
              }}
            >
              <textarea
                ref={textareaRef}
                className="chat-input"
                rows={1}
                placeholder="Escribe tu mensaje aquí..."
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                maxLength={2000}
              />

              <div className="input-actions">
                {isGenerating ? (
                  <button 
                    type="button"
                    className="stop-btn"
                    onClick={handleStopGeneration}
                    title="Detener respuesta"
                  >
                    <Square size={13} fill="currentColor" />
                  </button>
                ) : (
                  <button 
                    type="submit"
                    className="send-btn"
                    disabled={!inputValue.trim()}
                    title="Enviar mensaje"
                  >
                    <Send size={15} />
                  </button>
                )}
              </div>
            </form>

            <div className="chat-caption">
              <span>Impulsado por <strong>Open WebUI</strong> · Python Backend</span>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
