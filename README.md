# 🤖 Chatbot con Open WebUI & Python FastAPI

Proyecto de Chatbot conversacional con diseño minimalista sobre fondo blanco, widget interactivo con burbuja flotante en la esquina inferior derecha y arquitectura modular separada en `frontend/` y `backend/`.

---

## 📁 Estructura del Proyecto

```text
chatbot/
├── backend/
│   ├── .env                    # Credenciales y configuración del API Open WebUI
│   ├── .env.example            # Plantilla de variables de entorno
│   ├── requirements.txt        # Dependencias de Python (FastAPI, uvicorn, httpx, etc.)
│   ├── config.py               # Cargador de configuración
│   ├── main.py                 # Servidor FastAPI y endpoints REST/SSE
│   └── services/
│       └── ai_client.py        # Cliente HTTP para Open WebUI (streaming y completions)
├── frontend/
│   ├── index.html              # Página web con fondo blanco de diseño y widget de chat
│   ├── css/
│   │   └── style.css           # Estilos modernos, diseño responsivo y animaciones
│   └── js/
│       └── app.js              # Lógica de la burbuja flotante, streaming SSE y audio Web API
├── start.sh                    # Script para iniciar el servidor con un solo comando
└── README.md
```

---

## ⚙️ Configuración de Credenciales (`backend/.env`)

Las credenciales ya han sido configuradas en `backend/.env`:

```env
OPEN_WEBUI_URL=https://zuri.zvortex.cloud/api
OPEN_WEBUI_KEY=sk-e0ebaaf070f7407b9293a2a5426ee613
MODEL_NAME=zuri:latest
BACKEND_PORT=8000
BACKEND_HOST=0.0.0.0
```

---

## 🚀 Cómo Ejecutar el Proyecto

### Opción 1: Con el script automático (Recomendado)

En la terminal, ejecuta:

```bash
cd /home/felipe/Documents/clase/chatbot
./start.sh
```

### Opción 2: Ejecución manual del backend

1. Navega a la carpeta del backend:
   ```bash
   cd /home/felipe/Documents/clase/chatbot/backend
   ```
2. Activa el entorno virtual:
   ```bash
   source venv/bin/activate
   ```
3. Inicia el servidor FastAPI:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
4. Abre tu navegador en [http://localhost:8000](http://localhost:8000).

---

## ✨ Características Principales

1. **Diseño de Fondo Blanco Minimalista**:
   - Estética limpia con tipografía moderna (`Plus Jakarta Sans`), sutiles efectos de luz y tarjetas de presentación.
2. **Burbuja Flotante de Chatbot (Esquina Inferior Derecha)**:
   - Botón de acción flotante con pulso interactivo, badge de alerta y tooltip de invitación tras 2 segundos.
   - Al pulsar la burbuja, se despliega la ventana del chat con animaciones suaves.
3. **Streaming SSE en Tiempo Real**:
   - Respuestas token a token generadas en vivo con el modelo `zuri:latest` de Open WebUI.
4. **Formatos y Utilidades del Chat**:
   - Soporte completo para Markdown (listas, negritas, bloques de código con botón de copiar).
   - Sugerencias rápidas de preguntas (*chips* interactivos).
   - Indicador dinámico de escritura (*typing indicator*).
   - Botón para detener la respuesta en curso.
   - Efectos sonoros sutiles generados con Web Audio API (sin descargas de archivos externos).
   - Botón para maximizar la ventana o limpiarla en cualquier momento.
5. **Endpoints de la API**:
   - `GET /api/health`: Estado de conexión con Open WebUI.
   - `GET /api/models`: Modelos disponibles en el servidor Open WebUI.
   - `POST /api/chat`: Consulta estándar no-streaming.
   - `POST /api/chat/stream`: Consulta por streaming (Server-Sent Events).
