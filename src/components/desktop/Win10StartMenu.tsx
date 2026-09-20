import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppDefinition, DeviceInfo } from '../../types';
import { getAppIcon } from '../AppIconHelper';
import {
  Search,
  Power,
  RefreshCw,
  Smartphone,
  User,
  FolderKanban,
  Settings,
  Pin,
  RotateCcw,
  Sparkles,
  LayoutGrid,
  List,
  Terminal,
  Gamepad2,
  Tv
} from 'lucide-react';

interface Win10StartMenuProps {
  isOpen: boolean;
  onClose: () => void;
  apps: AppDefinition[];
  onOpenApp: (appId: string) => void;
  activeDevice: DeviceInfo | null;
  onOpenSettings?: () => void;
  onSimulateReconnect?: () => void;
  onRefreshApps?: () => void;
  onOpenDeviceManager?: () => void;
  pinnedDesktopAppIds?: string[];
  onTogglePinDesktop?: (appId: string) => void;
}

export const Win10StartMenu: React.FC<Win10StartMenuProps> = ({
  isOpen,
  onClose,
  apps,
  onOpenApp,
  activeDevice,
  onOpenSettings,
  onSimulateReconnect,
  onRefreshApps,
  onOpenDeviceManager,
  pinnedDesktopAppIds = [],
  onTogglePinDesktop,
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'pinned' | 'all'>('pinned');
  const [isPowerMenuOpen, setIsPowerMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setIsPowerMenuOpen(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        const startBtn = document.getElementById('win10-start-button');
        if (startBtn && startBtn.contains(e.target as Node)) return;
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Filter out internal mirror wrapper utilities, keeping genuine phone apps
  const filteredPhoneApps = useMemo(() => {
    const query = search.trim().toLowerCase();
    return apps
      .filter((app) => !app.id.includes('mirror') && !app.packageName.startsWith('com.androiddex.'))
      .filter((app) => {
        if (!query) return true;
        return (
          app.name.toLowerCase().includes(query) ||
          app.packageName.toLowerCase().includes(query)
        );
      });
  }, [apps, search]);

  // Alphabetical grouping of phone apps (A-Z)
  const groupedApps = useMemo(() => {
    const groups: Record<string, AppDefinition[]> = {};
    for (const app of filteredPhoneApps) {
      const firstChar = (app.name[0] || '#').toUpperCase();
      const groupKey = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(app);
    }
    return Object.keys(groups)
      .sort()
      .map((key) => ({
        letter: key,
        items: groups[key].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [filteredPhoneApps]);

  // Pinned Apps for the modern grid
  const pinnedTiles = useMemo(() => {
    const phoneAppsOnly = apps.filter(
      (a) => !a.id.includes('mirror') && !a.packageName.startsWith('com.androiddex.')
    );
    // Prioritize popular phone apps
    const priority = ['chrome', 'youtube', 'camera', 'photos', 'whatsapp', 'spotify', 'vlc', 'play-store', 'maps', 'file', 'settings', 'calculator', 'messages'];
    const getPriorityIndex = (app: AppDefinition) => {
      const id = app.id.toLowerCase();
      const pkg = (app.packageName || '').toLowerCase();
      const name = (app.name || '').toLowerCase();
      for (let i = 0; i < priority.length; i++) {
        const p = priority[i];
        if (id.includes(p) || pkg.includes(p) || name.includes(p)) return i;
      }
      return 999;
    };
    const sorted = [...phoneAppsOnly].sort((a, b) => {
      const aIdx = getPriorityIndex(a);
      const bIdx = getPriorityIndex(b);
      if (aIdx !== bIdx) return aIdx - bIdx;
      return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
    });
    return sorted.slice(0, 12);
  }, [apps]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      id="win10-start-menu"
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed bottom-[60px] left-3 z-50 pointer-events-auto flex flex-col w-[620px] h-[580px] rounded-3xl overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9)] border border-white/15 backdrop-blur-3xl bg-slate-950/90 text-white select-none animate-in fade-in slide-in-from-bottom-4 duration-200 ring-1 ring-white/10 font-sans"
    >
      {/* Specular top highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

      {/* Top Section: Search Bar & Tab Toggle */}
      <div className="p-4 pb-2 border-b border-white/10 flex flex-col gap-3 shrink-0">
        {/* Modern Frosted Search Bar */}
        <div className="flex items-center bg-white/[0.06] hover:bg-white/[0.09] focus-within:bg-white/[0.12] focus-within:ring-2 focus-within:ring-cyan-400/50 border border-white/10 rounded-2xl px-4 py-2.5 transition-all shadow-inner">
          <Search className="w-4 h-4 text-cyan-400 mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Search phone apps, settings, Android files..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value.trim() && activeTab !== 'all') {
                setActiveTab('all');
              }
            }}
            autoFocus
            className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-slate-400 font-sans"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <button
              onClick={() => setActiveTab('pinned')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'pinned'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Pinned Apps</span>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>All Apps ({apps.length})</span>
            </button>
          </div>

          <span className="text-[11px] text-cyan-300/80 font-mono flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{activeDevice ? `${activeDevice.name} · 60Hz` : 'Android Desktop · 60Hz'}</span>
          </span>
        </div>
      </div>

      {/* Middle Section: Pinned Grid or All Apps List */}
      <div className="flex-1 min-h-0 overflow-y-auto win10-menu-scrollbar p-4">
        {activeTab === 'pinned' && !search ? (
          <div className="space-y-4">
            {/* Pinned Phone Apps Grid */}
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Pinned Phone Apps</span>
                <span className="text-[10px] text-slate-500 lowercase">click to launch in widescreen</span>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {pinnedTiles.map((app) => (
                  <div
                    key={app.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      onOpenApp(app.id);
                      onClose();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenApp(app.id);
                        onClose();
                      }
                    }}
                    className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.06] hover:border-cyan-400/40 hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group hover:-translate-y-0.5 active:scale-95"
                    title={`${app.name} (${app.packageName})`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all mb-1.5">
                      {getAppIcon(app.icon, 'w-6 h-6', app.iconUrl)}
                    </div>
                    <span className="text-xs font-medium text-white/90 group-hover:text-cyan-200 truncate w-full">
                      {app.name}
                    </span>
                    <span className="text-[9px] text-slate-400 truncate w-full">
                      {app.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick DeX Utilities Strip */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Desktop Tools
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    onOpenApp('phone-mirror');
                    onClose();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.06] text-left transition hover:border-cyan-400/30 group"
                >
                  <Tv className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">60 FPS Mirror</div>
                    <div className="text-[10px] text-slate-400 truncate">Low latency view</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onOpenApp('dex-files');
                    onClose();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.06] text-left transition hover:border-blue-400/30 group"
                >
                  <FolderKanban className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">Android Storage</div>
                    <div className="text-[10px] text-slate-400 truncate">File Explorer</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onOpenApp('adb-terminal');
                    onClose();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.06] text-left transition hover:border-emerald-400/30 group"
                >
                  <Terminal className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">ADB Shell</div>
                    <div className="text-[10px] text-slate-400 truncate">Terminal</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Alphabetical All Apps List */
          <div className="space-y-3">
            {groupedApps.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-30 text-cyan-400" />
                <p className="text-sm font-medium">No matching Android apps found</p>
                <p className="text-xs text-slate-600 mt-1">Try a different search query</p>
              </div>
            ) : (
              groupedApps.map((group) => (
                <div key={group.letter} className="space-y-1">
                  <div className="px-3 py-1 text-xs font-bold text-cyan-400 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10">
                    {group.letter}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {group.items.map((app) => {
                      const isPinnedToDesktop = pinnedDesktopAppIds.includes(app.id);
                      return (
                        <div
                          key={app.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            onOpenApp(app.id);
                            onClose();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onOpenApp(app.id);
                              onClose();
                            }
                          }}
                          className="group flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.08] cursor-pointer transition-colors"
                          title={`${app.name} (${app.packageName})`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 text-cyan-400 group-hover:scale-105 transition-transform">
                              {getAppIcon(app.icon, 'w-4 h-4', app.iconUrl)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                                {app.name}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {app.category}
                              </div>
                            </div>
                          </div>

                          {onTogglePinDesktop && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePinDesktop(app.id);
                              }}
                              className={`p-1.5 rounded-lg transition-opacity ${
                                isPinnedToDesktop
                                  ? 'text-cyan-400 opacity-100'
                                  : 'text-slate-500 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10'
                              }`}
                              title={isPinnedToDesktop ? 'Unpin from Desktop' : 'Pin to Desktop'}
                            >
                              <Pin className={`w-3.5 h-3.5 ${isPinnedToDesktop ? 'fill-current' : ''}`} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Profile & Power Dock */}
      <div className="p-3 px-4 border-t border-white/10 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
        {/* Active Device / User Info */}
        <div
          onClick={() => onOpenDeviceManager?.()}
          className="flex items-center gap-3 p-1.5 px-2.5 rounded-xl hover:bg-white/10 cursor-pointer transition-all max-w-[320px] group"
          title="Click to manage connected Android devices"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white truncate">
                {activeDevice ? activeDevice.name : 'Android Desktop'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              {activeDevice ? `${activeDevice.screenResolution} · 60 FPS` : 'Ready to pair via USB/Wi-Fi'}
            </div>
          </div>
        </div>

        {/* Action Buttons: Sync, Restart ADB, Settings, Power */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (onRefreshApps) onRefreshApps();
              else onSimulateReconnect?.();
            }}
            className="w-8 h-8 rounded-xl hover:bg-white/10 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition"
            title="Sync Phone Apps"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (onOpenSettings) onOpenSettings();
              else onOpenApp('settings');
              onClose();
            }}
            className="w-8 h-8 rounded-xl hover:bg-white/10 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsPowerMenuOpen(!isPowerMenuOpen)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
                isPowerMenuOpen
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'hover:bg-white/10 text-slate-300 hover:text-rose-400'
              }`}
              title="Power & ADB Options"
            >
              <Power className="w-4 h-4" />
            </button>

            {/* Power Flyout */}
            {isPowerMenuOpen && (
              <div
                className="absolute bottom-11 right-0 w-48 bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl p-1.5 text-xs text-slate-200 z-50 select-none animate-in fade-in zoom-in-95 ring-1 ring-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setIsPowerMenuOpen(false);
                    fetch('/api/adb/restart-server', { method: 'POST' }).catch(() => {});
                    onClose();
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-white/10 hover:text-cyan-300 flex items-center gap-2 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Restart ADB Daemon</span>
                </button>
                <div className="border-t border-white/10 my-1" />
                <button
                  onClick={() => {
                    setIsPowerMenuOpen(false);
                    onClose();
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-rose-600 hover:text-white flex items-center gap-2 text-rose-300 transition"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Disconnect Session</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
