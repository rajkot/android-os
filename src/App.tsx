import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DeviceInfo,
  AppDefinition,
  OpenWindowState,
  StorageFile,
  AndroidNotification,
  DexSystemTelemetry,
  GameKeymapItem
} from './types';
import {
  INITIAL_DEVICES,
  INITIAL_APPS,
  SYSTEM_DESKTOP_APPS,
  INITIAL_STORAGE_FILES,
  INITIAL_NOTIFICATIONS,
  INITIAL_TELEMETRY,
  INITIAL_GAME_KEYMAPS,
  WALLPAPERS,
  DISCONNECTED_TELEMETRY,
  ACTIVE_TELEMETRY,
} from './data/initialData';
import { TitleBar } from './components/TitleBar';
import { DesktopCanvas } from './components/DesktopCanvas';
import { WinDesktopScreen } from './components/desktop/WinDesktopScreen';
import { Win10StartMenu } from './components/desktop/Win10StartMenu';
import { QuickSettingsFlyout } from './components/QuickSettingsFlyout';
import { NotificationCenter } from './components/NotificationCenter';
import { DeviceManagerModal } from './components/DeviceManagerModal';
import { BootScreen } from './components/BootScreen';
import { WindowFrame } from './components/WindowFrame';

// Apps
import { PhoneMirrorApp } from './components/apps/PhoneMirrorApp';
import { DexFileManagerApp } from './components/apps/DexFileManagerApp';
import { AdbTerminalApp } from './components/apps/AdbTerminalApp';
import { SettingsTelemetryApp } from './components/apps/SettingsTelemetryApp';
import { GamingCenterApp } from './components/apps/GamingCenterApp';
import { MediaHubApp } from './components/apps/MediaHubApp';
import { CameraMirrorApp } from './components/apps/CameraMirrorApp';
import { GenericAndroidApp } from './components/apps/GenericAndroidApp';

export default function App() {
  // Device & Telemetry State
  const [devices, setDevices] = useState<DeviceInfo[]>(INITIAL_DEVICES);
  const [activeDeviceIndex, setActiveDeviceIndex] = useState(0);
  const activeDevice: DeviceInfo | null = devices.length > 0 ? (devices[activeDeviceIndex] ?? devices[0] ?? null) : null;
  const [telemetry, setTelemetry] = useState<DexSystemTelemetry>(INITIAL_TELEMETRY);

  // Boot & System State
  const [isBooting, setIsBooting] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wallpaper, setWallpaper] = useState<string>(WALLPAPERS[0].path);
  const [screenshotFlash, setScreenshotFlash] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Flyouts & Modals
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isDeviceManagerOpen, setIsDeviceManagerOpen] = useState(false);
  const [isGamingModeGlobal, setIsGamingModeGlobal] = useState(false);

  // App Data & Files - Start with core DEX desktop apps
  const [apps, setApps] = useState<AppDefinition[]>(INITIAL_APPS);

  const [storageFiles, setStorageFiles] = useState<StorageFile[]>(INITIAL_STORAGE_FILES);
  const [notifications, setNotifications] = useState<AndroidNotification[]>(INITIAL_NOTIFICATIONS);
  const [gameKeymaps, setGameKeymaps] = useState<GameKeymapItem[]>(INITIAL_GAME_KEYMAPS);
  const [pinnedDesktopAppIds, setPinnedDesktopAppIds] = useState<string[]>([
    'phone-mirror',
    'chrome',
    'youtube',
    'camera',
    'photos',
    'whatsapp',
    'spotify',
    'dex-files',
    'adb-terminal',
    'settings',
  ]);

  const handleTogglePinDesktop = (appId: string) => {
    setPinnedDesktopAppIds((prev) => {
      const isPinned = prev.includes(appId);
      const updated = isPinned ? prev.filter((id) => id !== appId) : [...prev, appId];
      showToast(isPinned ? 'Shortcut removed from Desktop' : 'Shortcut pinned to Desktop');
      return updated;
    });
  };

  // Reference to track active device serial for dynamic device swap detection
  const lastDeviceSerialRef = useRef<string | null>(null);

  // Reusable ADB sync engine: updates devices, installed phone apps, and storage files
  const syncAdbData = useCallback(async (options?: { forceToast?: boolean; forceReload?: boolean }) => {
    try {
      // 1. Sync real connected devices
      const devRes = await fetch('/api/adb/devices');
      const devData = await devRes.json();
      const connectedDevices = devData.success && devData.devices ? devData.devices : [];
      const currentSerial = connectedDevices.length > 0 ? (connectedDevices[0].serialNumber || connectedDevices[0].id) : null;

      // Detect device swap or disconnect
      const deviceChanged = lastDeviceSerialRef.current !== null && lastDeviceSerialRef.current !== currentSerial;
      const isForce = options?.forceReload || deviceChanged;

      if (deviceChanged) {
        console.log(`[App] Device swap/change detected: "${lastDeviceSerialRef.current}" -> "${currentSerial}". Clearing cache.`);
        // Immediately clear all cached app packages, titles, and icons from state
        localStorage.removeItem('dex_cached_installed_apps');
        setApps(INITIAL_APPS);
      }
      lastDeviceSerialRef.current = currentSerial;

      if (connectedDevices.length > 0) {
        setDevices(connectedDevices);
        setTelemetry((prev) => ({
          ...prev,
          ...ACTIVE_TELEMETRY,
          jarConnected: true,
          apkConnected: true,
          allConnected: true,
        }));
      } else {
        setDevices([]);
        setTelemetry((prev) => ({
          ...prev,
          ...DISCONNECTED_TELEMETRY,
        }));
      }

      // 2. Sync real apps from connected phone
      if (connectedDevices.length > 0) {
        const clearParam = isForce ? '?clearCache=true' : '';
        const appsRes = await fetch(`/api/adb/apps${clearParam}`);
        const appsData = await appsRes.json();
        if (appsData.success && appsData.apps && appsData.apps.length > 0) {
          const realPhoneApps = appsData.apps.filter(
            (a: AppDefinition) => !a.packageName.startsWith('com.androiddex.')
          );
          
          const combined = [
            ...SYSTEM_DESKTOP_APPS,
            ...realPhoneApps.filter(
              (r: AppDefinition) =>
                !SYSTEM_DESKTOP_APPS.some((s) => s.id === r.id || s.packageName === r.packageName)
            ),
          ];
          setApps(combined);

          // Persist to localStorage so apps never disappear when phone is disconnected
          try {
            localStorage.setItem('dex_cached_installed_apps', JSON.stringify(realPhoneApps));
          } catch {}

          // Broadcast to sub-apps (e.g. PhoneMirrorApp)
          window.dispatchEvent(new CustomEvent('adb:apps-synced', { detail: { apps: appsData.apps } }));

          if (options?.forceToast || deviceChanged) {
            showToast(`✓ Synced ${realPhoneApps.length} Android apps${currentSerial ? ` (${currentSerial})` : ''}`);
          }
        }
      } else {
        setApps(INITIAL_APPS);
        localStorage.removeItem('dex_cached_installed_apps');
      }

      // 3. Sync real files from phone (/sdcard)
      const filesRes = await fetch('/api/adb/files?path=/sdcard');
      const filesData = await filesRes.json();
      if (filesData.success && filesData.files && filesData.files.length > 0) {
        setStorageFiles(filesData.files);
      }
    } catch (err) {
      console.warn('[ADB Sync] Error syncing ADB data:', err);
      if (options?.forceToast) {
        showToast('⚠️ ADB Sync: Unable to reach ADB bridge');
      }
    }
  }, [showToast]);

  // Initial Sync on component mount & periodic device watcher
  useEffect(() => {
    syncAdbData();
    const interval = setInterval(() => {
      syncAdbData();
    }, 3000);
    return () => clearInterval(interval);
  }, [syncAdbData]);

  // Window Manager State - Default to Floating Landscape Mirror Window so Desktop is visible
  const [openWindows, setOpenWindows] = useState<OpenWindowState[]>([
    {
      id: 'win-phone-mirror',
      appId: 'phone-mirror',
      title: 'Phone Screen Mirror',
      icon: 'Smartphone',
      x: 70,
      y: 50,
      width: 880,
      height: 560,
      minWidth: 480,
      minHeight: 360,
      isMinimized: false,
      isMaximized: false,
      zIndex: 12,
      orientation: 'landscape',
    }
  ]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>('win-phone-mirror');
  const [nextZIndex, setNextZIndex] = useState(13);

  // Explicitly sanitize package name (strip 'package:', 'phone-app-', query parameters, and whitespace)
  const sanitizePackage = (raw: string): string => {
    let clean = (raw || '').trim();
    while (clean.startsWith('package:')) {
      clean = clean.substring('package:'.length).trim();
    }
    if (clean.startsWith('phone-app-')) {
      clean = clean.substring('phone-app-'.length).trim();
    }
    if (clean.includes('?')) {
      clean = clean.split('?')[0].trim();
    }
    return clean.replace(/[\r\n\t]/g, '').trim();
  };

  // Resilient App Definition Lookup
  const findAppDef = useCallback(
    (targetId: string): AppDefinition | undefined => {
      if (!targetId) return undefined;
      const clean = sanitizePackage(targetId).toLowerCase();

      // 1. Direct ID match
      let found = apps.find((a) => a.id.toLowerCase() === targetId.toLowerCase());
      if (found) return found;

      // 2. Exact packageName match
      found = apps.find((a) => (a.packageName || '').toLowerCase() === clean);
      if (found) return found;

      // 3. ID without phone-app- prefix or clean ID
      found = apps.find(
        (a) =>
          a.id.toLowerCase() === `phone-app-${clean}` ||
          sanitizePackage(a.id).toLowerCase() === clean
      );
      if (found) return found;

      // 4. Match common package suffix or alias
      found = apps.find((a) => {
        const pkg = (a.packageName || '').toLowerCase();
        const id = a.id.toLowerCase();
        const name = (a.name || '').toLowerCase();
        return (
          pkg.endsWith(`.${clean}`) ||
          pkg.includes(`.${clean}.`) ||
          id.includes(clean) ||
          name === clean ||
          name.includes(clean)
        );
      });
      if (found) return found;

      // 5. Fallback in SYSTEM_DESKTOP_APPS or INITIAL_APPS
      found = [...SYSTEM_DESKTOP_APPS, ...INITIAL_APPS].find(
        (a) =>
          a.id.toLowerCase() === targetId.toLowerCase() ||
          (a.packageName || '').toLowerCase() === clean ||
          a.id.toLowerCase().includes(clean)
      );
      if (found) return found;

      return undefined;
    },
    [apps]
  );

  // Open App in Window - Always opens in Landscape Desktop Window
  const handleOpenApp = useCallback(
    (appId: string) => {
      const cleanAppId = sanitizePackage(appId);
      const appDef = findAppDef(appId);

      if (!appDef) {
        console.warn(`[App Launcher] App not found: "${appId}" (clean: "${cleanAppId}")`);
        showToast(`App "${appId}" not found`);
        return;
      }

      // Close Start Menu flyout immediately on app click
      setIsStartMenuOpen(false);

      // If it's a real phone app, dispatch ADB launch command on the physical phone
      const isRealPhoneApp = !!(
        appDef.packageName && !appDef.packageName.startsWith('com.androiddex.')
      );

      if (isRealPhoneApp) {
        const cleanPkg = sanitizePackage(appDef.packageName);
        console.log(`[App Launcher] Executing launch for: ${appDef.name} (${cleanPkg})`);
        showToast(`Launching ${appDef.name}...`);

        fetch('/api/adb/launch-app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packageName: cleanPkg }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              showToast(`✓ Opened ${appDef.name}`);
              window.dispatchEvent(
                new CustomEvent('adb-app-launched', { detail: { packageName: cleanPkg } })
              );
            } else {
              const err = data.error || data.stderr || data.stdout || 'ADB launch command failed';
              console.error(`[App Launcher ERROR] ${err}`);
              showToast(`⚠️ Failed to launch ${appDef.name}: ${err}`);
            }
          })
          .catch((err) => {
            console.error(`[App Launcher Network Error]`, err);
            showToast(`⚠️ ADB connection error: ${err.message}`);
          });
      }

      // Unique window ID
      const winId = `win-${cleanAppId || appDef.id}`;
      const existing = openWindows.find(
        (w) =>
          w.id === winId ||
          w.appId === appDef.id ||
          w.appId === appId ||
          w.appId === cleanAppId ||
          w.id === `win-${appDef.id}`
      );

      // If window is already open, unminimize, bring to front and focus
      if (existing) {
        setOpenWindows((prev) =>
          prev.map((w) =>
            w.id === existing.id
              ? { ...w, isMinimized: false, zIndex: nextZIndex + 1 }
              : w
          )
        );
        setActiveWindowId(existing.id);
        setNextZIndex((z) => z + 2);
        return;
      }

      // Default sizing: all apps launch in clean landscape desktop window
      const initialWidth = 920;
      const initialHeight = 580;

      // Stagger offset based on open windows
      const offsetX = 50 + (openWindows.length % 6) * 35;
      const offsetY = 40 + (openWindows.length % 6) * 35;

      const newWindow: OpenWindowState = {
        id: winId,
        appId: appDef.id,
        title: appDef.name,
        icon: appDef.icon,
        iconUrl: appDef.iconUrl,
        x: offsetX,
        y: offsetY,
        width: initialWidth,
        height: initialHeight,
        minWidth: 480,
        minHeight: 360,
        isMinimized: false,
        isMaximized: false,
        zIndex: nextZIndex + 1,
        orientation: 'landscape',
        gamingModeActive: isGamingModeGlobal || appDef.category === 'Games',
      };

      setOpenWindows((prev) => [...prev, newWindow]);
      setActiveWindowId(newWindow.id);
      setNextZIndex((z) => z + 2);
    },
    [findAppDef, isGamingModeGlobal, nextZIndex, openWindows, showToast]
  );

  const handleFocusWindow = (id: string) => {
    setActiveWindowId(id);
    setOpenWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, zIndex: nextZIndex } : w))
    );
    setNextZIndex((z) => z + 1);
  };

  const handleCloseWindow = (id: string) => {
    setOpenWindows((prev) => prev.filter((w) => w.id !== id));
    if (activeWindowId === id) {
      const remaining = openWindows.filter((w) => w.id !== id);
      setActiveWindowId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }
  };

  const handleMinimizeWindow = (id: string) => {
    setOpenWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w))
    );
    if (activeWindowId === id) {
      const remaining = openWindows.filter((w) => w.id !== id && !w.isMinimized);
      setActiveWindowId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }
  };

  const handleToggleMinimize = (id: string) => {
    const target = openWindows.find((w) => w.id === id);
    if (!target) return;

    if (target.isMinimized) {
      setOpenWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, isMinimized: false, zIndex: nextZIndex } : w))
      );
      setActiveWindowId(id);
      setNextZIndex((z) => z + 1);
    } else if (activeWindowId === id) {
      handleMinimizeWindow(id);
    } else {
      handleFocusWindow(id);
    }
  };

  const handleMaximizeWindow = (id: string) => {
    setOpenWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w))
    );
  };

  const handleToggleFullScreen = (id?: string) => {
    const targetId = id || activeWindowId || (openWindows.length > 0 ? openWindows[0].id : null);
    if (!targetId) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        setIsFullscreen(true);
      } else {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
      return;
    }

    setOpenWindows((prev) =>
      prev.map((w) => {
        if (w.id === targetId) {
          const nextState = !w.isFullScreen;
          if (nextState) {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            }
            setIsFullscreen(true);
            showToast(`Full Screen: ${w.title} (Press Esc to exit)`);
            return { ...w, isFullScreen: true, isMinimized: false };
          } else {
            showToast(`Exited Full Screen`);
            return { ...w, isFullScreen: false };
          }
        }
        return w;
      })
    );
  };

  const handleSetScaleMode = (id: string, mode: 'contain' | 'cover' | 'stretch') => {
    setOpenWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, scaleMode: mode } : w))
    );
    showToast(`Scaling set to ${mode === 'stretch' ? 'Stretch 100%' : mode === 'cover' ? 'Fill Screen' : 'Fit Screen'}`);
  };

  const handleToggleScaleMode = (id: string) => {
    setOpenWindows((prev) =>
      prev.map((w) => {
        if (w.id === id) {
          const current = w.scaleMode || 'contain';
          const next: 'contain' | 'cover' | 'stretch' =
            current === 'contain' ? 'stretch' : current === 'stretch' ? 'cover' : 'contain';
          showToast(`Display Scaling: ${next === 'stretch' ? '100% Stretch' : next === 'cover' ? 'Fill (Zoom)' : 'Fit (Aspect)'}`);
          return { ...w, scaleMode: next };
        }
        return w;
      })
    );
  };

  const handleUpdatePosition = (id: string, x: number, y: number) => {
    setOpenWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, x, y } : w))
    );
  };

  const handleUpdateSize = (id: string, width: number, height: number) => {
    setOpenWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, width, height } : w))
    );
  };

  const handleToggleOrientation = (id?: string) => {
    const targetId = id || activeWindowId || (openWindows.length > 0 ? openWindows[0].id : null);
    if (!targetId) return;

    let targetNewOrientation: 'portrait' | 'landscape' = 'landscape';

    setOpenWindows((prev) =>
      prev.map((w) => {
        if (w.id === targetId) {
          const newOrientation = w.orientation === 'portrait' ? 'landscape' : 'portrait';
          targetNewOrientation = newOrientation;
          // Swap width & height for realistic Android screen rotation
          const newWidth = Math.max(w.minWidth, w.height);
          const newHeight = Math.max(w.minHeight, w.width);
          return {
            ...w,
            orientation: newOrientation,
            width: newWidth,
            height: newHeight,
          };
        }
        return w;
      })
    );

    // Physically instruct Android phone via ADB to rotate display buffer
    fetch('/api/adb/rotate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orientation: targetNewOrientation }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          showToast(`✓ Phone physically rotated to ${targetNewOrientation}`);
        }
      })
      .catch(() => {});
  };

  const handleToggleGamingMode = (id: string) => {
    setOpenWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, gamingModeActive: !w.gamingModeActive } : w))
    );
  };

  const handleToggleGamingModeGlobal = () => {
    const nextState = !isGamingModeGlobal;
    setIsGamingModeGlobal(nextState);
    setOpenWindows((prev) =>
      prev.map((w) => ({ ...w, gamingModeActive: nextState }))
    );
    showToast(`Gaming HUD ${nextState ? 'Activated (Ctrl+G)' : 'Disabled'}`);
  };

  // Launch 0ms Native Scrcpy Mirror
  const handleLaunchScrcpy = async () => {
    showToast('⚡ Launching 0ms Ultra-Low Latency Scrcpy Mirror on Windows...');
    try {
      const res = await fetch('/api/scrcpy/launch', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('✓ Scrcpy 60 FPS mirror active with 0ms hardware latency!');
      } else {
        showToast(`⚠️ ${data.error || 'Failed to start Scrcpy'}`);
      }
    } catch (err: any) {
      showToast(`⚠️ Scrcpy error: ${err.message}`);
    }
  };

  // Screenshot capture feature
  const handleTakeScreenshot = () => {
    setScreenshotFlash(true);
    setTimeout(() => setScreenshotFlash(false), 200);

    const filename = `Screenshot_DEX_${Date.now()}.png`;
    const newScreenshot: StorageFile = {
      id: `screen-${Date.now()}`,
      name: filename,
      path: `/sdcard/Pictures/Screenshots/${filename}`,
      type: 'image',
      size: '2.4 MB',
      modified: 'Just now',
      url: '/assets/dex/multiple_apps_running.png',
    };

    setStorageFiles((prev) => [newScreenshot, ...prev]);

    // Also add an Android Notification
    const newNotif: AndroidNotification = {
      id: `notif-${Date.now()}`,
      appId: 'dex-files',
      appName: 'System UI',
      title: 'Screenshot captured',
      text: `Saved to ${newScreenshot.path} · Click to view in Files`,
      time: 'Just now',
      read: false,
      avatarColor: '#06B6D4',
    };
    setNotifications((prev) => [newNotif, ...prev]);
    showToast(`Screenshot captured: ${filename}`);
  };

  // Auto-healing Reconnect Simulation & Real App Sync
  const handleSimulateReconnect = () => {
    showToast('Triggering ADB Reconnection & Auto-Healing Watchdog…');
    setIsBooting(true);
    fetch('/api/adb/wake', { method: 'POST' }).catch(() => {});
    syncAdbData({ forceToast: true });
  };

  const handleShowDesktop = () => {
    setOpenWindows((prev) => prev.map((w) => ({ ...w, isMinimized: true })));
    setActiveWindowId(null);
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + G : Toggle Gaming Mode
      if (e.ctrlKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        handleToggleGamingModeGlobal();
      }
      // F11 or Ctrl + F : Fullscreen
      if (e.key === 'F11' || (e.ctrlKey && e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        handleToggleFullScreen();
      }
      // Escape : Exit Full Screen
      if (e.key === 'Escape') {
        const fullScreenWin = openWindows.find((w) => w.isFullScreen);
        if (fullScreenWin) {
          e.preventDefault();
          setOpenWindows((prev) =>
            prev.map((w) => (w.id === fullScreenWin.id ? { ...w, isFullScreen: false } : w))
          );
          showToast('Exited Full Screen mode');
        }
      }
      // Ctrl + Shift + S : Screenshot
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleTakeScreenshot();
      }
      // Ctrl + Alt + Left/Right : Device Switcher
      if (e.ctrlKey && e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        if (devices.length > 0) {
          const nextIdx = (activeDeviceIndex + 1) % devices.length;
          setActiveDeviceIndex(nextIdx);
          showToast(`Switched active device to: ${devices[nextIdx].name}`);
        } else {
          showToast('No devices connected. Open Device Manager to connect.');
        }
      }
    };

    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, [isGamingModeGlobal, activeDeviceIndex, devices, openWindows, activeWindowId]);

  // Devices reference for background ADB daemon polling and hardware listeners
  const devicesRef = useRef(devices);
  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  // Monitor device status and trigger automatic refresh when a USB connection is detected by ADB daemon
  useEffect(() => {
    let isSubscribed = true;

    // Helper to refresh and register a newly detected USB device into state
    const refreshWithUsbDevice = (usbInfo: Partial<DeviceInfo> & { name?: string; brand?: string; model?: string }) => {
      const devId = usbInfo.id || `usb-${Date.now()}`;
      const devName = usbInfo.name || 'Connected Android Device';
      const brand = usbInfo.brand || 'Android';
      const model = usbInfo.model || devName;

      const detectedDevice: DeviceInfo = {
        id: devId,
        name: devName,
        model: model,
        brand: brand,
        connectionType: 'usb',
        batteryLevel: usbInfo.batteryLevel ?? 92,
        isCharging: usbInfo.isCharging ?? true,
        batteryTemperature: usbInfo.batteryTemperature ?? 31.8,
        batteryVoltage: usbInfo.batteryVoltage ?? 4.25,
        batteryHealth: usbInfo.batteryHealth ?? 'Good',
        androidVersion: usbInfo.androidVersion ?? 'Android 14 (USB 3.2 Gen 1)',
        screenResolution: usbInfo.screenResolution ?? '2400 × 1080 FHD+ 60Hz',
        refreshRate: usbInfo.refreshRate ?? 60,
        fps: usbInfo.fps ?? 60,
        bitrateMbps: usbInfo.bitrateMbps ?? 8.0,
        latencyMs: usbInfo.latencyMs ?? 3.2,
        isOnline: true,
      };

      setDevices((prev) => {
        const existingIdx = prev.findIndex(
          (d) => d.id === detectedDevice.id || (d.connectionType === 'usb' && d.name === detectedDevice.name)
        );
        if (existingIdx !== -1) {
          return prev.map((d, i) => (i === existingIdx ? { ...d, ...detectedDevice, isOnline: true } : d));
        }
        return [detectedDevice, ...prev];
      });

      setActiveDeviceIndex(0);
      setTelemetry((prev) => ({
        ...prev,
        ...ACTIVE_TELEMETRY,
        jarConnected: true,
        apkConnected: true,
        allConnected: true,
      }));

      // Add system notification for the newly established USB connection
      const connectNotification: AndroidNotification = {
        id: `notif-adb-${Date.now()}`,
        appId: 'telemetry-settings',
        appName: 'ADB Daemon',
        title: 'USB Connection Detected',
        text: `${devName} linked via USB bridge. Scrcpy 60Hz pipeline active.`,
        time: 'Just now',
        read: false,
        avatarColor: '#10B981',
      };
      setNotifications((prev) => [connectNotification, ...prev]);

      showToast(`ADB Daemon: USB Device Detected (${devName})`);
      handleOpenApp('phone-mirror');
    };

    // 1. WebUSB Native Hardware Listener (Chrome / Edge)
    const handleNativeUsbConnect = (event: Event) => {
      if (!isSubscribed) return;
      try {
        // @ts-expect-error WebUSB standard event
        const dev = event.device;
        const name = dev?.productName || 'USB Android Device';
        const brand = dev?.manufacturerName || 'Android';
        refreshWithUsbDevice({
          id: `webusb-${dev?.serialNumber || Date.now()}`,
          name,
          brand,
          model: dev?.manufacturerName ? `${brand} ${name}` : name,
        });
      } catch (err) {
        console.error('Failed to parse WebUSB connect event:', err);
      }
    };

    const handleNativeUsbDisconnect = (event: Event) => {
      if (!isSubscribed) return;
      try {
        // @ts-expect-error WebUSB standard event
        const dev = event.device;
        const devSerial = dev?.serialNumber;
        setDevices((prev) => {
          const remaining = prev.filter(
            (d) => !(d.connectionType === 'usb' && devSerial && d.id.includes(devSerial))
          );
          if (remaining.length === 0) {
            setTelemetry(DISCONNECTED_TELEMETRY);
            setActiveDeviceIndex(0);
          }
          return remaining;
        });
        showToast('ADB Daemon: USB device unplugged');
      } catch (err) {
        console.error('Failed to handle WebUSB disconnect:', err);
      }
    };

    if (typeof navigator !== 'undefined' && 'usb' in navigator) {
      // Check already paired USB devices in browser session
      // @ts-expect-error WebUSB standard API
      navigator.usb.getDevices().then((pairedDevices: any[]) => {
        if (!isSubscribed) return;
        if (pairedDevices && pairedDevices.length > 0 && devicesRef.current.length === 0) {
          const first = pairedDevices[0];
          const name = first.productName || 'USB Android Phone';
          const brand = first.manufacturerName || 'Android';
          refreshWithUsbDevice({
            id: `webusb-${first.serialNumber || Date.now()}`,
            name,
            brand,
            model: `${brand} ${name}`,
          });
        }
      }).catch(() => {});

      // @ts-expect-error WebUSB standard API
      navigator.usb.addEventListener('connect', handleNativeUsbConnect);
      // @ts-expect-error WebUSB standard API
      navigator.usb.addEventListener('disconnect', handleNativeUsbDisconnect);
    }

    // 2. Custom ADB Daemon Event Listener
    const handleAdbUsbDetected = (e: Event) => {
      if (!isSubscribed) return;
      const customEvt = e as CustomEvent<{ device?: Partial<DeviceInfo> }>;
      if (customEvt.detail?.device) {
        refreshWithUsbDevice(customEvt.detail.device);
      }
    };

    const handleAdbRefresh = () => {
      if (!isSubscribed) return;
      if (devicesRef.current.length > 0) {
        setTelemetry((prev) => ({
          ...prev,
          jarConnected: true,
          apkConnected: true,
          allConnected: true,
        }));
        showToast('ADB Daemon: Refreshed active device telemetry');
      }
    };

    window.addEventListener('adb:usb-device-detected', handleAdbUsbDetected);
    window.addEventListener('adb:refresh-devices', handleAdbRefresh);

    // 3. ADB Daemon Live Polling & Auto-Reconnection Watchdog
    let prevDevicesCount = devicesRef.current.length;
    let prevDeviceSerial = devicesRef.current[0]?.serialNumber || devicesRef.current[0]?.id || '';
    let isInitialCheck = true;

    const adbWatchdog = setInterval(async () => {
      if (!isSubscribed) return;
      try {
        const res = await fetch('/api/adb/devices');
        const data = await res.json();
        if (!isSubscribed) return;

        const liveDevices: DeviceInfo[] = data.devices || [];
        const liveSerial = liveDevices.length > 0 ? (liveDevices[0].serialNumber || liveDevices[0].id) : '';

        if (isInitialCheck) {
          isInitialCheck = false;
          prevDevicesCount = liveDevices.length;
          prevDeviceSerial = liveSerial;
          if (liveDevices.length > 0) {
            setDevices(liveDevices);
          }
          return;
        }

        // 1. Phone RECONNECTED (attached USB device transitioned from 0 to >0)
        if (liveDevices.length > 0 && prevDevicesCount === 0) {
          console.log(`[ADB Daemon] Phone reconnected: ${liveDevices[0].name} (${liveSerial})`);
          prevDevicesCount = liveDevices.length;
          prevDeviceSerial = liveSerial;

          setDevices(liveDevices);
          setActiveDeviceIndex(0);
          setTelemetry((prev) => ({
            ...prev,
            ...ACTIVE_TELEMETRY,
            jarConnected: true,
            apkConnected: true,
            allConnected: true,
          }));

          // Wake device and re-sync real phone apps & files immediately
          fetch('/api/adb/wake', { method: 'POST' }).catch(() => {});
          syncAdbData();

          const devName = liveDevices[0].name || 'Android Phone';
          showToast(`✓ Phone Reconnected: ${devName} · Restored all apps`);

          const notif: AndroidNotification = {
            id: `notif-adb-${Date.now()}`,
            appId: 'telemetry-settings',
            appName: 'ADB Daemon',
            title: 'Phone Reconnected',
            text: `${devName} linked via USB bridge. All apps and screen mirror synchronized.`,
            time: 'Just now',
            read: false,
            avatarColor: '#10B981',
          };
          setNotifications((prev) => [notif, ...prev]);
        }
        // 2. Different device attached (serial changed)
        else if (liveDevices.length > 0 && liveSerial !== prevDeviceSerial) {
          console.log(`[ADB Daemon] Device switched to: ${liveSerial}`);
          prevDevicesCount = liveDevices.length;
          prevDeviceSerial = liveSerial;
          setDevices(liveDevices);
          syncAdbData();
          showToast(`✓ Switched to device: ${liveDevices[0].name}`);
        }
        // 3. Phone DISCONNECTED (transitioned from >0 to 0)
        else if (liveDevices.length === 0 && prevDevicesCount > 0) {
          console.log('[ADB Daemon] Phone disconnected');
          prevDevicesCount = 0;
          prevDeviceSerial = '';
          setTelemetry(DISCONNECTED_TELEMETRY);
          showToast('⚠️ Phone Disconnected · Retaining installed apps in Start Menu');

          const notif: AndroidNotification = {
            id: `notif-adb-disc-${Date.now()}`,
            appId: 'telemetry-settings',
            appName: 'ADB Daemon',
            title: 'Phone Disconnected',
            text: 'USB connection lost. Installed apps remain cached and accessible in Start Menu.',
            time: 'Just now',
            read: false,
            avatarColor: '#F59E0B',
          };
          setNotifications((prev) => [notif, ...prev]);
        }
        // 4. Device connected, update telemetry jitter
        else if (liveDevices.length > 0) {
          setDevices((prev) =>
            prev.map((d, i) => {
              if (i === 0 && d.isOnline) {
                const tempJitter = Number((31.5 + Math.sin(Date.now() / 10000) * 0.5).toFixed(1));
                const latencyJitter = Number((3.1 + Math.random() * 0.3).toFixed(1));
                return {
                  ...d,
                  batteryTemperature: tempJitter,
                  latencyMs: latencyJitter,
                };
              }
              return d;
            })
          );
        }
      } catch {
        // ADB temporarily busy
      }
    }, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(adbWatchdog);
      if (typeof navigator !== 'undefined' && 'usb' in navigator) {
        // @ts-expect-error WebUSB standard API
        navigator.usb.removeEventListener('connect', handleNativeUsbConnect);
        // @ts-expect-error WebUSB standard API
        navigator.usb.removeEventListener('disconnect', handleNativeUsbDisconnect);
      }
      window.removeEventListener('adb:usb-device-detected', handleAdbUsbDetected);
      window.removeEventListener('adb:refresh-devices', handleAdbRefresh);
    };
  }, [syncAdbData]);

  // Render content of each window
  const renderAppContent = (appId: string, win?: OpenWindowState) => {
    switch (appId) {
      case 'phone-mirror':
        return (
          <PhoneMirrorApp
            device={activeDevice}
            storageFiles={storageFiles}
            onUploadFile={(f) => setStorageFiles((prev) => [f, ...prev])}
            onUploadMultipleFiles={(newFiles) => setStorageFiles((prev) => [...newFiles, ...prev])}
            notifications={notifications}
            onOpenAppInWindow={handleOpenApp}
            onTakeScreenshot={handleTakeScreenshot}
            windowOrientation={win?.orientation}
            isMaximized={win?.isMaximized}
            isFullScreen={win?.isFullScreen}
            onToggleFullScreen={() => handleToggleFullScreen(win?.id)}
            scaleMode={win?.scaleMode || 'contain'}
            onScaleModeChange={(mode) => win && handleSetScaleMode(win.id, mode)}
            onOrientationChange={(newOrient) => {
              if (win) {
                setOpenWindows((prev) =>
                  prev.map((w) => (w.id === win.id ? { ...w, orientation: newOrient } : w))
                );
              }
            }}
          />
        );
      case 'dex-files':
        return (
          <DexFileManagerApp
            device={activeDevice}
            files={storageFiles}
            onUploadFile={(f) => setStorageFiles((prev) => [f, ...prev])}
            onUploadMultipleFiles={(newFiles) => setStorageFiles((prev) => [...newFiles, ...prev])}
            onDeleteFile={(id) => setStorageFiles((prev) => prev.filter((f) => f.id !== id))}
          />
        );
      case 'adb-terminal':
        return <AdbTerminalApp activeDevice={activeDevice} />;
      case 'settings':
      case 'telemetry-settings':
        return (
          <SettingsTelemetryApp
            device={activeDevice}
            telemetry={telemetry}
            onUpdateTelemetry={(up) => setTelemetry((prev) => ({ ...prev, ...up }))}
            onSimulateReconnect={handleSimulateReconnect}
          />
        );
      case 'gaming-center':
        return (
          <GamingCenterApp
            keymaps={gameKeymaps}
            onUpdateKeymaps={setGameKeymaps}
            onLaunchGame={(gId) => handleOpenApp(gId)}
          />
        );
      case 'media-hub':
        return <MediaHubApp />;
      case 'camera':
      case 'camera-mirror':
        return (
          <CameraMirrorApp
            onSavePhoto={(f) => {
              setStorageFiles((prev) => [f, ...prev]);
              showToast(`Photo saved to /sdcard/DCIM/Camera`);
            }}
          />
        );
      default:
        return (
          <GenericAndroidApp
            appId={appId}
            appDef={findAppDef(appId)}
            activeDevice={activeDevice}
            onOpenPhoneMirror={() => handleOpenApp('phone-mirror')}
            isFullScreen={win?.isFullScreen}
            onToggleFullScreen={() => handleToggleFullScreen(win?.id)}
            scaleMode={win?.scaleMode || 'contain'}
            onScaleModeChange={(mode) => win && handleSetScaleMode(win.id, mode)}
          />
        );
    }
  };

  return (
    <div
      id="android-os-app-root"
      className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none flex flex-col"
    >
      {/* Boot Initialization Screen */}
      {isBooting && (
        <BootScreen
          device={activeDevice}
          onComplete={() => setIsBooting(false)}
        />
      )}

      {/* Screenshot Flash Effect */}
      {screenshotFlash && (
        <div className="fixed inset-0 bg-white z-[100] transition-opacity duration-200 pointer-events-none" />
      )}

      {/* Floating System Toast */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[90] bg-slate-900/95 border border-slate-700/80 text-white text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Windows 11 TitleBar */}
      <TitleBar
        activeDevice={activeDevice}
        onOpenDeviceManager={() => setIsDeviceManagerOpen(true)}
        onOpenPhoneMirror={() => handleOpenApp('phone-mirror')}
        onDisconnectDevice={() => {
          setDevices([]);
          setActiveDeviceIndex(0);
          setTelemetry(DISCONNECTED_TELEMETRY);
          showToast('Device disconnected. ADB waiting for connection.');
        }}
        isFullscreen={isFullscreen || !!openWindows.find((w) => w.isFullScreen)}
        onToggleFullscreen={() => handleToggleFullScreen()}
        isGamingModeGlobal={isGamingModeGlobal}
        onToggleGamingModeGlobal={handleToggleGamingModeGlobal}
        onSimulateReconnect={handleSimulateReconnect}
      />

      {/* Windows 10 Foundational Desktop Screen Shell */}
      <WinDesktopScreen
        wallpaper={wallpaper}
        backgroundColor="#0c0c0c"
        isStartOpen={isStartMenuOpen}
        onStartClick={() => {
          setIsStartMenuOpen((v) => !v);
          setIsQuickSettingsOpen(false);
          setIsNotificationCenterOpen(false);
        }}
        onSearchClick={() => {
          setIsStartMenuOpen(true);
          setIsQuickSettingsOpen(false);
          setIsNotificationCenterOpen(false);
        }}
        onNotificationCenterClick={() => {
          setIsNotificationCenterOpen((v) => !v);
          setIsStartMenuOpen(false);
          setIsQuickSettingsOpen(false);
        }}
        isNotificationCenterOpen={isNotificationCenterOpen}
        onQuickSettingsClick={() => {
          setIsQuickSettingsOpen((v) => !v);
          setIsStartMenuOpen(false);
          setIsNotificationCenterOpen(false);
        }}
        isQuickSettingsOpen={isQuickSettingsOpen}
        onShowDesktop={handleShowDesktop}
        unreadNotificationsCount={notifications.filter((n) => !n.read).length}
        openWindows={openWindows}
        activeWindowId={activeWindowId}
        onWindowClick={handleToggleMinimize}
        onWindowClose={handleCloseWindow}
        activeDevice={activeDevice}
        telemetry={telemetry}
        onTakeScreenshot={handleTakeScreenshot}
        onLaunchScrcpy={() => {
          fetch('/api/scrcpy/launch', { method: 'POST' })
            .then((r) => r.json())
            .then((data) => {
              if (data.success) {
                showToast('✓ Scrcpy 60 FPS native mirror launched!');
              } else {
                showToast(`Scrcpy launch: ${data.error || 'Failed'}`);
              }
            })
            .catch(() => showToast('Failed to connect to Scrcpy bridge'));
        }}
        onBackClick={() => {
          fetch('/api/adb/input/key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 4 }),
          }).catch(() => {});
        }}
        onHomeClick={() => {
          fetch('/api/adb/input/key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 3 }),
          }).catch(() => {});
        }}
        onRecentsClick={() => {
          fetch('/api/adb/input/key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 187 }),
          }).catch(() => {});
        }}
        onRotateClick={() => {
          handleToggleOrientation();
        }}
        desktopContent={
          <>
            {/* Desktop Canvas with Wallpaper and Desktop Icons */}
            <DesktopCanvas
              apps={apps}
              onOpenApp={handleOpenApp}
              wallpaper={wallpaper}
              onChangeWallpaper={setWallpaper}
              onSimulateReconnect={handleSimulateReconnect}
              onToggleGamingMode={handleToggleGamingModeGlobal}
              activeDevice={activeDevice}
              onOpenDeviceManager={() => setIsDeviceManagerOpen(true)}
              pinnedDesktopAppIds={pinnedDesktopAppIds}
              onTogglePinDesktop={handleTogglePinDesktop}
            />

            {/* Multi-Window Workspace Container */}
            <div className="absolute inset-0 pointer-events-none z-20">
              {openWindows.map((win) => (
                <div key={win.id} className="pointer-events-auto">
                  <WindowFrame
                    window={win}
                    isActive={activeWindowId === win.id}
                    onFocus={handleFocusWindow}
                    onClose={handleCloseWindow}
                    onMinimize={handleMinimizeWindow}
                    onMaximize={handleMaximizeWindow}
                    onToggleFullScreen={handleToggleFullScreen}
                    onToggleScaleMode={handleToggleScaleMode}
                    onUpdatePosition={handleUpdatePosition}
                    onUpdateSize={handleUpdateSize}
                    onToggleOrientation={handleToggleOrientation}
                    onToggleGamingMode={handleToggleGamingMode}
                    onLaunchScrcpy={handleLaunchScrcpy}
                    gameKeymaps={gameKeymaps}
                  >
                    {renderAppContent(win.appId, win)}
                  </WindowFrame>
                </div>
              ))}
            </div>
          </>
        }
        overlays={
          <>
            {/* Windows 10 Start Menu Flyout */}
            <Win10StartMenu
              isOpen={isStartMenuOpen}
              onClose={() => setIsStartMenuOpen(false)}
              apps={apps}
              onOpenApp={handleOpenApp}
              activeDevice={activeDevice}
              onOpenSettings={() => handleOpenApp('telemetry-settings')}
              onSimulateReconnect={handleSimulateReconnect}
              onRefreshApps={() => syncAdbData({ forceToast: true, forceReload: true })}
              onOpenDeviceManager={() => setIsDeviceManagerOpen(true)}
              pinnedDesktopAppIds={pinnedDesktopAppIds}
              onTogglePinDesktop={handleTogglePinDesktop}
            />

            {/* Quick Settings Flyout */}
            <QuickSettingsFlyout
              isOpen={isQuickSettingsOpen}
              onClose={() => setIsQuickSettingsOpen(false)}
              telemetry={telemetry}
              activeDevice={activeDevice}
              onUpdateTelemetry={(up) => setTelemetry((prev) => ({ ...prev, ...up }))}
              onToggleGamingMode={handleToggleGamingModeGlobal}
              isGamingMode={isGamingModeGlobal}
              onOpenSettings={() => handleOpenApp('telemetry-settings')}
            />

            {/* Notification Center */}
            <NotificationCenter
              isOpen={isNotificationCenterOpen}
              onClose={() => setIsNotificationCenterOpen(false)}
              notifications={notifications}
              onClearAll={() => setNotifications([])}
              onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
              onOpenApp={handleOpenApp}
            />

            {/* Device Switcher & ADB Pairing Modal */}
            <DeviceManagerModal
              isOpen={isDeviceManagerOpen}
              onClose={() => setIsDeviceManagerOpen(false)}
              devices={devices}
              activeDevice={activeDevice}
              onOpenMirror={() => handleOpenApp('phone-mirror')}
              onSelectDevice={(d) => {
                setDevices((prev) => {
                  const idx = prev.findIndex((x) => x.id === d.id);
                  if (idx !== -1) {
                    return prev.map((x) => (x.id === d.id ? { ...x, ...d, isOnline: true } : x));
                  }
                  return [d, ...prev];
                });
                setActiveDeviceIndex(0);
                setTelemetry((prev) => ({
                  ...prev,
                  ...ACTIVE_TELEMETRY,
                  jarConnected: true,
                  apkConnected: true,
                  allConnected: true,
                }));
                setIsDeviceManagerOpen(false);
                showToast(`Connected to ${d.name}`);
                handleOpenApp('phone-mirror');
              }}
              onDisconnectDevice={() => {
                setDevices([]);
                setActiveDeviceIndex(0);
                setTelemetry(DISCONNECTED_TELEMETRY);
                showToast('Device disconnected.');
              }}
              onConnectTestDevice={(d) => {
                setDevices([d]);
                setActiveDeviceIndex(0);
                setTelemetry(ACTIVE_TELEMETRY);
                setIsDeviceManagerOpen(false);
                showToast(`Connected to test device: ${d.name}`);
                handleOpenApp('phone-mirror');
              }}
              onAddWirelessDevice={(ip, port, name) => {
                const newDev: DeviceInfo = {
                  id: `dev-${Date.now()}`,
                  name,
                  model: name,
                  brand: 'Android',
                  connectionType: 'wifi',
                  ipAddress: ip,
                  port,
                  batteryLevel: 78,
                  isCharging: false,
                  batteryTemperature: 30.5,
                  batteryVoltage: 4.1,
                  batteryHealth: 'Good',
                  androidVersion: 'Android 14',
                  screenResolution: '2400 × 1080 FHD+',
                  refreshRate: 120,
                  fps: 60,
                  bitrateMbps: 12.0,
                  latencyMs: 14.5,
                  isOnline: true,
                };
                setDevices((prev) => [...prev, newDev]);
                setActiveDeviceIndex(devices.length);
                setTelemetry(ACTIVE_TELEMETRY);
                showToast(`Wireless pairing established with ${name} (${ip}:${port})`);
                handleOpenApp('phone-mirror');
              }}
            />
          </>
        }
      />
    </div>
  );
}
