import 'dart:async';
import 'package:flutter/material.dart';
import 'adb_service.dart';
import 'desktop_background.dart';
import 'taskbar.dart';
import 'win_window.dart';
import 'win_window_model.dart';
import 'win10_desktop_icon.dart';
import 'win10_start_menu.dart';

const List<FlutterAppDef> _defaultApps = [
  FlutterAppDef(
    id: 'phone-mirror',
    name: 'Phone Screen Mirror',
    packageName: 'com.androiddex.scrcpy.mirror',
    icon: Icons.smartphone,
    category: 'Tools',
    isPinned: true,
  ),
  FlutterAppDef(
    id: 'dex-files',
    name: 'Dex Files',
    packageName: 'com.androiddex.filemanager',
    icon: Icons.folder,
    category: 'Tools',
    isPinned: true,
  ),
  FlutterAppDef(
    id: 'adb-terminal',
    name: 'Command Prompt (Termux)',
    packageName: 'com.termux',
    icon: Icons.terminal,
    category: 'Tools',
    isPinned: true,
  ),
  FlutterAppDef(
    id: 'gaming-center',
    name: 'Gaming Controls',
    packageName: 'com.androiddex.gamepad',
    icon: Icons.sports_esports,
    category: 'Games',
    isPinned: true,
  ),
  FlutterAppDef(
    id: 'media-hub',
    name: 'Media & Audio Center',
    packageName: 'com.androiddex.media',
    icon: Icons.music_note,
    category: 'Media',
    isPinned: true,
  ),
  FlutterAppDef(
    id: 'camera-mirror',
    name: 'Camera Mirror',
    packageName: 'com.androiddex.camera',
    icon: Icons.camera_alt,
    category: 'Media',
    isPinned: true,
  ),
  FlutterAppDef(
    id: 'telemetry-settings',
    name: 'Settings & Telemetry',
    packageName: 'com.androiddex.settings',
    icon: Icons.settings,
    category: 'Tools',
    isPinned: true,
  ),
];

/// Foundational Windows 10 Desktop Screen Shell Widget with
/// Complete Multi-Window Management System
/// Combines:
/// 1. DesktopBackground taking up the main screen canvas
/// 2. Interactive Multi-Window Workspace layer (Draggable, Resizable, Focusable Windows)
/// 3. Bottom Taskbar with Active Apps Integration (48px height)
/// 4. Windows 10 Start Menu & Notification Center Flyouts
class WinDesktopScreen extends StatefulWidget {
  final String? wallpaperUrl;
  final Color backgroundColor;
  final Widget? desktopContent;
  final List<WinWindowState>? initialWindows;
  final List<FlutterAppDef>? apps;
  final AdbService? adbService;
  final Widget? startMenu;
  final Widget? notificationCenter;

  const WinDesktopScreen({
    super.key,
    this.wallpaperUrl,
    this.backgroundColor = const Color(0xFF0C0C0C),
    this.desktopContent,
    this.initialWindows,
    this.apps,
    this.adbService,
    this.startMenu,
    this.notificationCenter,
  });

  @override
  State<WinDesktopScreen> createState() => _WinDesktopScreenState();
}

class _WinDesktopScreenState extends State<WinDesktopScreen> {
  bool _isStartMenuOpen = false;
  bool _isNotificationCenterOpen = false;
  String? _selectedDesktopIconId;

  // Window Manager State
  late List<WinWindowState> _openWindows;
  String? _activeWindowId;
  int _nextZIndex = 12;

  // Dynamic Apps & Device State Watcher
  late List<FlutterAppDef> _currentApps;
  StreamSubscription<String?>? _deviceSub;

  @override
  void initState() {
    super.initState();
    _currentApps = List.from(widget.apps ?? _defaultApps);

    // Start background ADB device watcher & invalidate cache on device swap
    if (widget.adbService != null) {
      widget.adbService!.startDeviceWatcher();
      _deviceSub = widget.adbService!.onDeviceChanged.listen((newSerial) async {
        debugPrint('[WinDesktopScreen] ADB Device Swap detected: serial="$newSerial"');
        if (newSerial != null) {
          final freshApps = await widget.adbService!.queryLaunchableApps(forceRefresh: true);
          if (mounted && freshApps.isNotEmpty) {
            setState(() {
              _currentApps = [
                ..._defaultApps,
                ...freshApps.map((a) => FlutterAppDef(
                      id: a.id,
                      name: a.name,
                      packageName: a.packageName,
                      activity: a.activity,
                      icon: Icons.smartphone,
                      iconUrl: a.iconUrl,
                      iconBase64: a.iconBase64,
                      category: a.category,
                    )),
              ];
            });
          }
        } else {
          // Device disconnected -> reset cached app list to core system utilities
          if (mounted) {
            setState(() {
              _currentApps = List.from(_defaultApps);
            });
          }
        }
      });
    }

    _openWindows = widget.initialWindows != null
        ? List.from(widget.initialWindows!)
        : [
            // Default sample Windows 10 running windows
            WinWindowState(
              id: 'win-phone-mirror',
              appId: 'com.androiddex.scrcpy.mirror',
              title: 'Phone Screen Mirror',
              icon: 'smartphone',
              isScreenMirror: true,
              x: 40.0,
              y: 30.0,
              width: 330.0,
              height: 480.0,
              minWidth: 280.0,
              minHeight: 360.0,
              zIndex: 11,
            ),
            WinWindowState(
              id: 'win-files',
              appId: 'com.androiddex.filemanager',
              title: 'Dex Files',
              icon: 'folder',
              x: 390.0,
              y: 40.0,
              width: 370.0,
              height: 380.0,
              minWidth: 300.0,
              minHeight: 240.0,
              zIndex: 10,
            ),
          ];

    _activeWindowId = _openWindows.isNotEmpty ? _openWindows.first.id : null;
  }

  @override
  void dispose() {
    _deviceSub?.cancel();
    widget.adbService?.stopDeviceWatcher();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Window Operations (Open, Focus, Minimize, Maximize, Close, Move, Resize)
  // ---------------------------------------------------------------------------

  void openApp(FlutterAppDef app) {
    final isTerminal = app.id == 'adb-terminal' ||
        app.packageName == 'com.termux' ||
        app.packageName == 'com.androiddex.shell' ||
        app.name.toLowerCase().contains('command prompt') ||
        app.name.toLowerCase().contains('terminal');

    // For non-terminal apps, bring existing window to front
    if (!isTerminal) {
      final existingIndex = _openWindows.indexWhere(
        (w) => w.appId == app.id || w.appId == app.packageName,
      );

      if (existingIndex != -1) {
        final existing = _openWindows[existingIndex];
        setState(() {
          existing.isMinimized = false;
          _nextZIndex++;
          existing.zIndex = _nextZIndex;
          _activeWindowId = existing.id;
          _isStartMenuOpen = false;
        });
        return;
      }
    }

    final offsetCount = _openWindows.length % 6;
    final newX = 90.0 + (offsetCount * 32.0);
    final newY = 60.0 + (offsetCount * 28.0);
    final isMirror = app.packageName.contains('scrcpy') || app.packageName.contains('mirror');

    final terminalCount = _openWindows.where((w) =>
        w.appId == 'com.termux' ||
        w.appId == 'com.androiddex.shell' ||
        w.title.contains('Command Prompt') ||
        w.title.contains('Terminal')).length;
    final winTitle = isTerminal && terminalCount > 0
        ? '${app.name} (${terminalCount + 1})'
        : app.name;

    final newWin = WinWindowState(
      id: 'win-${app.packageName}-${DateTime.now().millisecondsSinceEpoch}',
      appId: app.packageName,
      title: winTitle,
      iconUrl: app.iconUrl,
      iconBase64: app.iconBase64,
      isScreenMirror: isMirror,
      x: newX,
      y: newY,
      width: isMirror ? 360.0 : (isTerminal ? 640.0 : 600.0),
      height: isMirror ? 520.0 : (isTerminal ? 420.0 : 440.0),
      minWidth: isTerminal ? 360.0 : 300.0,
      minHeight: isTerminal ? 240.0 : 200.0,
      zIndex: ++_nextZIndex,
    );

    setState(() {
      _openWindows.add(newWin);
      _activeWindowId = newWin.id;
      _isStartMenuOpen = false;
    });
  }

  void openAppById(String appId, {String? title, String? icon}) {
    final isTerminal = appId == 'adb-terminal' ||
        appId == 'com.termux' ||
        appId == 'com.androiddex.shell' ||
        (title != null && title.toLowerCase().contains('terminal'));

    if (!isTerminal) {
      final existingIndex = _openWindows.indexWhere(
        (w) => w.id == appId || w.appId == appId || w.id == 'win-$appId',
      );

      if (existingIndex != -1) {
        final existing = _openWindows[existingIndex];
        setState(() {
          existing.isMinimized = false;
          _nextZIndex++;
          existing.zIndex = _nextZIndex;
          _activeWindowId = existing.id;
          _isStartMenuOpen = false;
        });
        return;
      }
    }

    final offsetCount = _openWindows.length % 6;
    final newX = 90.0 + (offsetCount * 32.0);
    final newY = 60.0 + (offsetCount * 28.0);
    final formattedTitle = title ?? (isTerminal ? 'Command Prompt (Termux)' : appId.split('.').last.replaceAll('_', ' '));

    final newWin = WinWindowState(
      id: 'win-$appId-${DateTime.now().millisecondsSinceEpoch}',
      appId: appId,
      title: formattedTitle,
      icon: icon ?? (isTerminal ? 'terminal' : 'window'),
      x: newX,
      y: newY,
      width: isTerminal ? 640.0 : 600.0,
      height: isTerminal ? 420.0 : 440.0,
      minWidth: isTerminal ? 360.0 : 300.0,
      minHeight: isTerminal ? 240.0 : 200.0,
      zIndex: ++_nextZIndex,
    );

    setState(() {
      _openWindows.add(newWin);
      _activeWindowId = newWin.id;
      _isStartMenuOpen = false;
    });
  }

  void focusWindow(String id) {
    final idx = _openWindows.indexWhere((w) => w.id == id);
    if (idx == -1) return;

    setState(() {
      _activeWindowId = id;
      _nextZIndex++;
      _openWindows[idx].zIndex = _nextZIndex;
    });
  }

  void minimizeWindow(String id) {
    final idx = _openWindows.indexWhere((w) => w.id == id);
    if (idx == -1) return;

    setState(() {
      _openWindows[idx].isMinimized = true;
      if (_activeWindowId == id) {
        final remaining = _openWindows.where((w) => !w.isMinimized).toList();
        if (remaining.isNotEmpty) {
          remaining.sort((a, b) => b.zIndex.compareTo(a.zIndex));
          _activeWindowId = remaining.first.id;
        } else {
          _activeWindowId = null;
        }
      }
    });
  }

  void toggleMinimize(String id) {
    final idx = _openWindows.indexWhere((w) => w.id == id);
    if (idx == -1) return;

    final win = _openWindows[idx];
    setState(() {
      if (win.isMinimized) {
        win.isMinimized = false;
        _nextZIndex++;
        win.zIndex = _nextZIndex;
        _activeWindowId = id;
      } else if (_activeWindowId == id) {
        minimizeWindow(id);
      } else {
        focusWindow(id);
      }
    });
  }

  void maximizeWindow(String id) {
    final idx = _openWindows.indexWhere((w) => w.id == id);
    if (idx == -1) return;

    setState(() {
      final win = _openWindows[idx];
      win.isMaximized = !win.isMaximized;
      focusWindow(id);
    });
  }

  void toggleOrientation(String id) {
    final idx = _openWindows.indexWhere((w) => w.id == id);
    if (idx == -1) return;

    final win = _openWindows[idx];
    setState(() {
      win.isLandscape = !win.isLandscape;
      if (!win.isMaximized) {
        // Swap dimensions between Portrait and Landscape cleanly
        final oldW = win.width;
        final oldH = win.height;
        win.width = oldH.clamp(win.minWidth, 1200.0);
        win.height = oldW.clamp(win.minHeight, 800.0);
      }
      focusWindow(id);
    });
  }

  void closeWindow(String id) {
    setState(() {
      _openWindows.removeWhere((w) => w.id == id);
      if (_activeWindowId == id) {
        final remaining = _openWindows.where((w) => !w.isMinimized).toList();
        if (remaining.isNotEmpty) {
          remaining.sort((a, b) => b.zIndex.compareTo(a.zIndex));
          _activeWindowId = remaining.first.id;
        } else {
          _activeWindowId = null;
        }
      }
    });
  }

  void updatePosition(String id, double x, double y) {
    final idx = _openWindows.indexWhere((w) => w.id == id);
    if (idx == -1) return;

    setState(() {
      _openWindows[idx].x = x;
      _openWindows[idx].y = y;
    });
  }

  void updateSize(String id, double width, double height) {
    final idx = _openWindows.indexWhere((w) => w.id == id);
    if (idx == -1) return;

    setState(() {
      _openWindows[idx].width = width;
      _openWindows[idx].height = height;
    });
  }

  void showDesktop() {
    setState(() {
      for (final win in _openWindows) {
        win.isMinimized = true;
      }
      _activeWindowId = null;
      _closeFlyouts();
    });
  }

  // ---------------------------------------------------------------------------
  // Flyouts (Start Menu, Notification Center)
  // ---------------------------------------------------------------------------

  void _toggleStartMenu() {
    setState(() {
      _isStartMenuOpen = !_isStartMenuOpen;
      _isNotificationCenterOpen = false;
    });
  }

  void _toggleNotificationCenter() {
    setState(() {
      _isNotificationCenterOpen = !_isNotificationCenterOpen;
      _isStartMenuOpen = false;
    });
  }

  void _closeFlyouts() {
    if (_isStartMenuOpen || _isNotificationCenterOpen) {
      setState(() {
        _isStartMenuOpen = false;
        _isNotificationCenterOpen = false;
        _selectedDesktopIconId = null;
      });
    }
  }

  Widget _buildDefaultDesktopIcons() {
    final apps = widget.apps ?? _defaultApps;
    return Align(
      alignment: Alignment.topLeft,
      child: Padding(
        padding: const EdgeInsets.only(left: 12.0, top: 16.0),
        child: Wrap(
          direction: Axis.vertical,
          spacing: 12.0,
          runSpacing: 16.0,
          children: apps.where((a) => a.isPinned).map((app) {
            return Win10DesktopIcon(
              id: app.id,
              name: app.name,
              packageName: app.packageName,
              icon: app.icon,
              iconUrl: app.iconUrl,
              iconBase64: app.iconBase64,
              isSelected: _selectedDesktopIconId == app.id,
              onSelect: () => setState(() => _selectedDesktopIconId = app.id),
              onOpen: () => openApp(app),
            );
          }).toList(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: widget.backgroundColor,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final workspaceSize = Size(
            constraints.maxWidth,
            constraints.maxHeight - 48.0, // Height minus Taskbar
          );

          // Sort windows by zIndex ascending so highest zIndex renders on top
          final sortedWindows = List<WinWindowState>.from(_openWindows)
            ..sort((a, b) => a.zIndex.compareTo(b.zIndex));

          return Stack(
            children: [
              // 1. Column: Main Desktop Canvas + Bottom Taskbar
              Column(
                children: [
                  // Desktop Canvas with Wallpaper
                  Expanded(
                    child: DesktopBackground(
                      wallpaperUrl: widget.wallpaperUrl,
                      backgroundColor: widget.backgroundColor,
                      onTap: _closeFlyouts,
                      child: widget.desktopContent ?? _buildDefaultDesktopIcons(),
                    ),
                  ),

                  // Bottom Taskbar (Height 48px) with running windows
                  Taskbar(
                    isStartOpen: _isStartMenuOpen,
                    onStartPressed: _toggleStartMenu,
                    onNotificationCenterPressed: _toggleNotificationCenter,
                    onShowDesktopPressed: showDesktop,
                    runningWindows: _openWindows,
                    activeWindowId: _activeWindowId,
                    onWindowTap: toggleMinimize,
                  ),
                ],
              ),

              // 2. Multi-Window Floating Workspace Layer
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                bottom: 48.0,
                child: Stack(
                  children: sortedWindows.map((win) {
                    return WinWindow(
                      key: ValueKey(win.id),
                      window: win,
                      isActive: _activeWindowId == win.id && !win.isMinimized,
                      onFocus: focusWindow,
                      onClose: closeWindow,
                      onMinimize: minimizeWindow,
                      onMaximize: maximizeWindow,
                      onToggleOrientation: toggleOrientation,
                      onUpdatePosition: updatePosition,
                      onUpdateSize: updateSize,
                      workspaceSize: workspaceSize,
                      adbService: widget.adbService,
                    );
                  }).toList(),
                ),
              ),

              // 3. Start Menu Flyout Layer
              if (_isStartMenuOpen)
                Positioned(
                  left: 0,
                  bottom: 48.0,
                  child: widget.startMenu ??
                      Win10StartMenu(
                        apps: _currentApps,
                        adbService: widget.adbService,
                        onRefreshApps: () async {
                          if (widget.adbService != null) {
                            final reloaded = await widget.adbService!.invalidateCacheAndReload();
                            if (mounted && reloaded.isNotEmpty) {
                              setState(() {
                                _currentApps = [
                                  ..._defaultApps,
                                  ...reloaded.map((a) => FlutterAppDef(
                                        id: a.id,
                                        name: a.name,
                                        packageName: a.packageName,
                                        activity: a.activity,
                                        icon: Icons.smartphone,
                                        iconUrl: a.iconUrl,
                                        iconBase64: a.iconBase64,
                                        category: a.category,
                                      )),
                                ];
                              });
                            }
                          }
                        },
                        onOpenApp: (appId) {
                          final allApps = _currentApps;
                          final matched = allApps.firstWhere(
                            (a) => a.id == appId || a.packageName == appId,
                            orElse: () => FlutterAppDef(
                              id: appId,
                              name: appId,
                              packageName: appId,
                              icon: Icons.apps,
                              category: 'Tools',
                            ),
                          );
                          openApp(matched);
                        },
                        onSettingsTap: () => openAppById(
                          'com.androiddex.settings',
                          title: 'Settings & Telemetry',
                          icon: 'settings',
                        ),
                      ),
                ),

              // 4. Notification Center Flyout Layer
              if (_isNotificationCenterOpen && widget.notificationCenter != null)
                Positioned(
                  right: 0,
                  top: 0,
                  bottom: 48.0,
                  child: widget.notificationCenter!,
                ),
            ],
          );
        },
      ),
    );
  }
}
