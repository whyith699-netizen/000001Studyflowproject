const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { startBackendApi, startCloudflared } = require('./processManager');

let mainWindow;
let apiProcess;
let tunnelProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        },
        title: 'StudyFlow Server'
    });

    // Start Backend API if not already running
    if (!apiProcess) {
        const apiDir = path.join(__dirname, '..', 'Backend', 'studyflow-api');
        apiProcess = startBackendApi(
            apiDir,
            (log) => {
                console.log(log);
                if (mainWindow) mainWindow.webContents.send('status-update', log);
            },
            (err) => {
                console.error(err);
                if (mainWindow) mainWindow.webContents.send('status-update', err);
            }
        );
    }

    // Start Cloudflared tunnel simulation
    if (!tunnelProcess) {
        tunnelProcess = startCloudflared(
            (log) => {
                console.log(log);
                if (mainWindow) mainWindow.webContents.send('status-update', log);
            },
            (err) => {
                console.error(err);
                if (mainWindow) mainWindow.webContents.send('status-update', err);
            }
        );
    }

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
    if (tunnelProcess) tunnelProcess.kill();
});
