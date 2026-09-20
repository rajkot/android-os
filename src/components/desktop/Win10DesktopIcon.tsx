import React, { useState } from 'react';
import { AppDefinition } from '../../types';
import { getAppIcon } from '../AppIconHelper';

interface Win10DesktopIconProps {
  app: AppDefinition;
  isSelected?: boolean;
  onSelect?: () => void;
  onOpen: () => void;
  onUnpin?: () => void;
}

export const Win10DesktopIcon: React.FC<Win10DesktopIconProps> = ({
  app,
  isSelected = false,
  onSelect,
  onOpen,
  onUnpin,
}) => {
  const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.();
    onOpen();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      id={`desktop-icon-${app.id}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className={`group relative flex flex-col items-center justify-center p-2 w-[84px] h-[92px] text-center cursor-pointer transition-all duration-200 rounded-2xl select-none ${
        isSelected
          ? 'bg-cyan-500/20 backdrop-blur-md border border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.02]'
          : 'border border-transparent hover:bg-white/[0.08] hover:backdrop-blur-md hover:border-white/15 hover:shadow-[0_8px_25px_rgba(0,0,0,0.45)] hover:-translate-y-0.5 active:scale-95'
      }`}
      title={`${app.name} (${app.packageName})`}
    >
      {/* Icon Squircle Container with ambient backlight */}
      <div className="relative w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:border-cyan-400/40 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all duration-200 mb-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
        {/* Soft radial glow on hover */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/20 group-hover:to-blue-500/20 transition-all duration-200 pointer-events-none" />
        <div className="relative z-10">
          {getAppIcon(app.icon, 'w-7 h-7', app.iconUrl)}
        </div>
      </div>

      {/* Text Label Underneath (Plus Jakarta Sans & enhanced readability shadow) */}
      <span className="text-[11px] font-medium leading-tight text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] line-clamp-2 px-1 tracking-tight group-hover:text-cyan-200 transition-colors">
        {app.name}
      </span>

      {/* Right-click Context Menu */}
      {showContextMenu && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={(e) => {
              e.stopPropagation();
              setShowContextMenu(null);
            }}
          />
          <div
            style={{ top: showContextMenu.y, left: showContextMenu.x }}
            className="fixed z-[101] min-w-[180px] bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-1.5 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(null);
                onOpen();
              }}
              className="w-full px-3 py-2 text-left rounded-xl hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 hover:text-white font-medium flex items-center gap-2 transition-all"
            >
              <span>Launch App</span>
            </button>
            {onUnpin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowContextMenu(null);
                  onUnpin();
                }}
                className="w-full px-3 py-2 text-left rounded-xl hover:bg-white/10 hover:text-rose-300 flex items-center gap-2 transition-all"
              >
                <span>Unpin from Desktop</span>
              </button>
            )}
            <div className="my-1 border-t border-white/10" />
            <div className="px-3 py-1.5 text-[10px] text-slate-400 font-mono truncate">
              {app.packageName}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
