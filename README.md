# 🤖 Chatbot con Open WebUI, React & Python FastAPI

Proyecto de Chatbot conversacional con diseño minimalista sobre fondo blanco, widget interactivo con burbuja flotante en la esquina inferior derecha y arquitectura modular separada en `frontend/` (**React + Vite**) y `backend/` (**Python FastAPI**).

---

## 📁 Estructura del Proyecto

```text
chatbot/
├── backend/
│   ├── .env                    # Credenciales configuradas de Open WebUI
│   ├── .env.example            # Plantilla de variables de entorno
│   ├── requirements.txt        # Dependencias de Python (FastAPI, uvicorn, httpx, etc.)
│   ├── config.py               # Cargador de configuración
│   ├── main.py                 # API FastAPI con streaming SSE y servidor estático de React
│   └── services/
│       └── ai_client.py        # Cliente HTTP para Open WebUI (streaming y completions)
├── frontend/                   # Aplicación en React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatbotWidget.jsx # Widget flotante con streaming, audio y markdown
│   │   │   ├── Header.jsx       # Cabecera con monitor de estado en vivo
│   │   │   └── Hero.jsx         # Hero section y tarjetas con fondo blanco de diseño
│   │   ├── utils/
│   │   │   └── audio.js         # Sintetizador de tonos suaves con Web Audio API
│   │   ├── App.jsx              # Ensamblado principal de la aplicación
│   │   ├── main.jsx             # Punto de entrada de React
│   │   └── index.css            # Estilos CSS modernos, animaciones y tokens
│   ├── package.json             # Dependencias npm (React, lucide-react, marked, etc.)
│   ├── vite.config.js           # Configuración de Vite con proxy hacia FastAPI
│   └── index.html               # Plantilla HTML con tipografía Plus Jakarta Sans
├── start.sh                    # Script para compilar y arrancar todo automáticamente
└── README.md
```

---

## ⚙️ Configuración de Variables de Entorno (`.env`)

El proyecto cuenta con archivos `.env` independientes para backend y frontend:

### 1. Backend (`backend/.env`):
```env
OPEN_WEBUI_URL=https://zuri.zvortex.cloud/api
OPEN_WEBUI_KEY=sk-e0ebaaf070f7407b9293a2a5426ee613
MODEL_NAME=zuri:latest
BACKEND_PORT=8000
BACKEND_HOST=0.0.0.0
```

### 2. Frontend (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_PORT=5173
```

*(Ambos directorios cuentan con sus plantillas `.env.example` versionadas en el repositorio).*

---

## 🚀 Cómo Ejecutar el Proyecto

### Opción 1: Levantar Frontend y Backend juntos con un solo comando (Recomendado)

En la terminal:

```bash
cd /home/felipe/Documents/clase/chatbot
./start.sh
```

El script verificará dependencias, copiará los `.env` si no existen e iniciará ambos servicios concurrentemente:
- 🌐 **Frontend React (Vite):** [http://localhost:5173](http://localhost:5173) (con HMR y proxy a la API)
- ⚙️ **Backend FastAPI:** [http://localhost:8000](http://localhost:8000) (API y documentación Swagger en `/docs`)

Al presionar `CTRL+C` en la terminal, ambos servidores se detienen limpiamente.

### Opción 2: Modo Desarrollo React (Con Hot-Reloading)

1. En una terminal, inicia el backend de Python:
   ```bash
   cd /home/felipe/Documents/clase/chatbot/backend
   source venv/bin/activate
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. En otra terminal, inicia el servidor de desarrollo de React:
   ```bash
   cd /home/felipe/Documents/clase/chatbot/frontend
   npm run dev
   ```
   Abre [http://localhost:5173](http://localhost:5173) (las peticiones `/api` se redirigen automáticamente al backend en el puerto 8000).

---

## ✨ Características Principales

1. **Frontend en React**:
   - Componentes modulares con estado reactivo (`ChatbotWidget`, `Header`, `Hero`).
   - Iconografía moderna con `lucide-react`.
   - Renderizado seguro de Markdown con `marked` y `DOMPurify`.
2. **Página de Fondo Blanco de Diseño**:
   - Estética limpia y luminosa con tipografía `Plus Jakarta Sans`, sutiles orbes ambientales y tarjetas de presentación.
3. **Burbuja Flotante de Chatbot (Esquina Inferior Derecha)**:
   - Botón de acción flotante con pulso interactivo, badge de notificación y tooltip interactivo tras 2 segundos.
4. **Streaming SSE en Tiempo Real**:
   - Respuestas palabra a palabra conectadas en directo a Open WebUI (`zuri:latest`).
5. **Efectos y Controles**:
   - Tonos de sonido sutiles con Web Audio API.
   - Opciones para expandir tamaño, detener generación en curso y limpiar el historial.
