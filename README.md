# Android OS - Windows Desktop Client

A modern, high-performance Windows desktop environment for Android devices, built with React, Vite, TypeScript, Tailwind CSS, ADB Bridge, and Scrcpy.

## Features

- **Fluid Desktop Interface**: Windows 10/11 style desktop canvas, start menu, taskbar, ambient clock, and window manager.
- **Multi-Window Android Apps**: Run Android applications side-by-side in resizable, draggable floating desktop windows.
- **60 FPS Screen Mirroring**: Low-latency hardware-accelerated video streaming powered by Scrcpy and ADB.
- **Full Mouse & Keyboard Control**: Direct touch event injection (`input tap`, `input keyevent`, `input swipe`) mapping PC clicks and keystrokes directly to your physical Android device.
- **Device Management**: Automatic ADB USB & Wi-Fi detection, battery diagnostics, and latency telemetry.
- **File Manager & Media Hub**: Browse device storage, photos, and files directly from your PC.
- **Built-in ADB Terminal**: Interactive command-line terminal with quick action chips and device commands.
- **Desktop Gaming Engine**: Custom keymapping overlays for mobile games with anti-cheat safe driver-level injection.

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Lucide Icons, Tailwind CSS
- **Backend Bridge**: Node.js ADB Bridge server (`src/server/adbBridge.ts`)
- **Protocols**: ADB Daemon, Scrcpy H.264/WebCodecs stream, WebSocket & REST APIs

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Android SDK Platform-Tools (`adb`) in your system PATH
- Android Phone with **Developer Options** and **USB Debugging** enabled
  *(Note for Xiaomi / MIUI users: Enable **USB debugging (Security settings)** to allow mouse click control)*

### Installation
```bash
# Clone the repository
git clone https://github.com/rajkot/android-os.git
cd android-os

# Install dependencies
npm install

# Start the desktop application & ADB bridge
npm run dev
```

Open your browser at `http://localhost:3000/`.

## License
MIT
