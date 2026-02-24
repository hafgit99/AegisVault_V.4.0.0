const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');

let vaultCache = [];

// A mini HTTP server to serve the Chrome/Firefox Extension safely
const syncServer = http.createServer((req, res) => {
  // CORS so the extension can fetch from it
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  if (req.url === '/api/vault' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(vaultCache));
    return;
  }
  
  res.writeHead(404);
  res.end();
});

// Start the local sync server
syncServer.listen(23456, '127.0.0.1', () => {
  console.log('Aegis Local Sync Server running on port 23456');
});

// Sync event from Dashboard's active vault
ipcMain.on('sync-vault', (event, passwords) => {
  vaultCache = passwords;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the index.html from the dist folder
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  
  // Disable the default menu
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
