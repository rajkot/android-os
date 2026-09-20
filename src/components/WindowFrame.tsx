import React, { useState, useRef, useEffect } from 'react';
import { OpenWindowState, GameKeymapItem } from '../types';
import { getAppIcon } from './AppIconHelper';
import {
  Minus,
  Square,
  X,
  RotateCw,
  Gamepad2,
  Pin,
  Maximize2,
  Minimize2,
  Expand,
  Zap
} from 'lucide-react';

interface WindowFrameProps {
  window: OpenWindowState;
  isActive: boolean;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onToggleFullScreen?: (id: string) => void;
  onToggleScaleMode?: (id: string) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateSize: (id: string, width: number, height: number) => void;
  onToggleOrientation: (id: string) => void;
  onToggleGamingMode: (id: string) => void;
  onLaunchScrcpy?: (id: string) => void;
  gameKeymaps?: GameKeymapItem[];
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
  window: win,
  isActive,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onToggleFullScreen,
  onToggleScaleMode,
  onUpdatePosition,
  onUpdateSize,
  onToggleOrientation,
  onToggleGamingMode,
  onLaunchScrcpy,
  gameKeymaps = [],
  children,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Handle Dragging
  const handleMouseDownHeader = (e: React.MouseEvent) => {
    if (win.isMaximized) return;
    onFocus(win.id);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - win.x,
      y: e.clientY - win.y,
    });
  };

  // Handle Resizing
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFocus(win.id);
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: win.width,
      height: win.height,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 100));
        const newY = Math.max(36, Math.min(e.clientY - dragOffset.y, window.innerHeight - 100));
        onUpdatePosition(win.id, newX, newY);
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const newWidth = Math.max(win.minWidth, resizeStart.width + deltaX);
        const newHeight = Math.max(win.minHeight, resizeStart.height + deltaY);
        onUpdateSize(win.id, newWidth, newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, resizeStart, win.id, win.minWidth, win.minHeight]);

  if (win.isMinimized) {
    return null;
  }

  const containerStyle: React.CSSProperties = win.isFullScreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        margin: 0,
      }
    : win.isMaximized
    ? {
        position: 'absolute',
        top: 36, // Below titlebar
        left: 0,
        right: 0,
        bottom: 52, // Above 52px taskbar
        zIndex: win.zIndex,
      }
    : {
        position: 'absolute',
        left: `${win.x}px`,
        top: `${win.y}px`,
        width: `${win.width}px`,
        height: `${win.height}px`,
        zIndex: win.zIndex,
      };

  return (
    <div
      id={`window-${win.id}`}
      style={containerStyle}
      onClick={() => onFocus(win.id)}
      className={`flex flex-col overflow-hidden shadow-2xl transition-all ${
        win.isFullScreen || win.isMaximized ? 'rounded-none border-0' : 'rounded-2xl border border-white/15'
      } ${
        isActive
          ? 'ring-1 ring-cyan-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(6,182,212,0.15)]'
          : 'ring-1 ring-white/5 shadow-xl opacity-95'
      } bg-slate-950`}
    >
      {/* Window Header / Title Bar (Fluent Acrylic) */}
      <div
        onMouseDown={handleMouseDownHeader}
        onDoubleClick={() => (onToggleFullScreen ? onToggleFullScreen(win.id) : onMaximize(win.id))}
        className={`h-9 px-3 flex items-center justify-between select-none cursor-move ${
          isActive ? 'bg-slate-900/90 text-white' : 'bg-slate-950/90 text-slate-400'
        } backdrop-blur-xl border-b border-white/10 relative shrink-0`}
      >
        {/* Specular top highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* Left: Icon, Title & Telemetry */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-cyan-400 shrink-0">
            {getAppIcon(win.icon, 'w-4 h-4', win.iconUrl)}
          </div>
          <span className="text-xs font-semibold truncate text-slate-100 tracking-tight">
            {win.title}
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono font-medium text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded-md border border-emerald-500/30">
            60 FPS
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onLaunchScrcpy) {
                onLaunchScrcpy(win.id);
              } else {
                fetch('/api/scrcpy/launch', { method: 'POST' }).catch(() => {});
              }
            }}
            className="hidden sm:inline-flex items-center gap-1 text-[10px] font-sans font-bold text-amber-300 bg-amber-950/70 hover:bg-amber-900/90 px-2 py-0.5 rounded-md border border-amber-500/40 cursor-pointer shadow-sm transition hover:scale-105 active:scale-95"
            title="Launch 0ms Ultra-Low Latency Hardware Scrcpy Mirror on Windows Desktop"
          >
            <Zap className="w-2.5 h-2.5 fill-current text-amber-400" />
            <span>0ms Mirror</span>
          </button>
          {win.isFullScreen && (
            <span className="hidden sm:inline-block text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded-md border border-cyan-500/40 animate-pulse">
              FULLSCREEN
            </span>
          )}
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          {/* Scale Mode Switcher */}
          {onToggleScaleMode && (
            <button
              onClick={() => onToggleScaleMode(win.id)}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/[0.06] hover:bg-white/15 border border-white/10 text-cyan-300 transition"
              title={`Display Scale: ${win.scaleMode || 'contain'}. Click to toggle Fit / Fill / Stretch`}
            >
              {win.scaleMode === 'stretch' ? 'Stretch' : win.scaleMode === 'cover' ? 'Fill' : 'Fit'}
            </button>
          )}

          {/* Gaming Mode Keymaps Toggle */}
          <button
            onClick={() => onToggleGamingMode(win.id)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              win.gamingModeActive
                ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                : 'hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
            title="Toggle Gaming Controls (Ctrl+G)"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
          </button>

          {/* Rotate Screen (Landscape / Portrait) with Live Indicator */}
          <button
            onClick={() => onToggleOrientation(win.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              win.orientation === 'landscape'
                ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'bg-white/[0.06] border border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title={`Current: ${win.orientation === 'landscape' ? 'Landscape (Widescreen Desktop)' : 'Portrait'}. Click to rotate`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{win.orientation === 'landscape' ? 'Landscape' : 'Portrait'}</span>
          </button>

          {/* Immersive Fullscreen Toggle */}
          {onToggleFullScreen && (
            <button
              onClick={() => onToggleFullScreen(win.id)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                win.isFullScreen
                  ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.6)] font-bold'
                  : 'hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
              title={win.isFullScreen ? 'Exit Full Screen (Esc / F11)' : 'Immersive Full Screen (F11)'}
            >
              {win.isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Minimize */}
          <button
            onClick={() => onMinimize(win.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-white transition"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Maximize */}
          <button
            onClick={() => onMaximize(win.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-white transition"
            title={win.isMaximized ? 'Restore Down' : 'Maximize'}
          >
            {win.isMaximized ? <Maximize2 className="w-3.5 h-3.5" /> : <Square className="w-3 h-3" />}
          </button>

          {/* Close */}
          <button
            onClick={() => onClose(win.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-500 hover:text-white text-slate-400 hover:shadow-[0_0_15px_rgba(244,63,94,0.5)] transition-all"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Exit Full Screen Pill (Only visible in Fullscreen mode) */}
      {win.isFullScreen && (
        <div className="absolute top-2 right-1/2 translate-x-1/2 z-50 pointer-events-auto flex items-center gap-2 bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 px-3 py-1 rounded-full shadow-2xl animate-fade-in opacity-80 hover:opacity-100 transition-opacity">
          <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Full Screen</span>
          </span>
          <span className="text-white/20">|</span>
          {onToggleScaleMode && (
            <button
              onClick={() => onToggleScaleMode(win.id)}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 hover:bg-white/20 text-white transition"
              title="Cycle Fit / Fill / Stretch"
            >
              {win.scaleMode === 'stretch' ? 'Stretch 100%' : win.scaleMode === 'cover' ? 'Fill' : 'Fit'}
            </button>
          )}
          <button
            onClick={() => onToggleFullScreen?.(win.id)}
            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-1"
            title="Exit Full Screen (Esc)"
          >
            <Minimize2 className="w-3 h-3" />
            <span>Exit (Esc)</span>
          </button>
        </div>
      )}

      {/* Window Body */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden flex flex-col">
        {children}

        {/* Gaming Mode Virtual Keymaps HUD Overlay */}
        {win.gamingModeActive && (
          <div className="absolute inset-0 pointer-events-none z-30 select-none">
            {gameKeymaps.map((km) => (
              <div
                key={km.id}
                style={{ left: `${km.xPercent}%`, top: `${km.yPercent}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-lg backdrop-blur-sm pointer-events-auto cursor-pointer border ${
                    km.type === 'dpad'
                      ? 'bg-blue-600/70 border-blue-400 text-white w-12 h-12'
                      : km.type === 'aim'
                      ? 'bg-purple-600/70 border-purple-400 text-white'
                      : km.type === 'turbo'
                      ? 'bg-rose-600/70 border-rose-400 text-white ring-2 ring-rose-400/50 animate-pulse'
                      : 'bg-slate-900/80 border-amber-400 text-amber-300'
                  }`}
                >
                  {km.key}
                </div>
                <span className="text-[9px] text-white/90 bg-black/70 px-1 rounded mt-0.5 whitespace-nowrap">
                  {km.label || km.key}
                </span>
              </div>
            ))}

            <div className="absolute top-2 right-2 bg-purple-950/80 border border-purple-500/60 text-purple-200 text-[10px] px-2 py-0.5 rounded-full pointer-events-auto">
              Gaming HUD Active
            </div>
          </div>
        )}
      </div>


      {/* Resize Handle at bottom right */}
      {!win.isMaximized && (
        <div
          onMouseDown={handleMouseDownResize}
          className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize flex items-center justify-center opacity-40 hover:opacity-100 z-40"
        >
          <div className="w-2 h-2 border-r-2 border-b-2 border-slate-400" />
        </div>
      )}
    </div>
  );
};
