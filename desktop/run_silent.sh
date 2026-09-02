#!/bin/bash
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Terminate dangling backend instance on port 8000 to avoid startup locks
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    kill -9 $(lsof -t -i :8000) 2>/dev/null
fi

# Expand PATH for Homebrew, nvm, local node installs
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/node/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Start Python backend
PYTHON="$PROJECT_ROOT/backend/.venv/bin/python"
cd "$PROJECT_ROOT/backend"
"$PYTHON" -m uvicorn main:app --host 127.0.0.1 --port 8000 &

# Launch Electron directly (no npm dependency)
ELECTRON="$PROJECT_ROOT/desktop/node_modules/.bin/electron"
cd "$PROJECT_ROOT/desktop"
"$ELECTRON" .
