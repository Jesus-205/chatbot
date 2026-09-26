import json
import logging
from typing import AsyncGenerator, Dict, Any, List
import httpx
from config import OPEN_WEBUI_URL, OPEN_WEBUI_KEY, MODEL_NAME

logger = logging.getLogger(__name__)

HEADERS = {
    "Authorization": f"Bearer {OPEN_WEBUI_KEY}",
    "Content-Type": "application/json",
}

async def check_api_health() -> Dict[str, Any]:
    """Check connectivity with Open WebUI API and fetch available models."""
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

async def generate_chat_response(messages: List[Dict[str, str]], model: str = None) -> Dict[str, Any]:
    """Non-streaming chat completion."""
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
        except httpx.HTTPStatusError as e:
            logger.error(f"Open WebUI HTTP error {e.response.status_code}: {e.response.text}")
            return {
                "success": False,
                "error": f"Error del servidor AI ({e.response.status_code}): {e.response.text}",
            }
        except Exception as e:
            logger.error(f"AI Client error: {e}")
            return {
                "success": False,
                "error": f"No se pudo conectar con el servicio AI: {str(e)}",
            }

async def stream_chat_response(messages: List[Dict[str, str]], model: str = None) -> AsyncGenerator[str, None]:
    """Streaming chat completion using Server-Sent Events (SSE)."""
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
