import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  RotateCcw,
  Zap,
  RefreshCw,
  ChevronLeft,
  Circle,
  Square,
  Power,
  Keyboard,
  Send,
  ExternalLink,
  Sliders,
  Layers,
  ThumbsUp,
  Share2,
  Bookmark,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Globe,
  Smile,
  Compass,
  Check,
  CheckCircle2,
  Sparkles,
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react';

import { AppDefinition, DeviceInfo } from '../../types';
import { getAppIcon } from '../AppIconHelper';
import { ScrcpyStreamCanvas } from './ScrcpyStreamCanvas';

interface GenericAndroidAppProps {
  appId: string;
  appDef?: AppDefinition;
  activeDevice?: DeviceInfo | null;
  onOpenPhoneMirror?: () => void;
  scaleMode?: 'contain' | 'cover' | 'stretch';
  onScaleModeChange?: (mode: 'contain' | 'cover' | 'stretch') => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const GenericAndroidApp: React.FC<GenericAndroidAppProps> = React.memo(({
  appId,
  appDef,
  activeDevice,
  onOpenPhoneMirror,
  scaleMode = 'contain',
  onScaleModeChange,
  isFullScreen = false,
  onToggleFullScreen,
}) => {
  const cleanPackage = React.useMemo(() => {
    let raw = appDef?.packageName || appId;
    while (raw.startsWith('package:')) raw = raw.substring('package:'.length).trim();
    while (raw.startsWith('phone-app-')) raw = raw.substring('phone-app-'.length).trim();
    if (raw.includes('?')) raw = raw.split('?')[0].trim();
    return raw.trim();
  }, [appDef, appId]);

  const appName = appDef?.name || cleanPackage.split('.').pop() || 'Android App';
  const isRealPhoneApp = !!cleanPackage && !cleanPackage.startsWith('com.androiddex.');

  // Default to live view if device is connected or it's a real phone app
  const [viewMode, setViewMode] = useState<'live' | 'simulation'>(() => {
    return isRealPhoneApp ? 'live' : 'simulation';
  });

  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);

  const showFeedback = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 3000);
  };

  // 1. Android Key Events
  const handleSendAdbKey = async (key: number, name: string) => {
    try {
      await fetch('/api/adb/input/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
    } catch (err: any) {
      showFeedback(`Key error: ${err.message}`);
    }
  };

  // 2. Send typed text
  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const textToSend = textInput;
    setTextInput('');
    try {
      await fetch('/api/adb/input/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend }),
      });
      showFeedback(`Sent text to ${appName}`);
    } catch (err: any) {
      showFeedback(`Text error: ${err.message}`);
    }
  };

  // 3. Relaunch App on Phone
  const handleRelaunchApp = async () => {
    setIsLaunching(true);
    showFeedback(`Launching ${appName} on phone…`);
    try {
      const res = await fetch('/api/adb/launch-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName: cleanPackage }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback(`✓ Foregrounded ${appName}`);
      } else {
        showFeedback(`⚠️ ${data.error || 'Launch failed'}`);
      }
    } catch (err: any) {
      showFeedback(`⚠️ Launch failed: ${err.message}`);
    } finally {
      setIsLaunching(false);
    }
  };

  // 6. Native Scrcpy 60 FPS window launch
  const handleLaunchNativeScrcpy = async () => {
    showFeedback('Popping up 60 FPS native hardware mirror…');
    try {
      const res = await fetch('/api/scrcpy/launch', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showFeedback('✓ Scrcpy 60 FPS mirror launched on Windows desktop!');
      } else {
        showFeedback(`⚠️ Scrcpy error: ${data.error || 'Failed'}`);
      }
    } catch (err: any) {
      showFeedback(`⚠️ Scrcpy bridge error: ${err.message}`);
    }
  };

  // Simulation states
  const [messages, setMessages] = useState([
    { sender: 'other', text: `Welcome to ${appName}! Synced seamlessly with Android OS.`, time: '14:20' },
    { sender: 'user', text: 'Running via Direct ADB Mirror & Multi-Window container.', time: '14:21' },
  ]);
  const [newMsg, setNewMsg] = useState('');
  const [browserUrl, setBrowserUrl] = useState('https://google.com');

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    const text = newMsg;
    setMessages((prev) => [...prev, { sender: 'user', text, time: 'Just now' }]);
    setNewMsg('');
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: 'other', text: 'Message synced via Android OS bridge!', time: 'Just now' },
      ]);
    }, 1000);
  };

  return (
    <div className="h-full w-full bg-black text-slate-100 flex flex-col select-none overflow-hidden font-sans relative">
      {/* Main Viewport Area */}
      <div className="flex-1 w-full h-full relative flex flex-col items-center justify-center overflow-hidden bg-black">
        {viewMode === 'live' ? (
          /* LIVE ADB MIRROR VIEWPORT - 100% EDGE-TO-EDGE FULLSCREEN DESKTOP EXPERIENCE */
          <div className="w-full h-full relative flex items-center justify-center bg-black select-none overflow-hidden">
            {/* Live Interactive Screen Frame (Double-Buffered Canvas) */}
            <ScrcpyStreamCanvas
              scaleMode={scaleMode}
              onScaleModeChange={onScaleModeChange}
              onLaunchScrcpy={handleLaunchNativeScrcpy}
            />

            {/* Senior UX Floating Sleek Action Bar - Minimal Glassmorphic Overlay */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 z-30 bg-black/60 hover:bg-black/85 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 opacity-70 hover:opacity-100 transition-opacity shadow-lg">
              {statusToast && (
                <span className="text-[10px] text-cyan-300 px-1 font-mono truncate max-w-[120px]">
                  {statusToast}
                </span>
              )}
              {onScaleModeChange && (
                <button
                  onClick={() => {
                    const next: 'contain' | 'cover' | 'stretch' =
                      scaleMode === 'contain' ? 'stretch' : scaleMode === 'stretch' ? 'cover' : 'contain';
                    onScaleModeChange(next);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 hover:bg-white/20 text-cyan-300 transition"
                  title={`Scaling: ${scaleMode}. Click to toggle Fit / Stretch / Fill`}
                >
                  {scaleMode === 'stretch' ? 'Stretch' : scaleMode === 'cover' ? 'Fill' : 'Fit'}
                </button>
              )}
              {onToggleFullScreen && (
                <button
                  onClick={onToggleFullScreen}
                  className={`p-1 rounded-full transition cursor-pointer ${
                    isFullScreen ? 'bg-cyan-500 text-black' : 'hover:bg-white/15 text-slate-300 hover:text-white'
                  }`}
                  title={isFullScreen ? 'Exit Fullscreen (Esc)' : 'Immersive Full Screen (F11)'}
                >
                  {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                onClick={handleRelaunchApp}
                disabled={isLaunching}
                title={`Bring ${appName} to Foreground`}
                className="p-1 hover:bg-white/15 rounded-full text-slate-300 hover:text-white transition cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 text-cyan-400 ${isLaunching ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowKeyInput((v) => !v)}
                title="Send Keyboard Text to App"
                className={`p-1 rounded-full transition cursor-pointer ${
                  showKeyInput ? 'bg-cyan-600 text-white' : 'hover:bg-white/15 text-slate-300 hover:text-white'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleLaunchNativeScrcpy}
                title="Launch 60 FPS hardware mirror window"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-[10px] transition cursor-pointer"
              >
                <Zap className="w-2.5 h-2.5 fill-current" />
                <span>60 FPS</span>
              </button>
              <button
                onClick={() => setViewMode('simulation')}
                title="View App Details & Diagnostics"
                className="p-1 hover:bg-white/15 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Text Typing Drawer (Floating at bottom when active) */}
            {showKeyInput && (
              <form
                onSubmit={handleSendText}
                className="absolute bottom-3 inset-x-3 max-w-lg mx-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-2 flex items-center gap-2 z-40 shadow-2xl animate-in fade-in slide-in-from-bottom-2"
              >
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={`Type text to send to ${appName}…`}
                  autoFocus
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition flex items-center gap-1 cursor-pointer shadow"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowKeyInput(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  ✕
                </button>
              </form>
            )}
          </div>
        ) : (
          /* SIMULATED VIEWPORT / DETAILED APP CONTAINER */
          <div className="flex-1 w-full h-full overflow-y-auto bg-slate-950 flex flex-col">
            {/* Simulation Header */}
            <div className="bg-slate-900/80 border-b border-slate-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-md">
                  {getAppIcon(appDef?.icon || 'Smartphone', 'w-7 h-7', appDef?.iconUrl || `/api/adb/icon?package=${cleanPackage}`)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{appName}</h2>
                  <p className="text-xs text-slate-400 font-mono">{cleanPackage}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('live')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Switch to Live Screen</span>
                </button>
              </div>
            </div>

            {/* Sub-app Specific Simulated UIs */}
            {cleanPackage.includes('youtube') ? (
              <div className="p-4 space-y-4 flex-1">
                <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                  <img src="/assets/dex/home_screen.png" alt="YouTube Preview" className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-red-500 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/40">
                        1080p60 HDR
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1">
                        Android OS Desktop: Native Android Multi-Window Performance Test
                      </h3>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs text-slate-400">Android OS Tech · 1.4M views</span>
                  <button onClick={() => setViewMode('live')} className="px-3 py-1 rounded bg-white text-black text-xs font-bold">
                    Watch in Live App
                  </button>
                </div>
              </div>
            ) : cleanPackage.includes('chrome') ? (
              <div className="flex-1 flex flex-col">
                <div className="bg-slate-900 border-b border-slate-800 p-2 flex items-center gap-2 text-xs">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <input
                    type="text"
                    value={browserUrl}
                    onChange={(e) => setBrowserUrl(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200"
                  />
                  <button onClick={() => setViewMode('live')} className="px-2 py-1 bg-blue-600 rounded text-[11px] text-white font-medium">
                    Open in Live Chrome
                  </button>
                </div>
                <div className="p-6 text-center text-slate-400 my-auto">
                  <p className="text-sm font-medium text-white">Google Chrome Web Browser</p>
                  <p className="text-xs mt-1">Click "Switch to Live Screen" above to browse websites live on your phone!</p>
                </div>
              </div>
            ) : cleanPackage.includes('whatsapp') ? (
              <div className="flex-1 flex flex-col">
                <div className="p-3 bg-emerald-950/60 border-b border-emerald-800/40 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-300">WhatsApp Business</span>
                  <button onClick={() => setViewMode('live')} className="text-[11px] text-emerald-400 underline font-semibold">
                    Open Live WhatsApp
                  </button>
                </div>
                <div className="flex-1 p-3 space-y-2 overflow-y-auto text-xs">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`max-w-[80%] p-2 rounded-xl ${
                        m.sender === 'user' ? 'ml-auto bg-emerald-700 text-white' : 'mr-auto bg-slate-800 text-slate-200'
                      }`}
                    >
                      <p>{m.text}</p>
                      <span className="text-[9px] opacity-70 block text-right mt-0.5">{m.time}</span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendWhatsApp} className="p-2 bg-slate-900 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    placeholder="Type a simulated message…"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <button type="submit" className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs">
                    Send
                  </button>
                </form>
              </div>
            ) : (
              /* Universal Android App Telemetry & Diagnostics Inspector */
              <div className="p-6 space-y-6 max-w-xl mx-auto w-full">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase">Package Name</span>
                    <span className="font-mono font-semibold text-slate-200 break-all">{cleanPackage}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase">Category</span>
                    <span className="font-semibold text-slate-200">{appDef?.category || 'Android Application'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase">Screen Pipeline</span>
                    <span className="font-semibold text-emerald-400">60 FPS Direct Surface</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase">Target Device</span>
                    <span className="font-semibold text-blue-400">{activeDevice?.name || 'Xiaomi Redmi 8A Dual'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Instant Execution Options</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This Android app is installed on your physical device. You can interact with it directly inside this window via live ADB mirroring, or launch a dedicated zero-latency 60 FPS window.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => setViewMode('live')}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center gap-2 shadow cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Interact in Live Screen</span>
                    </button>
                    <button
                      onClick={handleLaunchNativeScrcpy}
                      className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition flex items-center gap-2 shadow cursor-pointer"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Pop Out 60 FPS Window</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
