const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');

const {
  handleAdbBridge,
  sendFastTap,
  sendFastKey,
  sendFastSwipe,
  sendFastText,
} = require('./adbBridge.cjs');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function getDistDir() {
  const possiblePaths = [
    path.join(__dirname, '../dist'),
    path.join(__dirname, 'dist'),
    path.join(process.resourcesPath || '', 'app/dist'),
    path.join(process.resourcesPath || '', 'dist'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
      return p;
    }
  }
  return path.join(__dirname, '../dist');
}

function createDesktopServer() {
  const distDir = getDistDir();
  console.log('[Desktop Server] Serving static files from:', distDir);

  const server = http.createServer((req, res) => {
    // 1. Route API calls to ADB bridge
    const handled = handleAdbBridge(req, res);
    if (handled) return;

    // 2. Serve static files from dist
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let reqPath = decodeURIComponent(parsedUrl.pathname);
    if (reqPath === '/' || !reqPath) reqPath = '/index.html';

    let filePath = path.join(distDir, reqPath);

    // Prevent directory traversal
    if (!filePath.startsWith(distDir)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
        res.setHeader('Cache-Control', ext === '.html' ? 'no-cache' : 'public, max-age=31536000');
        fs.createReadStream(filePath).pipe(res);
      } else {
        // SPA Fallback to index.html
        const indexPath = path.join(distDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          fs.createReadStream(indexPath).pipe(res);
        } else {
          res.statusCode = 404;
          res.end('Not Found');
        }
      }
    });
  });

  // 3. Attach WebSocket Screencap Streamer
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/ws/scrcpy' || url.pathname === '/api/scrcpy/stream') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  let isCapturing = false;
  let activeTimer = null;
  let currentProc = null;

  const scheduleNextFrame = (delayMs = 45) => {
    if (activeTimer) clearTimeout(activeTimer);
    if (wss.clients.size === 0) return;
    activeTimer = setTimeout(broadcastFrame, delayMs);
  };

  const broadcastFrame = () => {
    if (wss.clients.size === 0 || isCapturing) return;
    isCapturing = true;

    const proc = spawn('adb', ['exec-out', 'screencap', '-p'], { windowsHide: true });
    currentProc = proc;
    const chunks = [];

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      isCapturing = false;
      currentProc = null;
      scheduleNextFrame(45);
    };

    const watchdog = setTimeout(() => {
      try { proc.kill(); } catch {}
      finish();
    }, 1200);

    proc.stdout.on('data', (c) => chunks.push(c));
    proc.stdout.on('end', () => {
      clearTimeout(watchdog);
      if (chunks.length > 0) {
        const buf = Buffer.concat(chunks);
        if (buf.length > 100 && buf[0] === 0x89 && buf[1] === 0x50) {
          for (const client of wss.clients) {
            if (client.readyState === 1 /* OPEN */) {
              client.send(buf);
            }
          }
        }
      }
      finish();
    });
    proc.on('error', () => {
      clearTimeout(watchdog);
      finish();
    });
    proc.on('close', () => {
      clearTimeout(watchdog);
      finish();
    });
  };

  wss.on('connection', (ws) => {
    console.log('[ADB WS Bridge] Client connected to live mirror stream');
    scheduleNextFrame(10);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'tap') {
          sendFastTap(msg.x, msg.y);
          scheduleNextFrame(15);
        } else if (msg.type === 'swipe') {
          sendFastSwipe(msg.x1, msg.y1, msg.x2, msg.y2, msg.duration || 200);
          scheduleNextFrame(40);
        } else if (msg.type === 'key') {
          sendFastKey(msg.key);
          scheduleNextFrame(15);
        } else if (msg.type === 'text') {
          sendFastText(msg.text);
          scheduleNextFrame(15);
        } else if (msg.type === 'refresh') {
          scheduleNextFrame(5);
        }
      } catch (err) {
        console.warn('[ADB WS Bridge] Message parse error:', err);
      }
    });

    ws.on('close', () => {
      if (wss.clients.size === 0) {
        if (activeTimer) {
          clearTimeout(activeTimer);
          activeTimer = null;
        }
        if (currentProc) {
          try { currentProc.kill(); } catch {}
          currentProc = null;
        }
        isCapturing = false;
      }
    });
  });

  return { server, wss };
}

function startDesktopServer(desiredPort = 3000) {
  return new Promise((resolve, reject) => {
    const { server, wss } = createDesktopServer();

    const tryListen = (portToTry) => {
      server.listen(portToTry, '127.0.0.1', () => {
        const port = server.address().port;
        console.log(`[Desktop Server] Listening on http://127.0.0.1:${port}`);
        resolve({ server, wss, port });
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[Desktop Server] Port ${portToTry} in use, trying next port...`);
          tryListen(portToTry + 1);
        } else {
          reject(err);
        }
      });
    };

    tryListen(desiredPort);
  });
}

module.exports = {
  createDesktopServer,
  startDesktopServer,
};
