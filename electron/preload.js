const { contextBridge } = require('electron');

// Expón, si quieres, alguna API segura al renderer
contextBridge.exposeInMainWorld('appInfo', {
  version: '1.0.0'
});
