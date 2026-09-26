#!/usr/bin/env bash
set -e

# Directorio base del proyecto
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$BASE_DIR/backend"
FRONTEND_DIR="$BASE_DIR/frontend"

echo "============================================="
echo "  🚀 Iniciando Asistente Chatbot (React + Python)"
echo "============================================="

# 1. Preparar Frontend (React + Vite)
if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"
    if [ ! -d "node_modules" ]; then
        echo "📦 Instalando dependencias del Frontend (npm install)..."
        npm install
    fi
    if [ ! -d "dist" ]; then
        echo "🔨 Construyendo aplicación React (npm run build)..."
        npm run build
    fi
fi

# 2. Preparar Backend (Python FastAPI)
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
    echo "⬇️ Instalando dependencias de Python..."
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
fi

echo "🟢 Servidor Chatbot listo en: http://localhost:8000"
echo "🌐 Para desarrollo del Frontend con HMR puedes usar en otra terminal:"
echo "   cd frontend && npm run dev (puerto 5173 con proxy automático al backend)"
echo "============================================="

./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
