import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { exec, spawn } from 'child_process';

import { handleAdbBridge, sendFastTap, sendFastKey, sendFastSwipe, sendFastText } from './src/server/adbBridge';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

function adbBridgePlugin(): Plugin {
  return {
    name: 'adb-bridge-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const handled = handleAdbBridge(req, res);
        if (!handled) {
          next();
        }
      });

      if (server.httpServer) {
        try {
          const { WebSocketServer } = require('ws');
          const wss = new WebSocketServer({ noServer: true });

          server.httpServer.on('upgrade', (req, socket, head) => {
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            if (url.pathname === '/ws/scrcpy' || url.pathname === '/api/scrcpy/stream') {
              wss.handleUpgrade(req, socket, head, (ws: any) => {
                wss.emit('connection', ws, req);
              });
            }
          });

          let isCapturing = false;
          let activeTimer: NodeJS.Timeout | null = null;
          let currentProc: any = null;

          const scheduleNextFrame = (delayMs = 45) => {
            if (activeTimer) clearTimeout(activeTimer);
            if (wss.clients.size === 0) return;
            activeTimer = setTimeout(broadcastFrame, delayMs);
          };

          const broadcastFrame = () => {
            if (wss.clients.size === 0 || isCapturing) return;
            isCapturing = true;

            const proc = spawn('adb', ['exec-out', 'screencap', '-p']);
            currentProc = proc;
            const chunks: Buffer[] = [];

            let finished = false;
            const finish = () => {
              if (finished) return;
              finished = true;
              isCapturing = false;
              currentProc = null;
              // Adaptive pacing: 45ms pause between frames leaves CPU headroom on phone
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

          wss.on('connection', (ws: any) => {
            console.log('[ADB WS Bridge] Client connected to live mirror stream (Instant Input & 60 FPS optimized)');
            scheduleNextFrame(10);

            // Instant Sub-Millisecond Input Routing over WebSocket
            ws.on('message', (raw: any) => {
              try {
                const msg = JSON.parse(raw.toString());
                if (msg.type === 'tap') {
                  sendFastTap(msg.x, msg.y);
                  // Expedite frame capture immediately after tap
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
        } catch (e) {
          console.warn('[ADB WS Bridge] WebSocket setup error:', e);
        }
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), adbBridgePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/flutter_reference/**', '**/flutter_reference/build/**', '**/dist/**', '**/release/**', '**/electron/**'],
      },
    },
  };
});
