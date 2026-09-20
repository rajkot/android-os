import React, { useState, useEffect } from 'react';
import { Layers, Zap, CheckCircle2, RefreshCw, Smartphone } from 'lucide-react';
import { DeviceInfo } from '../types';

interface BootScreenProps {
  device: DeviceInfo | null;
  onComplete: () => void;
}

export const BootScreen: React.FC<BootScreenProps> = ({ device, onComplete }) => {
  const [appProgress, setAppProgress] = useState(0.05);
  const [jarProgress, setJarProgress] = useState(0.0);
  const [appStatusMessage, setAppStatusMessage] = useState('Starting ADB server daemon on port 5037…');
  const [jarStatusMessage, setJarStatusMessage] = useState('Standby — waiting for target device handshake…');

  useEffect(() => {
    const steps = [
      {
        t: 300,
        appP: 0.15,
        appMsg: device
          ? `Connecting to ${device.name} via ${device.connectionType.toUpperCase()}…`
          : 'Scanning local USB buses & Wi-Fi subnet for Android devices…',
        jarP: device ? 0.15 : 0.05,
        jarMsg: device ? 'Stopping previous service on device (PID clear)…' : 'Logic engine subsystem standby…',
      },
      {
        t: 700,
        appP: 0.35,
        appMsg: device
          ? 'Device link established — configuring reverse network bridge…'
          : 'ADB Daemon running. Ready for USB or Wireless ADB connections…',
        jarP: device ? 0.3 : 0.2,
        jarMsg: 'Locating service module (androiddex.jar)…',
      },
      {
        t: 1200,
        appP: 0.55,
        appMsg: 'Starting local communication servers (Ports 48901 - 48904)…',
        jarP: device ? 0.5 : 0.4,
        jarMsg: device ? 'Uploading service module to /data/local/tmp/…' : 'TCP bridge listeners active on localhost…',
      },
      {
        t: 1700,
        appP: 0.75,
        appMsg: device
          ? 'Verifying companion APK & permissions on device…'
          : 'Scrcpy video receiver ready. Audio routing initialized…',
        jarP: device ? 0.85 : 0.7,
        jarMsg: device ? 'Launching Logic Engine via ADB app_process…' : 'Ready to spawn Logic Engine upon device connection.',
      },
      {
        t: 2200,
        appP: 0.90,
        appMsg: device
          ? 'Waiting for background service handshake (jar.hello)…'
          : 'Window Manager initialized — setting up desktop workspace…',
        jarP: 1.0,
        jarMsg: 'Subsystems ready ✓',
      },
      {
        t: 2700,
        appP: 1.0,
        appMsg: 'Workspace ready — entering desktop… ✓',
        jarP: 1.0,
        jarMsg: 'Ready',
      },
    ];

    const timeouts = steps.map((step) =>
      setTimeout(() => {
        setAppProgress(step.appP);
        setAppStatusMessage(step.appMsg);
        setJarProgress(step.jarP);
        setJarStatusMessage(step.jarMsg);

        if (step.appP === 1.0) {
          setTimeout(onComplete, 500);
        }
      }, step.t)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [device, onComplete]);

  return (
    <div
      id="dex-boot-screen"
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 select-none"
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.15),transparent_70%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center space-y-6">
        {/* App Logo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-3.5 shadow-2xl shadow-blue-500/20 flex items-center justify-center animate-pulse">
            <img
              src="/assets/dex/app_png.png"
              alt="Android OS"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 rounded-full p-1 shadow">
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Android OS</h1>
          <p className="text-xs text-slate-400 mt-1">Universal Desktop Client for Android</p>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] font-mono text-blue-400 bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-800/40">
            <Smartphone className="w-3.5 h-3.5" />
            <span>{device ? `Target: ${device.name} (${device.model})` : 'Target: Standby (No device connected)'}</span>
          </div>
        </div>

        {/* Dual Progress Bars as specified in BOOT_FLOW.md */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4 text-left shadow-lg">
          {/* Bar 1: Overall APP bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                System Orchestration (APP)
              </span>
              <span className="font-mono text-blue-400">{(appProgress * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${appProgress * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 truncate">{appStatusMessage}</p>
          </div>

          {/* Bar 2: JAR Logic Engine deployment */}
          <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Logic Engine (androiddex.jar)
              </span>
              <span className="font-mono text-amber-400">{(jarProgress * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${jarProgress * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 truncate">{jarStatusMessage}</p>
          </div>
        </div>

        {/* Quick Skip button */}
        <button
          onClick={onComplete}
          className="text-xs text-slate-500 hover:text-slate-300 transition py-1 px-3 rounded hover:bg-slate-900"
        >
          Skip initialization & enter desktop
        </button>
      </div>
    </div>
  );
};
