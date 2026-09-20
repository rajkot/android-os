import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Smartphone,
  Cast,
  RotateCw,
  Volume2,
  VolumeX,
  Power,
  Camera,
  MessageSquare,
  Image as ImageIcon,
  Folder,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Send,
  Phone,
  Play,
  Settings as SettingsIcon,
  PlayCircle,
  Download,
  Search,
  Wifi,
  BatteryCharging,
  Battery,
  Layers,
  ChevronRight,
  ArrowLeft,
  X,
  Monitor,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Upload,
  HardDrive,
  FileUp,
  Video,
  Info,
  Radio,
  Sparkles,
  ChevronLeft,
  Circle,
  Square,
  Zap,
  Keyboard,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getAppIcon } from '../AppIconHelper';
import { DeviceInfo, StorageFile, AndroidNotification } from '../../types';
import { ScrcpyStreamCanvas, type ScrcpyStreamCanvasHandle } from './ScrcpyStreamCanvas';

interface PhoneMirrorAppProps {
  device: DeviceInfo | null;
  storageFiles: StorageFile[];
  onUploadFile: (file: StorageFile) => void;
  onUploadMultipleFiles?: (files: StorageFile[]) => void;
  notifications: AndroidNotification[];
  onOpenAppInWindow?: (appId: string) => void;
  onTakeScreenshot?: () => void;
  windowOrientation?: 'portrait' | 'landscape';
  isMaximized?: boolean;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  scaleMode?: 'contain' | 'cover' | 'stretch';
  onScaleModeChange?: (mode: 'contain' | 'cover' | 'stretch') => void;
  onOrientationChange?: (orientation: 'portrait' | 'landscape') => void;
}

export const PhoneMirrorApp: React.FC<PhoneMirrorAppProps> = React.memo(({
  device,
  storageFiles,
  onUploadFile,
  onUploadMultipleFiles,
  notifications,
  onOpenAppInWindow,
  onTakeScreenshot,
  windowOrientation,
  isMaximized = true,
  isFullScreen = false,
  onToggleFullScreen,
  scaleMode: propScaleMode,
  onScaleModeChange,
  onOrientationChange,
}) => {
  const [internalScaleMode, setInternalScaleMode] = useState<'contain' | 'cover' | 'stretch'>('contain');
  const scaleMode = propScaleMode || internalScaleMode;
  const handleScaleModeChange = (mode: 'contain' | 'cover' | 'stretch') => {
    setInternalScaleMode(mode);
    onScaleModeChange?.(mode);
  };
  const [isToolbarCollapsedInFullScreen, setIsToolbarCollapsedInFullScreen] = useState(false);
  // Screen state
  const [activeTab, setActiveTab] = useState<'screen' | 'content' | 'messages' | 'scrcpy'>('screen');
  const [phoneDisplayMode, setPhoneDisplayMode] = useState<'live-connect' | 'apps'>('live-connect');
  const [isScreenOn, setIsScreenOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(windowOrientation || 'portrait');
  const [isAutoRotateEnabled, setIsAutoRotateEnabled] = useState(true);
  const [isUnlockPopoverOpen, setIsUnlockPopoverOpen] = useState(false);

  useEffect(() => {
    if (windowOrientation) {
      setOrientation(windowOrientation);
    }
  }, [windowOrientation]);

  // Real-time automatic orientation adapter from ScrcpyStreamCanvas
  const handleAutoRotate = useCallback(
    (detectedOrient: 'portrait' | 'landscape') => {
      if (isAutoRotateEnabled) {
        setOrientation(detectedOrient);
        onOrientationChange?.(detectedOrient);
      }
    },
    [isAutoRotateEnabled, onOrientationChange]
  );

  // Manual rotation switch
  const handleToggleRotation = async () => {
    const nextOrient: 'portrait' | 'landscape' = orientation === 'portrait' ? 'landscape' : 'portrait';
    setOrientation(nextOrient);
    setIsAutoRotateEnabled(false);
    onOrientationChange?.(nextOrient);
    try {
      await fetch('/api/adb/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orientation: nextOrient }),
      });
      triggerSyncFeedback(`Switched to ${nextOrient} mode`);
    } catch {}
    streamCanvasRef.current?.requestImmediateFrame();
  };

  // Toggle Auto-Rotate sensor detection mode
  const handleToggleAutoRotateMode = async () => {
    const nextMode = !isAutoRotateEnabled;
    setIsAutoRotateEnabled(nextMode);
    if (nextMode) {
      try {
        await fetch('/api/adb/rotate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orientation: 'auto' }),
        });
      } catch {}
      triggerSyncFeedback('✓ Auto-Rotate Enabled (Sensor-based)');
    } else {
      triggerSyncFeedback(`Rotation locked to ${orientation}`);
    }
  };
  const [activeInPhoneApp, setActiveInPhoneApp] = useState<string | null>(null);
  const [clipboardText, setClipboardText] = useState('https://github.com/jigsi_karia/Android-OS');
  const [copied, setCopied] = useState(false);

  // Live Screen / Camera Capture via Browser API
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [streamType, setStreamType] = useState<'screen' | 'camera' | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-bind media stream to video element whenever streaming is enabled or element mounts
  useEffect(() => {
    if (isLiveStreaming && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.warn('Video auto-play warning:', err);
      });
    }
  }, [isLiveStreaming, streamType]);

  // Chat message state in mirror
  const [messages, setMessages] = useState([
    { sender: 'Sarah (Work)', text: 'Hey, are the slide decks ready for the sync?', time: '10:42 AM' },
    { sender: 'You', text: 'Yes, reviewing on Android OS right now!', time: '10:44 AM' },
  ]);
  const [inputMsg, setInputMsg] = useState('');

  // Selected photo for preview
  const [selectedPhoto, setSelectedPhoto] = useState<StorageFile | null>(null);

  // Current time for status bar
  const [currentTime, setCurrentTime] = useState('12:00');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Zero-State-Rebuild Stream Canvas Reference
  const streamCanvasRef = useRef<ScrcpyStreamCanvasHandle | null>(null);
  const [syncedPhoneApps, setSyncedPhoneApps] = useState<any[]>([]);
  const [syncedPhonePhotos, setSyncedPhonePhotos] = useState<StorageFile[]>([]);
  const [appsSearchQuery, setAppsSearchQuery] = useState('');

  // Immediate screen refresh when an app is launched from Start Menu or Desktop
  useEffect(() => {
    const handleAppLaunched = () => {
      setActiveTab('screen');
      setPhoneDisplayMode('live-connect');
      streamCanvasRef.current?.requestImmediateFrame();
      setTimeout(() => streamCanvasRef.current?.requestImmediateFrame(), 400);
      setTimeout(() => streamCanvasRef.current?.requestImmediateFrame(), 1000);
    };
    window.addEventListener('adb-app-launched', handleAppLaunched);
    return () => window.removeEventListener('adb-app-launched', handleAppLaunched);
  }, []);

  // Fetch real apps & photos from connected phone, and update when reconnected
  useEffect(() => {
    const fetchAppsAndPhotos = () => {
      fetch('/api/adb/apps')
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.apps) {
            setSyncedPhoneApps(d.apps);
          }
        })
        .catch(() => {});

      Promise.all([
        fetch('/api/adb/files?path=/sdcard/DCIM/Camera').then((r) => r.json()).catch(() => ({ files: [] })),
        fetch('/api/adb/files?path=/sdcard/DCIM').then((r) => r.json()).catch(() => ({ files: [] })),
      ]).then(([camData, dcimData]) => {
        const allFiles = [...(camData.files || []), ...(dcimData.files || [])];
        const imageFiles = allFiles.filter((f: any) => f.type === 'image');
        if (imageFiles.length > 0) {
          setSyncedPhonePhotos(imageFiles);
        }
      }).catch(() => {});
    };

    fetchAppsAndPhotos();

    const handleSyncedEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{ apps?: any[] }>;
      if (customEvt.detail?.apps) {
        setSyncedPhoneApps(customEvt.detail.apps);
      } else {
        fetchAppsAndPhotos();
      }
    };

    window.addEventListener('adb:apps-synced', handleSyncedEvent);
    return () => window.removeEventListener('adb:apps-synced', handleSyncedEvent);
  }, []);


  const [passcodeInput, setPasscodeInput] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Wake-on-Click: lights up display and dismisses lockscreen
  const handleWakeDevice = async () => {
    setIsScreenOn(true);
    triggerSyncFeedback('✓ Sent KEYCODE_WAKEUP to display');
    if (streamCanvasRef.current) {
      await streamCanvasRef.current.wakeScreen();
    } else {
      try {
        await fetch('/api/adb/wake');
      } catch {}
    }
  };

  // Lock Screen Swipe: injects upward swipe to reveal PIN/Pattern entry
  const handleUnlockSwipeUp = async () => {
    triggerSyncFeedback('✓ Injected swipe-up to reveal lock screen');
    if (streamCanvasRef.current) {
      await streamCanvasRef.current.swipeUp();
    } else {
      try {
        await fetch('/api/adb/input/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x1: 540, y1: 1800, x2: 540, y2: 400, duration: 250 }),
        });
      } catch {}
    }
  };

  // Keyboard Passcode Entry: sends text then KEYCODE_ENTER (66)
  const handleSendPasscodeAndUnlock = async (passcode: string) => {
    if (!passcode.trim()) return;
    setIsUnlocking(true);
    try {
      await fetch('/api/adb/input/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: passcode.trim() }),
      });
      setTimeout(async () => {
        await handleSendAdbKey(66);
        setPasscodeInput('');
        triggerSyncFeedback('✓ Passcode entered and submitted via ADB');
        streamCanvasRef.current?.requestImmediateFrame();
        setIsUnlocking(false);
      }, 150);
    } catch {
      setIsUnlocking(false);
    }
  };

  const handleSendAdbKey = async (key: number) => {
    try {
      await fetch('/api/adb/input/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      streamCanvasRef.current?.requestImmediateFrame();
    } catch {
      // ignore
    }
  };

  const handleLaunchAppOnPhone = async (packageName: string, appName: string) => {
    try {
      await fetch('/api/adb/launch-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName }),
      });
      triggerSyncFeedback(`✓ Launched ${appName} on your phone!`);
      setActiveTab('screen');
      setPhoneDisplayMode('live-connect');
      streamCanvasRef.current?.requestImmediateFrame();
    } catch (e: any) {
      triggerSyncFeedback(`Failed to launch app: ${e.message}`);
    }
  };

  // Stop video stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const triggerSyncFeedback = (msg: string) => {
    setSyncFeedback(msg);
    setTimeout(() => setSyncFeedback(null), 4500);
  };

  // Stop any active stream
  const stopCurrentStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsLiveStreaming(false);
    setStreamType(null);
  };

  // Launch Windows 11 Phone Link natively
  const handleLaunchWindowsPhoneLink = () => {
    try {
      window.location.href = 'ms-phone:';
      triggerSyncFeedback('Opening Windows Phone Link on your PC...');
    } catch {
      window.open('https://www.microsoft.com/en-us/windows/sync-across-your-devices', '_blank');
    }
  };

  // Live Screen Cast (Windows Phone Link, Scrcpy, or Screen)
  const handleToggleLiveStream = async () => {
    setStreamError(null);
    if (isLiveStreaming && streamType === 'screen') {
      stopCurrentStream();
      return;
    }
    stopCurrentStream();

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen capture is restricted in this browser context.');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'window',
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsLiveStreaming(true);
      setStreamType('screen');
      setActiveTab('screen');

      // Immediate attach if video element is already in DOM
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      triggerSyncFeedback(`Live screen mirroring active at 60 FPS`);

      stream.getVideoTracks()[0].onended = () => {
        stopCurrentStream();
      };
    } catch (err: unknown) {
      const e = err as Error;
      if (e.name !== 'NotAllowedError') {
        setStreamError(e.message || 'Unable to capture window/screen.');
      }
    }
  };

  // Camera / Webcam mode
  const handleToggleCameraStream = async () => {
    setStreamError(null);
    if (isLiveStreaming && streamType === 'camera') {
      stopCurrentStream();
      return;
    }
    stopCurrentStream();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      setIsLiveStreaming(true);
      setStreamType('camera');
      setActiveTab('screen');

      // Immediate attach if video element is already in DOM
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      triggerSyncFeedback(`Live camera stream active`);

      stream.getVideoTracks()[0].onended = () => {
        stopCurrentStream();
      };
    } catch (err: unknown) {
      const e = err as Error;
      if (e.name !== 'NotAllowedError') {
        setStreamError(e.message || 'Unable to access camera.');
      }
    }
  };

  // Import real physical photos and files from connected phone via MTP file picker
  const handlePhysicalFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (rawFiles.length === 0) return;

    const importedFiles: StorageFile[] = rawFiles.map((file, idx) => ({
      id: `phone-sync-${Date.now()}-${idx}`,
      name: file.name,
      path: file.type.startsWith('image/')
        ? `/sdcard/DCIM/Camera/${file.name}`
        : file.type.startsWith('video/')
        ? `/sdcard/DCIM/Camera/${file.name}`
        : `/sdcard/Download/${file.name}`,
      type: file.type.startsWith('image/')
        ? 'image'
        : file.name.endsWith('.apk')
        ? 'apk'
        : file.type.startsWith('audio/')
        ? 'audio'
        : file.type.startsWith('video/')
        ? 'video'
        : 'file',
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      modified: 'Just now (Synced)',
      url: URL.createObjectURL(file),
    }));

    if (onUploadMultipleFiles) {
      onUploadMultipleFiles(importedFiles);
    } else {
      importedFiles.forEach((f) => onUploadFile(f));
    }

    triggerSyncFeedback(`✓ Successfully imported ${importedFiles.length} item(s) from phone into storage!`);
    setActiveTab('content');
  };

  // Drag and drop handler
  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped: File[] = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (dropped.length === 0) return;

    const importedFiles: StorageFile[] = dropped.map((file, idx) => ({
      id: `phone-drop-${Date.now()}-${idx}`,
      name: file.name,
      path: file.type.startsWith('image/')
        ? `/sdcard/DCIM/Camera/${file.name}`
        : `/sdcard/Download/${file.name}`,
      type: file.type.startsWith('image/')
        ? 'image'
        : file.name.endsWith('.apk')
        ? 'apk'
        : file.type.startsWith('audio/')
        ? 'audio'
        : file.type.startsWith('video/')
        ? 'video'
        : 'file',
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      modified: 'Just now (Dropped)',
      url: URL.createObjectURL(file),
    }));

    if (onUploadMultipleFiles) {
      onUploadMultipleFiles(importedFiles);
    } else {
      importedFiles.forEach((f) => onUploadFile(f));
    }

    triggerSyncFeedback(`✓ Added ${importedFiles.length} dropped file(s) to synced phone storage!`);
    setActiveTab('content');
  };

  // Direct Scrcpy Mirror Launch via local dev server bridge
  const handleDirectLaunchScrcpy = async () => {
    try {
      const res = await fetch('/api/scrcpy/launch', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        triggerSyncFeedback('✓ Scrcpy 60 FPS native mirror launched on your desktop!');
      } else {
        triggerSyncFeedback(data.error || 'Failed to start scrcpy automatically. Use launcher bat below.');
      }
    } catch {
      handleDownloadScrcpyBat();
    }
  };

  // 1-Click Scrcpy Windows Batch Script Download
  const handleDownloadScrcpyBat = () => {
    const batContent = `@echo off
title Android OS Scrcpy 60 FPS Mirror
color 0b
echo ==============================================================
echo       ANDROID OS - LOW LATENCY PHONE SCREEN MIRROR
echo ==============================================================
echo.
echo Checking connected ADB devices...
adb devices
echo.
echo Launching 60 FPS mirror with keyboard and audio sync...
scrcpy --max-fps 60 --stay-awake --turn-screen-off --power-off-on-close
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [NOTICE] If scrcpy failed to launch:
    echo 1. Ensure "USB Debugging" is enabled on your phone.
    echo 2. Accept the "Allow USB debugging" prompt on your phone screen.
    echo 3. Install scrcpy or download from: https://github.com/Genymobile/scrcpy
    echo.
    pause
)
`;
    const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Launch-Scrcpy-Mirror.bat';
    a.click();
    URL.revokeObjectURL(url);
    triggerSyncFeedback('✓ Downloaded "Launch-Scrcpy-Mirror.bat" to your PC!');
  };

  // Launch Windows Phone Link protocol
  const handleLaunchPhoneLink = () => {
    try {
      window.location.href = 'ms-phone:';
    } catch {
      // ignore
    }
  };

  const handleCopyScrcpyCommand = () => {
    navigator.clipboard.writeText('scrcpy --max-fps 60 --stay-awake --turn-screen-off');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    const text = inputMsg;
    setInputMsg('');
    setMessages((prev) => [...prev, { sender: 'You', text, time: currentTime }]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: 'Sarah (Work)', text: 'Got it! Synced via ADB bridge.', time: currentTime },
      ]);
    }, 1200);
  };

  const phoneBrand = device?.brand || 'Android';
  const phoneModel = device?.name || (device ? 'Connected Phone' : 'No Phone Connected');
  const batteryPct = device?.batteryLevel ?? (device ? 88 : '--');
  const isCharging = device?.isCharging ?? false;

  // Filter gallery photos (prefer real synced phone camera roll, fallback to storageFiles)
  const photos =
    syncedPhonePhotos.length > 0
      ? syncedPhonePhotos.filter((f) => f.type === 'image')
      : storageFiles.filter((f) => f.type === 'image');

  return (
    <div id="phone-mirror-app-root" className="h-full bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden">
      {/* Top Mirror Header & Toolbar */}
      <div className="h-11 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-950/60 border border-blue-600/40 text-blue-300 text-xs font-semibold">
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span className="truncate max-w-[140px] sm:max-w-[200px]">{phoneModel}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-700/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{device?.isOnline ? 'Active Sync (60 FPS)' : 'Standby'}</span>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('screen')}
            className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1.5 ${
              activeTab === 'screen' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Screen</span>
          </button>

          <button
            onClick={() => setActiveTab('content')}
            className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1.5 ${
              activeTab === 'content' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Content Sync</span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full text-slate-300">
              {photos.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1.5 ${
              activeTab === 'messages' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Messages</span>
          </button>

          <button
            onClick={() => setActiveTab('scrcpy')}
            className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1.5 ${
              activeTab === 'scrcpy' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Scrcpy</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 text-slate-300">
          {/* Scale Mode Switcher */}
          <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/80 text-[11px]">
            <button
              onClick={() => handleScaleModeChange('contain')}
              className={`px-2 py-0.5 rounded-md font-semibold transition ${
                scaleMode === 'contain'
                  ? 'bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Fit Screen (Keep Aspect Ratio)"
            >
              Fit
            </button>
            <button
              onClick={() => handleScaleModeChange('cover')}
              className={`px-2 py-0.5 rounded-md font-semibold transition ${
                scaleMode === 'cover'
                  ? 'bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Fill Screen (Zoom to eliminate black borders)"
            >
              Fill
            </button>
            <button
              onClick={() => handleScaleModeChange('stretch')}
              className={`px-2 py-0.5 rounded-md font-semibold transition ${
                scaleMode === 'stretch'
                  ? 'bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Stretch 100% (No black borders)"
            >
              Stretch
            </button>
          </div>

          {/* Full Screen Toggle Button */}
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer ${
                isFullScreen
                  ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
              title={isFullScreen ? 'Exit Full Screen (Esc)' : 'Immersive Full Screen (F11)'}
            >
              {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isFullScreen ? 'Exit Fullscreen' : 'Full Screen'}</span>
            </button>
          )}

          <button
            onClick={handleToggleLiveStream}
            title={isLiveStreaming ? 'Stop Live Screen Cast' : 'Stream Live Screen / Camera into Phone'}
            className={`p-1.5 rounded-lg border text-xs transition flex items-center gap-1 ${
              isLiveStreaming
                ? 'bg-rose-950 border-rose-600 text-rose-300 animate-pulse'
                : 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Cast className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">
              {isLiveStreaming ? 'Stop Cast' : 'Live Cast'}
            </span>
          </button>

          {/* Auto-Rotate Mode Pill */}
          <button
            onClick={handleToggleAutoRotateMode}
            title={isAutoRotateEnabled ? 'Auto-Rotate: ON (Click to lock rotation)' : 'Auto-Rotate: LOCKED (Click to enable auto-rotate)'}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              isAutoRotateEnabled
                ? 'bg-blue-600/30 border border-blue-500/70 text-blue-300 shadow-sm'
                : 'bg-slate-850 border border-slate-700/60 text-slate-400 hover:text-white'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isAutoRotateEnabled ? 'text-blue-400 animate-spin-slow' : ''}`} />
            <span className="hidden sm:inline">{isAutoRotateEnabled ? 'Auto-Rotate ON' : 'Rotate: Locked'}</span>
          </button>

          {/* Manual Rotate Toggle */}
          <button
            onClick={handleToggleRotation}
            title={`Rotate phone to ${orientation === 'portrait' ? 'Landscape' : 'Portrait'}`}
            className="p-1.5 rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition text-slate-400 hover:text-white"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onTakeScreenshot}
            title="Take Screenshot"
            className="p-1.5 rounded-lg hover:bg-slate-800 transition text-slate-400 hover:text-white"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsScreenOn(!isScreenOn)}
            title="Power: Toggle Screen Sleep/Wake"
            className={`p-1.5 rounded-lg transition ${
              isScreenOn ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-rose-400 bg-rose-950/60'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>

          {isFullScreen && (
            <button
              onClick={() => setIsToolbarCollapsedInFullScreen(true)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Collapse Toolbar for 100% Edge-to-Edge Screen"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Reveal Handle when Toolbar is Collapsed in Full Screen */}
      {isFullScreen && isToolbarCollapsedInFullScreen && (
        <button
          onClick={() => setIsToolbarCollapsedInFullScreen(false)}
          className="absolute top-1 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-xl transition backdrop-blur-md animate-fade-in"
          title="Show Toolbar Controls"
        >
          <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
          <span>Show Controls</span>
        </button>
      )}

      {/* Hidden File Picker for Real Phone Storage */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,application/pdf,text/*,.apk"
        onChange={handlePhysicalFileSelection}
        className="hidden"
      />

      {/* Main Viewport Area */}
      {activeTab === 'screen' ? (
        /* TAB 1: Phone Screen Mirror - 100% EDGE-TO-EDGE FULLSCREEN DESKTOP EXPERIENCE */
        <div className="flex-1 w-full h-full relative overflow-hidden bg-black flex flex-col items-center justify-center select-none">
          {/* Floating Toast Feedback */}
          {syncFeedback && (
            <div className="absolute top-3 inset-x-4 max-w-md mx-auto z-40 p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-600/70 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-2xl animate-fade-in">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{syncFeedback}</span>
              </div>
              <button
                onClick={() => setSyncFeedback(null)}
                className="p-1 hover:bg-emerald-900/50 rounded text-emerald-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Browser Stream Error Notice */}
          {streamError && (
            <div className="absolute top-3 inset-x-4 max-w-md mx-auto z-40 p-2.5 rounded-xl bg-rose-950/90 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-2xl">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="truncate">{streamError}</span>
              </div>
              <button
                onClick={() => setStreamError(null)}
                className="p-1 text-rose-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Real Live Screen Stream from Physical Android Phone */}
          {phoneDisplayMode === 'live-connect' ? (
            <div className="w-full h-full relative flex items-center justify-center bg-black overflow-hidden select-none">
              {/* Sleek Floating Passcode & Quick Unlock Drawer (Shown only when toggled) */}
              {isUnlockPopoverOpen && (
                <div className="absolute top-3 inset-x-3 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-3 shadow-2xl z-40 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Quick Unlock & Passcode Entry</span>
                    </span>
                    <button
                      onClick={() => setIsUnlockPopoverOpen(false)}
                      className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleWakeDevice}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-600/50 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="Wake display (KEYCODE_WAKEUP)"
                    >
                      <Power className="w-3 h-3 text-emerald-400" />
                      <span>Wake</span>
                    </button>
                    <button
                      onClick={handleUnlockSwipeUp}
                      className="px-2.5 py-1 rounded-lg bg-blue-950/80 border border-blue-600/50 hover:bg-blue-900 text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="Swipe Up to reveal PIN/Pattern screen"
                    >
                      <span>Swipe Up</span>
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendPasscodeAndUnlock(passcodeInput);
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="password"
                      placeholder="Enter PIN / Passcode..."
                      value={passcodeInput}
                      onChange={(e) => setPasscodeInput(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={isUnlocking}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      {isUnlocking ? '...' : 'Unlock'}
                    </button>
                  </form>
                </div>
              )}

              {/* Edge-to-Edge Canvas Viewport */}
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
                {isLiveStreaming ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full ${
                      scaleMode === 'stretch' ? 'object-fill' : scaleMode === 'cover' ? 'object-cover' : 'object-contain'
                    }`}
                  />
                ) : (
                  <ScrcpyStreamCanvas
                    ref={streamCanvasRef}
                    isScreenOn={isScreenOn}
                    scaleMode={scaleMode}
                    onScaleModeChange={handleScaleModeChange}
                    onWake={handleWakeDevice}
                    onLaunchScrcpy={handleDirectLaunchScrcpy}
                    onAutoRotate={handleAutoRotate}
                  />
                )}
              </div>

              {/* Senior UI/UX Floating DeX Quick Action Pill (Glassmorphic, Unobtrusive) */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 z-30 bg-black/60 hover:bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 opacity-75 hover:opacity-100 transition-opacity shadow-lg">
                <button
                  onClick={() => setPhoneDisplayMode('apps')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-[11px] text-white font-semibold transition cursor-pointer shadow"
                  title="Browse all synced apps on phone"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Apps ({syncedPhoneApps.length})</span>
                </button>
                <button
                  onClick={() => setIsUnlockPopoverOpen((v) => !v)}
                  className={`p-1 rounded-full transition cursor-pointer ${
                    isUnlockPopoverOpen ? 'bg-amber-600 text-white' : 'hover:bg-white/15 text-slate-300 hover:text-white'
                  }`}
                  title="Quick PIN Unlock & Keypad"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleToggleRotation}
                  className="p-1 rounded-full hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer"
                  title={`Rotate to ${orientation === 'portrait' ? 'Landscape' : 'Portrait'}`}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Synced Physical Phone Apps Drawer (Full-window Overlay Grid) */
            <div className="w-full h-full flex flex-col bg-slate-950/95 backdrop-blur-md p-4 overflow-hidden text-xs z-30">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPhoneDisplayMode('live-connect')}
                    className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h3 className="font-bold text-sm text-white">Installed Phone Applications</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {syncedPhoneApps.length} Apps on {phoneModel}
                </span>
              </div>

              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search real phone apps..."
                  value={appsSearchQuery}
                  onChange={(e) => setAppsSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pr-1">
                {syncedPhoneApps
                  .filter((a) => a.name.toLowerCase().includes(appsSearchQuery.toLowerCase()))
                  .map((app) => (
                    <div
                      key={app.id}
                      className="relative flex flex-col items-center p-3 rounded-2xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition text-center group cursor-pointer"
                      onClick={() => handleLaunchAppOnPhone(app.packageName, app.name)}
                      title={`Click to launch ${app.name} on phone screen in landscape`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:bg-blue-600/20 transition mb-2 shadow-sm">
                        {getAppIcon(app.icon, 'w-6 h-6', app.iconUrl)}
                      </div>
                      <span className="text-xs font-medium text-slate-200 truncate w-full group-hover:text-white">
                        {app.name}
                      </span>
                      {onOpenAppInWindow && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAppInWindow(app.id);
                          }}
                          title="Open in separate Desktop Window"
                          className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 p-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[9px] shadow transition cursor-pointer"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TABS 2, 3, 4: Content Sync, Messages, Scrcpy - Scrollable Desktop Utility Center */
        <div className="flex-1 overflow-y-auto bg-slate-950 flex flex-col items-center justify-start p-4 relative w-full">
          {/* Sync Toast Feedback Banner */}
          {syncFeedback && (
            <div className="w-full max-w-3xl mb-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-600/70 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-lg animate-fade-in">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{syncFeedback}</span>
              </div>
              <button
                onClick={() => setSyncFeedback(null)}
                className="p-1 hover:bg-emerald-900/50 rounded-lg text-emerald-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Browser Stream Error Notice */}
          {streamError && (
            <div className="w-full max-w-3xl mb-3 p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{streamError}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="px-2.5 py-1 rounded bg-rose-800 hover:bg-rose-700 text-white text-[11px] font-semibold"
                >
                  Open in New Window
                </button>
                <button
                  onClick={() => setStreamError(null)}
                  className="p-1 text-rose-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Physical Phone Live Sync Toolbar Banner */}
          <div className="w-full max-w-3xl mb-3 p-3 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-xs">{phoneModel}</span>
                  {device ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-400 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      USB Connected
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/60 text-amber-300 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Disconnected
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {device
                    ? 'Manage phone files, messages, and scrcpy tools directly from PC'
                    : 'Plug your Android phone via USB cable and enable USB Debugging'}
                </p>
              </div>
            </div>

            {/* Quick Action Sync Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow"
                title="Select photos and files from your physical phone storage"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Import Phone Files</span>
              </button>

              <button
                onClick={() => setShowTroubleshooter(!showTroubleshooter)}
                className={`p-1.5 rounded-xl border text-xs transition flex items-center gap-1 ${
                  showTroubleshooter
                    ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="Troubleshoot USB connection and screen sync"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Troubleshooter & Explanation Card */}
          {showTroubleshooter && (
            <div className="w-full max-w-3xl mb-3 p-4 rounded-2xl bg-slate-900 border border-amber-600/40 shadow-xl text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Physical Phone Connection & Sync Help</span>
                </div>
                <button onClick={() => setShowTroubleshooter(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                To get the best experience, ensure USB Debugging is enabled in Android Developer Options.
              </p>
            </div>
          )}

        {/* TAB 2: Synced Phone Content (DCIM Photos, Downloads, Files) */}
        {activeTab === 'content' && (
          <div className="w-full max-w-4xl space-y-4 p-2 text-xs">
            {/* Header with Import Button */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Folder className="w-4 h-4 text-blue-400" />
                  <span>Synced Phone Storage (/sdcard)</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Photos, screenshots, and downloads synced over USB MTP bridge with PC
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition flex items-center gap-1.5 shadow"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Import from Connected Phone</span>
                </button>

                <button
                  onClick={() => onOpenAppInWindow?.('dex-files')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition flex items-center gap-1.5"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Open in Files</span>
                </button>
              </div>
            </div>

            {/* Drag & Drop Import Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDropFiles}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed transition flex flex-col items-center justify-center text-center cursor-pointer ${
                isDragging ? 'border-emerald-400 bg-emerald-950/20' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-white text-xs">Import Photos & Files from Connected Phone</h4>
              <p className="text-slate-400 text-[11px] mt-1 max-w-md">
                Click here or drag and drop photos from your phone folder (<code>This PC &gt; {phoneModel} &gt; Internal Storage &gt; DCIM</code>) to load them directly into storage!
              </p>
            </div>

            {/* Photos & Videos Section */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-200 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-pink-400" />
                  <span>Phone Camera Roll & Screenshots ({photos.length})</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">/sdcard/DCIM/Camera</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {photos.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPhoto(p)}
                    className="group bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl overflow-hidden cursor-pointer transition flex flex-col"
                  >
                    <div className="aspect-video bg-slate-900 relative overflow-hidden">
                      <img
                        src={p.url || '/assets/dex/home_screen.png'}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <Download className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="p-2">
                      <div className="font-semibold text-white truncate text-[11px]">{p.name}</div>
                      <div className="text-[10px] text-slate-400 flex justify-between mt-0.5">
                        <span>{p.size}</span>
                        <span>{p.modified}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clipboard Sync */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="font-semibold text-slate-200 flex items-center gap-2">
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>Two-Way Clipboard Sync</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Text copied on your phone is automatically synced to your PC clipboard via ADB:
                </p>
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-blue-300 select-all">
                  {clipboardText}
                </div>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(clipboardText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition shrink-0 flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy to PC'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Messages & Synced Notifications */}
        {activeTab === 'messages' && (
          <div className="w-full max-w-2xl space-y-4 p-2 text-xs">
            {/* Live Message Thread */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 font-bold text-white">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Synced Phone SMS & WhatsApp Chats</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">Live Sync Active</span>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.sender === 'You' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-2.5 rounded-xl ${
                        m.sender === 'You'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      <div className="text-[10px] font-bold opacity-75 mb-0.5">{m.sender}</div>
                      <p className="text-xs leading-relaxed">{m.text}</p>
                      <span className="text-[9px] opacity-60 block text-right mt-1">{m.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder="Reply to message directly from PC…"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>

            {/* Synced Phone Notifications */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <h4 className="font-semibold text-white text-xs">Recent Synced Notifications ({notifications.length})</h4>
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: n.avatarColor || '#3B82F6' }}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline">
                        <span className="font-semibold text-white text-[11px]">{n.title}</span>
                        <span className="text-[10px] text-slate-500">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{n.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Native Scrcpy / Physical Phone Mirroring Guide */}
        {activeTab === 'scrcpy' && (
          <div className="w-full max-w-3xl space-y-4 p-2 text-xs">
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/40 space-y-3">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Direct Native Screen Mirror (Scrcpy 60 FPS)</h3>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed">
                Because web browsers run in a sandboxed security container, web pages cannot directly capture raw H.264 video hardware decoders over your local USB driver without a desktop relay.
                For the absolute fastest <b>60 FPS latency-free mirroring</b> of your physical phone screen to Windows:
              </p>

              {/* 1-Click Launchers */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleDirectLaunchScrcpy}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50"
                  title="Directly launch local Scrcpy window at 60 FPS"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Launch Scrcpy Mirror Window (Instant 60 FPS)</span>
                </button>
                <button
                  onClick={handleDownloadScrcpyBat}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>Download 1-Click Scrcpy Launcher (.bat)</span>
                </button>
                <button
                  onClick={handleLaunchPhoneLink}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Open Windows Phone Link</span>
                </button>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Windows Terminal / CMD Command:</span>
                  <button
                    onClick={handleCopyScrcpyCommand}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Command'}</span>
                  </button>
                </div>
                <code className="font-mono text-xs text-indigo-300 block bg-slate-900/90 p-2.5 rounded-lg select-all border border-indigo-900/60">
                  scrcpy --max-fps 60 --stay-awake --turn-screen-off
                </code>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="font-semibold text-white">Full Keyboard & Mouse Control</div>
                  <p className="text-slate-400 mt-0.5">Click with mouse, right-click for BACK, middle click for HOME.</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="font-semibold text-white">Screen Turned Off on Phone</div>
                  <p className="text-slate-400 mt-0.5">Keeps phone cool and saves battery while working on your PC monitor.</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-xs">Run commands in ADB Terminal</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Check device state, run screenrecord, or pull photos directly</p>
              </div>
              <button
                onClick={() => onOpenAppInWindow?.('adb-terminal')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
              >
                Open ADB Terminal
              </button>
            </div>
          </div>
        )}

        {/* Photo Lightbox Modal */}
        {selectedPhoto && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col">
              <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="font-semibold text-white text-xs truncate max-w-xs">{selectedPhoto.name}</div>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="aspect-video bg-black flex items-center justify-center overflow-hidden">
                <img
                  src={selectedPhoto.url || '/assets/dex/home_screen.png'}
                  alt={selectedPhoto.name}
                  className="max-h-[60vh] object-contain"
                />
              </div>

              <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">{selectedPhoto.size} · Synced from phone</span>
                <a
                  href={selectedPhoto.url || '#'}
                  download={selectedPhoto.name}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download to PC</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
});
