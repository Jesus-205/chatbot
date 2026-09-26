import React, { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ChatbotWidget from './components/ChatbotWidget';

export default function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Fondo ambiental minimalista blanco con sutiles orbes */}
      <div className="ambient-background">
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
        <div className="grid-overlay"></div>
      </div>

      {/* Cabecera */}
      <Header />

      {/* Contenido Hero */}
      <Hero onOpenChat={() => setIsChatOpen(true)} />

      {/* Burbuja flotante de Chatbot en la esquina inferior derecha */}
      <ChatbotWidget isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
    </div>
  );
}
