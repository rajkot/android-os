import React, { useState, useEffect } from 'react';
import { AppDefinition, DeviceInfo } from '../types';
import { getAppIcon } from './AppIconHelper';
import { WALLPAPERS } from '../data/initialData';
import { Win10DesktopIcon } from './desktop/Win10DesktopIcon';
import {
  FolderKanban,
  Terminal,
  Gamepad2,
  SlidersHorizontal,
  RefreshCw,
  Image,
  Smartphone,
  Check,
  Eye,
  EyeOff,
  Palette,
  Clock,
  Usb
} from 'lucide-react';

interface DesktopCanvasProps {
  apps: AppDefinition[];
  onOpenApp: (appId: string) => void;
  wallpaper: string;
  onChangeWallpaper: (bg: string) => void;
  onSimulateReconnect: () => void;
  onToggleGamingMode: () => void;
  activeDevice?: DeviceInfo | null;
  onOpenDeviceManager?: () => void;
  pinnedDesktopAppIds?: string[];
  onTogglePinDesktop?: (appId: string) => void;
}

export const DesktopCanvas: React.FC<DesktopCanvasProps> = ({
  apps,
  onOpenApp,
  wallpaper,
  onChangeWallpaper,
  onSimulateReconnect,
  onToggleGamingMode,
  activeDevice,
  onOpenDeviceManager,
  pinnedDesktopAppIds = [],
  onTogglePinDesktop,
}) => {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [iconViewMode, setIconViewMode] = useState<'essential' | 'all' | 'hidden'>('essential');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter apps according to iconViewMode
  const visibleApps = React.useMemo(() => {
    if (iconViewMode === 'hidden') return [];

    const isMatch = (app: AppDefinition, searchKeys: string[]) => {
      const lowerId = app.id.toLowerCase();
      const lowerPkg = (app.packageName || '').toLowerCase();
      const lowerName = (app.name || '').toLowerCase();
      return searchKeys.some((k) => {
        const key = k.toLowerCase();
        return (
          lowerId === key ||
          lowerId === `phone-app-${key}` ||
          lowerPkg === key ||
          lowerPkg.endsWith(`.${key}`) ||
          lowerPkg.includes(`.${key}.`) ||
          lowerName.includes(key)
        );
      });
    };

    if (iconViewMode === 'essential') {
      const targetKeys =
        pinnedDesktopAppIds && pinnedDesktopAppIds.length > 0
          ? pinnedDesktopAppIds
          : ['chrome', 'youtube', 'camera', 'photos', 'whatsapp', 'spotify', 'dex-files', 'terminal', 'phone-mirror'];

      const filtered = apps.filter((a) => isMatch(a, targetKeys));
      if (filtered.length > 0) {
        return filtered.slice(0, 24);
      }
      return apps.slice(0, 16);
    }

    return apps.slice(0, 48);
  }, [apps, iconViewMode, pinnedDesktopAppIds]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <div
      id="desktop-canvas"
      onClick={() => {
        setSelectedAppId(null);
        handleCloseContextMenu();
      }}
      onContextMenu={handleContextMenu}
      className="absolute inset-0 top-9 bottom-[52px] overflow-hidden select-none"
      style={{
        background: wallpaper.startsWith('http') || wallpaper.startsWith('/')
          ? `url('${wallpaper}') center/cover no-repeat`
          : wallpaper,
      }}
    >
      {/* Subtle depth gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />

      {/* Top-right Status Widget */}
      <div className="absolute top-4 right-4 z-10">
        {!activeDevice ? (
          <div
            onClick={onOpenDeviceManager}
            className="flex items-center gap-3 bg-slate-950/80 hover:bg-slate-900/90 backdrop-blur-2xl border border-amber-500/40 hover:border-amber-400 p-2.5 px-4 rounded-2xl text-xs cursor-pointer transition-all duration-200 shadow-[0_8px_25px_rgba(0,0,0,0.5)] group ring-1 ring-amber-500/20 hover:scale-[1.02] active:scale-95"
          >
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 group-hover:scale-110 transition-transform">
              <Usb className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-300">Plug in Phone</span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              </div>
              <p className="text-[11px] text-slate-300">Click to pair USB & connect</p>
            </div>
          </div>
        ) : (
          <div
            onClick={() => onOpenApp('phone-mirror')}
            className="flex items-center gap-3 bg-slate-950/80 hover:bg-slate-900/90 backdrop-blur-2xl border border-white/15 hover:border-cyan-400/50 p-2.5 px-4 rounded-2xl text-xs cursor-pointer transition-all duration-200 shadow-[0_8px_30px_rgba(0,0,0,0.5)] group ring-1 ring-white/10 hover:scale-[1.02] active:scale-95"
            title="Click to open Phone Screen Mirror & Sync Content"
          >
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 text-cyan-300 border border-cyan-500/30 group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Smartphone className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white tracking-tight">{activeDevice.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                <span className="text-[10px] bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold px-2 py-0.5 rounded-full shadow-sm">
                  Mirror
                </span>
              </div>
              <p className="text-[10px] font-mono text-cyan-200/80">
                60 FPS · Ultra Low Latency
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Elegant DeX Ambient Clock & Date in upper-center (Frosted Glass Capsule) */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center pointer-events-none z-0 flex flex-col items-center">
        <div className="px-8 py-3 rounded-3xl bg-slate-950/40 backdrop-blur-xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.4)] flex flex-col items-center">
          <div className="text-6xl font-extralight tracking-tight text-white drop-shadow-[0_2px_18px_rgba(255,255,255,0.25)] font-sans">
            {currentTime || '12:00'}
          </div>
          <div className="text-xs font-medium text-cyan-200/90 tracking-widest uppercase mt-1 flex items-center justify-center">
            <span>{currentDate}</span>
          </div>
        </div>
      </div>

      {/* Left Column/Grid: Desktop App Icons */}
      {iconViewMode !== 'hidden' && (
        <div className="relative z-10 p-3 grid grid-flow-col auto-cols-[86px] grid-rows-[repeat(auto-fill,96px)] gap-1 max-h-[calc(100vh-140px)] w-max">
          {visibleApps.map((app) => {
            const isSelected = selectedAppId === app.id;
            return (
              <Win10DesktopIcon
                key={app.id}
                app={app}
                isSelected={isSelected}
                onSelect={() => setSelectedAppId(app.id)}
                onOpen={() => onOpenApp(app.id)}
                onUnpin={onTogglePinDesktop ? () => onTogglePinDesktop(app.id) : undefined}
              />
            );
          })}
        </div>
      )}

      {/* Bottom-right Quick Controls: Wallpaper & Icon density pill */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIconViewMode((prev) => {
              if (prev === 'essential') return 'all';
              if (prev === 'all') return 'hidden';
              return 'essential';
            });
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs backdrop-blur-xl transition-all shadow-lg hover:scale-105 active:scale-95"
          title="Toggle Desktop Icon Density"
        >
          {iconViewMode === 'hidden' ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
          <span className="font-medium">
            {iconViewMode === 'essential'
              ? `Icons: Essential (${visibleApps.length})`
              : iconViewMode === 'all'
              ? `Icons: All (${visibleApps.length})`
              : 'Icons: Hidden'}
          </span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowWallpaperPicker(true);
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs backdrop-blur-xl transition-all shadow-lg hover:scale-105 active:scale-95"
        >
          <Palette className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-medium">Wallpaper</span>
        </button>
      </div>

      {/* Right-Click Desktop Context Menu */}
      {contextMenu && (
        <div
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-60 bg-slate-950/90 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-2 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-white/10"
        >
          <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            View Settings
          </div>
          <button
            onClick={() => {
              setIconViewMode('essential');
              handleCloseContextMenu();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition text-left ${
              iconViewMode === 'essential' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium' : 'hover:bg-white/10'
            }`}
          >
            <span>Essential Icons</span>
            {iconViewMode === 'essential' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
          </button>
          <button
            onClick={() => {
              setIconViewMode('all');
              handleCloseContextMenu();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition text-left ${
              iconViewMode === 'all' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium' : 'hover:bg-white/10'
            }`}
          >
            <span>All Synced Apps</span>
            {iconViewMode === 'all' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
          </button>
          <button
            onClick={() => {
              setIconViewMode('hidden');
              handleCloseContextMenu();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition text-left ${
              iconViewMode === 'hidden' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium' : 'hover:bg-white/10'
            }`}
          >
            <span>Clean (Hide Icons)</span>
            {iconViewMode === 'hidden' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          <div className="my-1.5 border-t border-white/10" />

          <button
            onClick={() => {
              onOpenApp('dex-files');
              handleCloseContextMenu();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 hover:text-white transition text-left font-medium"
          >
            <FolderKanban className="w-4 h-4 text-cyan-400 group-hover:text-white" />
            <span>Open Android Files</span>
          </button>

          <button
            onClick={() => {
              onOpenApp('adb-terminal');
              handleCloseContextMenu();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 hover:text-white transition text-left font-medium"
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>New ADB Shell Terminal</span>
          </button>

          <button
            onClick={() => {
              onToggleGamingMode();
              handleCloseContextMenu();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-600 hover:text-white transition text-left font-medium"
          >
            <Gamepad2 className="w-4 h-4 text-purple-400" />
            <span>Toggle Gaming HUD (Ctrl+G)</span>
          </button>

          <div className="my-1.5 border-t border-white/10" />

          <button
            onClick={() => {
              setShowWallpaperPicker(true);
              handleCloseContextMenu();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition text-left"
          >
            <Palette className="w-4 h-4 text-indigo-400" />
            <span>Change Wallpaper</span>
          </button>

          <button
            onClick={() => {
              onSimulateReconnect();
              handleCloseContextMenu();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition text-left"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span>Reconnect ADB Bridge</span>
          </button>
        </div>
      )}

      {/* Dynamic Wallpaper Picker Modal */}
      {showWallpaperPicker && (
        <div
          onClick={() => setShowWallpaperPicker(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-slate-950/90 border border-white/15 rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.85)] space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Choose Desktop Wallpaper</h3>
                  <p className="text-[11px] text-slate-400">Ultra-clarity themes for Android Desktop</p>
                </div>
              </div>
              <button
                onClick={() => setShowWallpaperPicker(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-xs transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-84 overflow-y-auto pr-1">
              {WALLPAPERS.map((wp) => {
                const isActive = wallpaper === wp.path;
                return (
                  <button
                    key={wp.id}
                    onClick={() => {
                      onChangeWallpaper(wp.path);
                      setShowWallpaperPicker(false);
                    }}
                    className={`h-28 rounded-2xl border-2 relative group overflow-hidden transition-all text-left flex flex-col justify-end p-3 ${
                      isActive
                        ? 'border-cyan-400 ring-4 ring-cyan-500/30 scale-[1.02]'
                        : 'border-white/10 hover:border-white/30 hover:scale-[1.01]'
                    }`}
                    style={{
                      background: wp.path.startsWith('http') || wp.path.startsWith('/')
                        ? `url('${wp.path}') center/cover no-repeat`
                        : wp.path,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-white truncate max-w-[170px] drop-shadow">
                        {wp.name}
                      </span>
                      {isActive && (
                        <span className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
