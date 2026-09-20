import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Headphones,
  Speaker,
  Music,
  Sliders,
  Check
} from 'lucide-react';

export const MediaHubApp: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(102); // in seconds
  const totalDuration = 243; // 4:03
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<'speakers' | 'headphones' | 'phone'>('speakers');

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setProgress((prev) => (prev >= totalDuration ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div id="media-hub-app" className="h-full bg-slate-950 text-slate-100 p-5 overflow-y-auto space-y-6 select-none">
      {/* Active Track Player Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center gap-6">
        {/* Album Art */}
        <div className="relative w-36 h-36 rounded-xl overflow-hidden shadow-2xl shrink-0 group border border-slate-700/60">
          <img
            src="/assets/dex/media_control.png"
            alt="Album Art"
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Lossless ALAC
            </span>
          </div>
        </div>

        {/* Track Info & Controls */}
        <div className="flex-1 min-w-0 space-y-3 w-full">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Spotify for Android
              </span>
              <span className="text-[10px] text-slate-500">WebSocket Audio Sink</span>
            </div>
            <h3 className="text-lg font-bold text-white truncate mt-1">Midnight City</h3>
            <p className="text-xs text-slate-400 truncate">M83 · Hurry Up, We're Dreaming (Deluxe)</p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="w-full bg-slate-800 h-1.5 rounded-full cursor-pointer relative overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${(progress / totalDuration) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
          </div>

          {/* Player controls */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-slate-400">
              <button className="p-1.5 hover:text-white transition">
                <Shuffle className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setProgress(Math.max(0, progress - 15))}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/30 transition transform active:scale-95"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
              </button>

              <button
                onClick={() => setProgress(Math.min(totalDuration, progress + 15))}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-slate-400 hover:text-white transition"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  setIsMuted(false);
                }}
                className="w-20 accent-emerald-500 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audio Output Routing */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
          <Speaker className="w-4 h-4 text-emerald-400" />
          Hardware Audio Sink Routing
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setSelectedRoute('speakers')}
            className={`p-3 rounded-xl border text-left flex items-start justify-between transition ${
              selectedRoute === 'speakers'
                ? 'bg-emerald-950/40 border-emerald-500 text-white shadow'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            <div>
              <div className="font-semibold text-xs flex items-center gap-1.5">
                <Speaker className="w-4 h-4 text-emerald-400" />
                Windows Desktop Speakers
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Realtek High Definition Audio (Default)</div>
            </div>
            {selectedRoute === 'speakers' && <Check className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={() => setSelectedRoute('headphones')}
            className={`p-3 rounded-xl border text-left flex items-start justify-between transition ${
              selectedRoute === 'headphones'
                ? 'bg-emerald-950/40 border-emerald-500 text-white shadow'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            <div>
              <div className="font-semibold text-xs flex items-center gap-1.5">
                <Headphones className="w-4 h-4 text-emerald-400" />
                Spatial Gaming Headset
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Low-latency 24-bit 48kHz audio pipe</div>
            </div>
            {selectedRoute === 'headphones' && <Check className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={() => setSelectedRoute('phone')}
            className={`p-3 rounded-xl border text-left flex items-start justify-between transition ${
              selectedRoute === 'phone'
                ? 'bg-emerald-950/40 border-emerald-500 text-white shadow'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            <div>
              <div className="font-semibold text-xs flex items-center gap-1.5">
                <Music className="w-4 h-4 text-emerald-400" />
                Leave on Android Phone
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Play through phone's stereo speakers</div>
            </div>
            {selectedRoute === 'phone' && <Check className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>
    </div>
  );
};
