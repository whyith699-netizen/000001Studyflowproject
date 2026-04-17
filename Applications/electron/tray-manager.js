const { Tray, Menu, nativeImage, app } = require('electron')
const path = require('path')

let tray = null
let mainWindow = null

function createTray(win) {
  mainWindow = win

  const iconPath = path.join(__dirname, '..', 'build', 'tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath)

  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('StudyFlow')

  updateContextMenu('No timer')

  tray.on('double-click', () => {
    showWindow()
  })

  return tray
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.show()
  mainWindow.focus()
}

function updateContextMenu(timerStatus) {
  if (!tray) return

  const contextMenu = Menu.buildFromTemplate([
    { label: timerStatus, enabled: false },
    { type: 'separator' },
    {
      label: 'Start / Pause Timer',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('timer:toggle')
        }
      },
    },
    {
      label: 'Reset Timer',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('timer:reset')
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => showWindow(),
    },
    { type: 'separator' },
    {
      label: 'Quit StudyFlow',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.destroy()
        }
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
}

function updateTimerTooltip(statusText) {
  if (tray) {
    tray.setToolTip(`StudyFlow — ${statusText}`)
  }
}

function destroy() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

module.exports = { createTray, updateContextMenu, updateTimerTooltip, destroy }
