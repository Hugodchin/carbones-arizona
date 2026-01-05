const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';
const API_PORT = process.env.API_PORT || 3300;

function startApi() {
  // Inicia la API (Node/Express) empaquetada en server/index.js
  // Nota: usa la misma instancia de Node que Electron.
  require(path.join(__dirname, '..', 'server', 'index.js'));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Modo dev: apunta a la API que sirve estáticos; modo prod: igual
  win.loadURL(`http://localhost:${API_PORT}`);
}

app.whenReady().then(() => {
  startApi();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
