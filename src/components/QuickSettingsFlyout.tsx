import React from 'react';
import { DeviceInfo, DexSystemTelemetry } from '../types';
import {
  Wifi,
  Bluetooth,
  Radio,
  Plane,
  Zap,
  RotateCw,
  Battery,
  Gamepad2,
  Volume2,
  Sun,
  Sliders,
  Settings
} from 'lucide-react';

interface QuickSettingsFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: DexSystemTelemetry;
  activeDevice: DeviceInfo | null;
  onUpdateTelemetry: (updated: Partial<DexSystemTelemetry>) => void;
  onToggleGamingMode: () => void;
  isGamingMode: boolean;
  onOpenSettings: () => void;
}

export const QuickSettingsFlyout: React.FC<QuickSettingsFlyoutProps> = ({
  isOpen,
  onClose,
  telemetry,
  activeDevice,
  onUpdateTelemetry,
  onToggleGamingMode,
  isGamingMode,
  onOpenSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="quick-settings-flyout"
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed bottom-[60px] right-3 w-84 pointer-events-auto bg-slate-950/90 backdrop-blur-3xl border border-white/15 rounded-3xl p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] z-50 select-none text-slate-200 animate-in fade-in slide-in-from-bottom-3 duration-150 ring-1 ring-white/10"
    >
      {/* Specular top highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

      {/* 2x3 Quick Action Toggles */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {/* Wi-Fi */}
        <button
          onClick={() => onUpdateTelemetry({ wifiEnabled: !telemetry.wifiEnabled })}
          className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition text-left ${
            telemetry.wifiEnabled
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'bg-white/[0.04] border-white/10 text-slate-400 hover:bg-white/[0.08] hover:text-white'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Wifi className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">Wi-Fi</div>
            <div className="text-[10px] opacity-80 truncate">{telemetry.wifiEnabled ? telemetry.wifiSsid : 'Off'}</div>
          </div>
        </button>

        {/* Bluetooth */}
        <button
          onClick={() => onUpdateTelemetry({ bluetoothEnabled: !telemetry.bluetoothEnabled })}
          className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition text-left ${
            telemetry.bluetoothEnabled
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'bg-white/[0.04] border-white/10 text-slate-400 hover:bg-white/[0.08] hover:text-white'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Bluetooth className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">Bluetooth</div>
            <div className="text-[10px] opacity-80 truncate">{telemetry.bluetoothEnabled ? 'Connected' : 'Off'}</div>
          </div>
        </button>

        {/* Mobile Data */}
        <button
          onClick={() => onUpdateTelemetry({ mobileDataEnabled: !telemetry.mobileDataEnabled })}
          className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition text-left ${
            telemetry.mobileDataEnabled
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'bg-white/[0.04] border-white/10 text-slate-400 hover:bg-white/[0.08] hover:text-white'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">Mobile Data</div>
            <div className="text-[10px] opacity-80 truncate">{telemetry.mobileDataEnabled ? '5G Active' : 'Off'}</div>
          </div>
        </button>

        {/* Airplane Mode */}
        <button
          onClick={() => onUpdateTelemetry({ airplaneMode: !telemetry.airplaneMode })}
          className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition text-left ${
            telemetry.airplaneMode
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'bg-white/[0.04] border-white/10 text-slate-400 hover:bg-white/[0.08] hover:text-white'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Plane className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">Airplane</div>
            <div className="text-[10px] opacity-80 truncate">{telemetry.airplaneMode ? 'Enabled' : 'Off'}</div>
          </div>
        </button>

        {/* Flashlight */}
        <button
          onClick={() => onUpdateTelemetry({ torchEnabled: !telemetry.torchEnabled })}
          className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition text-left ${
            telemetry.torchEnabled
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-[0_0_15px_rgba(245,158,11,0.4)]'
              : 'bg-white/[0.04] border-white/10 text-slate-400 hover:bg-white/[0.08] hover:text-white'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">Torch</div>
            <div className="text-[10px] opacity-80 truncate">{telemetry.torchEnabled ? 'On' : 'Off'}</div>
          </div>
        </button>

        {/* Gaming Mode */}
        <button
          onClick={onToggleGamingMode}
          className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition text-left ${
            isGamingMode
              ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
              : 'bg-white/[0.04] border-white/10 text-slate-400 hover:bg-white/[0.08] hover:text-white'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">Gaming HUD</div>
            <div className="text-[10px] opacity-80 truncate">{isGamingMode ? 'Active (Ctrl+G)' : 'Off'}</div>
          </div>
        </button>
      </div>

      {/* Sliders: Volume and Brightness */}
      <div className="space-y-3 p-3.5 bg-white/[0.04] rounded-2xl border border-white/10">
        {/* Volume */}
        <div className="flex items-center gap-3">
          <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            type="range"
            min="0"
            max={telemetry.volumeMusicMax}
            value={telemetry.volumeMusic}
            onChange={(e) => onUpdateTelemetry({ volumeMusic: Number(e.target.value) })}
            className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
          />
          <span className="text-[11px] font-mono text-slate-300 w-6 text-right">
            {Math.round((telemetry.volumeMusic / telemetry.volumeMusicMax) * 100)}%
          </span>
        </div>

        {/* Screen Mirror Brightness */}
        <div className="flex items-center gap-3">
          <Sun className="w-4 h-4 text-amber-400 shrink-0" />
          <input
            type="range"
            min="10"
            max="100"
            defaultValue="85"
            className="w-full accent-amber-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
          />
          <span className="text-[11px] font-mono text-slate-300 w-6 text-right">85%</span>
        </div>
      </div>

      {/* Footer with Battery status & All Settings */}
      <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/10 text-xs">
        {activeDevice ? (
          <div className="flex items-center gap-2">
            <Battery className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-100">{activeDevice.batteryLevel}%</span>
            <span className="text-[10px] text-slate-400">
              {activeDevice.isCharging ? 'Charging' : '~6h 20m remaining'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-400 text-[11px]">
            <Battery className="w-4 h-4 text-amber-500" />
            <span>No Android device attached</span>
          </div>
        )}

        <button
          onClick={() => {
            onOpenSettings();
            onClose();
          }}
          className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition"
          title="Open All Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
