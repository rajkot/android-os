import React from 'react';
import { DeviceInfo } from '../types';
import {
  Smartphone,
  Wifi,
  Usb,
  Maximize2,
  Minimize2,
  Minus,
  Square,
  X,
  Gamepad2,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

interface TitleBarProps {
  activeDevice: DeviceInfo | null;
  onOpenDeviceManager: () => void;
  onDisconnectDevice?: () => void;
  onOpenPhoneMirror?: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isGamingModeGlobal: boolean;
  onToggleGamingModeGlobal: () => void;
  onSimulateReconnect: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  activeDevice,
  onOpenDeviceManager,
  onDisconnectDevice,
  onOpenPhoneMirror,
  isFullscreen,
  onToggleFullscreen,
  isGamingModeGlobal,
  onToggleGamingModeGlobal,
  onSimulateReconnect,
}) => {
  return (
    <div
      id="windows-title-bar"
      className="h-9 bg-slate-950/85 backdrop-blur-2xl border-b border-white/10 px-3 flex items-center justify-between select-none z-50 text-slate-300 text-xs shadow-sm"
    >
      {/* Left: App Logo & Brand with Fluid Accent */}
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-sm shadow-cyan-500/20">
          <img
            src="/assets/dex/app_png.png"
            alt="Android OS"
            className="w-3.5 h-3.5 object-contain drop-shadow"
          />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            Android OS
          </span>
          <span className="text-[10px] text-cyan-400/80 font-mono hidden md:inline px-1.5 py-0.2 rounded-full bg-cyan-950/40 border border-cyan-800/40">
            Desktop Win64
          </span>
        </div>
      </div>

      {/* Center: Device Connection Pill & Switcher */}
      <div className="flex items-center gap-2">
        {activeDevice ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenDeviceManager}
              className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-850 px-3 py-1 rounded-full border border-white/10 hover:border-cyan-500/40 transition shadow-inner group cursor-pointer"
              title="Click to manage or switch devices"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-200">
                {activeDevice.connectionType === 'usb' ? (
                  <Usb className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span className="font-semibold">{activeDevice.name}</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300/80 hidden sm:inline px-1.5 py-0.2 rounded-full bg-cyan-950/50 border border-cyan-700/40">
                {activeDevice.fps} FPS · {activeDevice.latencyMs}ms
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white transition-transform" />
            </button>

            {onOpenPhoneMirror && (
              <button
                onClick={onOpenPhoneMirror}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium text-[11px] transition shadow-md shadow-blue-900/30 cursor-pointer"
                title="Open Phone Screen Mirror & Sync"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mirror Screen</span>
              </button>
            )}

            <button
              onClick={onSimulateReconnect}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              title="Auto-Healing Reconnect Test"
            >
              <RefreshCw className="w-3 h-3" />
            </button>

            {onDisconnectDevice && (
              <button
                onClick={onDisconnectDevice}
                className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-900/70 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-700/50 transition cursor-pointer"
                title="Disconnect this Android device"
              >
                Disconnect
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenDeviceManager}
            className="flex items-center gap-2 bg-amber-950/40 hover:bg-amber-900/50 px-3.5 py-1 rounded-full border border-amber-600/40 text-amber-300 hover:border-amber-400 transition shadow-inner group cursor-pointer"
            title="No device connected. Click to pair or connect."
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[11px] font-semibold">No Device Connected</span>
            <span className="text-[10px] bg-amber-900/80 border border-amber-500/50 text-amber-200 px-2 py-0.5 rounded-full ml-1 group-hover:bg-amber-800">
              Connect Phone
            </span>
            <ChevronDown className="w-3 h-3 text-amber-400" />
          </button>
        )}
      </div>

      {/* Right: Quick Action Toggles & Standard Windows Controls */}
      <div className="flex items-center gap-2">
        {/* Gaming mode indicator */}
        <button
          onClick={onToggleGamingModeGlobal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition cursor-pointer ${
            isGamingModeGlobal
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/40'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title="Toggle Global Gaming Mode (Ctrl+G)"
        >
          <Gamepad2 className="w-3 h-3" />
          <span className="hidden sm:inline">Gaming HUD</span>
        </button>

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          title="Toggle Fullscreen (Ctrl+F)"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Standard Windows Window Controls */}
        <div className="flex items-center ml-2 border-l border-white/10 pl-1">
          <button
            onClick={() => {}}
            className="w-8 h-7 flex items-center justify-center hover:bg-white/10 rounded-sm text-slate-400 hover:text-white transition cursor-pointer"
            title="Minimize to Tray"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleFullscreen}
            className="w-8 h-7 flex items-center justify-center hover:bg-white/10 rounded-sm text-slate-400 hover:text-white transition cursor-pointer"
            title="Maximize"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={() => {}}
            className="w-8 h-7 flex items-center justify-center hover:bg-rose-600 hover:text-white rounded-sm text-slate-400 transition cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
