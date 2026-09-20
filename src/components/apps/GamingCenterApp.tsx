import React, { useState } from 'react';
import { GameKeymapItem } from '../../types';
import {
  Gamepad2,
  Crosshair,
  Zap,
  MousePointer,
  Shield,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  CheckCircle,
  Sparkles,
  Layers,
  HelpCircle
} from 'lucide-react';

interface GamingCenterAppProps {
  keymaps: GameKeymapItem[];
  onUpdateKeymaps: (keymaps: GameKeymapItem[]) => void;
  onLaunchGame: (gameId: string) => void;
}

export const GamingCenterApp: React.FC<GamingCenterAppProps> = ({
  keymaps,
  onUpdateKeymaps,
  onLaunchGame,
}) => {
  const [selectedProfile, setSelectedProfile] = useState<'pubg' | 'cod' | 'genshin'>('pubg');
  const [turboCount, setTurboCount] = useState<number>(0);
  const [isTurboActive, setIsTurboActive] = useState<boolean>(false);
  const [mouseAimSensitivity, setMouseAimSensitivity] = useState<number>(75);
  const [gyroEmulation, setGyroEmulation] = useState<boolean>(true);

  const handleTriggerTurboTest = () => {
    setIsTurboActive(true);
    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      setTurboCount(c => c + 1);
      if (count >= 20) {
        clearInterval(interval);
        setIsTurboActive(false);
      }
    }, 50);
  };

  return (
    <div id="gaming-center-app" className="h-full bg-slate-950 text-slate-100 p-5 overflow-y-auto space-y-6 select-none">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/60 border border-purple-800/40 gap-3">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/30">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Desktop Gaming Engine (UHID Virtual Input)
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Anti-Cheat Safe
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Zero emulator detection. Raw touch events injected via ADB daemon at device driver level.
            </p>
          </div>
        </div>

        <button
          onClick={() => onLaunchGame('pubg-mobile')}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-lg shadow-purple-900/30 transition"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Launch Game with Keymaps</span>
        </button>
      </div>

      {/* Profiles Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setSelectedProfile('pubg')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
            selectedProfile === 'pubg'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          PUBG Mobile (Battle Royale)
        </button>
        <button
          onClick={() => setSelectedProfile('cod')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
            selectedProfile === 'cod'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Call of Duty: Warzone Mobile
        </button>
        <button
          onClick={() => setSelectedProfile('genshin')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
            selectedProfile === 'genshin'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Genshin Impact / RPG
        </button>
      </div>

      {/* Interactive Visual Keymap Layout Canvas Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-semibold flex items-center gap-1.5">
            <Crosshair className="w-4 h-4 text-purple-400" />
            Virtual HUD Mapping Canvas (Press Ctrl + G to toggle in-game)
          </span>
          <span className="text-[11px] text-slate-500 font-mono">1080p Target Canvas</span>
        </div>

        <div className="relative w-full h-64 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
          {/* Background Game Screenshot Simulation */}
          <div
            className="absolute inset-0 opacity-50 bg-cover bg-center transition-all duration-300"
            style={{
              backgroundImage: `url('${
                selectedProfile === 'pubg'
                  ? '/assets/dex/controller_1.png'
                  : selectedProfile === 'cod'
                  ? '/assets/dex/controller_2.png'
                  : '/assets/dex/controller_3.png'
              }')`,
            }}
          />
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px]" />

          {/* Keymap nodes on the screen */}
          {keymaps.map((km) => (
            <div
              key={km.id}
              style={{ left: `${km.xPercent}%`, top: `${km.yPercent}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-10"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-lg transition-transform group-hover:scale-110 ${
                  km.type === 'dpad'
                    ? 'bg-blue-600/80 text-white border-2 border-blue-400 w-14 h-14'
                    : km.type === 'aim'
                    ? 'bg-purple-600/80 text-white border-2 border-purple-400'
                    : km.type === 'turbo'
                    ? 'bg-rose-600/80 text-white border-2 border-rose-400 ring-2 ring-rose-500/40 animate-pulse'
                    : 'bg-slate-800/90 text-amber-300 border-2 border-amber-400/80'
                }`}
              >
                {km.key}
              </div>
              <span className="text-[10px] text-slate-300 bg-slate-950/80 px-1.5 py-0.5 rounded mt-1 opacity-80 group-hover:opacity-100 whitespace-nowrap">
                {km.label || km.key}
              </span>
            </div>
          ))}

          {/* Info pill in canvas */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700/60 text-[11px] text-slate-300 px-3 py-1 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>9 active keybinds mapped · Polling rate: 1000Hz USB</span>
          </div>
        </div>
      </div>

      {/* Advanced Gaming Settings & Turbo Tester */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* FPS Mouse Aim & Gyroscope */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <MousePointer className="w-4 h-4 text-purple-400" />
            FPS Mouse Lock & Sensitivity
          </h4>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-300">Aim Sensitivity (X/Y Ratio)</span>
              <span className="text-purple-400 font-mono">{mouseAimSensitivity}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="150"
              value={mouseAimSensitivity}
              onChange={(e) => setMouseAimSensitivity(Number(e.target.value))}
              className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800 text-xs">
            <div>
              <div className="font-medium text-slate-200">Emulate Gyroscope via Mouse</div>
              <div className="text-[10px] text-slate-400">Maps small mouse flicks to phone IMU tilt</div>
            </div>
            <button
              onClick={() => setGyroEmulation(!gyroEmulation)}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                gyroEmulation ? 'bg-purple-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  gyroEmulation ? 'left-4.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Turbo Rapid-Fire Tester */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-rose-400" />
            Turbo Rapid-Fire Pulse Tester
          </h4>
          <p className="text-[11px] text-slate-400">
            Injects 20 touch-down and touch-up events per second into the Android kernel input pipeline.
          </p>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleTriggerTurboTest}
              disabled={isTurboActive}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-medium transition"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isTurboActive ? 'Injecting Taps...' : 'Test 20-Tap Turbo'}</span>
            </button>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Simulated Injections</span>
              <span className="text-sm font-bold font-mono text-rose-400">{turboCount} taps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
