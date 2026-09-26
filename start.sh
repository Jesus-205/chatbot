#!/usr/bin/env bash
set -e

# Directorio base del proyecto
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$BASE_DIR/backend"

echo "============================================="
echo "  🚀 Iniciando Asistente Chatbot (Python)"
echo "============================================="

cd "$BACKEND_DIR"

# Asegurar archivo .env
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "📋 Creando .env a partir de .env.example..."
    cp .env.example .env
fi

# Crear entorno virtual si no existe
if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual Python..."
    python3 -m venv venv
    echo "⬇️ Instalando dependencias..."
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
fi

echo "🟢 Servidor iniciado en: http://localhost:8000"
echo "🌐 Abre tu navegador en: http://localhost:8000"
echo "Para detener el servidor, presiona CTRL+C"
echo "============================================="

./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
