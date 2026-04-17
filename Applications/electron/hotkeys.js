const { globalShortcut } = require('electron')

let mainWindow = null

function register(win) {
  mainWindow = win

  // Toggle timer
  const toggleKey = process.platform === 'darwin' ? 'Cmd+Shift+T' : 'Ctrl+Shift+T'
  globalShortcut.register(toggleKey, () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('timer:toggle')
    }
  })

  // Reset timer
  const resetKey = process.platform === 'darwin' ? 'Cmd+Shift+R' : 'Ctrl+Shift+R'
  globalShortcut.register(resetKey, () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('timer:reset')
    }
  })

  // Show/hide window
  const showKey = process.platform === 'darwin' ? 'Cmd+Shift+S' : 'Ctrl+Shift+S'
  globalShortcut.register(showKey, () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function unregister() {
  globalShortcut.unregisterAll()
}

module.exports = { register, unregister }
