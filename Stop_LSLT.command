#!/bin/bash
echo "=========================================================="
echo " Stopping Lao Sacred Language Translator (LSLT) Services..."
echo "=========================================================="

# Stop backend
BACKEND_PID=$(lsof -t -i :8000)
if [ -n "$BACKEND_PID" ]; then
    kill $BACKEND_PID
    echo "[✔] Stopped Backend server (PID $BACKEND_PID)."
else
    echo "[ ] Backend server was not running."
fi

# Stop frontend
FRONTEND_PID=$(lsof -t -i :5173)
if [ -n "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID
    echo "[✔] Stopped Frontend server (PID $FRONTEND_PID)."
else
    echo "[ ] Frontend server was not running."
fi

echo "=========================================================="
echo " LSLT services successfully terminated."
echo "=========================================================="
sleep 2
