const { app } = require('electron')

function enable() {
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe'),
  })
}

function disable() {
  app.setLoginItemSettings({
    openAtLogin: false,
  })
}

function isEnabled() {
  const settings = app.getLoginItemSettings()
  return settings.openAtLogin
}

module.exports = { enable, disable, isEnabled }
