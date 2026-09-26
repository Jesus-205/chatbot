#!/usr/bin/env bash
set -e

# Directorios del proyecto
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$BASE_DIR/backend"
FRONTEND_DIR="$BASE_DIR/frontend"

echo "=========================================================="
echo "  🚀 Levantando Chatbot Completo (Frontend + Backend)"
echo "=========================================================="

# 1. Asegurar archivos .env en Backend y Frontend
if [ ! -f "$BACKEND_DIR/.env" ] && [ -f "$BACKEND_DIR/.env.example" ]; then
    echo "📋 Creando backend/.env a partir de .env.example..."
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
fi

if [ ! -f "$FRONTEND_DIR/.env" ] && [ -f "$FRONTEND_DIR/.env.example" ]; then
    echo "📋 Creando frontend/.env a partir de .env.example..."
    cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
fi

# 2. Preparar Entorno Virtual de Python y Dependencias
echo "⚙️  Verificando Backend Python..."
cd "$BACKEND_DIR"
if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual Python (venv)..."
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
fi

# 3. Preparar Dependencias de Node / React
echo "⚙️  Verificando Frontend React..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias de React (npm install)..."
    npm install
fi

# Compilar build estático para FastAPI
if [ ! -d "dist" ]; then
    echo "🔨 Compilando frontend para FastAPI..."
    npm run build
fi

# Manejo de cierre limpio con CTRL+C para ambos procesos
cleanup() {
    echo ""
    echo "🛑 Deteniendo servidores (Frontend y Backend)..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID 2>/dev/null || true
    wait $FRONTEND_PID 2>/dev/null || true
    echo "✅ Servidores detenidos."
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 4. Iniciar Backend en segundo plano
echo "🚀 Iniciando Backend FastAPI..."
cd "$BACKEND_DIR"
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# 5. Iniciar Frontend Vite
echo "🚀 Iniciando Frontend React (Vite)..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================================="
echo "  ✅ AMBOS SERVICIOS ESTÁN CORRIENDO:"
echo "  🌐 Frontend React (Vite): http://localhost:5173"
echo "  ⚙️  Backend FastAPI:       http://localhost:8000"
echo "  📖 Documentación Swagger: http://localhost:8000/docs"
echo "=========================================================="
echo "Presiona CTRL+C en esta terminal para detener ambos servicios."
echo ""

# Esperar a que terminen los procesos
wait
