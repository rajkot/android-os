import React, { useState, useEffect } from 'react';
import { AppDefinition, OpenWindowState, DeviceInfo, DexSystemTelemetry } from '../types';
import { getAppIcon } from './AppIconHelper';
import {
  Camera,
  Gamepad2,
  Wifi,
  Battery,
  BatteryCharging,
  Volume2,
  Bell,
  Search,
  ChevronUp,
  Sliders,
  Sparkles
} from 'lucide-react';

interface TaskbarProps {
  apps: AppDefinition[];
  openWindows: OpenWindowState[];
  activeWindowId: string | null;
  onOpenApp: (appId: string) => void;
  onToggleMinimize: (windowId: string) => void;
  onToggleStartMenu: () => void;
  isStartMenuOpen: boolean;
  onToggleNotificationCenter: () => void;
  isNotificationCenterOpen: boolean;
  onToggleQuickSettings: () => void;
  isQuickSettingsOpen: boolean;
  onTakeScreenshot: () => void;
  onToggleGamingMode: () => void;
  isGamingMode: boolean;
  unreadNotificationsCount: number;
  activeDevice: DeviceInfo | null;
  telemetry: DexSystemTelemetry;
  onShowDesktop: () => void;
}

export const Taskbar: React.FC<TaskbarProps> = ({
  apps,
  openWindows,
  activeWindowId,
  onOpenApp,
  onToggleMinimize,
  onToggleStartMenu,
  isStartMenuOpen,
  onToggleNotificationCenter,
  isNotificationCenterOpen,
  onToggleQuickSettings,
  isQuickSettingsOpen,
  onTakeScreenshot,
  onToggleGamingMode,
  isGamingMode,
  unreadNotificationsCount,
  activeDevice,
  telemetry,
  onShowDesktop,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
      setDateStr(now.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter pinned apps + apps that have open windows
  const openAppIds = new Set(openWindows.map((w) => w.appId));
  const taskbarApps = apps.filter((app) => app.isPinned || openAppIds.has(app.id));

  return (
    <div
      id="windows-taskbar"
      className="h-12 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 px-3 flex items-center justify-between select-none z-50 fixed bottom-0 left-0 right-0"
    >
      {/* Left: DEX Quick Status & Widget */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleQuickSettings}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition text-xs border border-transparent hover:border-slate-800"
          title={activeDevice ? `Quick Android Settings (${activeDevice.model})` : 'Quick Settings (No Device)'}
        >
          <Sliders className={`w-3.5 h-3.5 ${activeDevice ? 'text-blue-400' : 'text-amber-400'}`} />
          <span className={`text-[11px] font-medium ${activeDevice ? 'text-slate-300' : 'text-amber-300'}`}>
            {activeDevice ? activeDevice.model : 'No Device Connected'}
          </span>
        </button>
      </div>

      {/* Center: Start Button, Search & App Icons */}
      <div className="flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
        {/* Start Button */}
        <button
          onClick={onToggleStartMenu}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition group relative ${
            isStartMenuOpen
              ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500'
              : 'hover:bg-slate-800/80 text-slate-300'
          }`}
          title="Start Menu (Android OS)"
        >
          <img
            src="/assets/dex/app_png.png"
            alt="Start"
            className="w-5 h-5 object-contain group-hover:scale-110 transition-transform"
          />
        </button>

        {/* Quick Search */}
        <button
          onClick={onToggleStartMenu}
          className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 transition"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-6 bg-slate-800 mx-1" />

        {/* Taskbar App Pins */}
        {taskbarApps.map((app) => {
          const matchingWindow = openWindows.find((w) => w.appId === app.id);
          const isOpen = !!matchingWindow;
          const isActive = matchingWindow?.id === activeWindowId && !matchingWindow?.isMinimized;

          return (
            <button
              key={app.id}
              onClick={() => {
                if (matchingWindow) {
                  onToggleMinimize(matchingWindow.id);
                } else {
                  onOpenApp(app.id);
                }
              }}
              className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center relative transition group ${
                isActive
                  ? 'bg-slate-800/90 text-white shadow'
                  : isOpen
                  ? 'bg-slate-900/60 text-slate-300 hover:bg-slate-850'
                  : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
              title={`${app.name} ${isOpen ? '(Running)' : ''}`}
            >
              <div className="group-hover:scale-110 transition-transform">
                {getAppIcon(app.icon, 'w-5 h-5', app.iconUrl)}
              </div>

              {/* Running indicator bar/pill */}
              {isOpen && (
                <span
                  className={`absolute bottom-1 rounded-full transition-all ${
                    isActive
                      ? 'w-4 h-0.5 bg-blue-400'
                      : 'w-1.5 h-1.5 bg-slate-500 group-hover:w-3 group-hover:bg-slate-300'
                  }`}
                />
              )}
            </button>
          );
        })}

        <div className="w-[1px] h-6 bg-slate-800 mx-1" />

        {/* Quick Screenshot Trigger */}
        <button
          onClick={onTakeScreenshot}
          className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-slate-800/80 text-slate-400 hover:text-cyan-300 transition"
          title="Capture Screenshot (Ctrl+Shift+S)"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Gaming Mode Trigger */}
        <button
          onClick={onToggleGamingMode}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${
            isGamingMode
              ? 'bg-purple-600/30 text-purple-300 ring-1 ring-purple-500'
              : 'hover:bg-slate-800/80 text-slate-400 hover:text-purple-300'
          }`}
          title="Toggle Gaming Mode (Ctrl+G)"
        >
          <Gamepad2 className="w-4 h-4" />
        </button>
      </div>

      {/* Right: System Tray & Clock */}
      <div className="flex items-center gap-1.5">
        {/* Quick Settings Combo Pill (Wifi, Volume, Battery) */}
        <button
          onClick={onToggleQuickSettings}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-900 border transition ${
            isQuickSettingsOpen
              ? 'bg-slate-900 border-blue-500/80 text-blue-300'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
          }`}
          title="Network, Sound & Battery Settings"
        >
          <Wifi className="w-3.5 h-3.5 text-blue-400" />
          <Volume2 className="w-3.5 h-3.5 text-slate-300" />
          {activeDevice ? (
            <div className="flex items-center gap-1">
              {activeDevice.isCharging ? (
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Battery className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span className="text-[11px] font-mono">{activeDevice.batteryLevel}%</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] font-mono text-amber-400/90">
              <Battery className="w-3.5 h-3.5 text-amber-500/70" />
              <span>Offline</span>
            </div>
          )}
        </button>

        {/* Notification Bell */}
        <button
          onClick={onToggleNotificationCenter}
          className={`relative p-2 rounded-lg hover:bg-slate-900 border transition ${
            isNotificationCenterOpen
              ? 'bg-slate-900 border-blue-500/80 text-blue-300'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
          }`}
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shadow">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Clock & Date */}
        <div
          onClick={onToggleNotificationCenter}
          className="flex flex-col items-end px-2 py-0.5 rounded-md hover:bg-slate-900 cursor-pointer text-slate-300 transition"
        >
          <span className="text-xs font-semibold leading-tight">{timeStr || '14:45'}</span>
          <span className="text-[10px] text-slate-500 leading-tight">{dateStr || '9/14/2026'}</span>
        </div>

        {/* Show Desktop Slim Bar */}
        <div
          onClick={onShowDesktop}
          className="w-1.5 h-7 hover:bg-blue-500/50 rounded-sm cursor-pointer transition ml-1"
          title="Show Desktop"
        />
      </div>
    </div>
  );
};
