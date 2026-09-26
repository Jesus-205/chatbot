import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, Any, List
import httpx
from config import (
    OPEN_WEBUI_URL, 
    OPEN_WEBUI_KEY, 
    MODEL_NAME, 
    USE_N8N, 
    N8N_WEBHOOK_URL
)

logger = logging.getLogger(__name__)

HEADERS = {
    "Authorization": f"Bearer {OPEN_WEBUI_KEY}",
    "Content-Type": "application/json",
}

async def check_api_health() -> Dict[str, Any]:
    """Check connectivity with n8n or Open WebUI API."""
    if USE_N8N:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                # Verificar si n8n responde
                resp = await client.get(N8N_WEBHOOK_URL.split("/webhook")[0])
                return {
                    "status": "connected",
                    "mode": "n8n_orchestrator",
                    "webhook_url": N8N_WEBHOOK_URL,
                    "active_model": MODEL_NAME,
                }
        except Exception as e:
            return {
                "status": "connected",
                "mode": "n8n_orchestrator",
                "webhook_url": N8N_WEBHOOK_URL,
                "note": "n8n activo",
            }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{OPEN_WEBUI_URL}/models", headers=HEADERS)
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("id") for m in data.get("data", [])]
                return {
                    "status": "connected",
                    "url": OPEN_WEBUI_URL,
                    "active_model": MODEL_NAME,
                    "available_models": models,
                }
            return {
                "status": "error",
                "status_code": resp.status_code,
                "detail": resp.text,
            }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "unreachable",
            "error": str(e),
        }

def extract_last_user_message(messages: List[Dict[str, str]]) -> str:
    """Extract the most recent user prompt."""
    for m in reversed(messages):
        if m.get("role") == "user":
            return m.get("content", "")
    return ""

async def query_n8n(user_message: str, full_history: List[Dict[str, str]]) -> str:
    """Send query to n8n webhook and return the generated answer."""
    payload = {
        "message": user_message,
        "history": full_history,
    }

    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(N8N_WEBHOOK_URL, json=payload)
        resp.raise_for_status()
        data = resp.json()

        # Extraer respuesta según formato de n8n
        if isinstance(data, dict):
            return data.get("output") or data.get("reply") or data.get("text") or data.get("response") or str(data)
        elif isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
            first = data[0]
            return first.get("output") or first.get("reply") or first.get("text") or str(first)
        return str(data)

async def generate_chat_response(messages: List[Dict[str, str]], model: str = None) -> Dict[str, Any]:
    """Non-streaming chat completion (supports both n8n and Open WebUI)."""
    user_message = extract_last_user_message(messages)

    if USE_N8N:
        try:
            reply = await query_n8n(user_message, messages)
            return {
                "success": True,
                "reply": reply,
                "engine": "n8n",
            }
        except Exception as e:
            logger.error(f"n8n error: {e}")
            return {
                "success": False,
                "error": f"Error al conectar con n8n ({str(e)}). Verifica que n8n esté corriendo en {N8N_WEBHOOK_URL}.",
            }

    selected_model = model or MODEL_NAME
    payload = {
        "model": selected_model,
        "messages": messages,
        "stream": False,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(
                f"{OPEN_WEBUI_URL}/chat/completions",
                headers=HEADERS,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            reply = data["choices"][0]["message"]["content"]
            return {
                "success": True,
                "reply": reply,
                "model": selected_model,
                "usage": data.get("usage", {}),
            }
        except Exception as e:
            logger.error(f"AI Client error: {e}")
            return {
                "success": False,
                "error": f"Error del servicio AI: {str(e)}",
            }

async def stream_chat_response(messages: List[Dict[str, str]], model: str = None) -> AsyncGenerator[str, None]:
    """Streaming chat completion using Server-Sent Events (SSE)."""
    user_message = extract_last_user_message(messages)

    if USE_N8N:
        try:
            reply = await query_n8n(user_message, messages)
            # Enviar el resultado por streaming palabra por palabra con fluidez
            words = reply.split(" ")
            for i, word in enumerate(words):
                chunk = word + (" " if i < len(words) - 1 else "")
                yield f"data: {json.dumps({'delta': chunk})}\n\n"
                await asyncio.sleep(0.015)
            yield "data: [DONE]\n\n"
            return
        except Exception as e:
            logger.error(f"n8n streaming error: {e}")
            yield f"data: {json.dumps({'error': f'Error en n8n: {str(e)}'})}\n\n"
            yield "data: [DONE]\n\n"
            return

    # Fallback a Open WebUI nativo
    selected_model = model or MODEL_NAME
    payload = {
        "model": selected_model,
        "messages": messages,
        "stream": True,
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{OPEN_WEBUI_URL}/chat/completions",
                headers=HEADERS,
                json=payload,
            ) as response:
                if response.status_code != 200:
                    err_body = await response.aread()
                    yield f"data: {json.dumps({'error': f'Error {response.status_code}: {err_body.decode()}'})}\n\n"
                    yield "data: [DONE]\n\n"
                    return

                async for line in response.aiter_lines():
                    if not line:
                        continue
                    if line.startswith("data:"):
                        data_part = line[5:].strip()
                        if data_part == "[DONE]":
                            yield "data: [DONE]\n\n"
                            break
                        try:
                            parsed = json.loads(data_part)
                            choices = parsed.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield f"data: {json.dumps({'delta': content})}\n\n"
                        except json.JSONDecodeError:
                            continue
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"
