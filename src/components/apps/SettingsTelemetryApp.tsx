import React from 'react';
import { DeviceInfo, DexSystemTelemetry } from '../../types';
import {
  Cpu,
  Battery,
  Layers,
  Wifi,
  Bluetooth,
  Volume2,
  ShieldCheck,
  Zap,
  Radio,
  Sliders,
  RefreshCw,
  Server,
  Activity,
  Maximize2,
  Smartphone
} from 'lucide-react';

interface SettingsTelemetryAppProps {
  device: DeviceInfo | null;
  telemetry: DexSystemTelemetry;
  onUpdateTelemetry: (updated: Partial<DexSystemTelemetry>) => void;
  onSimulateReconnect: () => void;
}

export const SettingsTelemetryApp: React.FC<SettingsTelemetryAppProps> = ({
  device,
  telemetry,
  onUpdateTelemetry,
  onSimulateReconnect,
}) => {
  return (
    <div id="settings-telemetry-app" className="h-full bg-slate-950 text-slate-100 p-5 overflow-y-auto space-y-6 select-none">
      {/* Top Banner with Device & Model */}
      {device ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-900/40 gap-3">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {device.name}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {device.connectionType.toUpperCase()} Connected
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {device.model} · {device.androidVersion} · Display: {device.screenResolution}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSimulateReconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Simulate Reconnect</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-amber-950/20 border border-amber-600/30 gap-3">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-600/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-200 flex items-center gap-2">
                No Device Connected
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ADB Standby
                </span>
              </h2>
              <p className="text-xs text-amber-300/70">
                Daemon listening on port 5037. Connect an Android phone via USB cable or wireless Wi-Fi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSimulateReconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Scan for Devices</span>
            </button>
          </div>
        </div>
      )}

      {/* 3-Tier Architecture Status */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-blue-400" />
          Android OS 3-Tier Subsystem Status
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Layer 1: Windows Client */}
          <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                Layer 1: Windows Host
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-400">
              Win32 Scrcpy Host & ADB Daemon Bridge active.
            </p>
            <div className="text-[10px] font-mono text-slate-500 space-y-0.5 pt-1 border-t border-slate-800/80">
              <div>TCP Bridge: 48901 (JAR)</div>
              <div>WebSocket: 48902 (APK)</div>
            </div>
          </div>

          {/* Layer 2: Logic Engine */}
          <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Layer 2: Logic Engine (JAR)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                PID {telemetry.jarPid}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Elevated shell context running via app_process.
            </p>
            <div className="text-[10px] font-mono text-slate-500 space-y-0.5 pt-1 border-t border-slate-800/80">
              <div>Status: jar.hello Confirmed</div>
              <div>Privilege: ADB Shell User</div>
            </div>
          </div>

          {/* Layer 3: Feature Hub */}
          <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                Layer 3: Feature Hub (APK)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                Online
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Kotlin companion holding Notification & Media listeners.
            </p>
            <div className="text-[10px] font-mono text-slate-500 space-y-0.5 pt-1 border-t border-slate-800/80">
              <div>Status: apk.hello Synced</div>
              <div>Telemetry: Live 100ms stream</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware Telemetry: Battery & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Battery Telemetry Card */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Battery className="w-4 h-4 text-emerald-400" />
              Battery Telemetry (dumpsys battery)
            </h4>
            <span className="text-xs font-bold text-emerald-400">
              {device ? `${device.batteryLevel}% ${device.isCharging ? '(Fast Charging)' : '(Discharging)'}` : 'No Battery Data'}
            </span>
          </div>

          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                !device ? 'bg-slate-700' : device.batteryLevel > 50 ? 'bg-emerald-500' : device.batteryLevel > 20 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${device ? device.batteryLevel : 0}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center">
            <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Temperature</span>
              <span className="text-xs font-semibold text-slate-200 font-mono">{device ? `${device.batteryTemperature}°C` : '--'}</span>
            </div>
            <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Voltage</span>
              <span className="text-xs font-semibold text-slate-200 font-mono">{device ? `${device.batteryVoltage} V` : '--'}</span>
            </div>
            <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Health</span>
              <span className="text-xs font-semibold text-emerald-300">{device ? device.batteryHealth : '--'}</span>
            </div>
            <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Current Draw</span>
              <span className="text-xs font-semibold text-blue-300 font-mono">{device ? '+1240 mA' : '0 mA'}</span>
            </div>
          </div>
        </div>

        {/* Video & Screen Mirroring Engine */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Scrcpy Low-Latency Video Pipeline
            </h4>
            <span className="text-xs font-mono text-cyan-400">
              {device ? `${device.fps} FPS · ${device.latencyMs}ms Latency` : 'Standby (0 FPS)'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Bitrate</span>
              <span className="text-xs font-semibold text-slate-200 font-mono">{device ? `${device.bitrateMbps} Mbps` : '0 Mbps'}</span>
            </div>
            <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Codec</span>
              <span className="text-xs font-semibold text-slate-200 font-mono">H.264 NVENC</span>
            </div>
            <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Frame Drops</span>
              <span className="text-xs font-semibold text-emerald-400 font-mono">0.00%</span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Input injection mode:</span>
            <span className="text-slate-200 font-medium font-mono">UHID Virtual Pointer & KeyEvents</span>
          </div>
        </div>
      </div>

      {/* Audio Stream Control (AudioManager via Logic Engine) */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-blue-400" />
          Android Audio Streams (Shell AudioManager Control)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Media Volume */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Media & Music</span>
              <span className="text-slate-400 font-mono">
                {telemetry.volumeMusic} / {telemetry.volumeMusicMax}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={telemetry.volumeMusicMax}
              value={telemetry.volumeMusic}
              onChange={(e) => onUpdateTelemetry({ volumeMusic: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Ringtone Volume */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Ringtone & Calls</span>
              <span className="text-slate-400 font-mono">
                {telemetry.volumeRing} / {telemetry.volumeRingMax}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={telemetry.volumeRingMax}
              value={telemetry.volumeRing}
              onChange={(e) => onUpdateTelemetry({ volumeRing: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Notification Volume */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Notifications</span>
              <span className="text-slate-400 font-mono">
                {telemetry.volumeNotification} / {telemetry.volumeNotificationMax}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={telemetry.volumeNotificationMax}
              value={telemetry.volumeNotification}
              onChange={(e) => onUpdateTelemetry({ volumeNotification: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Alarm Volume */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Alarm</span>
              <span className="text-slate-400 font-mono">
                {telemetry.volumeAlarm} / {telemetry.volumeAlarmMax}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={telemetry.volumeAlarmMax}
              value={telemetry.volumeAlarm}
              onChange={(e) => onUpdateTelemetry({ volumeAlarm: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Android System Toggles */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
        <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-purple-400" />
          Quick System State Toggles
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => onUpdateTelemetry({ wifiEnabled: !telemetry.wifiEnabled })}
            className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
              telemetry.wifiEnabled
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-200'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div>
              <div className="text-xs font-medium">Wi-Fi</div>
              <div className="text-[10px] text-slate-400">{telemetry.wifiEnabled ? telemetry.wifiSsid : 'Disabled'}</div>
            </div>
            <Wifi className="w-4 h-4" />
          </button>

          <button
            onClick={() => onUpdateTelemetry({ bluetoothEnabled: !telemetry.bluetoothEnabled })}
            className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
              telemetry.bluetoothEnabled
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-200'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div>
              <div className="text-xs font-medium">Bluetooth</div>
              <div className="text-[10px] text-slate-400">{telemetry.bluetoothEnabled ? 'Active' : 'Off'}</div>
            </div>
            <Bluetooth className="w-4 h-4" />
          </button>

          <button
            onClick={() => onUpdateTelemetry({ torchEnabled: !telemetry.torchEnabled })}
            className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
              telemetry.torchEnabled
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div>
              <div className="text-xs font-medium">Flashlight</div>
              <div className="text-[10px] text-slate-400">{telemetry.torchEnabled ? 'On' : 'Off'}</div>
            </div>
            <Zap className="w-4 h-4" />
          </button>

          <button
            onClick={() => onUpdateTelemetry({ batterySaver: !telemetry.batterySaver })}
            className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
              telemetry.batterySaver
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div>
              <div className="text-xs font-medium">Power Saver</div>
              <div className="text-[10px] text-slate-400">{telemetry.batterySaver ? 'Active' : 'Off'}</div>
            </div>
            <Battery className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
