import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from the current directory or backend directory
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

OPEN_WEBUI_URL = os.getenv("OPEN_WEBUI_URL", "https://zuri.zvortex.cloud/api").rstrip("/")
OPEN_WEBUI_KEY = os.getenv("OPEN_WEBUI_KEY", "sk-e0ebaaf070f7407b9293a2a5426ee613")
MODEL_NAME = os.getenv("MODEL_NAME", "zuri:latest")
BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))

USE_N8N = os.getenv("USE_N8N", "true").lower() in ("true", "1", "yes")
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "http://localhost:5678/webhook/chat")
