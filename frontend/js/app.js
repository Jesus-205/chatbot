/**
 * Zuri AI Chatbot Widget - Frontend Logic
 * Conectado con FastAPI y Open WebUI con streaming SSE en tiempo real
 */

document.addEventListener('DOMContentLoaded', () => {
  // Detectar la URL base del backend
  const getBackendUrl = () => {
    // Si estamos en localhost:8000 o similar servido por FastAPI
    if (window.location.protocol.startsWith('http') && window.location.port === '8000') {
      return window.location.origin;
    }
    // Si estamos en un puerto diferente (ej: Live Server en 5500, Vite en 5173 o file://)
    return 'http://localhost:8000';
  };

  const BACKEND_URL = getBackendUrl();

  // Elementos del DOM
  const chatbotWidget = document.getElementById('chatbotWidget');
  const chatBubbleBtn = document.getElementById('chatBubbleBtn');
  const chatWindow = document.getElementById('chatWindow');
  const closeChatBtn = document.getElementById('closeChatBtn');
  const expandToggleBtn = document.getElementById('expandToggleBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const chatMessages = document.getElementById('chatMessages');
  const chatInputForm = document.getElementById('chatInputForm');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const stopGenerationBtn = document.getElementById('stopGenerationBtn');
  const typingIndicator = document.getElementById('typingIndicator');
  const unreadBadge = document.getElementById('unreadBadge');
  const chatInvitation = document.getElementById('chatInvitation');
  const closeInvitationBtn = document.getElementById('closeInvitationBtn');
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  const headerStatusText = document.getElementById('headerStatusText');
  const openChatHeroBtn = document.getElementById('openChatHeroBtn');
  const welcomeBox = document.getElementById('welcomeBox');

  // Estado de la aplicación
  let isOpen = false;
  let isExpanded = false;
  let isSoundEnabled = true;
  let isGenerating = false;
  let abortController = null;
  let conversationHistory = []; // [{ role: 'user' | 'assistant', content: '...' }]
  let audioCtx = null;

  // ==========================================================================
  // Efectos de Sonido mediante Web Audio API (Sin archivos externos requeridos)
  // ==========================================================================
  const playChime = (type = 'receive') => {
    if (!isSoundEnabled) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'receive') {
        // Melodía suave ascendente de 2 tonos
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(840, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'send') {
        // Pop suave al enviar
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (e) {
      console.warn('Audio no disponible:', e);
    }
  };

  // ==========================================================================
  // Comprobación de Salud del Backend
  // ==========================================================================
  const checkHealth = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`, { method: 'GET' });
      if (!response.ok) throw new Error('Servidor offline');
      const data = await response.json();
      
      const isAiConnected = data.ai_connection && data.ai_connection.status === 'connected';
      
      if (apiStatusBadge) {
        apiStatusBadge.classList.remove('error');
        apiStatusBadge.classList.add('connected');
        const label = apiStatusBadge.querySelector('.status-label');
        if (label) label.textContent = isAiConnected ? `Zuri IA Conectada` : `Backend Activo`;
      }
      if (headerStatusText) {
        headerStatusText.textContent = isAiConnected ? 'En línea · Open WebUI' : 'Conectado al servidor';
      }
    } catch (err) {
      console.warn('Error al verificar salud de backend:', err);
      if (apiStatusBadge) {
        apiStatusBadge.classList.remove('connected');
        apiStatusBadge.classList.add('error');
        const label = apiStatusBadge.querySelector('.status-label');
        if (label) label.textContent = 'Backend Desconectado';
      }
      if (headerStatusText) {
        headerStatusText.textContent = 'Reconectando...';
      }
    }
  };

  // Ejecutar verificación inicial y periódica cada 45s
  checkHealth();
  setInterval(checkHealth, 45000);

  // ==========================================================================
  // Apertura y Cierre de la Burbuja del Chat
  // ==========================================================================
  const openChat = () => {
    isOpen = true;
    chatWindow.removeAttribute('hidden');
    chatBubbleBtn.classList.add('is-active');
    chatBubbleBtn.setAttribute('aria-expanded', 'true');
    
    // Ocultar badge de no leídos
    if (unreadBadge) {
      unreadBadge.style.display = 'none';
    }
    // Ocultar tooltip de sugerencia
    if (chatInvitation) {
      chatInvitation.style.display = 'none';
    }

    setTimeout(() => {
      chatInput.focus();
      scrollToBottom();
    }, 150);
  };

  const closeChat = () => {
    isOpen = false;
    chatWindow.setAttribute('hidden', '');
    chatBubbleBtn.classList.remove('is-active');
    chatBubbleBtn.setAttribute('aria-expanded', 'false');
  };

  const toggleChat = () => {
    if (isOpen) {
      closeChat();
    } else {
      openChat();
    }
  };

  chatBubbleBtn.addEventListener('click', toggleChat);
  if (closeChatBtn) closeChatBtn.addEventListener('click', closeChat);
  if (openChatHeroBtn) openChatHeroBtn.addEventListener('click', openChat);

  // Invitación emergente
  setTimeout(() => {
    if (!isOpen && chatInvitation) {
      chatInvitation.style.display = 'flex';
    }
  }, 2200);

  if (chatInvitation) {
    chatInvitation.addEventListener('click', (e) => {
      if (e.target.id === 'closeInvitationBtn') {
        e.stopPropagation();
        chatInvitation.style.display = 'none';
      } else {
        openChat();
      }
    });
  }

  // ==========================================================================
  // Botones de Cabecera (Expandir, Sonido, Limpiar)
  // ==========================================================================
  if (expandToggleBtn) {
    expandToggleBtn.addEventListener('click', () => {
      isExpanded = !isExpanded;
      chatWindow.classList.toggle('is-expanded', isExpanded);
      const iconExpand = expandToggleBtn.querySelector('.icon-expand');
      const iconShrink = expandToggleBtn.querySelector('.icon-shrink');
      if (iconExpand && iconShrink) {
        iconExpand.style.display = isExpanded ? 'none' : 'block';
        iconShrink.style.display = isExpanded ? 'block' : 'none';
      }
    });
  }

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      isSoundEnabled = !isSoundEnabled;
      soundToggleBtn.style.opacity = isSoundEnabled ? '1' : '0.4';
      soundToggleBtn.title = isSoundEnabled ? 'Silenciar notificaciones' : 'Activar sonido';
    });
  }

  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', () => {
      if (conversationHistory.length === 0) return;
      if (confirm('¿Deseas reiniciar la conversación y borrar los mensajes actuales?')) {
        conversationHistory = [];
        // Limpiar mensajes y restablecer bienvenida
        chatMessages.innerHTML = '';
        if (welcomeBox) {
          chatMessages.appendChild(welcomeBox);
          bindSuggestionChips();
        }
      }
    });
  }

  // ==========================================================================
  // Auto-ajuste de altura del Textarea
  // ==========================================================================
  const adjustTextareaHeight = () => {
    chatInput.style.height = 'auto';
    const newHeight = Math.min(chatInput.scrollHeight, 120);
    chatInput.style.height = `${newHeight}px`;
    sendBtn.disabled = !chatInput.value.trim() || isGenerating;
  };

  chatInput.addEventListener('input', adjustTextareaHeight);

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) {
        handleSendMessage();
      }
    }
  });

  // ==========================================================================
  // Formateo y Renderizado de Mensajes (Markdown seguro)
  // ==========================================================================
  const renderMarkdown = (text) => {
    if (window.marked && window.DOMPurify) {
      try {
        const rawHtml = window.marked.parse(text);
        return window.DOMPurify.sanitize(rawHtml);
      } catch (err) {
        console.warn('Error al parsear Markdown:', err);
      }
    }
    // Fallback básico para saltos de línea y entidades HTML
    return escapeHtml(text).replace(/\n/g, '<br>');
  };

  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const scrollToBottom = () => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  // Crear burbuja de mensaje en el DOM
  const appendMessage = (role, content, isTemporary = false) => {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;

    const time = formatTime();

    if (role === 'bot') {
      row.innerHTML = `
        <div class="message-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path>
            <rect x="4" y="8" width="16" height="12" rx="4"></rect>
          </svg>
        </div>
        <div class="message-content-wrapper">
          <div class="message-bubble">${renderMarkdown(content)}</div>
          <div class="message-meta">
            <span>${time}</span>
            <button class="btn-copy-msg" title="Copiar respuesta">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        </div>
      `;

      // Evento de copia
      const copyBtn = row.querySelector('.btn-copy-msg');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(content).then(() => {
            copyBtn.innerHTML = '✓';
            setTimeout(() => {
              copyBtn.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              `;
            }, 1500);
          });
        });
      }
    } else {
      // Mensaje de usuario
      row.innerHTML = `
        <div class="message-content-wrapper">
          <div class="message-bubble">${escapeHtml(content).replace(/\n/g, '<br>')}</div>
          <div class="message-meta">
            <span>${time}</span>
          </div>
        </div>
      `;
    }

    chatMessages.appendChild(row);
    scrollToBottom();
    return row;
  };

  // ==========================================================================
  // Enviar Mensaje con Streaming SSE
  // ==========================================================================
  const handleSendMessage = async (customText = null) => {
    const text = (customText || chatInput.value).trim();
    if (!text || isGenerating) return;

    // Resetear input
    chatInput.value = '';
    adjustTextareaHeight();

    // Reproducir tono de envío
    playChime('send');

    // Agregar mensaje del usuario a la vista y al historial
    appendMessage('user', text);
    conversationHistory.push({ role: 'user', content: text });

    // Mostrar estado generando
    isGenerating = true;
    sendBtn.disabled = true;
    sendBtn.style.display = 'none';
    stopGenerationBtn.style.display = 'flex';
    typingIndicator.style.display = 'flex';
    scrollToBottom();

    // Crear burbuja de respuesta para el bot en tiempo real
    const botRow = appendMessage('bot', '');
    const bubbleElement = botRow.querySelector('.message-bubble');
    let accumulatedText = '';

    abortController = new AbortController();

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor (${response.status})`);
      }

      // Ocultar typing indicator cuando empieza a llegar el stream
      typingIndicator.style.display = 'none';

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Mantener última línea incompleta en el buffer

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
              bubbleElement.innerHTML = renderMarkdown(accumulatedText);
              scrollToBottom();
            } else if (parsed.error) {
              accumulatedText += `\n\n⚠️ *${parsed.error}*`;
              bubbleElement.innerHTML = renderMarkdown(accumulatedText);
            }
          } catch (e) {
            // Ignorar líneas intermedias no JSON
          }
        }
      }

      // Mensaje final completado
      if (accumulatedText.trim().length > 0) {
        conversationHistory.push({ role: 'assistant', content: accumulatedText });
        playChime('receive');
      } else {
        bubbleElement.innerHTML = renderMarkdown('No se recibió contenido de la respuesta.');
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        accumulatedText += ' *(Respuesta interrumpida)*';
        bubbleElement.innerHTML = renderMarkdown(accumulatedText);
      } else {
        console.error('Error durante la consulta AI:', err);
        bubbleElement.innerHTML = `⚠️ <strong>Error de conexión:</strong> No se pudo conectar al servidor backend. Verifica que esté corriendo en <code>${BACKEND_URL}</code>.`;
      }
    } finally {
      isGenerating = false;
      typingIndicator.style.display = 'none';
      stopGenerationBtn.style.display = 'none';
      sendBtn.style.display = 'flex';
      sendBtn.disabled = !chatInput.value.trim();
      abortController = null;
      scrollToBottom();
    }
  };

  // Evento enviar del formulario
  chatInputForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSendMessage();
  });

  // Botón para detener la generación
  stopGenerationBtn.addEventListener('click', () => {
    if (abortController) {
      abortController.abort();
    }
  });

  // ==========================================================================
  // Chips de Sugerencias Rápidas
  // ==========================================================================
  const bindSuggestionChips = () => {
    const chips = document.querySelectorAll('.suggestion-chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        if (prompt) {
          handleSendMessage(prompt);
        }
      });
    });
  };

  bindSuggestionChips();
});
