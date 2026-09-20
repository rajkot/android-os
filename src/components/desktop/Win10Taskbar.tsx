import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi,
  Volume2,
  BatteryCharging,
  Battery,
  ChevronUp,
  MessageSquare,
  Search,
  X,
  Zap,
  Camera,
  RefreshCw,
  Smartphone,
  ChevronLeft,
  Circle,
  Square,
  RotateCw,
} from 'lucide-react';
import { OpenWindowState, DeviceInfo, DexSystemTelemetry } from '../../types';
import { getAppIcon } from '../AppIconHelper';

export interface Win10TaskbarProps {
  onStartClick?: () => void;
  isStartOpen?: boolean;
  onSearchClick?: () => void;
  onNotificationCenterClick?: () => void;
  isNotificationCenterOpen?: boolean;
  onQuickSettingsClick?: () => void;
  isQuickSettingsOpen?: boolean;
  onShowDesktop?: () => void;
  unreadNotificationsCount?: number;
  openWindows?: OpenWindowState[];
  activeWindowId?: string | null;
  onWindowClick?: (windowId: string) => void;
  onWindowClose?: (windowId: string) => void;
  activeDevice?: DeviceInfo | null;
  telemetry?: DexSystemTelemetry;
  onTakeScreenshot?: () => void;
  onLaunchScrcpy?: () => void;
  onBackClick?: () => void;
  onHomeClick?: () => void;
  onRecentsClick?: () => void;
  onRotateClick?: () => void;
  // Slots for custom items
  children?: React.ReactNode;
}

export const Win10Taskbar: React.FC<Win10TaskbarProps> = ({
  onStartClick,
  isStartOpen = false,
  onSearchClick,
  onNotificationCenterClick,
  isNotificationCenterOpen = false,
  onQuickSettingsClick,
  isQuickSettingsOpen = false,
  onShowDesktop,
  unreadNotificationsCount = 0,
  openWindows = [],
  activeWindowId = null,
  onWindowClick,
  onWindowClose,
  activeDevice = null,
  telemetry,
  onTakeScreenshot,
  onLaunchScrcpy,
  onBackClick,
  onHomeClick,
  onRecentsClick,
  onRotateClick,
  children,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [showHiddenIcons, setShowHiddenIcons] = useState(false);
  const hiddenIconsRef = useRef<HTMLDivElement>(null);

  // Live Windows 10 clock (updates every second)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString([], {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        })
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close hidden icons flyout when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (hiddenIconsRef.current && !hiddenIconsRef.current.contains(e.target as Node)) {
        setShowHiddenIcons(false);
      }
    };
    if (showHiddenIcons) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHiddenIcons]);

  // Compute status info for System Tray tooltips
  const isConnected = !!(activeDevice || telemetry?.allConnected);
  const batteryPct = activeDevice?.batteryLevel ?? (telemetry?.allConnected ? telemetry?.batteryLevel : null);
  const batteryIsCharging = activeDevice?.isCharging ?? (telemetry?.allConnected ? telemetry?.isCharging : false);
  const networkName = activeDevice?.isWireless
    ? `Wi-Fi: Connected (${activeDevice.ipAddress || 'LAN'})`
    : activeDevice
    ? `USB ADB: ${activeDevice.name}`
    : 'No Android Device';
  const quickSettingsTooltip = isConnected
    ? `${networkName}\nSpeakers: 100%\nBattery: ${batteryPct ?? '--'}% ${batteryIsCharging ? '(Charging)' : ''}\nClick to open Quick Settings`
    : 'No Android Device Connected\nClick to open Quick Settings & Device Manager';

  return (
    <div
      id="win10-taskbar"
      className="h-[52px] w-full bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between select-none z-50 fixed bottom-0 left-0 right-0 text-white text-sm shadow-[0_-8px_30px_rgba(0,0,0,0.6)] px-2"
    >
      {/* 1. Far Left: Windows Start Button, Search Bar, and DeX Navigation Capsule */}
      <div className="flex items-center h-full gap-2 shrink-0 py-1.5">
        {/* Modern Windows Start Button */}
        <button
          id="win10-start-button"
          onClick={onStartClick}
          aria-label="Start"
          title="Start Menu (Windows Key)"
          className={`h-full px-3 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
            isStartOpen
              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'bg-white/5 hover:bg-white/10 active:bg-white/15 border-white/10 hover:border-cyan-500/30 text-white'
          }`}
        >
          {/* Windows 11 / Modern 4-pane gradient emblem */}
          <div className="grid grid-cols-2 gap-0.5 w-4 h-4 group-hover:scale-105 transition-transform">
            <div className="bg-cyan-400 rounded-[1.5px] w-1.5 h-1.5 shadow-sm" />
            <div className="bg-blue-500 rounded-[1.5px] w-1.5 h-1.5 shadow-sm" />
            <div className="bg-blue-400 rounded-[1.5px] w-1.5 h-1.5 shadow-sm" />
            <div className="bg-cyan-300 rounded-[1.5px] w-1.5 h-1.5 shadow-sm" />
          </div>
        </button>

        {/* Windows Search Bar */}
        <div
          id="win10-search-box"
          onClick={onSearchClick}
          className="hidden md:flex items-center h-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 rounded-xl text-xs text-slate-300 w-52 cursor-text transition-all shadow-inner"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
          <span className="truncate text-slate-400 font-normal">Search apps & files…</span>
          <span className="ml-auto text-[9px] font-mono text-slate-500 bg-white/5 px-1 py-0.5 rounded border border-white/5">
            Win
          </span>
        </div>

        {/* Compact search icon for smaller viewports */}
        <button
          onClick={onSearchClick}
          className="md:hidden h-full px-2.5 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all cursor-pointer"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Android Navigation Capsule (Back, Home, Recents, Rotate) */}
        <div className="flex items-center h-full px-1.5 gap-1 rounded-xl bg-white/5 border border-white/10 shadow-inner backdrop-blur-md">
          <button
            onClick={onBackClick || (() => fetch('/api/adb/input/key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 4 }) }))}
            title="Android Back (Esc / KEYCODE_BACK)"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/15 active:scale-90 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onHomeClick || (() => fetch('/api/adb/input/key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 3 }) }))}
            title="Android Home (KEYCODE_HOME)"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/15 active:scale-90 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <Circle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRecentsClick || (() => fetch('/api/adb/input/key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 187 }) }))}
            title="Android Recent Apps (KEYCODE_APP_SWITCH)"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/15 active:scale-90 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRotateClick || (() => fetch('/api/adb/rotate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orientation: 'toggle' }) }))}
            title="Rotate Screen (Landscape ⇄ Portrait)"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/15 active:scale-90 text-slate-300 hover:text-cyan-400 transition-all cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Middle Section: Row for Running Apps & Windows */}
      <div
        id="win10-running-apps-row"
        className="flex-1 h-full flex items-center px-2 gap-1.5 overflow-x-auto overflow-y-hidden py-1.5"
        style={{ scrollbarWidth: 'none' }}
      >
        {openWindows && openWindows.length > 0 ? (
          openWindows.map((win) => {
            const isActive = activeWindowId === win.id && !win.isMinimized;
            const isMinimized = !!win.isMinimized;

            return (
              <div
                key={win.id}
                id={`taskbar-item-${win.id}`}
                onClick={() => onWindowClick?.(win.id)}
                title={`${win.title}${isMinimized ? ' (Minimized)' : ''}`}
                className={`group relative h-full px-3 flex items-center gap-2 max-w-[200px] rounded-xl transition-all cursor-pointer select-none border ${
                  isActive
                    ? 'bg-white/15 border-white/20 text-white shadow-md shadow-cyan-950/40'
                    : isMinimized
                    ? 'bg-transparent hover:bg-white/5 border-transparent text-slate-400 hover:text-slate-200'
                    : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-200 hover:text-white'
                }`}
              >
                {/* App Icon */}
                <div className="w-4 h-4 shrink-0 text-cyan-400 flex items-center justify-center">
                  {getAppIcon(win.icon, 'w-4 h-4', win.iconUrl)}
                </div>

                {/* Window Title */}
                <span className="text-xs truncate tracking-tight font-medium leading-none flex-1">
                  {win.title}
                </span>

                {/* Close Button on Hover */}
                {onWindowClose && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onWindowClose(win.id);
                    }}
                    title="Close"
                    aria-label={`Close ${win.title}`}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-600 hover:text-white text-slate-400 transition-all cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}

                {/* Bottom Active Indicator Pill */}
                {isActive ? (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                ) : (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1 bg-slate-500/50 rounded-full group-hover:w-3 transition-all" />
                )}
              </div>
            );
          })
        ) : (
          children
        )}
      </div>

      {/* 3. Far Right: System Tray */}
      <div id="win10-system-tray" className="flex items-center h-full shrink-0 gap-1.5 py-1.5 relative">
        {/* Hidden Icons Chevron */}
        <div className="relative h-full" ref={hiddenIconsRef}>
          <button
            onClick={() => setShowHiddenIcons((prev) => !prev)}
            aria-label="Show hidden icons"
            title="Show hidden icons & ADB status"
            className={`h-full px-2 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all cursor-pointer ${
              showHiddenIcons ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300' : ''
            }`}
          >
            <ChevronUp className={`w-3.5 h-3.5 transition-transform ${showHiddenIcons ? 'rotate-180' : ''}`} />
          </button>

          {/* Hidden Icons Context Flyout */}
          {showHiddenIcons && (
            <div
              className="absolute bottom-[56px] -right-6 min-w-[240px] bg-slate-900/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-2.5 rounded-2xl text-xs text-slate-200 z-50 animate-in fade-in slide-in-from-bottom-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 border-b border-white/10 mb-2 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span>ADB Daemon Services</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
              </div>

              {activeDevice && (
                <div className="px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] flex items-center gap-2.5 text-slate-300 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="truncate min-w-0">
                    <div className="font-semibold text-white truncate">{activeDevice.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {activeDevice.connectionType.toUpperCase()} · Android {activeDevice.androidVersion}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <button
                  onClick={() => {
                    setShowHiddenIcons(false);
                    if (onLaunchScrcpy) {
                      onLaunchScrcpy();
                    } else {
                      fetch('/api/scrcpy/launch', { method: 'POST' }).catch(() => {});
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-cyan-600/20 hover:text-cyan-200 text-left flex items-center gap-2 text-xs transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Launch Scrcpy (60 FPS)</span>
                </button>

                <button
                  onClick={() => {
                    setShowHiddenIcons(false);
                    onTakeScreenshot?.();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-blue-600/20 hover:text-blue-200 text-left flex items-center gap-2 text-xs transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Capture Screenshot</span>
                </button>

                <button
                  onClick={() => {
                    setShowHiddenIcons(false);
                    fetch('/api/adb/restart-server', { method: 'POST' }).catch(() => {});
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-cyan-600/20 hover:text-cyan-200 text-left flex items-center gap-2 text-xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Restart ADB Server</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* System Icons: Network, Volume, Battery Capsule -> Triggers Quick Settings */}
        <div
          onClick={onQuickSettingsClick}
          title={quickSettingsTooltip}
          className={`flex items-center h-full px-2.5 gap-2 rounded-xl border transition-all cursor-pointer shadow-sm ${
            isQuickSettingsOpen
              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
          }`}
        >
          {/* Wi-Fi / Network */}
          <div className="flex items-center justify-center">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
          </div>

          {/* Speaker / Volume */}
          <div className="flex items-center justify-center">
            <Volume2 className="w-3.5 h-3.5" />
          </div>

          {/* Battery */}
          <div className="flex items-center justify-center">
            {batteryPct !== null ? (
              batteryIsCharging ? (
                <BatteryCharging className="w-4 h-4 text-emerald-400" />
              ) : (
                <Battery className="w-3.5 h-3.5 text-slate-200" />
              )
            ) : (
              <Battery className="w-3.5 h-3.5 text-slate-500 opacity-60" />
            )}
          </div>
        </div>

        {/* Live Clock & Date Capsule */}
        <div
          id="win10-tray-clock"
          className="h-full px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col justify-center items-center text-[11px] leading-tight text-slate-200 transition-all cursor-default"
          title={`${dateStr} ${timeStr}`}
        >
          <span className="font-semibold tracking-tight text-white">{timeStr || '12:00 PM'}</span>
          <span className="text-[10px] text-slate-400">{dateStr || '9/15/2026'}</span>
        </div>

        {/* Action Center / Notification Button */}
        <button
          id="win10-action-center"
          onClick={onNotificationCenterClick}
          aria-label="Action Center"
          title="Notification Center"
          className={`relative h-full px-2.5 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
            isNotificationCenterOpen
              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-cyan-500 text-slate-950 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-md">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Show Desktop Peek Strip */}
        <div
          id="win10-show-desktop"
          onClick={onShowDesktop}
          aria-label="Show Desktop"
          title="Show Desktop"
          className="w-[6px] h-full rounded-full border-l border-white/20 hover:bg-cyan-400/50 cursor-pointer transition-all ml-0.5"
        />
      </div>
    </div>
  );
};
