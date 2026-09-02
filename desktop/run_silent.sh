#!/bin/bash
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Terminate dangling backend instance on port 8000 to avoid startup locks
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    kill -9 $(lsof -t -i :8000) 2>/dev/null
fi

# Load macOS environment path for Node.js and Homebrew
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Navigate to desktop app directory and launch Electron silently
cd "$PROJECT_ROOT/desktop"
npm start
