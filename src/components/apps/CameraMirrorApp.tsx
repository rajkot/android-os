import React, { useState } from 'react';
import { Camera, RefreshCw, ZoomIn, ZoomOut, Zap, Sliders, CheckCircle2 } from 'lucide-react';
import { StorageFile } from '../../types';

interface CameraMirrorAppProps {
  onSavePhoto: (photoFile: StorageFile) => void;
}

export const CameraMirrorApp: React.FC<CameraMirrorAppProps> = ({ onSavePhoto }) => {
  const [zoom, setZoom] = useState<'0.6x' | '1x' | '3x' | '5x'>('1x');
  const [flash, setFlash] = useState(false);
  const [cameraMode, setCameraMode] = useState<'PHOTO' | 'VIDEO' | 'PRO' | 'NIGHT'>('PHOTO');
  const [shutterEffect, setShutterEffect] = useState(false);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);

  const handleCapture = () => {
    setShutterEffect(true);
    setTimeout(() => setShutterEffect(false), 200);

    const filename = `IMG_DEX_${Date.now()}.jpg`;
    const photo: StorageFile = {
      id: `photo-${Date.now()}`,
      name: filename,
      path: `/sdcard/DCIM/Camera/${filename}`,
      type: 'image',
      size: '3.6 MB',
      modified: 'Just now',
      url: '/assets/dex/home_screen.png',
    };

    setLastPhoto('/assets/dex/home_screen.png');
    onSavePhoto(photo);
  };

  return (
    <div id="camera-mirror-app" className="relative h-full bg-black text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Top Camera Toolbar */}
      <div className="z-20 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFlash(!flash)}
            className={`p-2 rounded-full transition ${flash ? 'bg-amber-400 text-black' : 'bg-black/50 text-white hover:bg-white/20'}`}
          >
            <Zap className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono bg-black/60 px-2 py-0.5 rounded border border-white/20 text-emerald-400">
            scrcpy · 60 FPS · 3.8ms
          </span>
        </div>

        <div className="text-[11px] font-mono text-slate-300 bg-black/60 px-2 py-0.5 rounded border border-white/20">
          50 MP ISOCELL GN3
        </div>
      </div>

      {/* Center Viewfinder */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* Background live viewfinder image */}
        <img
          src="/assets/dex/multiple_apps_running.png"
          alt="Viewfinder"
          className={`w-full h-full object-cover transition-transform duration-300 ${
            zoom === '0.6x' ? 'scale-90' : zoom === '1x' ? 'scale-100' : zoom === '3x' ? 'scale-125' : 'scale-150'
          }`}
        />

        {/* Viewfinder Grid Overlay */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
          <div className="border-r border-b border-white" />
          <div className="border-r border-b border-white" />
          <div className="border-b border-white" />
          <div className="border-r border-b border-white" />
          <div className="border-r border-b border-white" />
          <div className="border-b border-white" />
          <div className="border-r border-white" />
          <div className="border-r border-white" />
          <div />
        </div>

        {/* Shutter flash effect */}
        {shutterEffect && <div className="absolute inset-0 bg-white z-30 transition-opacity" />}

        {/* Zoom Selector Pills */}
        <div className="absolute bottom-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 z-20">
          {(['0.6x', '1x', '3x', '5x'] as const).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                zoom === z ? 'bg-amber-400 text-black' : 'text-white hover:text-amber-200'
              }`}
            >
              {z}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Shutter & Mode Controls */}
      <div className="z-20 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 flex flex-col items-center gap-3">
        {/* Mode selector */}
        <div className="flex items-center gap-5 text-xs font-semibold tracking-wider text-slate-400">
          {(['PRO', 'NIGHT', 'PHOTO', 'VIDEO'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setCameraMode(m)}
              className={`transition ${cameraMode === m ? 'text-amber-400 scale-105' : 'hover:text-white'}`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Shutter row */}
        <div className="flex items-center justify-between w-full max-w-xs px-4">
          {/* Gallery thumbnail preview */}
          <div className="w-10 h-10 rounded-full border-2 border-white/40 overflow-hidden bg-slate-800">
            {lastPhoto && <img src={lastPhoto} alt="Last captured" className="w-full h-full object-cover" />}
          </div>

          {/* Shutter button */}
          <button
            onClick={handleCapture}
            className="w-16 h-16 rounded-full border-4 border-white p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition"
          >
            <div className="w-full h-full rounded-full bg-white active:bg-amber-400 transition" />
          </button>

          {/* Flip camera */}
          <button
            onClick={() => setZoom(z => z === '1x' ? '0.6x' : '1x')}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            title="Switch Sensor"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
