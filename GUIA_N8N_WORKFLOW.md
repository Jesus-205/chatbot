# 📘 Guía Paso a Paso: Creación del Flujo de Chatbot en n8n

Esta guía documenta detalladamente y paso a paso cómo construimos el flujo de inteligencia artificial dentro de **n8n** para gobernar el comportamiento del chatbot, limitar sus respuestas únicamente a tu sistema y evitar tener lógica hardcodeada en Python.

---

## 🗺️ 1. Arquitectura del Flujo

El flujo completo en el lienzo de n8n queda interconectado de la siguiente manera:

```text
[ Webhook (POST) ] ─────────► [ AI Agent ] ─────────► [ Respond to Webhook ]
                                   │       │
                        (Chat Model)       (Memory)
                                   ▼       ▼
                       [ OpenAI Chat Model ] [ Simple Memory ]
```

---

## 💻 2. Iniciar n8n en Local

Para evitar que el firewall de **Cloudflare** bloquee la conexión con un error `403 Forbidden`, n8n debe ejecutarse localmente:

1. Abre una terminal en tu computadora y ejecuta:
   ```bash
   npx n8n
   ```
2. Una vez que termine de cargar, abre tu navegador en:
   👉 **`http://localhost:5678`**
3. Si es la primera vez, crea tu usuario local.
4. En el menú superior izquierdo, crea un flujo nuevo (**Add Workflow**).

---

## 🧩 3. Configuración Nodo por Nodo (Paso a Paso)

### 🔴 NODO 1: Webhook (Punto de Entrada)

Este nodo recibe las preguntas del usuario enviadas desde el frontend/backend.

1. Haz clic en **`+ Add first step...`** y busca el nodo **`Webhook`**.
2. Configura los siguientes campos:

| Campo | Valor a Seleccionar / Escribir | Explicación |
| :--- | :--- | :--- |
| **HTTP Method** | `POST` | Permite enviar cuerpos JSON con los mensajes. |
| **Path** | `chat` | Nombre del endpoint. |
| **Authentication** | `None` | Sin autenticación básica interna. |
| **Respond** | `Using 'Respond to Webhook' Node` | Hace que el webhook espere a que la IA termine para responder. |

3. URLs resultantes que genera n8n:
   - **Production URL:** `http://localhost:5678/webhook/chat` *(Para cuando el flujo esté publicado)*.
   - **Test URL:** `http://localhost:5678/webhook-test/chat` *(Para pruebas en vivo)*.
4. Cierra la ventana del nodo con la **`X`**.

---

### 🤖 NODO 2: AI Agent (El Cerebro con Guardrails)

Este nodo coordina al modelo de lenguaje, la memoria y aplica las reglas del sistema.

1. Haz clic en el círculo con el **`+`** a la derecha del nodo `Webhook` y busca: **`AI Agent`**.
2. Configura los parámetros principales:

| Campo | Valor a Seleccionar / Escribir |
| :--- | :--- |
| **Agent** | `Tools Agent` (o `Conversational Agent`) |
| **Source for Prompt (User Message)** | `Define below` |
| **Prompt (User Message)** | `{{ $json.body.message }}` |

3. **Agregar el System Message (Reglas estrictas para que NO hable de temas ajenos):**
   - En la sección **Options**, haz clic en el botón gris **`+ Add Option`**.
   - Selecciona **`System Message`**.
   - En el cuadro de texto que aparece, pega el siguiente prompt:

```text
Eres el Asistente Virtual Oficial exclusivo de [NOMBRE DE TU SISTEMA].

REGLAS ESTRICTAS DE SEGURIDAD Y ALCANCE:
1. Tu ÚNICO propósito es responder preguntas, dar soporte y guiar a los usuarios sobre las funciones, procesos, horarios y datos de [NOMBRE DE TU SISTEMA].
2. Tienes TERMINANTEMENTE PROHIBIDO responder preguntas sobre:
   - Programación, código fuente (Python, JS, etc.) o desarrollo de software general.
   - Matemáticas generales, tareas escolares, ciencia o historia ajena a la empresa.
   - Recetas de cocina, consejos personales, política, religión o cultura general.
3. Si el usuario te hace CUALQUIER pregunta que no tenga relación directa con [NOMBRE DE TU SISTEMA], debes negarte rotundamente diciendo:
   "Disculpa, como asistente de [NOMBRE DE TU SISTEMA] únicamente puedo resolver dudas y gestiones relacionadas con nuestra plataforma."
4. Bajo NINGUNA circunstancia ni insistencia del usuario des ejemplos ni códigos alternativos fuera del sistema.
5. Mantén siempre un tono profesional, claro y conciso en español.
```

---

### 🧠 NODO 3: OpenAI Chat Model (Conexión al LLM de Open WebUI)

Este nodo conecta n8n con tu servidor de inteligencia artificial.

1. En la parte inferior del nodo `AI Agent`, haz clic en el **`+`** debajo de **`Chat Model *`**.
2. Busca y selecciona: **`OpenAI Chat Model`**.
3. **Configurar la Credencial:**
   - En **Credential to connect with**, haz clic en el menú y elige **Create new credential** (o el lápiz ✏️).
   - Configura estos 2 campos:
     - **API Key:** `sk-e0ebaaf070f7407b9293a2a5426ee613`
     - **Base URL:** `https://zuri.zvortex.cloud/api/v1`
   - Haz clic en **Save** (Guardar) arriba a la derecha de la credencial y ciérrala.
4. **Configurar los Parámetros del Modelo:**

| Campo | Valor a Seleccionar / Escribir |
| :--- | :--- |
| **Model** | Cambiar el desplegable a **`By ID`** (o *By Name*) y escribir: `zuri:latest` |
| **Use Responses API** | **Apagado (Gris)** *(Open WebUI usa el estándar clásico de chat)* |

5. Cierra la ventana del nodo con la **`X`**.

---

### 💾 NODO 4: Simple Memory (Memoria de Conversación)

Permite que la IA recuerde los mensajes anteriores de la charla.

1. En la parte inferior del nodo `AI Agent`, haz clic en el **`+`** debajo de **`Memory`**.
2. Selecciona: **`Simple Memory`** *(ubicado bajo la categoría "For beginners")*.
3. Configura los siguientes campos:

| Campo | Valor a Seleccionar / Escribir |
| :--- | :--- |
| **Session ID** | `Define below` |
| **Key** | `default` |
| **Context Window Length** | `5` (o `10`) |

4. Cierra la ventana con la **`X`**.

---

### 📤 NODO 5: Respond to Webhook (Respuesta al Chatbot)

Este nodo devuelve la respuesta generada por la IA al backend/frontend.

1. En tu lienzo, haz clic en el círculo **`+`** a la derecha del nodo **`AI Agent`**.
2. Busca y selecciona: **`Respond to Webhook`**.
3. Configura el campo:

| Campo | Valor |
| :--- | :--- |
| **Respond With** | **`First incoming item`** |

*(Al usar `First incoming item`, n8n devuelve automáticamente el objeto JSON `{ "output": "..." }` generado por el AI Agent de forma limpia y sin errores de sintaxis).*

4. Cierra la ventana con la **`X`**.

---

## 💾 4. Guardar y Publicar el Flujo

1. Presiona **`Ctrl + S`** (o haz clic en **Save** arriba a la derecha) para guardar los cambios.
2. Haz clic en el botón **`Publish`** arriba a la derecha para activar el flujo.
   - Debe mostrar una luz verde o indicar **`Published`**.

---

## 🔍 5. Cómo Ver las Ejecuciones

En n8n existen dos vistas fundamentales:

### A. Vista Historial (`Executions`):
- Arriba al centro de la pantalla, haz clic en la pestaña **`Executions`** (al lado de *Editor*).
- Verás la lista de todas las preguntas recibidas con fecha, hora y estado en verde (`Success`).
- Al hacer clic en cualquier ejecución de la lista, **se abre el lienzo completo con todos los nodos iluminados en verde**, permitiéndote inspeccionar qué entró y qué respondió cada nodo.

### B. Vista en Vivo (Modo Radar):
- En la pestaña **`Editor`**, haz doble clic en el nodo `Webhook`.
- Selecciona la pestaña **`Test URL`** y haz clic en **`Listen for test event`**.
- Cuando envíes una pregunta, la pantalla animará las líneas y los nodos en vivo.

---

## 🔗 6. Conexión con el Proyecto Chatbot

Para que tu aplicación web (React + FastAPI) use este flujo de n8n automáticamente:

En el archivo [`backend/.env`](file:///home/felipe/Documents/clase/chatbot/backend/.env):
```env
USE_N8N=true
N8N_WEBHOOK_URL=http://localhost:5678/webhook/chat
```

Al abrir tu web en [http://localhost:5173](http://localhost:5173) o [http://localhost:8000](http://localhost:8000), cualquier mensaje escrito en la burbuja de chat flotante viajará directamente a tu n8n, se procesará con tus reglas y se mostrará en tiempo real con efecto streaming.
