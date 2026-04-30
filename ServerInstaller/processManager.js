const { spawn } = require('child_process');
const path = require('path');

function startBackendApi(apiDir, onLog, onError) {
    const apiPath = path.join(apiDir, 'src', 'index.js');
    
    const apiProcess = spawn('node', [apiPath], { cwd: apiDir });

    apiProcess.on('error', (err) => {
        onError(`[API SPAWN ERROR] ${err.message}`);
    });

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

function startCloudflared(onLog, onError) {
    // Simulasi Cloudflare tunnel
    onLog("[TUNNEL] Starting cloudflared tunnel...");
    
    setTimeout(() => {
        const fakeUrl = `https://api-${Math.floor(Math.random()*10000)}-studyflow.trycloudflare.com`;
        onLog(`[TUNNEL] Tunnel is active!`);
        onLog(`[TUNNEL] URL: ${fakeUrl}`);
    }, 2000);

    return { kill: () => onLog("[TUNNEL] Tunnel stopped.") };
}

module.exports = { startBackendApi, startCloudflared };
