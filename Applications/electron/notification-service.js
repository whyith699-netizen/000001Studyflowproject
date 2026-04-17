const { Notification } = require('electron')

let mainWindow = null

function init(win) {
  mainWindow = win
}

function sendNotification(title, body) {
  if (!Notification.isSupported()) return

  const notification = new Notification({ title, body })

  notification.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  notification.show()
}

module.exports = { init, sendNotification }
