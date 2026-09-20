export type DeviceConnectionType = 'usb' | 'wifi';

export interface DeviceInfo {
  id: string;
  name: string;
  model: string;
  brand: string;
  connectionType: DeviceConnectionType;
  serialNumber?: string;
  ipAddress?: string;
  port?: number;
  batteryLevel: number;
  isCharging: boolean;
  batteryTemperature: number; // in °C
  batteryVoltage: number; // in Volts
  batteryHealth: 'Good' | 'Fair' | 'Overheat' | 'Cold';
  androidVersion: string;
  screenResolution: string;
  refreshRate: number; // 60, 90, 120 Hz
  fps: number;
  bitrateMbps: number;
  latencyMs: number;
  isOnline: boolean;
}

export interface AppDefinition {
  id: string;
  name: string;
  packageName: string;
  activity?: string;
  icon: string; // Lucide icon name or asset path
  iconUrl?: string; // Direct image URL (e.g. /api/adb/icon?package=...)
  iconBase64?: string; // Base64 encoded PNG
  category: 'System' | 'Media' | 'Productivity' | 'Games' | 'Social' | 'Tools';
  version: string;
  size: string;
  isPinned?: boolean;
}

export interface OpenWindowState {
  id: string;
  appId: string;
  title: string;
  icon: string;
  iconUrl?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  isMinimized: boolean;
  isMaximized: boolean;
  isFullScreen?: boolean;
  scaleMode?: 'contain' | 'cover' | 'stretch';
  zIndex: number;
  orientation: 'portrait' | 'landscape';
  gamingModeActive?: boolean;
}

export interface AndroidNotification {
  id: string;
  appId: string;
  appName: string;
  title: string;
  text: string;
  time: string;
  read: boolean;
  avatarColor?: string;
}

export interface GameKeymapItem {
  id: string;
  type: 'tap' | 'dpad' | 'aim' | 'swipe' | 'turbo';
  key: string;
  xPercent: number; // 0-100% relative to window
  yPercent: number;
  label?: string;
  turboSpeed?: number;
}

export interface StorageFile {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder' | 'image' | 'apk' | 'video' | 'audio' | 'document';
  size: string;
  modified: string;
  url?: string;
}

export interface DexSystemTelemetry {
  jarConnected: boolean;
  apkConnected: boolean;
  allConnected: boolean;
  jarPid: number;
  serverPortJar: number;
  serverPortApk: number;
  volumeMusic: number;
  volumeMusicMax: number;
  volumeRing: number;
  volumeRingMax: number;
  volumeNotification: number;
  volumeNotificationMax: number;
  volumeAlarm: number;
  volumeAlarmMax: number;
  wifiEnabled: boolean;
  wifiSsid: string;
  bluetoothEnabled: boolean;
  mobileDataEnabled: boolean;
  airplaneMode: boolean;
  torchEnabled: boolean;
  rotationLocked: boolean;
  ringerMode: 'normal' | 'vibrate' | 'silent';
  batterySaver: boolean;
}
