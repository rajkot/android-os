import React from 'react';
import { DesktopBackground } from './DesktopBackground';
import { Win10Taskbar } from './Win10Taskbar';
import { OpenWindowState, DeviceInfo, DexSystemTelemetry } from '../../types';

export interface WinDesktopScreenProps {
  wallpaper?: string;
  backgroundColor?: string;
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
  desktopContent?: React.ReactNode;
  overlays?: React.ReactNode;
  runningAppsContent?: React.ReactNode;
  children?: React.ReactNode;
}

export const WinDesktopScreen: React.FC<WinDesktopScreenProps> = ({
  wallpaper = 'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(0, 120, 215, 0.4), transparent 70%), linear-gradient(135deg, #050a14 0%, #00122e 40%, #000c1e 70%, #020408 100%)',
  backgroundColor = '#0c0c0c',
  onStartClick,
  isStartOpen = false,
  onSearchClick,
  onNotificationCenterClick,
  isNotificationCenterOpen = false,
  onQuickSettingsClick,
  isQuickSettingsOpen = false,
  onShowDesktop,
  unreadNotificationsCount = 0,
  openWindows,
  activeWindowId,
  onWindowClick,
  onWindowClose,
  activeDevice,
  telemetry,
  onTakeScreenshot,
  onLaunchScrcpy,
  onBackClick,
  onHomeClick,
  onRecentsClick,
  onRotateClick,
  desktopContent,
  overlays,
  runningAppsContent,
  children,
}) => {
  return (
    <div
      id="win10-desktop-screen"
      className="relative flex-1 w-full overflow-hidden bg-[#0c0c0c] text-white select-none font-sans flex flex-col"
    >
      {/* 1. Main Screen Space: DesktopBackground */}
      <DesktopBackground wallpaper={wallpaper} backgroundColor={backgroundColor}>
        {desktopContent}
        {children}
      </DesktopBackground>

      {/* 2. Window & Flyout Overlays Layer (Above background, windows, and taskbar) */}
      {overlays && (
        <div className="absolute inset-0 pointer-events-none z-[60] [&>*]:pointer-events-auto">
          {overlays}
        </div>
      )}

      {/* 3. Bottom Taskbar (Height 48px) */}
      <Win10Taskbar
        onStartClick={onStartClick}
        isStartOpen={isStartOpen}
        onSearchClick={onSearchClick}
        onNotificationCenterClick={onNotificationCenterClick}
        isNotificationCenterOpen={isNotificationCenterOpen}
        onQuickSettingsClick={onQuickSettingsClick}
        isQuickSettingsOpen={isQuickSettingsOpen}
        onShowDesktop={onShowDesktop}
        unreadNotificationsCount={unreadNotificationsCount}
        openWindows={openWindows}
        activeWindowId={activeWindowId}
        onWindowClick={onWindowClick}
        onWindowClose={onWindowClose}
        activeDevice={activeDevice}
        telemetry={telemetry}
        onTakeScreenshot={onTakeScreenshot}
        onLaunchScrcpy={onLaunchScrcpy}
        onBackClick={onBackClick}
        onHomeClick={onHomeClick}
        onRecentsClick={onRecentsClick}
        onRotateClick={onRotateClick}
      >
        {runningAppsContent}
      </Win10Taskbar>
    </div>
  );
};
