const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    onStatusUpdate: (callback) => ipcRenderer.on('status-update', (_event, value) => callback(value))
});
