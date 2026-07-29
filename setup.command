#!/bin/bash
# LSLT Setup & Compiler Script for macOS

# Get the directory where this script is located
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
echo "=========================================================="
echo " Lao Sacred Language Translator (LSLT) Setup & Installation"
echo "=========================================================="

# 1. Check for Python 3
if ! command -v python3 &>/dev/null; then
    echo "[Error] Python 3 is not installed. Please install Python 3.10+ first."
    exit 1
fi
echo "[✔] Python 3 detected."

# 2. Check for Node.js
if ! command -v node &>/dev/null; then
    echo "[Error] Node.js is not installed. Please install Node.js (v20+) first."
    exit 1
fi
echo "[✔] Node.js/npm detected."

# 3. Check for Homebrew & pdftotext
if ! command -v pdftotext &>/dev/null; then
    echo "[!] pdftotext not found. Attempting to install Poppler via Homebrew..."
    if command -v brew &>/dev/null; then
        brew install poppler
    else
        echo "[Warning] Homebrew not found. Please install Homebrew and run: brew install poppler"
    fi
else
    echo "[✔] pdftotext/pdftoppm detected."
fi

# 4. Backend Virtual Env & Dependencies
echo -e "\n[1/4] Setting up Python Backend Virtual Environment..."
cd "$PROJECT_ROOT/backend"
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

echo "[✔] Backend packages installed."
echo "[▶] Initializing SQLite database schema and seeding dictionary data..."
PYTHONPATH=. .venv/bin/python test_server.py

# 5. Frontend Build
echo -e "\n[2/4] Installing Frontend Dependencies & Compiling Assets..."
cd "$PROJECT_ROOT/frontend"
npm install
npm run build
echo "[✔] Frontend compiled successfully (Vite build ready)."

# 6. Desktop Wrapper Setup
echo -e "\n[3/4] Installing Desktop Container dependencies..."
cd "$PROJECT_ROOT/desktop"
npm install
echo "[✔] Electron dependencies installed."

# 7. Compile macOS LSLT.app Bundle on Desktop
echo -e "\n[4/4] Compiling native macOS LSLT.app wrapper..."
chmod +x "$PROJECT_ROOT/desktop/run_silent.sh"

APP_PATH="$HOME/Desktop/LSLT.app"
if [ -d "$APP_PATH" ]; then
    rm -rf "$APP_PATH"
fi

osacompile -o "$APP_PATH" -e "do shell script \"$PROJECT_ROOT/desktop/run_silent.sh > /dev/null 2>&1 &\""
if [ -f "$PROJECT_ROOT/desktop/applet.icns" ]; then
    cp "$PROJECT_ROOT/desktop/applet.icns" "$APP_PATH/Contents/Resources/applet.icns"
    cp "$PROJECT_ROOT/desktop/applet.icns" "$APP_PATH/Contents/Resources/AppIcon.icns"
    touch "$APP_PATH"
fi
echo "[✔] Desktop App compiled successfully with Laos Flag icon and placed on your Desktop: LSLT.app"

echo -e "\n=========================================================="
echo " Setup Completed Successfully!"
echo " You can now close this window and double-click 'LSLT' on"
echo " your Desktop to run the application like a normal program."
echo "=========================================================="
read -p "Press Enter to exit..."
