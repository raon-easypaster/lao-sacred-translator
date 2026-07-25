#!/bin/bash
# Close this terminal tab when the script finishes
echo "=========================================================="
echo " Starting Lao Sacred Language Translator (LSLT) Services..."
echo "=========================================================="

PROJECT_ROOT="/Users/galeb76/.gemini/antigravity/scratch/lao-sacred-translator"

# Check if Backend (FastAPI) is running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "[✔] Backend is already running on port 8000."
else
    echo "[▶] Starting Backend (FastAPI)..."
    cd "$PROJECT_ROOT/backend"
    source .venv/bin/activate
    nohup uvicorn main:app --port 8000 > /tmp/lslt_backend.log 2>&1 &
    echo "    Backend started in the background."
fi

# Check if Frontend (Vite) is running
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    echo "[✔] Frontend is already running on port 5173."
else
    echo "[▶] Starting Frontend (Vite)..."
    cd "$PROJECT_ROOT/frontend"
    nohup npm run dev > /tmp/lslt_frontend.log 2>&1 &
    echo "    Frontend started in the background."
fi

# Wait a couple of seconds for servers to initialize
echo "[▶] Waiting for services to initialize..."
sleep 3

# Open default browser
echo "[▶] Opening translation workspace in default browser..."
open "http://localhost:5173"

echo "=========================================================="
echo " LSLT Active! You can close this Terminal window now."
echo "=========================================================="
