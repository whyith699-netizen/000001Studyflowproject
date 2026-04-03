import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist');
const indexFile = resolve(distDir, 'index.html');
const fallbackFile = resolve(distDir, '404.html');

if (!existsSync(indexFile)) {
  throw new Error(`Cannot create GH Pages fallback because ${indexFile} does not exist.`);
}

// GitHub Pages serves 404.html for unknown routes, so mirroring index.html keeps SPA routes working.
copyFileSync(indexFile, fallbackFile);
