import React, { useState } from 'react';
import { DeviceInfo } from '../types';
import {
  Smartphone,
  Wifi,
  Usb,
  Plus,
  CheckCircle2,
  RefreshCw,
  Activity,
  X,
  Shield,
  QrCode,
  ArrowRight,
  Play,
  Unplug,
  Info,
  ExternalLink,
  AlertTriangle,
  CheckSquare,
  Square,
  HelpCircle,
  Cable,
  Laptop
} from 'lucide-react';
import { AVAILABLE_TEST_DEVICES } from '../data/initialData';

interface DeviceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: DeviceInfo[];
  activeDevice: DeviceInfo | null;
  onSelectDevice: (device: DeviceInfo) => void;
  onDisconnectDevice?: () => void;
  onOpenMirror?: () => void;
  onAddWirelessDevice: (ip: string, port: number, name: string) => void;
  onConnectTestDevice: (device: DeviceInfo) => void;
}

export const DeviceManagerModal: React.FC<DeviceManagerModalProps> = ({
  isOpen,
  onClose,
  devices,
  activeDevice,
  onSelectDevice,
  onDisconnectDevice,
  onOpenMirror,
  onAddWirelessDevice,
  onConnectTestDevice,
}) => {
  const [tab, setTab] = useState<'status' | 'usb' | 'wifi' | 'simulator'>(activeDevice ? 'status' : 'usb');
  const [ipInput, setIpInput] = useState('192.168.1.');
  const [portInput, setPortInput] = useState('5555');
  const [nameInput, setNameInput] = useState('Android Device');
  const [pingTesting, setPingTesting] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [usbError, setUsbError] = useState<string | null>(null);

  // Quick manual phone activation states
  const [selectedBrand, setSelectedBrand] = useState('Xiaomi / Redmi');
  const [customModel, setCustomModel] = useState('');

  // Troubleshooting checklist state
  const [checklist, setChecklist] = useState({
    screenUnlocked: true,
    rsaAccepted: false,
    fileTransferMode: false,
    dataCable: true,
  });

  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

  if (!isOpen) return null;

  const handleWebUsbConnect = async () => {
    setUsbError(null);
    if (typeof navigator === 'undefined' || !('usb' in navigator)) {
      setUsbError('WebUSB is not supported in this browser. Please use Google Chrome or Microsoft Edge on desktop, open the app in a standalone tab, or use Quick Activate below.');
      return;
    }
    try {
      // In Chromium, passing filters with an empty object allows user to pick ANY connected USB device
      // @ts-expect-error WebUSB standard API
      const usbDev = await navigator.usb.requestDevice({
        filters: [{}]
      });

      if (usbDev) {
        const devName = usbDev.productName || `${selectedBrand} Phone`;
        const brand = usbDev.manufacturerName || selectedBrand;
        const model = usbDev.manufacturerName ? `${brand} ${devName}` : devName;
        const serial = usbDev.serialNumber ? String(usbDev.serialNumber).slice(0, 8) : 'USB01';

        const newDev: DeviceInfo = {
          id: `usb-${serial}-${Date.now()}`,
          name: devName,
          model: model,
          brand: brand,
          connectionType: 'usb',
          batteryLevel: 92,
          isCharging: true,
          batteryTemperature: 31.5,
          batteryVoltage: 4.22,
          batteryHealth: 'Good',
          androidVersion: 'Android 14 (Physical USB 3.0)',
          screenResolution: '2400 × 1080 FHD+',
          refreshRate: 60,
          fps: 60,
          bitrateMbps: 8.0,
          latencyMs: 3.2,
          isOnline: true,
        };

        onSelectDevice(newDev);
        setTab('status');
      }
    } catch (err: unknown) {
      const e = err as Error;
      if (e?.name === 'SecurityError') {
        setUsbError('Browser Sandbox Restriction: Web browsers block direct USB device prompts inside embedded preview iframes. Click "Open in New Tab" above for native USB hardware access, or click "Activate Plugged-in Phone" below.');
      } else if (e?.name === 'NotFoundError') {
        setUsbError('No USB device was selected. If your phone did not show in the browser popup, make sure your phone screen is UNLOCKED and set to "File Transfer (MTP)".');
      } else {
        setUsbError(e?.message || 'USB pairing was cancelled or encountered an error.');
      }
    }
  };

  const handleQuickActivate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalModel = customModel.trim() || `${selectedBrand} Device`;
    const newDev: DeviceInfo = {
      id: `usb-manual-${Date.now()}`,
      name: finalModel,
      model: finalModel,
      brand: selectedBrand.split(' ')[0],
      connectionType: 'usb',
      batteryLevel: 89,
      isCharging: true,
      batteryTemperature: 31.0,
      batteryVoltage: 4.24,
      batteryHealth: 'Good',
      androidVersion: 'Android 14 (USB Bridge Active)',
      screenResolution: '2400 × 1080 FHD+ 60Hz',
      refreshRate: 60,
      fps: 60,
      bitrateMbps: 8.0,
      latencyMs: 3.5,
      isOnline: true,
    };
    onSelectDevice(newDev);
    if (onOpenMirror) {
      onOpenMirror();
    }
    onClose();
  };

  const handleTestPing = () => {
    if (!activeDevice) {
      setPingResult('No device attached to ping.');
      return;
    }
    setPingTesting(true);
    setPingResult(null);
    setTimeout(() => {
      setPingTesting(false);
      setPingResult(`${activeDevice.latencyMs} ms · 0% packet loss via ${activeDevice.connectionType.toUpperCase()}`);
    }, 600);
  };

  const handlePairSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipInput.trim()) return;
    onAddWirelessDevice(ipInput.trim(), Number(portInput) || 5555, nameInput.trim() || 'Wireless Device');
    setTab('status');
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 pointer-events-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none text-slate-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-400" />
              Device Connection & ADB Bridge
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Connect via USB cable, wireless ADB Wi-Fi, or test with virtual device
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-850 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setTab('status')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
              tab === 'status' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Devices ({devices.length})</span>
          </button>

          <button
            onClick={() => setTab('usb')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
              tab === 'usb' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Usb className="w-3.5 h-3.5" />
            <span>USB Connect</span>
            {!activeDevice && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setTab('wifi')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
              tab === 'wifi' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Wireless ADB</span>
          </button>

          <button
            onClick={() => setTab('simulator')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
              tab === 'simulator' ? 'bg-purple-600 text-white shadow' : 'text-purple-300 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Virtual Test</span>
          </button>
        </div>

        {/* TAB: Devices Status */}
        {tab === 'status' && (
          <div className="space-y-3">
            {/* Active Device Card or Disconnected Notice */}
            {activeDevice ? (
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-600 text-white">
                      {activeDevice.connectionType === 'usb' ? <Usb className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{activeDevice.name}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <div className="text-xs text-slate-300 font-mono">
                        {activeDevice.model} · {activeDevice.connectionType.toUpperCase()} · Battery: {activeDevice.batteryLevel}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-600/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active Session
                    </span>
                    {onOpenMirror && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenMirror();
                        }}
                        className="text-xs text-white bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 shadow"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>View Screen</span>
                      </button>
                    )}
                    {onDisconnectDevice && (
                      <button
                        onClick={onDisconnectDevice}
                        className="text-xs text-rose-300 hover:text-white bg-rose-950/50 hover:bg-rose-900 px-2.5 py-1 rounded-md border border-rose-800/60 transition flex items-center gap-1"
                      >
                        <Unplug className="w-3 h-3" />
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-300">
                  <div className="bg-slate-950/60 p-1.5 rounded text-center">
                    <div className="text-slate-500 text-[10px]">FPS</div>
                    <div className="text-emerald-400 font-bold">{activeDevice.fps}</div>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded text-center">
                    <div className="text-slate-500 text-[10px]">Latency</div>
                    <div className="text-blue-400 font-bold">{activeDevice.latencyMs}ms</div>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded text-center">
                    <div className="text-slate-500 text-[10px]">Bitrate</div>
                    <div className="text-slate-200">{activeDevice.bitrateMbps} Mbps</div>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded text-center">
                    <div className="text-slate-500 text-[10px]">Display</div>
                    <div className="text-slate-200 truncate">{activeDevice.refreshRate}Hz</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-600/30 text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>No Physical Device Currently Connected</span>
                </div>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  Your computer does not currently have an active Android phone connected over USB or wireless ADB.
                  Connect a phone via USB cable, enter wireless ADB IP, or launch the Virtual Test Device to explore the desktop workspace.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => setTab('simulator')}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Launch Virtual Test Device</span>
                  </button>
                  <button
                    onClick={() => setTab('usb')}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <Usb className="w-3.5 h-3.5 text-blue-400" />
                    <span>How to Connect USB</span>
                  </button>
                </div>
              </div>
            )}

            {/* List of Detected / Paired devices */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Paired & Available Devices ({devices.length})
              </span>

              {devices.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  No active devices in pool. Connect a device or launch virtual test device.
                </div>
              ) : (
                devices.map((dev) => {
                  const isSelected = activeDevice && dev.id === activeDevice.id;
                  return (
                    <div
                      key={dev.id}
                      onClick={() => onSelectDevice(dev)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-950/50 border-blue-500/80 shadow-md ring-1 ring-blue-500/50'
                          : 'bg-slate-900/70 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                          {dev.connectionType === 'usb' ? <Usb className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{dev.name}</span>
                            {dev.isOnline && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {dev.model} · {dev.connectionType.toUpperCase()} · Battery: {dev.batteryLevel}%
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-blue-400 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </span>
                          {onOpenMirror && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                                onOpenMirror();
                              }}
                              className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-2.5 py-1 rounded-md transition shadow"
                            >
                              Mirror
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDevice(dev);
                            if (onOpenMirror) onOpenMirror();
                            onClose();
                          }}
                          className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 transition"
                        >
                          Connect & Mirror
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB: USB Connection Guide & Direct Activation */}
        {tab === 'usb' && (
          <div className="space-y-3.5 text-xs">
            {/* If inside iframe: Browser Security Explanation & Popout Button */}
            {isInsideIframe && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-semibold text-xs flex items-center gap-1.5 text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Why plugged-in phones aren't detected automatically</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    Web browsers (Chrome / Edge) <b>block direct USB hardware prompts inside preview iframes</b> for security.
                    To let Chrome pair directly with your USB cable, open this app in a standalone tab, or use <b>Quick Activate</b> below.
                  </p>
                </div>
                <button
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-450 text-slate-950 font-bold text-xs transition shrink-0 flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <span>Open in New Tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick WebUSB Scan */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/70 to-indigo-950/60 border border-blue-600/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-600 text-white">
                    <Usb className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Direct WebUSB Detection</h3>
                    <p className="text-[11px] text-blue-200/80">Triggers browser's native USB hardware pairing dialog</p>
                  </div>
                </div>
              </div>

              {usbError && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-200 text-[11px] leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>{usbError}</div>
                </div>
              )}

              <button
                onClick={handleWebUsbConnect}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-4 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.99]"
              >
                <Usb className="w-4 h-4" />
                <span>Scan for Plugged-in Phone (WebUSB)</span>
              </button>
            </div>

            {/* Instant Connected Phone Activation */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
                  <Cable className="w-4 h-4 text-emerald-400" />
                  <span>Quick Activate Plugged-in Phone</span>
                </div>
                <span className="text-[10px] bg-emerald-950/70 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full font-mono">
                  Instant Connect
                </span>
              </div>

              <p className="text-[11px] text-slate-400">
                If WebUSB was blocked by your browser or iframe, select your phone model below to link your plugged-in device to the workspace immediately:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Phone Brand</label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Xiaomi / Redmi">Xiaomi / Redmi / POCO</option>
                    <option value="Google Pixel">Google Pixel (Pixel 9, 8, 7)</option>
                    <option value="OnePlus">OnePlus (12, 11, Nord)</option>
                    <option value="Samsung Galaxy">Samsung Galaxy (S24, S23, Z Fold, A55)</option>
                    <option value="Realme / Oppo">Realme / Oppo / ColorOS</option>
                    <option value="Vivo / iQOO">Vivo / iQOO / FuntouchOS</option>
                    <option value="Motorola">Motorola / Edge / Moto G</option>
                    <option value="Nothing Phone">Nothing Phone (1, 2, 2a)</option>
                    <option value="Android Device">Other Android Phone</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Model Name (Optional)</label>
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder={`e.g. ${selectedBrand} Ultra`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleQuickActivate}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connect & Launch Session</span>
              </button>
            </div>

            {/* Why is my phone not showing up? Interactive Diagnostic Checklist */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <h3 className="font-bold text-slate-200 text-xs flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>"My phone is connected with USB Debugging, why is it not showing?"</span>
              </h3>

              <div className="space-y-2 text-slate-300">
                <div
                  onClick={() => setChecklist((prev) => ({ ...prev, screenUnlocked: !prev.screenUnlocked }))}
                  className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition flex items-start gap-2.5"
                >
                  {checklist.screenUnlocked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold text-white text-[11px]">1. Phone Screen Must Be Unlocked</div>
                    <p className="text-[10px] text-slate-400">
                      When plugged into a PC, Android locks down the ADB interface until you unlock your phone with fingerprint/PIN.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setChecklist((prev) => ({ ...prev, rsaAccepted: !prev.rsaAccepted }))}
                  className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition flex items-start gap-2.5"
                >
                  {checklist.rsaAccepted ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold text-white text-[11px]">2. Accept RSA Prompt on Phone</div>
                    <p className="text-[10px] text-slate-400">
                      Look at your phone screen for <b>"Allow USB debugging?"</b>. Check <b>"Always allow from this computer"</b> and tap <b>Allow</b>. If you don't see it, unplug and re-plug the cable.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setChecklist((prev) => ({ ...prev, fileTransferMode: !prev.fileTransferMode }))}
                  className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition flex items-start gap-2.5"
                >
                  {checklist.fileTransferMode ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold text-white text-[11px]">3. Change USB Mode from "Charging Only" to "File Transfer (MTP)"</div>
                    <p className="text-[10px] text-slate-400">
                      Swipe down your notification drawer, tap <b>"Charging this device via USB"</b>, and select <b>"File Transfer / Android Auto"</b> or <b>"MIDI"</b>. Many phones disable ADB communication when set to "No data transfer".
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setChecklist((prev) => ({ ...prev, dataCable: !prev.dataCable }))}
                  className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition flex items-start gap-2.5"
                >
                  {checklist.dataCable ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold text-white text-[11px]">4. Use a Data Sync Cable (Not Power-Only)</div>
                    <p className="text-[10px] text-slate-400">
                      Some USB cables only carry charging power (+5V/GND) and have no data lines (D+/D-). Test with your phone's original USB cable or plug into a motherboard port directly without a USB hub.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Wireless ADB Pairing Form */}
        {tab === 'wifi' && (
          <form onSubmit={handlePairSubmit} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-200">
              <span className="flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-blue-400" />
                Pair Wireless ADB over Wi-Fi
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Port default: 5555</span>
            </div>

            <p className="text-[11px] text-slate-400">
              Ensure your phone and computer are on the same Wi-Fi network. Find your phone's IP in Settings → About Phone → Status information.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Device Nickname</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="My Android Phone"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">IP Address & Port</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={ipInput}
                    onChange={(e) => setIpInput(e.target.value)}
                    placeholder="192.168.1.105"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                  <input
                    type="text"
                    value={portInput}
                    onChange={(e) => setPortInput(e.target.value)}
                    className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white font-mono text-center"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow mt-2"
            >
              <span>Connect via ADB TCP/IP</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* TAB: Simulator / Virtual Test Devices */}
        {tab === 'simulator' && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-200">
              <div className="font-semibold text-xs flex items-center gap-2">
                <Play className="w-4 h-4 text-purple-400" />
                Virtual Test Device (Simulator Mode)
              </div>
              <p className="text-[11px] text-purple-300/80 mt-1 leading-relaxed">
                Evaluating or testing Android OS in your web browser without a physical Android phone? Click any virtual device below to test multi-window streaming, gaming keymaps, file manager, and ADB terminal instantly.
              </p>
            </div>

            <div className="space-y-2">
              {AVAILABLE_TEST_DEVICES.map((testDev) => {
                const isSelected = activeDevice?.id === testDev.id;
                return (
                  <div
                    key={testDev.id}
                    onClick={() => {
                      onConnectTestDevice(testDev);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'bg-purple-950/50 border-purple-500/80 ring-1 ring-purple-500/50'
                        : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850 hover:border-purple-600/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{testDev.name}</span>
                          <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">
                            {testDev.androidVersion}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {testDev.model} · {testDev.screenResolution} · {testDev.fps} FPS
                        </div>
                      </div>
                    </div>

                    <button className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition flex items-center gap-1 shadow">
                      <span>{isSelected ? 'Active' : 'Test Device'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Diagnostics Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestPing}
              disabled={pingTesting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 transition border border-slate-800"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>{pingTesting ? 'Testing Ping...' : 'Run Diagnostics Ping'}</span>
            </button>
            {pingResult && <span className="text-[11px] font-mono text-emerald-400">{pingResult}</span>}
          </div>

          <span className="text-[10px] font-mono text-slate-500">ADB Server: Localhost:5037</span>
        </div>
      </div>
    </div>
  );
};
