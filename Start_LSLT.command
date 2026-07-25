#!/bin/bash
# Close this terminal tab when the script finishes
echo "=========================================================="
echo " Starting Lao Sacred Language Translator (LSLT) Desktop App..."
echo "=========================================================="

PROJECT_ROOT="/Users/galeb76/.gemini/antigravity/scratch/lao-sacred-translator"

# If FastAPI is running from a previous crash, terminate it first to avoid conflicts
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "[!] Port 8000 is busy. Terminating dangling backend instance..."
    kill -9 $(lsof -t -i :8000) 2>/dev/null
    sleep 1
fi

echo "[▶] Booting Electron standalone desktop container..."
cd "$PROJECT_ROOT/desktop"
npm start

echo "=========================================================="
echo " LSLT Desktop session closed cleanly."
echo "=========================================================="
