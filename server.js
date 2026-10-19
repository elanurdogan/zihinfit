// Bağımlılıksız yerel geliştirme sunucusu. ES modules file:// üzerinden çalışmadığı için gerekli.
// Kullanım: node server.js [--port 5173] [--open]

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const args = process.argv.slice(2);
const portArg = args.indexOf('--port');
const PORT = Number(portArg >= 0 ? args[portArg + 1] : process.env.PORT) || 5173;
const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.md': 'text/plain; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
};

const server = createServer(async (req, res) => {
    try {
        const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        let filePath = normalize(join(ROOT, urlPath));
        if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
            res.writeHead(403).end('Yasak');
            return;
        }
        if ((await stat(filePath).catch(() => null))?.isDirectory()) filePath = join(filePath, 'index.html');
        const body = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(body);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bulunamadı');
    }
});

server.listen(PORT, '127.0.0.1', () => {
    const url = `http://localhost:${PORT}/`;
    console.log(`Lumo çalışıyor: ${url}  (durdurmak için Ctrl+C)`);
    if (args.includes('--open')) {
        const opener = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
        exec(opener);
    }
});
