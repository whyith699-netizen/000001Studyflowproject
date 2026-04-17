const Store = require('electron-store')

const store = new Store({ name: 'window-state' })

const DEFAULT_BOUNDS = {
  width: 1280,
  height: 800,
}

function createWindowState() {
  const saved = store.get('bounds', {})
  return {
    width: saved.width || DEFAULT_BOUNDS.width,
    height: saved.height || DEFAULT_BOUNDS.height,
    x: saved.x,
    y: saved.y,
    isMaximized: saved.isMaximized || false,
  }
}

function saveWindowState(win) {
  if (win.isDestroyed()) return
  try {
    const isMaximized = win.isMaximized()
    const bounds = isMaximized ? store.get('bounds', {}) : win.getBounds()
    store.set('bounds', {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
    })
  } catch {
    // Window may be closing or bounds unavailable
  }
}

module.exports = { createWindowState, saveWindowState }
