import os
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from config import MODEL_NAME, BACKEND_HOST, BACKEND_PORT
from services.ai_client import (
    check_api_health,
    generate_chat_response,
    stream_chat_response,
)

app = FastAPI(
    title="Chatbot API",
    description="Backend API para el asistente conversacional con Open WebUI",
    version="1.0.0",
)

# Enable CORS for any frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message text content")

class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., description="Full chat history")
    model: Optional[str] = Field(default=None, description="Optional override of model name")

@app.get("/api/health")
async def health_check():
    """Returns the backend and Open WebUI API connection status."""
    ai_status = await check_api_health()
    return {
        "service": "Chatbot Backend",
        "status": "online",
        "configured_model": MODEL_NAME,
        "ai_connection": ai_status,
    }

@app.get("/api/models")
async def get_models():
    """Fetches available models from Open WebUI."""
    res = await check_api_health()
    return res

@app.post("/api/chat")
async def chat_endpoint(payload: ChatRequest):
    """Standard non-streaming chat completion."""
    if not payload.messages:
        raise HTTPException(status_code=400, detail="Messages cannot be empty")
    
    dict_messages = [m.model_dump() for m in payload.messages]
    result = await generate_chat_response(dict_messages, model=payload.model)
    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "AI error"))
    return result

@app.post("/api/chat/stream")
async def chat_stream_endpoint(payload: ChatRequest):
    """Streaming chat completion using Server-Sent Events (SSE)."""
    if not payload.messages:
        raise HTTPException(status_code=400, detail="Messages cannot be empty")
    
    dict_messages = [m.model_dump() for m in payload.messages]
    return StreamingResponse(
        stream_chat_response(dict_messages, model=payload.model),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

# Frontend static serving setup (prioritizes React production build 'dist')
frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
dist_dir = frontend_dir / "dist"
dist_assets = dist_dir / "assets"

if dist_assets.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_assets)), name="dist_assets")

@app.get("/")
async def serve_index():
    dist_index = dist_dir / "index.html"
    if dist_index.exists():
        return FileResponse(dist_index)
    index_path = frontend_dir / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"message": "index.html not found"}

if __name__ == "__main__":
    import uvicorn
    print(f"🚀 Iniciando servidor Chatbot en http://{BACKEND_HOST}:{BACKEND_PORT}")
    uvicorn.run("main:app", host=BACKEND_HOST, port=BACKEND_PORT, reload=True)
