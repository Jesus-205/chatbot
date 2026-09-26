import React, { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';

export default function Header() {
  const [status, setStatus] = useState({ state: 'checking', label: 'Conectando...' });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (!res.ok) throw new Error('Offline');
        const data = await res.json();
        const isAiConnected = data.ai_connection && data.ai_connection.status === 'connected';
        setStatus({
          state: isAiConnected ? 'connected' : 'warning',
          label: isAiConnected ? 'Zuri IA Conectada' : 'Backend Activo',
        });
      } catch {
        setStatus({
          state: 'error',
          label: 'Backend Desconectado',
        });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="site-header">
      <div className="nav-container">
        <div className="brand">
          <div className="brand-logo">
            <Cpu size={20} />
          </div>
          <span className="brand-title">
            Zuri <span className="brand-badge">IA</span>
          </span>
        </div>

        <nav className="nav-links">
          <a href="#inicio" className="nav-link active">Inicio</a>
          <a href="#capacidades" className="nav-link">Capacidades</a>
          <a href="#tecnologia" className="nav-link">Tecnología</a>
        </nav>

        <div className="nav-actions">
          <div className={`api-status-badge ${status.state}`}>
            <span className="status-dot"></span>
            <span className="status-label">{status.label}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
