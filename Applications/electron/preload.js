const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: () => true,

  onTimerAction: (callback) => {
    ipcRenderer.on('timer:toggle', () => callback('toggle'))
    ipcRenderer.on('timer:reset', () => callback('reset'))
  },

  sendTimerState: (state) => {
    ipcRenderer.send('timer:update-state', state)
  },

  autolaunch: {
    enable: () => ipcRenderer.invoke('autolaunch:enable'),
    disable: () => ipcRenderer.invoke('autolaunch:disable'),
    isEnabled: () => ipcRenderer.invoke('autolaunch:isEnabled'),
  },

  onShowWindow: (callback) => {
    ipcRenderer.on('show-window', () => callback())
  },
})
