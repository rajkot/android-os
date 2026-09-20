import React, { useEffect, useRef, useImperativeHandle, forwardRef, memo } from 'react';
import { Zap, RefreshCw, Power, Keyboard, AlertTriangle, Smartphone } from 'lucide-react';

export interface ScrcpyStreamCanvasHandle {
  requestImmediateFrame: () => void;
  wakeScreen: () => Promise<void>;
  swipeUp: () => Promise<void>;
}

interface ScrcpyStreamCanvasProps {
  isScreenOn?: boolean;
  scaleMode?: 'contain' | 'cover' | 'stretch';
  onScaleModeChange?: (mode: 'contain' | 'cover' | 'stretch') => void;
  onTap?: (xPercent: number, yPercent: number) => void;
  onSwipe?: (startX: number, startY: number, endX: number, endY: number, duration: number) => void;
  onWake?: () => void;
  onPasscodeUnlock?: (passcode: string) => void;
  onLaunchScrcpy?: () => void;
  onAutoRotate?: (orientation: 'portrait' | 'landscape', width: number, height: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * ScrcpyStreamCanvas
 * High-performance, zero-React-state HTML5 double-buffered Canvas stream renderer.
 * 
 * Performance Guarantees:
 * 1. Absolute Zero React State on frame reception: No useState inside onmessage or render loops.
 * 2. Double-buffered requestAnimationFrame: Decodes via createImageBitmap offscreen and draws synchronously to canvas.
 * 3. Direct DOM decoupled FPS & metrics: fpsRef.current.textContent updated directly without React reconciliation.
 * 4. Persistent GPU surface: translateZ(0), object-fit: contain, impervious to window drag/resize/focus re-renders.
 */
export const ScrcpyStreamCanvas = memo(
  forwardRef<ScrcpyStreamCanvasHandle, ScrcpyStreamCanvasProps>(function ScrcpyStreamCanvas(
    {
      isScreenOn = true,
      scaleMode = 'contain',
      onScaleModeChange,
      onTap,
      onSwipe,
      onWake,
      onPasscodeUnlock,
      onLaunchScrcpy,
      onAutoRotate,
      className = '',
      style = {},
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const fpsRef = useRef<HTMLSpanElement | null>(null);
    const statusTextRef = useRef<HTMLSpanElement | null>(null);
    const statusDotRef = useRef<HTMLSpanElement | null>(null);
    const rippleRef = useRef<HTMLDivElement | null>(null);

    // Double-buffered frame refs
    const latestBitmapRef = useRef<ImageBitmap | null>(null);
    const hasNewFrameRef = useRef<boolean>(false);
    const animFrameIdRef = useRef<number | null>(null);
    const fpsCountRef = useRef<number>(0);
    const lastFpsTimeRef = useRef<number>(performance.now());
    const isDestroyedRef = useRef<boolean>(false);
    const isFetchingRef = useRef<boolean>(false);
    const wsRef = useRef<WebSocket | null>(null);
    const lastFrameTimeRef = useRef<number>(performance.now());
    const deviceWidthRef = useRef<number>(1520);
    const deviceHeightRef = useRef<number>(720);
    const lastWheelTimeRef = useRef<number>(0);
    const isHoveredRef = useRef<boolean>(false);

    // Keep screen state in ref to avoid re-triggering effects
    const isScreenOnRef = useRef<boolean>(isScreenOn);
    useEffect(() => {
      isScreenOnRef.current = isScreenOn;
      if (!isScreenOn && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#050505';
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        if (statusTextRef.current) statusTextRef.current.textContent = 'ASLEEP';
        if (statusDotRef.current) statusDotRef.current.className = 'w-1.5 h-1.5 rounded-full bg-neutral-600';
      }
    }, [isScreenOn]);

    // Keep interaction callbacks in refs for stable listener bindings
    const onTapRef = useRef(onTap);
    const onSwipeRef = useRef(onSwipe);
    const onWakeRef = useRef(onWake);
    const onAutoRotateRef = useRef(onAutoRotate);
    const lastDetectedOrientationRef = useRef<'portrait' | 'landscape' | null>(null);

    useEffect(() => {
      onTapRef.current = onTap;
      onSwipeRef.current = onSwipe;
      onWakeRef.current = onWake;
      onAutoRotateRef.current = onAutoRotate;
    });

    // Xiaomi / MIUI Security Settings Tracker (for INJECT_EVENTS permission)
    const [isSecurityBlocked, setIsSecurityBlocked] = React.useState(false);
    const [isBannerDismissed, setIsBannerDismissed] = React.useState(false);
    const [isCheckingSecurity, setIsCheckingSecurity] = React.useState(false);

    const checkSecurityStatus = React.useCallback(async () => {
      setIsCheckingSecurity(true);
      try {
        const res = await fetch('/api/adb/input/status?recheck=true');
        const data = await res.json();
        if (data && typeof data.isSecuritySettingsBlocked === 'boolean') {
          setIsSecurityBlocked(data.isSecuritySettingsBlocked);
          if (!data.isSecuritySettingsBlocked) {
            setIsBannerDismissed(false);
          }
        }
      } catch {}
      finally {
        setIsCheckingSecurity(false);
      }
    }, []);

    useEffect(() => {
      checkSecurityStatus();
      const interval = setInterval(checkSecurityStatus, 10000);
      return () => clearInterval(interval);
    }, [checkSecurityStatus]);

    const handleOpenDevOptions = async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await fetch('/api/adb/open-dev-options');
      } catch {}
    };

    // Process incoming Blob/Binary frame without ANY React setState
    const processFrameBlob = async (blob: Blob) => {
      if (isDestroyedRef.current || !isScreenOnRef.current) return;
      try {
        const bmp = await createImageBitmap(blob);
        if (isDestroyedRef.current) {
          bmp.close();
          return;
        }
        if (latestBitmapRef.current) {
          latestBitmapRef.current.close();
        }
        latestBitmapRef.current = bmp;
        hasNewFrameRef.current = true;
        lastFrameTimeRef.current = performance.now();

        // Real-time automatic orientation detection from frame dimensions
        if (bmp.width > 0 && bmp.height > 0) {
          deviceWidthRef.current = bmp.width;
          deviceHeightRef.current = bmp.height;
          const detected: 'portrait' | 'landscape' = bmp.width > bmp.height ? 'landscape' : 'portrait';
          if (detected !== lastDetectedOrientationRef.current) {
            lastDetectedOrientationRef.current = detected;
            onAutoRotateRef.current?.(detected, bmp.width, bmp.height);
          }
        }

        if (statusTextRef.current && statusTextRef.current.textContent !== 'LIVE') {
          statusTextRef.current.textContent = 'LIVE';
          if (statusDotRef.current) {
            statusDotRef.current.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse';
          }
        }
      } catch {
        // Silently skip corrupted frame packet
      }
    };

    // Imperative external methods
    useImperativeHandle(ref, () => ({
      requestImmediateFrame: async () => {
        if (isDestroyedRef.current || !isScreenOnRef.current) return;
        try {
          const res = await fetch('/api/adb/screen/frame', { cache: 'no-store' });
          if (res.ok) {
            const blob = await res.blob();
            if (blob.size > 1000) {
              await processFrameBlob(blob);
            }
          }
        } catch {}
      },
      wakeScreen: async () => {
        try {
          await fetch('/api/adb/wake');
          const res = await fetch('/api/adb/screen/frame', { cache: 'no-store' });
          if (res.ok) {
            const blob = await res.blob();
            await processFrameBlob(blob);
          }
        } catch {}
      },
      swipeUp: async () => {
        try {
          await fetch('/api/adb/input/swipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x1: 540, y1: 1800, x2: 540, y2: 400, duration: 250 }),
          });
          setTimeout(async () => {
            const res = await fetch('/api/adb/screen/frame', { cache: 'no-store' });
            if (res.ok) {
              const blob = await res.blob();
              await processFrameBlob(blob);
            }
          }, 300);
        } catch {}
      },
    }));

    // 1. Isolated requestAnimationFrame Render Loop
    useEffect(() => {
      isDestroyedRef.current = false;

      const render = (now: number) => {
        if (isDestroyedRef.current) return;

        if (hasNewFrameRef.current && latestBitmapRef.current && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
          if (ctx) {
            const bmp = latestBitmapRef.current;
            if (canvas.width !== bmp.width || canvas.height !== bmp.height) {
              canvas.width = bmp.width;
              canvas.height = bmp.height;
            }
            ctx.drawImage(bmp, 0, 0);
            hasNewFrameRef.current = false;
            fpsCountRef.current++;
          }
        }

        // Direct DOM update of FPS counter (no React setState)
        if (now - lastFpsTimeRef.current >= 1000) {
          const elapsed = (now - lastFpsTimeRef.current) / 1000;
          const fps = Math.round(fpsCountRef.current / elapsed);
          fpsCountRef.current = 0;
          lastFpsTimeRef.current = now;
          if (fpsRef.current) {
            fpsRef.current.textContent = `${fps} FPS`;
          }
        }

        animFrameIdRef.current = requestAnimationFrame(render);
      };

      animFrameIdRef.current = requestAnimationFrame(render);

      return () => {
        isDestroyedRef.current = true;
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
          animFrameIdRef.current = null;
        }
        if (latestBitmapRef.current) {
          latestBitmapRef.current.close();
          latestBitmapRef.current = null;
        }
      };
    }, []);

    // 2. Stream Ingestion Pipeline (WebSocket with High-Rate Fallback & Anti-Freeze Watchdog)
    useEffect(() => {
      let pollTimer: NodeJS.Timeout | null = null;
      let watchdogTimer: NodeJS.Timeout | null = null;
      let usingWs = false;

      const pollFrame = async () => {
        if (isDestroyedRef.current || !isScreenOnRef.current) return;
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
          const res = await fetch('/api/adb/screen/frame', { cache: 'no-store' });
          if (res.ok) {
            const blob = await res.blob();
            if (blob.size > 1000) {
              await processFrameBlob(blob);
            }
          }
        } catch {
        } finally {
          isFetchingRef.current = false;
          if (!isDestroyedRef.current && !usingWs) {
            pollTimer = setTimeout(pollFrame, 100);
          }
        }
      };

      // Watchdog: If no frames received for > 2500ms and not using active WS stream, pull one directly to prevent freeze
      watchdogTimer = setInterval(() => {
        if (isDestroyedRef.current || !isScreenOnRef.current) return;
        if (usingWs && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
        if (performance.now() - lastFrameTimeRef.current > 2500) {
          pollFrame();
        }
      }, 1000);

      // App Launch: when an app is launched, let WebSocket deliver frames; only poll once if WS not active
      const handleAppLaunched = () => {
        if (usingWs && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
        setTimeout(pollFrame, 200);
      };
      window.addEventListener('adb-app-launched', handleAppLaunched);

      // Try WebSocket connection
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/scrcpy`;
        const ws = new WebSocket(wsUrl);
        ws.binaryType = 'blob';

        ws.onopen = () => {
          usingWs = true;
          if (pollTimer) clearTimeout(pollTimer);
          if (statusTextRef.current) statusTextRef.current.textContent = 'WS STREAM';
          if (statusDotRef.current) {
            statusDotRef.current.className = 'w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse';
          }
        };

        ws.onmessage = (event) => {
          // ABSOLUTE ZERO REACT STATE UPDATE
          if (event.data instanceof Blob) {
            processFrameBlob(event.data);
          } else if (event.data instanceof ArrayBuffer) {
            processFrameBlob(new Blob([event.data], { type: 'image/png' }));
          }
        };

        ws.onerror = () => {
          usingWs = false;
          if (!pollTimer) pollFrame();
        };

        ws.onclose = () => {
          usingWs = false;
          if (!isDestroyedRef.current && !pollTimer) {
            pollTimer = setTimeout(pollFrame, 200);
          }
        };

        wsRef.current = ws;
      } catch {
        usingWs = false;
        pollFrame();
      }

      // Initial immediate fetch
      pollFrame();

      return () => {
        if (pollTimer) clearTimeout(pollTimer);
        if (watchdogTimer) clearInterval(watchdogTimer);
        window.removeEventListener('adb-app-launched', handleAppLaunched);
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
      };
    }, []);

    // 3. Pixel-Perfect Coordinate Transformation for letterboxed object-fit: contain, cover, stretch
    const getDeviceCoordinates = (clientX: number, clientY: number) => {
      if (!containerRef.current || !canvasRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const clickY = clientY - rect.top;

      const devW = deviceWidthRef.current || canvasRef.current.width || 1520;
      const devH = deviceHeightRef.current || canvasRef.current.height || 720;
      const aspect = devW / devH;
      const containerAspect = rect.width / rect.height;

      let renderedW: number;
      let renderedH: number;
      let offsetX: number;
      let offsetY: number;

      if (scaleMode === 'stretch') {
        renderedW = rect.width;
        renderedH = rect.height;
        offsetX = 0;
        offsetY = 0;
      } else if (scaleMode === 'cover') {
        if (containerAspect > aspect) {
          renderedW = rect.width;
          renderedH = rect.width / aspect;
          offsetX = 0;
          offsetY = (rect.height - renderedH) / 2;
        } else {
          renderedH = rect.height;
          renderedW = renderedH * aspect;
          offsetX = (rect.width - renderedW) / 2;
          offsetY = 0;
        }
      } else {
        // contain
        if (containerAspect > aspect) {
          // Pillarbox (black bars on left/right)
          renderedH = rect.height;
          renderedW = renderedH * aspect;
          offsetX = (rect.width - renderedW) / 2;
          offsetY = 0;
        } else {
          // Letterbox (black bars on top/bottom)
          renderedW = rect.width;
          renderedH = renderedW / aspect;
          offsetX = 0;
          offsetY = (rect.height - renderedH) / 2;
        }
      }

      const localX = clickX - offsetX;
      const localY = clickY - offsetY;

      const clampedX = Math.max(0, Math.min(renderedW, localX));
      const clampedY = Math.max(0, Math.min(renderedH, localY));

      const rawX = Math.round((clampedX / renderedW) * devW);
      const rawY = Math.round((clampedY / renderedH) * devH);
      const xPercent = (rawX / devW) * 100;
      const yPercent = (rawY / devH) * 100;

      return { rawX, rawY, xPercent, yPercent, clickX, clickY, devW, devH };
    };

    // 4. Ultra-Fast Pointer & Touch Interaction Handlers (with full Pointer Capture)
    const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      // Prevent browser default text selection / drag start
      e.preventDefault();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}

      // Acquire DOM focus immediately so all physical keyboard events route directly to Android
      containerRef.current?.focus({ preventScroll: true });
      isHoveredRef.current = true;

      dragStartRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };

      // Zero-Latency Immediate Visual Feedback: Render active touch point right under cursor
      if (containerRef.current && rippleRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        rippleRef.current.style.transition = 'transform 0.06s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.06s ease';
        rippleRef.current.style.left = `${clickX}px`;
        rippleRef.current.style.top = `${clickY}px`;
        rippleRef.current.style.opacity = '1';
        rippleRef.current.style.transform = 'translate(-50%, -50%) scale(1.1)';
      }
    };

    const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}

      if (!dragStartRef.current || !containerRef.current) return;
      const start = dragStartRef.current;
      const movedX = e.clientX - start.x;
      const movedY = e.clientY - start.y;
      const duration = Math.min(500, Math.max(80, Math.round(performance.now() - start.time)));
      dragStartRef.current = null;

      // Animate ripple expansion & fade out smoothly
      if (rippleRef.current) {
        rippleRef.current.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
        rippleRef.current.style.transform = 'translate(-50%, -50%) scale(1.8)';
        rippleRef.current.style.opacity = '0';
      }

      // Lock Screen Swipe-Up detection (drag upward > 35px)
      if (movedY < -35 && Math.abs(movedY) > Math.abs(movedX)) {
        const devW = deviceWidthRef.current || 1520;
        const devH = deviceHeightRef.current || 720;
        const midX = Math.round(devW / 2);
        const startY = Math.round(devH * 0.82);
        const endY = Math.round(devH * 0.2);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'swipe', x1: midX, y1: startY, x2: midX, y2: endY, duration: 180 }));
        } else if (onSwipeRef.current) {
          onSwipeRef.current(midX, startY, midX, endY, 180);
        } else {
          fetch('/api/adb/input/swipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x1: midX, y1: startY, x2: midX, y2: endY, duration: 180 }),
          }).catch(() => {});
        }
        return;
      }

      const startCoords = getDeviceCoordinates(start.x, start.y);
      const endCoords = getDeviceCoordinates(e.clientX, e.clientY);

      // Generic drag swipe / touch scrolling
      if (Math.abs(movedX) > 10 || Math.abs(movedY) > 10) {
        if (startCoords && endCoords) {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'swipe',
              x1: startCoords.rawX,
              y1: startCoords.rawY,
              x2: endCoords.rawX,
              y2: endCoords.rawY,
              duration,
            }));
          } else if (onSwipeRef.current) {
            onSwipeRef.current(startCoords.rawX, startCoords.rawY, endCoords.rawX, endCoords.rawY, duration);
          } else {
            fetch('/api/adb/input/swipe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                x1: startCoords.rawX,
                y1: startCoords.rawY,
                x2: endCoords.rawX,
                y2: endCoords.rawY,
                duration,
              }),
            }).catch(() => {});
          }
        }
        return;
      }

      // Tap / Click
      if (!isScreenOnRef.current) {
        if (onWakeRef.current) {
          onWakeRef.current();
        } else {
          fetch('/api/adb/wake').catch(() => {});
        }
        return;
      }

      if (endCoords) {
        // High-Speed Direct WebSocket Tap Dispatch (< 1ms delivery to persistent ADB shell)
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'tap',
            x: endCoords.rawX,
            y: endCoords.rawY,
          }));
        } else if (onTapRef.current) {
          onTapRef.current(endCoords.xPercent, endCoords.yPercent);
        } else {
          // Fast HTTP fallback
          fetch('/api/adb/input/tap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rawX: endCoords.rawX,
              rawY: endCoords.rawY,
              xPercent: endCoords.xPercent,
              yPercent: endCoords.yPercent,
              width: endCoords.devW,
              height: endCoords.devH,
            }),
          }).catch(() => {});
        }
      }
    };

    const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      dragStartRef.current = null;
      if (rippleRef.current) {
        rippleRef.current.style.opacity = '0';
      }
    };

    // 5. Natural PC Mouse Wheel Scrolling (Roll mouse wheel up/down to scroll app screen)
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const now = performance.now();
      // Throttle wheel events to avoid overloading ADB
      if (now - lastWheelTimeRef.current < 65) return;
      lastWheelTimeRef.current = now;

      const coords = getDeviceCoordinates(e.clientX, e.clientY);
      const devW = deviceWidthRef.current || 1520;
      const devH = deviceHeightRef.current || 720;

      const centerX = coords ? coords.rawX : Math.round(devW / 2);
      const centerY = coords ? coords.rawY : Math.round(devH / 2);

      // deltaY > 0 means scroll DOWN -> swipe upward (from lower screen to higher screen)
      // deltaY < 0 means scroll UP -> swipe downward (from higher screen to lower screen)
      const scrollDist = Math.round(devH * 0.38);
      const startY = e.deltaY > 0 ? Math.min(devH - 40, centerY + scrollDist) : Math.max(40, centerY - scrollDist);
      const endY = e.deltaY > 0 ? Math.max(40, centerY - scrollDist) : Math.min(devH - 40, centerY + scrollDist);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'swipe',
          x1: centerX,
          y1: startY,
          x2: centerX,
          y2: endY,
          duration: 140,
        }));
      } else if (onSwipeRef.current) {
        onSwipeRef.current(centerX, startY, centerX, endY, 140);
      } else {
        fetch('/api/adb/input/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            x1: centerX,
            y1: startY,
            x2: centerX,
            y2: endY,
            duration: 140,
          }),
        }).catch(() => {});
      }
    };

    // Helper: Fast ADB key event dispatch (via WebSocket or HTTP fallback)
    const sendKey = (key: number | string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'key', key }));
      } else {
        fetch('/api/adb/input/key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        }).catch(() => {});
      }
    };

    // Helper: Fast ADB text dispatch (via WebSocket or HTTP fallback)
    const sendText = (text: string) => {
      if (!text) return;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'text', text }));
      } else {
        fetch('/api/adb/input/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        }).catch(() => {});
      }
    };

    // Comprehensive Physical PC Keyboard Event Handler (Instant Typing, Navigation & Clipboard)
    const processKeyEvent = async (e: KeyboardEvent | React.KeyboardEvent) => {
      // Always allow DevTools (F12, Ctrl+Shift+I) and Page Refresh (F5, Ctrl+R) to function normally
      if (
        e.key === 'F12' ||
        e.key === 'F5' ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i')
      ) {
        return;
      }

      // If user is actively typing into a desktop DOM input element outside the canvas, don't intercept
      const activeEl = document.activeElement;
      const isDesktopInputActive =
        activeEl &&
        activeEl !== containerRef.current &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);
      if (isDesktopInputActive) return;

      // 1. Clipboard Paste (Ctrl+V / Cmd+V)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        try {
          if (navigator.clipboard && navigator.clipboard.readText) {
            const pasted = await navigator.clipboard.readText();
            if (pasted) {
              sendText(pasted);
              return;
            }
          }
        } catch {}
        sendKey(279); // KEYCODE_PASTE fallback
        return;
      }

      // 2. Clipboard Copy (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        sendKey(278); // KEYCODE_COPY
        return;
      }

      // 3. Clipboard Cut (Ctrl+X / Cmd+X)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        sendKey(277); // KEYCODE_CUT
        return;
      }

      // 4. Android Keycode Mapping for navigation, actions & control keys
      const controlKeyMap: Record<string, number> = {
        Backspace: 67, // KEYCODE_DEL
        Delete: 112, // KEYCODE_FORWARD_DEL
        Enter: 66, // KEYCODE_ENTER
        Tab: 61, // KEYCODE_TAB
        Escape: 4, // KEYCODE_BACK
        ArrowUp: 19, // KEYCODE_DPAD_UP
        ArrowDown: 20, // KEYCODE_DPAD_DOWN
        ArrowLeft: 21, // KEYCODE_DPAD_LEFT
        ArrowRight: 22, // KEYCODE_DPAD_RIGHT
        Home: 122, // KEYCODE_MOVE_HOME
        End: 123, // KEYCODE_MOVE_END
        PageUp: 92, // KEYCODE_PAGE_UP
        PageDown: 93, // KEYCODE_PAGE_DOWN
      };

      if (controlKeyMap[e.key] !== undefined) {
        e.preventDefault();
        sendKey(controlKeyMap[e.key]);
        return;
      }

      // 5. Space key
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        sendKey(62); // KEYCODE_SPACE
        return;
      }

      // 6. Ignore standalone modifier keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock'].includes(e.key)) {
        return;
      }

      // 7. All printable characters (Letters A-Z, a-z, digits 0-9, and all punctuation/symbols)
      if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
        e.preventDefault();
        sendText(e.key);
        return;
      }
    };

    // Global Key Listener: captures keystrokes whenever container is focused OR mouse is hovering over phone screen
    useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        const activeEl = document.activeElement;
        const isContainerFocused =
          activeEl === containerRef.current ||
          (containerRef.current ? containerRef.current.contains(activeEl) : false);
        const isHovered = isHoveredRef.current;

        if (!isContainerFocused && !isHovered) return;

        processKeyEvent(e);
      };

      window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
      return () => {
        window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
      };
    }, []);

    return (
      <div
        ref={containerRef}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onMouseEnter={() => {
          isHoveredRef.current = true;
        }}
        onMouseLeave={() => {
          isHoveredRef.current = false;
        }}
        onWheel={handleWheel}
        onKeyDown={(e) => processKeyEvent(e)}
        className={`relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none cursor-crosshair focus:outline-none touch-none ${className}`}
        style={{
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          ...style,
        }}
      >
        {/* Double-buffered hardware-accelerated Canvas */}
        <canvas
          ref={canvasRef}
          className={`w-full h-full pointer-events-none ${
            scaleMode === 'stretch'
              ? 'object-fill'
              : scaleMode === 'cover'
              ? 'object-cover'
              : 'object-contain'
          }`}
          style={{
            display: 'block',
            imageRendering: 'auto',
            transform: 'translateZ(0)',
            objectFit: scaleMode === 'stretch' ? 'fill' : scaleMode === 'cover' ? 'cover' : 'contain',
          }}
        />

        {/* DOM-direct Instant Tap & Touch Indicator */}
        <div
          ref={rippleRef}
          className="absolute w-10 h-10 rounded-full border-2 border-cyan-300 bg-cyan-400/25 pointer-events-none opacity-0 shadow-[0_0_16px_rgba(6,182,212,0.9)] flex items-center justify-center"
          style={{ transform: 'translate(-50%, -50%) scale(0.5)' }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
        </div>

        {/* Xiaomi / MIUI Security Settings Alert Banner */}
        {isSecurityBlocked && !isBannerDismissed && (
          <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-10 inset-x-3 sm:inset-x-6 z-40 bg-slate-950/95 border border-amber-500/80 rounded-2xl p-3.5 text-amber-200 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 pointer-events-auto select-none ring-1 ring-amber-500/30 font-sans"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Mouse Clicks Blocked by Xiaomi MIUI</span>
                    <span className="text-[10px] bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full font-mono font-semibold">
                      1 Setting Required
                    </span>
                  </h4>
                  <button
                    onClick={() => setIsBannerDismissed(true)}
                    className="text-slate-400 hover:text-white text-xs p-1 rounded-lg hover:bg-white/10 transition"
                    title="Dismiss alert"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                  On Xiaomi / Redmi phones, Android blocks PC mouse clicks until you enable <strong>&quot;USB debugging (Security settings)&quot;</strong> in Developer Options.
                </p>
                <div className="mt-2 bg-black/50 border border-amber-500/20 p-2.5 rounded-xl text-[11px] space-y-1 text-slate-200">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                    <span>Turn ON &quot;USB debugging (Security settings)&quot; on your phone</span>
                  </div>
                  <p className="text-[10px] text-slate-400 ml-5 font-mono">
                    Settings &gt; Additional settings &gt; Developer options &gt; USB debugging (Security settings)
                  </p>
                  <p className="text-[10px] text-amber-400/90 ml-5">
                    (Accept the 3 countdown prompts on the phone screen)
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <button
                    onClick={handleOpenDevOptions}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Open Developer Options on Phone</span>
                  </button>
                  <button
                    onClick={checkSecurityStatus}
                    disabled={isCheckingSecurity}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-xs transition flex items-center gap-1.5 border border-white/10 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingSecurity ? 'animate-spin' : ''}`} />
                    <span>I Enabled It (Recheck)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subtle Non-Intrusive Floating HUD */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 hover:bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] text-white/80 hover:text-white font-mono shadow transition-opacity opacity-70 hover:opacity-100 pointer-events-auto">
          <span ref={statusDotRef} className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span ref={statusTextRef} className="font-semibold text-neutral-200">LIVE</span>
          <span className="text-white/20">|</span>
          <span ref={fpsRef} className="text-cyan-300 font-bold">-- FPS</span>
          <span className="text-white/20">|</span>
          <span className="text-emerald-400/90 flex items-center gap-1 font-mono text-[9px]" title="Physical PC Keyboard Active (Type directly into Android apps, Ctrl+V to paste)">
            <Keyboard className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">KEYBOARD</span>
          </span>
          {onScaleModeChange && (
            <>
              <span className="text-white/20">|</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nextMode: 'contain' | 'cover' | 'stretch' =
                    scaleMode === 'contain' ? 'stretch' : scaleMode === 'stretch' ? 'cover' : 'contain';
                  onScaleModeChange(nextMode);
                }}
                className="px-1.5 py-0.5 rounded text-[9px] bg-white/10 hover:bg-white/20 text-cyan-300 font-sans uppercase font-bold tracking-wider"
                title={`Scale Mode: ${scaleMode}. Click to switch between Fit, Stretch, Fill`}
              >
                {scaleMode === 'stretch' ? 'Stretch' : scaleMode === 'cover' ? 'Fill' : 'Fit'}
              </button>
            </>
          )}
        </div>

        {/* Quick Action Top-Right Controls */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10 opacity-75 hover:opacity-100 transition-opacity">
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const res = await fetch('/api/adb/screen/frame', { cache: 'no-store' });
                if (res.ok) {
                  const blob = await res.blob();
                  await processFrameBlob(blob);
                }
              } catch {}
            }}
            className="p-1 rounded-full bg-black/60 hover:bg-black border border-white/20 text-white/80 hover:text-white transition shadow backdrop-blur-sm"
            title="Refresh Frame"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          {onLaunchScrcpy && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLaunchScrcpy();
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-[10px] shadow transition backdrop-blur-sm"
              title="Launch full 60 FPS hardware mirror on Windows"
            >
              <Zap className="w-2.5 h-2.5 fill-current" />
              <span>60 FPS</span>
            </button>
          )}
        </div>
      </div>
    );
  })
);
