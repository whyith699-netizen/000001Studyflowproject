const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { startBackendApi } = require('./processManager');

let mainWindow;
let apiProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        },
        title: 'StudyFlow Server'
    });

    // Start Backend API
    apiProcess = startBackendApi(
        (log) => {
            console.log(log);
            if (mainWindow) mainWindow.webContents.send('status-update', log);
        },
        (err) => {
            console.error(err);
            if (mainWindow) mainWindow.webContents.send('status-update', err);
        }
    );

    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    if (apiProcess) apiProcess.kill();
});
