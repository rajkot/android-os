import React, { useState } from 'react';
import { AppDefinition, DeviceInfo } from '../types';
import { getAppIcon } from './AppIconHelper';
import {
  Search,
  Power,
  RefreshCw,
  Sliders,
  Smartphone,
  ChevronRight,
  Pin,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface StartMenuProps {
  isOpen: boolean;
  onClose: () => void;
  apps: AppDefinition[];
  onOpenApp: (appId: string) => void;
  activeDevice: DeviceInfo | null;
  onOpenDeviceManager?: () => void;
  onSimulateReconnect: () => void;
  onOpenSettings: () => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({
  isOpen,
  onClose,
  apps,
  onOpenApp,
  activeDevice,
  onOpenDeviceManager,
  onSimulateReconnect,
  onOpenSettings,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen) return null;

  const categories = ['All', 'Tools', 'Media', 'Games', 'Productivity', 'Social', 'System'];

  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.packageName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div
      id="start-menu-flyout"
      className="fixed bottom-14 left-1/2 -translate-x-1/2 w-full max-w-xl bg-slate-950/95 backdrop-blur-2xl border border-slate-800/90 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[580px] select-none text-slate-200"
    >
      {/* Search Bar Header */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Type to search apps, packages, or settings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full bg-transparent border-none outline-none text-xs text-slate-100 placeholder:text-slate-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Apps Grid */}
      <div className="flex-1 p-4 overflow-y-auto min-h-[280px]">
        <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-[11px]">
            {selectedCategory === 'All' ? 'Installed Applications' : `${selectedCategory} Apps`}
          </span>
          <span className="text-[11px] font-mono">{filteredApps.length} Apps</span>
        </div>

        {filteredApps.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No applications match "{search}"
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {filteredApps.map((app) => (
              <button
                key={app.id}
                onClick={() => {
                  onOpenApp(app.id);
                  onClose();
                }}
                className="flex flex-col items-center p-3 rounded-xl hover:bg-slate-900/80 border border-transparent hover:border-slate-800 transition group text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-center text-blue-400 group-hover:scale-105 group-hover:bg-blue-600/20 group-hover:border-blue-500/40 transition shadow-sm mb-2">
                  {getAppIcon(app.icon, 'w-6 h-6', app.iconUrl)}
                </div>
                <span className="text-xs font-medium text-slate-200 group-hover:text-white truncate w-full">
                  {app.name}
                </span>
                <span className="text-[10px] text-slate-500 truncate w-full mt-0.5">
                  {app.category}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer: Device Profile & System Actions */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between text-xs">
        {activeDevice ? (
          <div
            onClick={onOpenSettings}
            className="flex items-center gap-2.5 hover:bg-slate-800/60 p-1.5 rounded-lg cursor-pointer transition"
          >
            <div className="p-1.5 rounded-md bg-blue-600/20 text-blue-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-200 leading-tight">{activeDevice.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {activeDevice.connectionType.toUpperCase()} · Battery: {activeDevice.batteryLevel}%
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => {
              if (onOpenDeviceManager) onOpenDeviceManager();
              onClose();
            }}
            className="flex items-center gap-2.5 hover:bg-slate-800/60 p-1.5 rounded-lg cursor-pointer transition"
          >
            <div className="p-1.5 rounded-md bg-amber-600/20 text-amber-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-amber-300 leading-tight">No Device Connected</div>
              <div className="text-[10px] text-slate-400 font-mono">
                Click to connect via USB or Wi-Fi
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              onSimulateReconnect();
              onClose();
            }}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Reconnect ADB Bridge"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="System Telemetry"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
