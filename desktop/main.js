const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let pyProc = null;
let mainWindow = null;

function startBackend() {
  const backendDir = path.join(__dirname, '../backend');
  const pythonBin = path.join(backendDir, '.venv/bin/python');
  
  console.log('Starting Python backend from:', backendDir);
  pyProc = spawn(pythonBin, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000'], {
    cwd: backendDir,
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });
  
  pyProc.stdout.on('data', (data) => {
    console.log(`[Python Stdout]: ${data}`);
  });
  
  pyProc.stderr.on('data', (data) => {
    console.error(`[Python Stderr]: ${data}`);
  });

  pyProc.on('close', (code) => {
    console.log(`Python backend exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    title: "Lao Sacred Language Translator (LSLT)",
    backgroundColor: '#0b0f19', // Matches mid-navy layout
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the pre-built React build
  const distPath = path.join(__dirname, '../frontend/dist/index.html');
  mainWindow.loadFile(distPath);
  
  // Disable default browser menu bar for a clean desktop feel
  mainWindow.setMenuBarVisibility(false);
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  startBackend();
  // Wait a short moment for uvicorn to boot up before drawing the window
  setTimeout(createWindow, 2000);
});

// For our server wrapper, always quit on window close to release port 8000
app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  if (pyProc) {
    console.log('Terminating Python backend process...');
    pyProc.kill('SIGTERM');
    pyProc = null;
  }
});
