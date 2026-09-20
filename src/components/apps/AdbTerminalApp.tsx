import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Trash2, HelpCircle, Play, CornerDownLeft } from 'lucide-react';
import { DeviceInfo } from '../../types';

interface AdbTerminalAppProps {
  activeDevice: DeviceInfo | null;
}

interface TerminalLog {
  id: string;
  type: 'cmd' | 'output' | 'error' | 'info' | 'system';
  text: string;
}

const QUICK_COMMANDS = [
  'adb devices',
  'adb shell dumpsys battery',
  'adb shell getprop ro.product.model',
  'adb shell pm list packages -3',
  'adb shell top -m 5 -n 1',
  'adb shell ip route',
  'adb logcat -v brief -t 10',
  'adb reverse --list',
];

export const AdbTerminalApp: React.FC<AdbTerminalAppProps> = ({ activeDevice }) => {
  const [inputCommand, setInputCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [logs, setLogs] = useState<TerminalLog[]>([
    { id: '1', type: 'system', text: 'Android OS ADB Shell Bridge [Version 2.4.0-win64]' },
    {
      id: '2',
      type: 'system',
      text: activeDevice
        ? `Connected daemon target: ${activeDevice.name} [${activeDevice.model}] via ${activeDevice.connectionType.toUpperCase()}`
        : 'ADB Daemon is running on localhost:5037. No target device attached.'
    },
    { id: '3', type: 'info', text: 'Type "help" for built-in ADB command list or click any shortcut chip above.' },
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const executeCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setHistory((prev) => [trimmed, ...prev]);
    setHistoryIndex(-1);
    setInputCommand('');

    const lower = trimmed.toLowerCase();

    if (lower === 'clear') {
      setLogs([]);
      return;
    }

    // Append command prompt
    const cmdLog: TerminalLog = { id: `${Date.now()}-cmd`, type: 'cmd', text: `$ ${trimmed}` };
    setLogs((prev) => [...prev, cmdLog]);

    // Attempt real ADB execution against local daemon bridge
    try {
      const res = await fetch('/api/adb/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.output && data.output.trim().length > 0) {
          setLogs((prev) => [
            ...prev,
            {
              id: `${Date.now()}-out`,
              type: data.success ? 'output' : 'error',
              text: data.output.trim(),
            },
          ]);
          return;
        }
      }
    } catch {
      // Fallback to built-in simulation below
    }

    const newLogs: TerminalLog[] = [];

    if (lower === 'help') {
      newLogs.push({
        id: `${Date.now()}-out`,
        type: 'info',
        text: `Available commands:
  adb devices                    - List detected Android devices
  adb shell dumpsys battery       - Query hardware battery telemetry
  adb shell getprop [property]   - Read Android build & system properties
  adb shell pm list packages     - List third-party & system applications
  adb shell top                  - Display real-time CPU & thread load
  adb shell ip route             - Display network routing table
  adb reverse --list             - Display active reverse TCP tunnel mappings
  adb logcat                     - Stream Android OS event log buffer
  scrcpy --help                  - Video pipe configuration flags
  clear                          - Clear terminal window buffer`,
      });
    } else if (lower === 'adb devices') {
      newLogs.push({
        id: `${Date.now()}-out`,
        type: 'output',
        text: activeDevice
          ? `List of devices attached\n${activeDevice.model}_${activeDevice.id.slice(0, 6)}\tdevice product:${activeDevice.model} model:${activeDevice.model} device:${activeDevice.name.replace(/\s+/g, '_')} transport_id:1`
          : `List of devices attached\n\n(no devices/emulators attached - connect via USB or wireless ADB)`
      });
    } else if (!activeDevice && lower.startsWith('adb shell')) {
      newLogs.push({
        id: `${Date.now()}-err`,
        type: 'error',
        text: `error: no devices/emulators found. Please connect a physical Android device or launch Virtual Test Device in Device Manager.`,
      });
    } else if (lower.includes('dumpsys battery')) {
      if (!activeDevice) {
        newLogs.push({ id: `${Date.now()}-err`, type: 'error', text: 'error: device offline or not attached' });
      } else {
        newLogs.push({
          id: `${Date.now()}-out`,
          type: 'output',
          text: `Current Battery Service state:
  AC powered: false
  USB powered: ${activeDevice.connectionType === 'usb'}
  Wireless powered: false
  Max charging current: 3000000
  Max charging voltage: 5000000
  Charge counter: 4890200
  status: ${activeDevice.isCharging ? '2 (Charging)' : '3 (Discharging)'}
  health: 2 (Good)
  present: true
  level: ${activeDevice.batteryLevel}
  scale: 100
  voltage: ${(activeDevice.batteryVoltage * 1000).toFixed(0)} mV
  temperature: ${(activeDevice.batteryTemperature * 10).toFixed(0)} (tenths of degree C)
  technology: Li-ion`,
        });
      }
    } else if (lower.includes('getprop')) {
      if (!activeDevice) {
        newLogs.push({ id: `${Date.now()}-err`, type: 'error', text: 'error: device offline or not attached' });
      } else {
        newLogs.push({
          id: `${Date.now()}-out`,
          type: 'output',
          text: `[ro.build.version.release]: [14]
[ro.build.version.sdk]: [34]
[ro.product.brand]: [${activeDevice.brand}]
[ro.product.model]: [${activeDevice.model}]
[ro.product.cpu.abi]: [arm64-v8a]
[ro.hardware]: [qcom]
[ro.soc.model]: [Snapdragon 8 Gen 3]
[ro.dex.server.version]: [2.4.0]
[persist.sys.scrcpy.encoder]: [c2.qti.avc.encoder]`,
        });
      }
    } else if (lower.includes('pm list packages')) {
      newLogs.push({
        id: `${Date.now()}-out`,
        type: 'output',
        text: `package:com.androiddex.filemanager
package:com.androiddex.gamepad
package:com.androiddex.media
package:com.androiddex.settings
package:com.google.android.youtube
package:com.android.chrome
package:com.spotify.music
package:com.whatsapp
package:com.tencent.ig
package:com.discord
package:com.google.android.apps.maps
package:com.sec.android.app.camera`,
      });
    } else if (lower.includes('top')) {
      newLogs.push({
        id: `${Date.now()}-out`,
        type: 'output',
        text: `Tasks: 718 total,   1 running, 717 sleeping,   0 stopped,   0 zombie
Mem:      11.4G total,       3.8G used,       7.6G free,     142M buffers
Swap:      8.0G total,          0 used,       8.0G free,     4.2G cached

  PID USER     PR  NI VIRT  RES  SHR S[%CPU] %MEM     TIME+ ARGS
14892 shell    20   0 1.2G  68M  32M S 12.4   0.5   0:14.22 app_process /data/local/tmp androiddex.jar
 1240 system   10 -10 2.8G 240M 112M S  6.2   2.0   1:48.33 surfaceflinger
  890 audios   20   0 480M  42M  24M S  3.1   0.3   0:22.18 audioserver
 3122 u0_a18   20   0 3.6G 310M 148M S  2.8   2.6   0:45.10 com.androiddex.companion
 5120 u0_a92   20   0 4.1G 420M 180M S  1.5   3.5   0:19.45 com.spotify.music`,
      });
    } else if (lower.includes('reverse')) {
      newLogs.push({
        id: `${Date.now()}-out`,
        type: 'output',
        text: `Reverse socket forward mappings:
(remote) tcp:48901 -> (local) tcp:48901 [Logic Engine JAR Pipe]
(remote) tcp:48902 -> (local) tcp:48902 [Feature Hub APK WebSocket]
(remote) tcp:48903 -> (local) tcp:48903 [Media Metadata Channel]
(remote) tcp:48904 -> (local) tcp:48904 [Notification Listener Stream]`,
      });
    } else if (lower.includes('logcat')) {
      newLogs.push({
        id: `${Date.now()}-out`,
        type: 'output',
        text: `09-14 14:42:01.120 14892 14900 I AndroidDexJar: [TCP:48901] Connection acknowledged - handshake confirmed.
09-14 14:42:01.240  3122  3140 I AndroidDexApk: [WS:48902] Feature Hub service connected. System telemetry bound.
09-14 14:42:01.385  3122  3145 D MediaSession: Active session updated: com.spotify.music -> M83 - Midnight City
09-14 14:42:01.512  1240  1310 I SurfaceFlinger: Scrcpy stream 1920x1080@120Hz encoder attached via H.264 pipe.
09-14 14:42:02.004 14892 14895 D AudioManager: Media stream gain set to index 11/15.
09-14 14:42:02.150  3122  3150 I NotificationListener: Handled 4 existing notifications from NotificationManager.`,
      });
    } else {
      newLogs.push({
        id: `${Date.now()}-out`,
        type: 'output',
        text: `Command executed on [${activeDevice.model}]:
exit status 0 (stdout routed through ADB daemon shell)`,
      });
    }

    setLogs((prev) => [...prev, ...newLogs]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(inputCommand);
    } else if (e.key === 'ArrowUp') {
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setInputCommand(history[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      if (historyIndex > 0) {
        const prevIndex = historyIndex - 1;
        setHistoryIndex(prevIndex);
        setInputCommand(history[prevIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCommand('');
      }
    }
  };

  return (
    <div id="adb-terminal-app" className="flex flex-col h-full bg-slate-950 font-mono text-xs text-slate-200 select-text overflow-hidden">
      {/* Quick Action Chips */}
      <div className="flex items-center gap-1.5 p-2 bg-slate-900 border-b border-slate-800 overflow-x-auto select-none">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold px-1 flex items-center gap-1">
          <Play className="w-3 h-3 text-blue-400" />
          Quick:
        </span>
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd}
            onClick={() => executeCommand(cmd)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 text-[11px] whitespace-nowrap transition border border-slate-700/60"
          >
            {cmd}
          </button>
        ))}
        <button
          onClick={() => setLogs([])}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 ml-auto shrink-0 transition"
          title="Clear buffer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Terminal Output Area */}
      <div
        className="flex-1 p-3 overflow-y-auto space-y-1 select-text cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {logs.map((log) => {
          let styleClass = 'text-slate-300';
          if (log.type === 'cmd') styleClass = 'text-cyan-400 font-semibold';
          if (log.type === 'system') styleClass = 'text-blue-400 font-medium';
          if (log.type === 'info') styleClass = 'text-amber-300';
          if (log.type === 'error') styleClass = 'text-rose-400';

          return (
            <div key={log.id} className={`whitespace-pre-wrap leading-relaxed ${styleClass}`}>
              {log.text}
            </div>
          );
        })}
        <div ref={terminalEndRef} />
      </div>

      {/* Input Prompt */}
      <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <span className="text-emerald-400 font-bold select-none flex items-center gap-1">
          <span>adb</span>
          <span className="text-slate-500">❯</span>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type an ADB command (e.g. 'dumpsys battery' or 'help')..."
          className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder:text-slate-600 font-mono text-xs"
          autoFocus
        />
        <button
          onClick={() => executeCommand(inputCommand)}
          className="p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition"
          title="Execute"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
