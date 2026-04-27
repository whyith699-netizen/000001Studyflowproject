const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { createWindowState, saveWindowState } = require('./window-state')
const { createTray, updateContextMenu, updateTimerTooltip, destroy: destroyTray } = require('./tray-manager')
const { init: initNotifications } = require('./notification-service')
const { register: registerHotkeys, unregister: unregisterHotkeys } = require('./hotkeys')
const autoLaunch = require('./auto-launch')

let mainWindow = null
let isQuitting = false

function createWindow() {
  const windowState = createWindowState()

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    title: 'StudyFlow',
  })

  if (windowState.isMaximized) {
    mainWindow.maximize()
  }

  // Load the app
  const isDev = !app.isPackaged && process.env.ELECTRON_BUILD !== 'true'
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Intercept close - hide to tray instead
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      saveWindowState(mainWindow)
      mainWindow.hide()
    }
  })

  mainWindow.on('resize', () => saveWindowState(mainWindow))
  mainWindow.on('move', () => saveWindowState(mainWindow))

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Initialize services
  initNotifications(mainWindow)
  createTray(mainWindow)
  registerHotkeys(mainWindow)

  return mainWindow
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  })
})

// Keep running in tray - do not quit when windows close
app.on('window-all-closed', (e) => {
  e.preventDefault()
})

// Cleanup on quit
app.on('before-quit', () => {
  isQuitting = true
  unregisterHotkeys()
  destroyTray()
  if (mainWindow && !mainWindow.isDestroyed()) {
    saveWindowState(mainWindow)
  }
})

// IPC: Timer state from renderer (for tray display)
ipcMain.on('timer:update-state', (_event, state) => {
  if (!state) return

  let statusText = 'No timer'
  if (state.isRunning) {
    const h = String(state.hours || 0).padStart(2, '0')
    const m = String(state.minutes || 0).padStart(2, '0')
    const s = String(state.seconds || 0).padStart(2, '0')
    const modeLabel = state.timerMode === 'pomodoro' ? 'Focus' : 'Break'
    statusText = `${modeLabel}: ${h}:${m}:${s} remaining`
  } else if (state.timeLeft > 0) {
    statusText = 'Paused'
  }

  updateContextMenu(statusText)
  updateTimerTooltip(statusText)
})

// IPC: Auto-launch controls
ipcMain.handle('autolaunch:enable', () => autoLaunch.enable())
ipcMain.handle('autolaunch:disable', () => autoLaunch.disable())
ipcMain.handle('autolaunch:isEnabled', () => autoLaunch.isEnabled())
