import { exec, spawn } from 'child_process';
import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';

// Memory cache for app icons
const iconCache = new Map<string, Buffer>();
let isExtractorPushed = false;
let cachedDeviceApps: any[] = [];
let lastKnownDeviceSerial = '';
let lastConnectedDeviceCount = 0;

let cachedDeviceWidth = 720;
let cachedDeviceHeight = 1520;

// High-Speed Persistent Interactive ADB Shell
// Keeps an active ADB shell open on standard input to bypass Windows process spawn overhead (50-100ms)
// and Android JVM startup overhead (300-500ms) on every touch interaction.
let persistentShellProc: ReturnType<typeof spawn> | null = null;
export let isSecuritySettingsBlocked = false;

export function checkInputSecurityStatus(): Promise<boolean> {
  return new Promise((resolve) => {
    exec('adb shell input keyevent 0', (err, stdout, stderr) => {
      const out = `${stdout || ''} ${stderr || ''} ${err?.message || ''}`;
      isSecuritySettingsBlocked = out.includes('INJECT_EVENTS') || out.includes('SecurityException');
      resolve(isSecuritySettingsBlocked);
    });
  });
}

// Check initial permission on startup
checkInputSecurityStatus().catch(() => {});

export function getPersistentShell() {
  if (!persistentShellProc || persistentShellProc.killed || persistentShellProc.exitCode !== null) {
    persistentShellProc = spawn('adb', ['shell'], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    persistentShellProc.stderr?.on('data', (chunk) => {
      const msg = chunk.toString();
      if (msg.includes('INJECT_EVENTS') || msg.includes('SecurityException')) {
        isSecuritySettingsBlocked = true;
        console.warn('[ADB Bridge] Touch blocked: "USB debugging (Security settings)" is required on Xiaomi/MIUI.');
      }
    });
    persistentShellProc.on('error', () => {
      persistentShellProc = null;
    });
    persistentShellProc.on('exit', () => {
      persistentShellProc = null;
    });
  }
  return persistentShellProc;
}

// Ultra-fast Tap: Direct Android input tap executed via persistent shell
export function sendFastTap(x: number, y: number) {
  markDeviceActive();
  const rx = Math.round(x);
  const ry = Math.round(y);
  const cmd = `input tap ${rx} ${ry}\n`;
  try {
    const shell = getPersistentShell();
    if (shell && shell.stdin && shell.stdin.writable) {
      shell.stdin.write(cmd);
      return;
    }
  } catch {}
  exec(`adb shell input tap ${rx} ${ry}`, (err, stdout, stderr) => {
    const out = `${stdout || ''} ${stderr || ''} ${err?.message || ''}`;
    if (out.includes('INJECT_EVENTS') || out.includes('SecurityException')) {
      isSecuritySettingsBlocked = true;
    }
  });
}

// Ultra-fast Key: Back, Home, Recents, Power, Del, Enter, etc.
export function sendFastKey(key: number | string) {
  markDeviceActive();
  const cmd = `input keyevent ${key}\n`;
  try {
    const shell = getPersistentShell();
    if (shell && shell.stdin && shell.stdin.writable) {
      shell.stdin.write(cmd);
      return;
    }
  } catch {}
  exec(`adb shell input keyevent ${key}`, (err) => {
    if (err) console.error('[ADB Bridge] input keyevent error:', err.message);
  });
}

// Ultra-fast Swipe / Drag / Scroll
export function sendFastSwipe(x1: number, y1: number, x2: number, y2: number, duration: number = 180) {
  markDeviceActive();
  const dur = Math.max(80, Math.min(600, duration));
  const rx1 = Math.round(x1);
  const ry1 = Math.round(y1);
  const rx2 = Math.round(x2);
  const ry2 = Math.round(y2);
  const cmd = `input swipe ${rx1} ${ry1} ${rx2} ${ry2} ${dur}\n`;
  try {
    const shell = getPersistentShell();
    if (shell && shell.stdin && shell.stdin.writable) {
      shell.stdin.write(cmd);
      return;
    }
  } catch {}
  exec(`adb shell input swipe ${rx1} ${ry1} ${rx2} ${ry2} ${dur}`, (err) => {
    if (err) console.error('[ADB Bridge] input swipe error:', err.message);
  });
}

// Ultra-fast Text Input via persistent shell with smart sanitization & multiline support
export function sendFastText(rawText: string) {
  markDeviceActive();
  if (!rawText) return;

  // Normalize smart quotes, typographic dashes, ellipsis to ASCII
  const sanitized = rawText
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, ''); // strip unmappable characters that crash Android input text

  if (!sanitized) return;

  // Split into lines to support multi-line paste cleanly
  const lines = sanitized.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 0) {
      if (line === ' ') {
        sendFastKey(62); // KEYCODE_SPACE
      } else {
        const formatted = line.replace(/ /g, '%s').replace(/([\\'"$&*~<>;|#()`!])/g, '\\$1');
        const cmd = `input text "${formatted}"\n`;
        try {
          const shell = getPersistentShell();
          if (shell && shell.stdin && shell.stdin.writable) {
            shell.stdin.write(cmd);
          } else {
            exec(`adb shell input text "${formatted}"`, (err) => {
              if (err) console.error('[ADB Bridge] input text error:', err.message);
            });
          }
        } catch {
          exec(`adb shell input text "${formatted}"`, (err) => {
            if (err) console.error('[ADB Bridge] input text error:', err.message);
          });
        }
      }
    }
    if (i < lines.length - 1) {
      sendFastKey(66); // KEYCODE_ENTER
    }
  }
}

// Ultra-fast App Launch via persistent shell
export function sendFastAppLaunch(cleanPackage: string) {
  markDeviceActive();
  const cmd = `wm dismiss-keyguard; monkey -p ${cleanPackage} -c android.intent.category.LAUNCHER 1 2>/dev/null\n`;
  try {
    const shell = getPersistentShell();
    if (shell && shell.stdin && shell.stdin.writable) {
      shell.stdin.write(cmd);
      return;
    }
  } catch {}
  exec(`adb shell "${cmd.trim()}"`);
}

function refreshDeviceResolution() {
  exec('adb shell wm size', (err, stdout) => {
    if (!err && stdout) {
      const match = stdout.match(/Physical size:\s*(\d+)x(\d+)/i) || stdout.match(/(\d+)x(\d+)/);
      if (match) {
        cachedDeviceWidth = parseInt(match[1], 10);
        cachedDeviceHeight = parseInt(match[2], 10);
        console.log(`[ADB Bridge] Detected device resolution: ${cachedDeviceWidth}x${cachedDeviceHeight}`);
      }
    }
  });
}
refreshDeviceResolution();

// Keep screen awake while connected via USB
exec('adb shell settings put global stay_on_while_plugged_in 3');

export let lastInputEventTime = 0;
let isDeviceAwakeCache = true;
let lastWakeCheckTime = Date.now();

export function markDeviceActive() {
  lastInputEventTime = Date.now();
  isDeviceAwakeCache = true;
}

export function wakeDeviceIfNeeded(cb: () => void) {
  const now = Date.now();
  // If we already know the device is active within the last 2 minutes, skip dumpsys completely!
  if (isDeviceAwakeCache && now - lastWakeCheckTime < 120000) {
    return cb();
  }
  exec('adb shell dumpsys power', (err, stdout) => {
    lastWakeCheckTime = Date.now();
    const isAsleep = (stdout || '').includes('mWakefulness=Asleep') || (stdout || '').includes('state=OFF');
    isDeviceAwakeCache = !isAsleep;
    if (isAsleep) {
      console.log('[ADB Bridge] Phone is asleep, waking up via KEYCODE_POWER (26)...');
      exec('adb shell "input keyevent 26 && wm dismiss-keyguard"', () => {
        isDeviceAwakeCache = true;
        setTimeout(cb, 80);
      });
    } else {
      cb();
    }
  });
}

function ensureExtractorJar(cb: (err: Error | null) => void) {
  if (isExtractorPushed) return cb(null);
  const localJar = path.resolve(__dirname, 'dex-icon-extractor.jar');
  exec(`adb push "${localJar}" /data/local/tmp/dex-icon-extractor.jar`, (err) => {
    if (!err) {
      isExtractorPushed = true;
      console.log('[ADB Bridge] Initialized dex-icon-extractor.jar on device');
    }
    cb(err);
  });
}

const KNOWN_APPS: Record<string, { name: string; category: 'Games' | 'Social' | 'Media' | 'Tools' | 'Productivity' | 'System'; icon: string }> = {
  'com.dts.freefiremax': { name: 'Free Fire MAX', category: 'Games', icon: 'Gamepad2' },
  'com.ea.gp.fifamobile': { name: 'EA SPORTS FC Mobile', category: 'Games', icon: 'Gamepad2' },
  'com.jigsi.chess': { name: 'Chess', category: 'Games', icon: 'Gamepad2' },
  'com.no1ornothing.color.water.sort.woody.puzzle': { name: 'Water Sort Puzzle', category: 'Games', icon: 'Gamepad2' },
  'com.openai.chatgpt': { name: 'ChatGPT', category: 'Tools', icon: 'MessageSquare' },
  'com.anthropic.claude': { name: 'Claude', category: 'Tools', icon: 'MessageSquare' },
  'ai.perplexity.app.android': { name: 'Perplexity AI', category: 'Productivity', icon: 'Search' },
  'com.deepseek.chat': { name: 'DeepSeek', category: 'Tools', icon: 'MessageSquare' },
  'ai.qwenlm.chat.android': { name: 'Qwen AI', category: 'Tools', icon: 'MessageSquare' },
  'com.moonshot.kimichat': { name: 'Kimi AI', category: 'Tools', icon: 'MessageSquare' },
  'ai.x.grok': { name: 'Grok', category: 'Tools', icon: 'MessageSquare' },
  'com.whatsapp': { name: 'WhatsApp', category: 'Social', icon: 'MessageSquare' },
  'com.whatsapp.w4b': { name: 'WhatsApp Business', category: 'Social', icon: 'MessageSquare' },
  'org.telegram.messenger': { name: 'Telegram', category: 'Social', icon: 'MessageSquare' },
  'com.instagram.android': { name: 'Instagram', category: 'Social', icon: 'Camera' },
  'com.facebook.katana': { name: 'Facebook', category: 'Social', icon: 'Radio' },
  'com.facebook.orca': { name: 'Messenger', category: 'Social', icon: 'MessageSquare' },
  'com.spotify.music': { name: 'Spotify', category: 'Media', icon: 'Music2' },
  'com.google.android.youtube': { name: 'YouTube', category: 'Media', icon: 'PlaySquare' },
  'org.videolan.vlc': { name: 'VLC Media Player', category: 'Media', icon: 'PlaySquare' },
  'com.termux': { name: 'Termux', category: 'Tools', icon: 'Terminal' },
  'com.github.android': { name: 'GitHub', category: 'Tools', icon: 'FolderKanban' },
  'com.discord': { name: 'Discord', category: 'Social', icon: 'Headphones' },
  'org.mozilla.firefox': { name: 'Firefox', category: 'Productivity', icon: 'Compass' },
  'com.brave.browser': { name: 'Brave Browser', category: 'Productivity', icon: 'Compass' },
  'org.torproject.torbrowser': { name: 'Tor Browser', category: 'Productivity', icon: 'Compass' },
  'com.google.android.apps.authenticator2': { name: 'Google Authenticator', category: 'Tools', icon: 'SlidersHorizontal' },
  'com.google.android.apps.docs.editors.docs': { name: 'Google Docs', category: 'Productivity', icon: 'FolderKanban' },
  'com.google.android.apps.docs.editors.sheets': { name: 'Google Sheets', category: 'Productivity', icon: 'SlidersHorizontal' },
  'com.microsoft.teams': { name: 'Microsoft Teams', category: 'Productivity', icon: 'MessageSquare' },
  'com.microsoft.office.officehubrow': { name: 'Microsoft 365', category: 'Productivity', icon: 'FolderKanban' },
  'us.zoom.videomeetings': { name: 'Zoom', category: 'Productivity', icon: 'Camera' },
  'com.binance.dev': { name: 'Binance', category: 'Productivity', icon: 'ShoppingBag' },
  'io.metamask': { name: 'MetaMask', category: 'Tools', icon: 'ShoppingBag' },
  'com.coindcx.btc': { name: 'CoinDCX', category: 'Productivity', icon: 'ShoppingBag' },
  'com.flipkart.android': { name: 'Flipkart', category: 'Social', icon: 'ShoppingBag' },
  'in.amazon.mShop.android.shopping': { name: 'Amazon', category: 'Social', icon: 'ShoppingBag' },
  'com.myntra.android': { name: 'Myntra', category: 'Social', icon: 'ShoppingBag' },
  'com.meesho.supply': { name: 'Meesho', category: 'Social', icon: 'ShoppingBag' },
  'com.rapido.passenger': { name: 'Rapido', category: 'Tools', icon: 'MapPin' },
  'org.coursera.android': { name: 'Coursera', category: 'Productivity', icon: 'PlaySquare' },
  'com.linkedin.android': { name: 'LinkedIn', category: 'Social', icon: 'MessageSquare' },
  'notion.id': { name: 'Notion', category: 'Productivity', icon: 'FolderKanban' },
  'com.replit.app': { name: 'Replit', category: 'Tools', icon: 'Terminal' },
  'com.rarlab.rar': { name: 'RAR', category: 'Tools', icon: 'FolderKanban' },
  'com.alphainventor.filemanager': { name: 'File Manager+', category: 'Tools', icon: 'FolderKanban' },
  'ch.protonvpn.android': { name: 'Proton VPN', category: 'Tools', icon: 'SlidersHorizontal' },
  'free.vpn.unblock.proxy.turbovpn': { name: 'Turbo VPN', category: 'Tools', icon: 'SlidersHorizontal' },
  'com.dev47apps.obsdroidcam': { name: 'DroidCam OBS', category: 'Media', icon: 'Camera' },
  // Common Android System & Launcher Apps
  'com.android.camera': { name: 'Camera', category: 'Media', icon: 'Camera' },
  'com.android.chrome': { name: 'Google Chrome', category: 'Productivity', icon: 'Compass' },
  'com.android.contacts': { name: 'Contacts', category: 'Social', icon: 'User' },
  'com.android.deskclock': { name: 'Clock', category: 'Tools', icon: 'Clock' },
  'com.android.mms': { name: 'Messages', category: 'Social', icon: 'MessageSquare' },
  'com.android.settings': { name: 'Settings', category: 'System', icon: 'Settings' },
  'com.android.soundrecorder': { name: 'Sound Recorder', category: 'Media', icon: 'Volume2' },
  'com.android.vending': { name: 'Google Play Store', category: 'Tools', icon: 'ShoppingBag' },
  'com.google.android.apps.maps': { name: 'Google Maps', category: 'Tools', icon: 'MapPin' },
  'com.google.android.apps.mapslite': { name: 'Google Maps Lite', category: 'Tools', icon: 'MapPin' },
  'com.google.android.gm': { name: 'Gmail', category: 'Productivity', icon: 'Mail' },
  'com.google.android.apps.photos': { name: 'Google Photos', category: 'Media', icon: 'Image' },
  'com.google.android.googlequicksearchbox': { name: 'Google Search', category: 'Tools', icon: 'Search' },
  'com.mi.android.globalFileexplorer': { name: 'File Manager', category: 'Tools', icon: 'FolderKanban' },
  'com.miui.calculator': { name: 'Calculator', category: 'Tools', icon: 'SlidersHorizontal' },
  'com.miui.gallery': { name: 'Gallery', category: 'Media', icon: 'Image' },
  'com.miui.notes': { name: 'Notes', category: 'Productivity', icon: 'FolderKanban' },
  'com.miui.weather2': { name: 'Weather', category: 'Tools', icon: 'Compass' },
  'com.miui.compass': { name: 'Compass', category: 'Tools', icon: 'Compass' },
  'com.miui.player': { name: 'Music Player', category: 'Media', icon: 'Music2' },
  'com.miui.screenrecorder': { name: 'Screen Recorder', category: 'Media', icon: 'Camera' },
  'com.miui.securitycenter': { name: 'Security Center', category: 'System', icon: 'SlidersHorizontal' },
  'com.xiaomi.calendar': { name: 'Calendar', category: 'Productivity', icon: 'Clock' },
  'com.xiaomi.scanner': { name: 'Scanner', category: 'Tools', icon: 'Camera' },
  'com.xiaomi.midrop': { name: 'ShareMe (Mi Drop)', category: 'Tools', icon: 'FolderKanban' },
  'com.adobe.reader': { name: 'Adobe Acrobat', category: 'Productivity', icon: 'FolderKanban' },
  'com.myairtelapp': { name: 'Airtel Thanks', category: 'Tools', icon: 'Smartphone' },
  'com.bigbasket.mobileapp': { name: 'BigBasket', category: 'Social', icon: 'ShoppingBag' },
  'com.grofers.customerapp': { name: 'Blinkit', category: 'Social', icon: 'ShoppingBag' },
  'com.realvnc.viewer.android': { name: 'RealVNC Viewer', category: 'Tools', icon: 'SlidersHorizontal' },
  'in.ndhm.phr': { name: 'ABHA Health', category: 'Tools', icon: 'Smartphone' },
  'de.wetteronline.wetterapp': { name: 'Weather & Radar', category: 'Tools', icon: 'Compass' },
};

function formatPackageName(pkg: string): string {
  if (KNOWN_APPS[pkg]) return KNOWN_APPS[pkg].name;
  const parts = pkg.split('.');
  const last = parts[parts.length - 1];
  return last
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getAppCategory(pkg: string): 'Games' | 'Social' | 'Media' | 'Tools' | 'Productivity' | 'System' {
  if (KNOWN_APPS[pkg]) return KNOWN_APPS[pkg].category;
  if (pkg.includes('game') || pkg.includes('play') || pkg.includes('puzzle')) return 'Games';
  if (pkg.includes('chat') || pkg.includes('social') || pkg.includes('mail') || pkg.includes('msg')) return 'Social';
  if (pkg.includes('video') || pkg.includes('music') || pkg.includes('audio') || pkg.includes('camera')) return 'Media';
  if (pkg.includes('office') || pkg.includes('docs') || pkg.includes('note') || pkg.includes('work')) return 'Productivity';
  return 'Tools';
}

function getAppIconName(pkg: string): string {
  if (KNOWN_APPS[pkg]) return KNOWN_APPS[pkg].icon;
  const cat = getAppCategory(pkg);
  if (cat === 'Games') return 'Gamepad2';
  if (cat === 'Social') return 'MessageSquare';
  if (cat === 'Media') return 'PlaySquare';
  if (cat === 'Productivity') return 'FolderKanban';
  return 'Smartphone';
}

export function handleAdbBridge(req: IncomingMessage, res: ServerResponse): boolean {
  if (!req.url) return false;
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = parsedUrl.pathname;

  // 1. Devices endpoint
  if (pathname === '/api/adb/devices') {
    exec('adb devices -l', (err, stdout) => {
      res.setHeader('Content-Type', 'application/json');
      if (err) {
        res.end(JSON.stringify({ success: false, error: err.message, devices: [] }));
        return;
      }

      const lines = stdout.split(/\r?\n/).filter((l) => l && !l.startsWith('List of devices'));
      const parsedDevices: any[] = [];
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2 && parts[1] === 'device') {
          const serial = parts[0];
          const modelMatch = line.match(/model:(\S+)/);
          const rawModel = modelMatch ? modelMatch[1].replace(/_/g, ' ') : 'Android Phone';
          let brand = 'Android';
          const lowerModel = rawModel.toLowerCase();
          if (lowerModel.includes('moto')) brand = 'Motorola';
          else if (lowerModel.includes('redmi') || lowerModel.includes('xiaomi') || lowerModel.includes('mi ')) brand = 'Xiaomi';
          else if (lowerModel.includes('samsung') || lowerModel.includes('sm-')) brand = 'Samsung';
          else if (lowerModel.includes('oneplus')) brand = 'OnePlus';
          else if (lowerModel.includes('pixel')) brand = 'Google';

          parsedDevices.push({
            id: `dev-${serial}`,
            name: `${brand} ${rawModel}`.replace(/^(Xiaomi|Motorola|Samsung|Google)\s+\1/i, '$1'),
            brand,
            model: rawModel,
            serialNumber: serial,
            androidVersion: '15',
            connectionType: 'usb',
            resolution: '1080x2400',
            refreshRate: 60,
            batteryLevel: 88,
            isCharging: true,
            storageTotal: '128 GB',
            storageUsed: '42.6 GB',
            ramTotal: '8 GB',
            ramUsed: '4.2 GB',
            ipAddress: '127.0.0.1',
            status: 'connected',
            isWireless: false,
          });
        }
      }

      if (parsedDevices.length > 0) {
        const activeSerial = parsedDevices[0].serialNumber;
        if (activeSerial !== lastKnownDeviceSerial) {
          console.log(`[ADB Bridge] Device connected/changed: ${activeSerial} (${parsedDevices[0].name})`);
          lastKnownDeviceSerial = activeSerial;
          isExtractorPushed = false;
          iconCache.clear();
          cachedDeviceApps = [];
        }
      } else if (lastConnectedDeviceCount > 0) {
        console.log('[ADB Bridge] Device disconnected, clearing state cache');
        lastKnownDeviceSerial = '';
        isExtractorPushed = false;
        iconCache.clear();
        cachedDeviceApps = [];
      }
      lastConnectedDeviceCount = parsedDevices.length;

      res.end(
        JSON.stringify({
          success: true,
          raw: stdout,
          devices: parsedDevices,
          connected: parsedDevices.length > 0,
          count: parsedDevices.length,
          timestamp: Date.now(),
        })
      );
    });
    return true;
  }

  // 1.05 Device Wake & Screen Unlock endpoint
  if (pathname === '/api/adb/wake') {
    wakeDeviceIfNeeded(() => {
      exec('adb shell "wm dismiss-keyguard && input keyevent 82"', (err, stdout) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: !err, output: stdout || '' }));
      });
    });
    return true;
  }

function sanitizePackage(raw: string): string {
  let clean = (raw || '').trim();
  while (clean.startsWith('package:')) {
    clean = clean.substring('package:'.length).trim();
  }
  if (clean.startsWith('phone-app-')) {
    clean = clean.substring('phone-app-'.length).trim();
  }
  if (clean.includes('?')) {
    clean = clean.split('?')[0].trim();
  }
  return clean.replace(/[\r\n\t]/g, '').trim();
}

  // 1.1 Real App Icon extraction endpoint (serves PNG with high-speed memory cache)
  if (pathname === '/api/adb/icon') {
    const rawPkg = parsedUrl.searchParams.get('package') || '';
    const pkg = sanitizePackage(rawPkg);
    if (!pkg) {
      res.statusCode = 400;
      res.end('Missing package parameter');
      return true;
    }

    // Return from in-memory cache if already extracted
    if (iconCache.has(pkg)) {
      const cached = iconCache.get(pkg)!;
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.end(cached);
      return true;
    }

    ensureExtractorJar((pushErr) => {
      if (pushErr) {
        res.statusCode = 404;
        res.end('Icon extractor unavailable');
        return;
      }

      const cmd = `adb shell "CLASSPATH=/data/local/tmp/dex-icon-extractor.jar app_process / com.androiddex.IconExtractor ${pkg} 2>/dev/null"`;
      exec(cmd, { maxBuffer: 5 * 1024 * 1024 }, (execErr, stdout) => {
        if (execErr || !stdout) {
          res.statusCode = 404;
          res.end('Icon extraction failed');
          return;
        }

        const lines = stdout.split(/\r?\n/);
        let b64 = '';
        for (const line of lines) {
          if (line.startsWith('ICON:')) {
            const parts = line.split('|');
            if (parts.length >= 2 && parts[1].trim().length > 20) {
              b64 = parts[1].trim();
              break;
            }
          } else if (line.trim().length > 100 && !line.includes(' ')) {
            b64 = line.trim();
            break;
          }
        }

        if (b64) {
          try {
            const imgBuf = Buffer.from(b64, 'base64');
            iconCache.set(pkg, imgBuf);
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.end(imgBuf);
          } catch {
            res.statusCode = 500;
            res.end('Invalid icon data');
          }
        } else {
          res.statusCode = 404;
          res.end('Icon data empty');
        }
      });
    });
    return true;
  }

  // 2. Real installed apps list (Enumerates all launchable activities, system & third-party)
  if (pathname === '/api/adb/apps') {
    const shouldClear = parsedUrl.searchParams.get('clearCache') === 'true' || parsedUrl.searchParams.get('force') === 'true';
    if (!shouldClear && cachedDeviceApps.length > 0) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, count: cachedDeviceApps.length, apps: cachedDeviceApps, fromCache: true, isDeviceConnected: true }));
      return true;
    }

    if (shouldClear) {
      console.log('[ADB Bridge] Invalidation requested: clearing icon and apps cache');
      iconCache.clear();
      cachedDeviceApps = [];
      isExtractorPushed = false;
    }

    const queryCmd = 'adb shell cmd package query-activities --brief -a android.intent.action.MAIN -c android.intent.category.LAUNCHER';

    exec(queryCmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      let activities: { pkg: string; act: string }[] = [];

      if (!err && stdout) {
        const lines = stdout.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.includes('/') && !trimmed.startsWith('match=') && !trimmed.startsWith('priority=') && !trimmed.startsWith('Activity #')) {
            const [rawPkg, act] = trimmed.split('/');
            const pkg = sanitizePackage(rawPkg);
            if (pkg && act) {
              activities.push({ pkg, act });
            }
          }
        }
      }

      // Fallback if query-activities failed or returned empty
      if (activities.length === 0) {
        console.warn('[ADB Bridge] query-activities returned empty, falling back to pm list packages');
        exec('adb shell pm list packages -3', (err2, stdout2) => {
          exec('adb shell pm list packages -s', (err3, stdout3) => {
            const combined = `${stdout2 || ''}\n${stdout3 || ''}`;
            const pkgLines = combined.split(/\r?\n/).filter((l) => l.startsWith('package:'));
            const apps = pkgLines.map((l, idx) => {
              const pkg = sanitizePackage(l);
              return {
                id: `phone-app-${pkg}`,
                name: formatPackageName(pkg),
                packageName: pkg,
                category: getAppCategory(pkg),
                icon: getAppIconName(pkg),
                iconUrl: `/api/adb/icon?package=${encodeURIComponent(pkg)}`,
                version: '1.0',
                size: 'Installed App',
                isPinned: idx < 6,
              };
            });
            if (apps.length > 0) {
              cachedDeviceApps = apps;
              console.log(`[ADB Bridge] Enumerated ${apps.length} fallback apps from device`);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, count: apps.length, apps, fromCache: false, isDeviceConnected: true }));
            } else if (cachedDeviceApps.length > 0) {
              console.log(`[ADB Bridge] Device offline/no apps returned, serving ${cachedDeviceApps.length} cached apps`);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, count: cachedDeviceApps.length, apps: cachedDeviceApps, fromCache: true, isDeviceConnected: false }));
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, count: 0, apps: [], fromCache: false, isDeviceConnected: false }));
            }
          });
        });
        return;
      }

      // Deduplicate packages while retaining main activity
      const seenPackages = new Map<string, string>();
      for (const { pkg, act } of activities) {
        if (!seenPackages.has(pkg)) {
          seenPackages.set(pkg, act);
        }
      }

      const apps = Array.from(seenPackages.entries()).map(([pkg, act], idx) => {
        return {
          id: `phone-app-${pkg}`,
          name: formatPackageName(pkg),
          packageName: pkg,
          activity: act,
          category: getAppCategory(pkg),
          icon: getAppIconName(pkg),
          iconUrl: `/api/adb/icon?package=${encodeURIComponent(pkg)}`,
          version: '1.0',
          size: 'Launchable App',
          isPinned: idx < 8,
        };
      });

      if (apps.length > 0) {
        cachedDeviceApps = apps;
        console.log(`[ADB Bridge] Successfully enumerated ${apps.length} launchable apps via cmd package`);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, count: apps.length, apps, fromCache: false, isDeviceConnected: true }));
      } else if (cachedDeviceApps.length > 0) {
        console.log(`[ADB Bridge] Query returned 0 apps, serving ${cachedDeviceApps.length} cached apps`);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, count: cachedDeviceApps.length, apps: cachedDeviceApps, fromCache: true, isDeviceConnected: false }));
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, count: 0, apps: [], fromCache: false, isDeviceConnected: false }));
      }
    });
    return true;
  }

  // Restart ADB Server
  if (pathname === '/api/adb/restart-server' && req.method === 'POST') {
    exec('adb kill-server && adb start-server', (err, stdout) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: !err, output: stdout }));
    });
    return true;
  }

  // 3. Reliable Multi-Fallback App Launch on phone
  // Primary: adb shell monkey -p <clean_package_name> -c android.intent.category.LAUNCHER 1
  // Secondary Fallback: adb shell cmd package resolve-activity --brief <clean_package_name> -> adb shell am start -n <component>
  if (pathname === '/api/adb/launch-app' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { packageName } = JSON.parse(body || '{}');
        const cleanPackage = sanitizePackage(packageName);

        if (!cleanPackage) {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, error: 'Missing or invalid packageName' }));
          return;
        }

        console.log(`[ADB Bridge] Launch requested for: "${packageName}" -> Clean: "${cleanPackage}"`);
        markDeviceActive();

        // High-speed launch: execute monkey directly, dismissing keyguard seamlessly
        const monkeyCmd = `adb shell "wm dismiss-keyguard; monkey -p ${cleanPackage} -c android.intent.category.LAUNCHER 1"`;
        console.log(`[ADB Bridge] Executing Fast Launch: ${monkeyCmd}`);

        // Respond immediately to the frontend so UI transition feels instantaneous
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: true,
          method: 'monkey-fast',
          command: monkeyCmd,
        }));

        // Execute in background
        exec(monkeyCmd, (mErr, mStdout, mStderr) => {
          const stdout = (mStdout || '').trim();
          const stderr = (mStderr || '').trim();
          const combined = `${stdout}\n${stderr}`;

          const isMonkeySuccess = !mErr &&
            !combined.includes('No activities found') &&
            !combined.includes('monkey aborted') &&
            !combined.includes('** Error:') &&
            !combined.includes('** Can\'t find');

          if (isMonkeySuccess) {
            console.log(`[ADB Bridge] ✓ Launch succeeded for ${cleanPackage}`);
          } else {
            // Fallback via resolve-activity
            console.warn(`[ADB Bridge] Monkey returned warning for ${cleanPackage}. Attempting Secondary Fallback...`);
            const resolveCmd = `adb shell "cmd package resolve-activity --brief ${cleanPackage}"`;
            exec(resolveCmd, (rErr, rStdout) => {
              const resolveOutput = (rStdout || '').trim();
              let resolvedComponent = '';
              for (const line of resolveOutput.split(/\r?\n/)) {
                const trimmed = line.trim();
                if (trimmed.includes('/') && !trimmed.startsWith('priority=')) {
                  resolvedComponent = trimmed;
                  break;
                }
              }
              if (resolvedComponent) {
                exec(`adb shell am start -n ${resolvedComponent}`);
              }
            });
          }

          // Ensure landscape orientation
          exec('adb shell "settings put system accelerometer_rotation 0 && settings put system user_rotation 1"');
        });
        return;
      } catch (e: any) {
        console.error('[ADB Bridge] Launch exception:', e);
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return true;
  }

  // 4. Real files list from /sdcard
  if (pathname === '/api/adb/files') {
    const targetPath = parsedUrl.searchParams.get('path') || '/sdcard';
    const cleanPath = targetPath.endsWith('/') ? targetPath : `${targetPath}/`;

    exec(`adb shell "ls -la '${cleanPath}'"`, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      res.setHeader('Content-Type', 'application/json');
      if (err) {
        res.end(JSON.stringify({ success: false, error: err.message, files: [] }));
        return;
      }

      const rawLines = stdout.split(/\r?\n/);
      const files: any[] = [];

      for (const line of rawLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('total ') || trimmed.startsWith('lrw')) continue;

        const match = trimmed.match(/^([drwxst-]{10})\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s+(.+)$/);
        if (match) {
          const [, permissions, sizeBytes, dateStr, fileName] = match;
          if (fileName === '.' || fileName === '..') continue;

          const isDir = permissions.startsWith('d');
          const ext = fileName.toLowerCase().split('.').pop() || '';
          let fileType = 'file';
          if (isDir) {
            fileType = 'folder';
          } else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
            fileType = 'image';
          } else if (['mp4', 'mkv', 'avi', 'mov'].includes(ext)) {
            fileType = 'video';
          } else if (['mp3', 'm4a', 'wav', 'flac'].includes(ext)) {
            fileType = 'audio';
          } else if (['apk', 'xapk'].includes(ext)) {
            fileType = 'apk';
          } else if (['pdf', 'doc', 'docx', 'txt', 'json'].includes(ext)) {
            fileType = 'document';
          }

          const bytes = parseInt(sizeBytes, 10);
          const sizeStr = isDir
            ? 'Folder'
            : bytes > 1024 * 1024 * 1024
            ? `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
            : bytes > 1024 * 1024
            ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(bytes / 1024)} KB`;

          const fullFilePath = `${cleanPath}${fileName}`.replace(/\/+/g, '/');

          files.push({
            id: `adb-f-${Buffer.from(fullFilePath).toString('base64').replace(/=/g, '')}`,
            name: fileName,
            path: fullFilePath,
            type: fileType,
            size: sizeStr,
            modified: dateStr,
            url: `/api/adb/file-content?path=${encodeURIComponent(fullFilePath)}`,
          });
        }
      }

      res.end(JSON.stringify({ success: true, path: targetPath, count: files.length, files }));
    });
    return true;
  }

  // 5. Stream real file content (photos, audio, video)
  if (pathname === '/api/adb/file-content') {
    const filePath = parsedUrl.searchParams.get('path');
    if (!filePath) {
      res.statusCode = 400;
      res.end('Missing path');
      return true;
    }

    const ext = filePath.toLowerCase().split('.').pop() || '';
    let mime = 'application/octet-stream';
    if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
    else if (ext === 'png') mime = 'image/png';
    else if (ext === 'webp') mime = 'image/webp';
    else if (ext === 'gif') mime = 'image/gif';
    else if (ext === 'mp4') mime = 'video/mp4';
    else if (ext === 'mp3') mime = 'audio/mpeg';
    else if (ext === 'pdf') mime = 'application/pdf';

    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const catProcess = spawn('adb', ['exec-out', 'cat', filePath]);
    catProcess.stdout.pipe(res);
    catProcess.stderr.on('data', () => {});
    catProcess.on('error', () => {
      if (!res.headersSent) res.statusCode = 500;
      res.end();
    });
    return true;
  }

  // 6. Live Screen Capture Frame
  if (pathname === '/api/adb/screen/frame') {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');

    const screencap = spawn('adb', ['exec-out', 'screencap', '-p']);
    screencap.stdout.pipe(res);
    screencap.on('error', () => {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end();
      }
    });
    return true;
  }

  // 6.5 Touch Input Security Status (Detects MIUI INJECT_EVENTS permission requirement)
  if (pathname === '/api/adb/input/status') {
    const forceRecheck = parsedUrl.searchParams.get('recheck') === 'true';
    if (forceRecheck) {
      checkInputSecurityStatus().then((isBlocked) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          canInjectEvents: !isBlocked,
          isSecuritySettingsBlocked: isBlocked,
          deviceBrand: 'Xiaomi',
        }));
      });
      return true;
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      canInjectEvents: !isSecuritySettingsBlocked,
      isSecuritySettingsBlocked,
      deviceBrand: 'Xiaomi',
    }));
    return true;
  }

  // 6.6 Open Developer Options on Phone directly via Intent
  if (pathname === '/api/adb/open-dev-options') {
    exec('adb shell "am start -a com.android.settings.APPLICATION_DEVELOPMENT_SETTINGS"', (err) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: !err, error: err?.message }));
    });
    return true;
  }

  // 7. Touch Input: Tap on Phone (Instant Fast Tap via persistent shell)
  if (pathname === '/api/adb/input/tap' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { xPercent, yPercent, width, height, rawX, rawY } = JSON.parse(body || '{}');
        const devW = width || cachedDeviceWidth;
        const devH = height || cachedDeviceHeight;

        let calcX: number;
        let calcY: number;

        if (typeof rawX === 'number' && typeof rawY === 'number') {
          calcX = Math.round(rawX);
          calcY = Math.round(rawY);
        } else {
          calcX = Math.round((xPercent / 100) * devW);
          calcY = Math.round((yPercent / 100) * devH);
        }

        // Send fast tap instantly via persistent shell
        sendFastTap(calcX, calcY);

        // Immediately respond to HTTP to keep frontend UI snappy and responsive
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, x: calcX, y: calcY }));
      } catch (e: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return true;
  }

  // 8. Keyevent: Home, Back, Recents, Power, Vol
  if (pathname === '/api/adb/input/key' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { key } = JSON.parse(body || '{}');
        sendFastKey(key);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, key }));
      } catch (e: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return true;
  }

  // 9. Swipe / Drag
  if (pathname === '/api/adb/input/swipe' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { x1, y1, x2, y2, duration = 200 } = JSON.parse(body || '{}');
        sendFastSwipe(x1, y1, x2, y2, duration);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      } catch (e: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return true;
  }

  // 9.5 Text Input (type text via ADB)
  if (pathname === '/api/adb/input/text' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { text } = JSON.parse(body || '{}');
        if (text) {
          sendFastText(text);
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      } catch (e: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return true;
  }

  // 9.6 Screen Rotation & Auto-Rotate
  if (pathname === '/api/adb/rotate') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const { orientation = 'toggle' } = JSON.parse(body || '{}');
          if (orientation === 'auto') {
            // Enable sensor-based accelerometer auto-rotation
            exec('adb shell settings put system accelerometer_rotation 1', (error) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: !error, mode: 'auto', orientation: 'auto' }));
            });
          } else if (orientation === 'portrait') {
            // Lock portrait (user_rotation 0)
            exec('adb shell "settings put system accelerometer_rotation 0 && settings put system user_rotation 0"', (error) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: !error, mode: 'manual', orientation: 'portrait' }));
            });
          } else if (orientation === 'landscape') {
            // Lock landscape (user_rotation 1)
            exec('adb shell "settings put system accelerometer_rotation 0 && settings put system user_rotation 1"', (error) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: !error, mode: 'manual', orientation: 'landscape' }));
            });
          } else {
            // Toggle
            exec('adb shell settings get system user_rotation', (err, stdout) => {
              const current = (stdout || '').trim();
              const nextRotation = current === '0' ? '1' : '0';
              const nextOrient = nextRotation === '1' ? 'landscape' : 'portrait';
              exec(`adb shell "settings put system accelerometer_rotation 0 && settings put system user_rotation ${nextRotation}"`, (toggleErr) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: !toggleErr, mode: 'manual', orientation: nextOrient }));
              });
            });
          }
        } catch (e: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return true;
    } else {
      // GET: return current rotation settings
      exec('adb shell "settings get system accelerometer_rotation && settings get system user_rotation"', (err, stdout) => {
        const lines = (stdout || '').split(/\r?\n/).filter(Boolean);
        const auto = lines[0] === '1';
        const userRot = lines[1] || '0';
        const currentOrient = userRot === '1' || userRot === '3' ? 'landscape' : 'portrait';
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: !err,
          autoRotate: auto,
          userRotation: parseInt(userRot, 10),
          orientation: currentOrient,
        }));
      });
      return true;
    }
  }

  // 10. Native Scrcpy 60 FPS Mirror Launch
  if (pathname === '/api/scrcpy/launch') {
    try {
      const requestedFps = parsedUrl.searchParams.get('fps') || '60';
      exec('adb devices -l', (err, stdout) => {
        let model = 'Android Phone';
        let serial = '';
        if (!err && stdout) {
          const lines = stdout.split(/\r?\n/).filter((l) => l && !l.startsWith('List of devices'));
          if (lines.length > 0) {
            const firstLine = lines[0].trim();
            const parts = firstLine.split(/\s+/);
            serial = parts[0];
            const modelMatch = firstLine.match(/model:(\S+)/);
            if (modelMatch) model = modelMatch[1].replace(/_/g, ' ');
          }
        }

        const serialArg = serial ? `-s ${serial}` : '';
        const titleArg = `--window-title="Android OS - ${model}"`;
        // Windows 'start' guarantees the native Direct3D11 GUI window is attached to the active user desktop
        // Using optimal 60 FPS with 8M bitrate to prevent thermal throttling, stutter, and USB bus saturation
        const launchCmd = `cmd.exe /c start "" scrcpy --max-fps ${requestedFps} --video-bit-rate 8M --stay-awake --no-audio ${serialArg} ${titleArg}`;
        console.log(`[ADB Bridge] Launching native scrcpy at ${requestedFps} FPS: ${launchCmd}`);

        exec(launchCmd, (execErr) => {
          res.setHeader('Content-Type', 'application/json');
          if (execErr) {
            console.error('[ADB Bridge] Failed to launch scrcpy:', execErr);
            res.end(JSON.stringify({ success: false, error: execErr.message }));
          } else {
            res.end(JSON.stringify({ success: true, message: `Scrcpy ${requestedFps} FPS mirror launched on desktop for ${model}!` }));
          }
        });
      });
    } catch (e: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return true;
  }

  return false;
}
