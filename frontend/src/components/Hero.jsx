import React from 'react';
import { MessageSquare, Zap, ShieldCheck, Layers, Sparkles } from 'lucide-react';

export default function Hero({ onOpenChat }) {
  return (
    <main className="main-content" id="inicio">
      <div className="content-container">
        {/* Sección Hero */}
        <section className="hero-section">
          <div className="hero-badge">
            <span className="badge-sparkle">✨</span>
            <span>Open WebUI Asistente Conversacional</span>
          </div>

          <h1 className="hero-title">
            Inteligencia artificial interactiva, <br />
            <span className="gradient-text">simple y elegante.</span>
          </h1>

          <p className="hero-description">
            Plataforma conversacional construida con <strong>React</strong> en el frontend y <strong>Python FastAPI</strong> en el backend, conectada a tu servidor Open WebUI con streaming token a token.
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary" onClick={onOpenChat}>
              <MessageSquare size={18} />
              Abrir Asistente Virtual
            </button>
            <a href="#capacidades" className="btn btn-secondary">
              Ver Capacidades
            </a>
          </div>
        </section>

        {/* Sección de Tarjetas de Características */}
        <section className="features-section" id="capacidades">
          <div className="feature-card">
            <div className="feature-icon-wrapper icon-blue">
              <Zap size={24} />
            </div>
            <h3>Streaming en Tiempo Real</h3>
            <p>
              Generación de respuestas palabra por palabra usando Server-Sent Events (SSE) para una fluidez natural instantánea.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper icon-purple">
              <ShieldCheck size={24} />
            </div>
            <h3>Conexión Segura con Open WebUI</h3>
            <p>
              Credenciales y claves API aisladas en el servidor backend de Python mediante variables de entorno en <code>.env</code>.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper icon-emerald">
              <Layers size={24} />
            </div>
            <h3>Frontend React Desacoplado</h3>
            <p>
              Componentes modernos de React, modularidad completa, soporte Markdown y control de estado reactivo.
            </p>
          </div>
        </section>

        {/* Footer de la página */}
        <footer className="site-footer" id="tecnologia">
          <p>© 2026 Zuri Chatbot · React + Vite · Backend Python FastAPI · Open WebUI</p>
        </footer>
      </div>
    </main>
  );
}
