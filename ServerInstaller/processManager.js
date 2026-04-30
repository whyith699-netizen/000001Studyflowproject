const { spawn } = require('child_process');
const path = require('path');

function startBackendApi(onLog, onError) {
    // Asumsi Backend/studyflow-api sejajar dengan folder ServerInstaller
    const apiPath = path.join(__dirname, '..', 'Backend', 'studyflow-api', 'src', 'index.js');
    
    const apiProcess = spawn('node', [apiPath]);

    apiProcess.stdout.on('data', (data) => {
        onLog(`[API] ${data.toString()}`);
    });

    apiProcess.stderr.on('data', (data) => {
        onError(`[API ERROR] ${data.toString()}`);
    });

    apiProcess.on('close', (code) => {
        onLog(`[API] Process exited with code ${code}`);
    });

    return apiProcess;
}

module.exports = { startBackendApi };
