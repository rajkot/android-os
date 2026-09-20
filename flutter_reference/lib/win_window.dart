import 'dart:convert';
import 'package:flutter/material.dart';
import 'adb_service.dart';
import 'scrcpy_stream_widget.dart';
import 'win_terminal_widget.dart';
import 'win10_theme.dart';
import 'win_window_model.dart';

/// Windows 10 Floating Window Container Widget
/// Features:
/// 1. Draggable Windows 10 Title Bar with app icon, title, and controls (Rotate, Minimize, Maximize, Close).
/// 2. Drag-to-move using GestureDetector / PanUpdate.
/// 3. Double-click title bar to Maximize / Restore.
/// 4. Interactive Resizing handle at bottom-right corner.
/// 5. Focus management (tap to bring to front).
/// 6. Acrylic background with active accent border.
class WinWindow extends StatelessWidget {
  final WinWindowState window;
  final bool isActive;
  final ValueChanged<String> onFocus;
  final ValueChanged<String> onClose;
  final ValueChanged<String> onMinimize;
  final ValueChanged<String> onMaximize;
  final ValueChanged<String>? onToggleOrientation;
  final void Function(String id, double x, double y) onUpdatePosition;
  final void Function(String id, double width, double height) onUpdateSize;
  final Size workspaceSize;
  final AdbService? adbService;
  final Widget? child;

  const WinWindow({
    super.key,
    required this.window,
    required this.isActive,
    required this.onFocus,
    required this.onClose,
    required this.onMinimize,
    required this.onMaximize,
    this.onToggleOrientation,
    required this.onUpdatePosition,
    required this.onUpdateSize,
    required this.workspaceSize,
    this.adbService,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    if (window.isMinimized) {
      return const SizedBox.shrink();
    }

    final effectiveWidth = window.isMaximized ? workspaceSize.width : window.width;
    final effectiveHeight = window.isMaximized ? workspaceSize.height : window.height;
    final effectiveX = window.isMaximized ? 0.0 : window.x;
    final effectiveY = window.isMaximized ? 0.0 : window.y;

    return Positioned(
      left: effectiveX,
      top: effectiveY,
      width: effectiveWidth,
      height: effectiveHeight,
      child: Listener(
        onPointerDown: (_) => onFocus(window.id),
        child: Container(
          decoration: BoxDecoration(
            color: Win10Theme.windowBackground,
            border: Border.all(
              color: isActive
                  ? Win10Theme.windowBorderActive
                  : Win10Theme.windowBorderInactive,
              width: 1.0,
            ),
            boxShadow: window.isMaximized
                ? const []
                : const [
                    BoxShadow(
                      color: Color(0x8C000000),
                      blurRadius: 20.0,
                      spreadRadius: 2.0,
                      offset: Offset(0, 10),
                    ),
                  ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Draggable Windows 10 Title Bar
              _WindowTitleBar(
                window: window,
                isActive: isActive,
                onFocus: () => onFocus(window.id),
                onMinimize: () => onMinimize(window.id),
                onMaximize: () => onMaximize(window.id),
                onToggleOrientation: onToggleOrientation != null
                    ? () => onToggleOrientation!(window.id)
                    : null,
                onClose: () => onClose(window.id),
                onDragDelta: (dx, dy) {
                  if (window.isMaximized) return;
                  final newX = (window.x + dx).clamp(
                    -window.width + 100.0,
                    workspaceSize.width - 100.0,
                  );
                  final newY = (window.y + dy).clamp(
                    0.0,
                    workspaceSize.height - Win10Theme.windowTitleBarHeight,
                  );
                  onUpdatePosition(window.id, newX, newY);
                },
              ),

              // 2. Window Body Content
              Expanded(
                child: Stack(
                  children: [
                    // Main App Content
                    Positioned.fill(
                      child: child ?? window.content ?? _buildDefaultContent(),
                    ),

                    // 3. Resize Grip (Bottom-Right Corner)
                    if (!window.isMaximized)
                      Positioned(
                        right: 0,
                        bottom: 0,
                        width: 16,
                        height: 16,
                        child: GestureDetector(
                          behavior: HitTestBehavior.translucent,
                          onPanStart: (_) => onFocus(window.id),
                          onPanUpdate: (details) {
                            final newWidth = (window.width + details.delta.dx)
                                .clamp(window.minWidth, workspaceSize.width);
                            final newHeight = (window.height + details.delta.dy)
                                .clamp(window.minHeight, workspaceSize.height);
                            onUpdateSize(window.id, newWidth, newHeight);
                          },
                          child: MouseRegion(
                            cursor: SystemMouseCursors.resizeDownRight,
                            child: CustomPaint(
                              painter: _ResizeGripPainter(),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDefaultContent() {
    if (window.isScreenMirror ||
        window.appId.contains('scrcpy') ||
        window.appId.contains('mirror')) {
      return ScrcpyStreamWidget(
        key: ScrcpyStreamWidget.getKeyFor(window.id),
        adbService: adbService,
        isLandscape: window.isLandscape,
        onToggleOrientation: onToggleOrientation != null
            ? () => onToggleOrientation!(window.id)
            : null,
      );
    }

    if (window.appId == 'com.termux' ||
        window.appId.contains('terminal') ||
        window.appId.contains('shell')) {
      return WinTerminalWidget(
        title: window.title,
      );
    }

    return Container(
      color: const Color(0xFF141414),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            buildAppIcon(window, size: 48),
            const SizedBox(height: 16),
            Text(
              window.title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Package: ${window.appId}',
              style: const TextStyle(
                color: Color(0xFF8A8A8A),
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget buildAppIcon(WinWindowState win, {double size = 16}) {
    if (win.iconBase64 != null && win.iconBase64!.isNotEmpty) {
      try {
        final bytes = base64Decode(win.iconBase64!);
        return Image.memory(
          bytes,
          width: size,
          height: size,
          filterQuality: FilterQuality.medium,
        );
      } catch (_) {}
    }

    if (win.iconUrl != null && win.iconUrl!.isNotEmpty) {
      return Image.network(
        win.iconUrl!,
        width: size,
        height: size,
        errorBuilder: (_, __, ___) => _fallbackIcon(win.icon, size),
      );
    }

    return _fallbackIcon(win.icon, size);
  }

  static Widget _fallbackIcon(String iconName, double size) {
    IconData data;
    switch (iconName.toLowerCase()) {
      case 'smartphone':
      case 'phone':
        data = Icons.smartphone;
        break;
      case 'folderkanban':
      case 'folder':
        data = Icons.folder;
        break;
      case 'terminal':
        data = Icons.terminal;
        break;
      case 'gamepad2':
      case 'game':
        data = Icons.sports_esports;
        break;
      case 'music2':
      case 'music':
        data = Icons.music_note;
        break;
      case 'camera':
        data = Icons.camera_alt;
        break;
      case 'settings':
        data = Icons.settings;
        break;
      default:
        data = Icons.apps;
    }
    return Icon(data, size: size, color: Colors.white);
  }
}

/// Draggable Windows 10 Title Bar Widget
class _WindowTitleBar extends StatelessWidget {
  final WinWindowState window;
  final bool isActive;
  final VoidCallback onFocus;
  final VoidCallback onMinimize;
  final VoidCallback onMaximize;
  final VoidCallback? onToggleOrientation;
  final VoidCallback onClose;
  final void Function(double dx, double dy) onDragDelta;

  const _WindowTitleBar({
    required this.window,
    required this.isActive,
    required this.onFocus,
    required this.onMinimize,
    required this.onMaximize,
    this.onToggleOrientation,
    required this.onClose,
    required this.onDragDelta,
  });

  @override
  Widget build(BuildContext context) {
    final showRotate = onToggleOrientation != null ||
        window.isScreenMirror ||
        window.appId.contains('mirror') ||
        window.appId.contains('scrcpy');

    return Container(
      height: Win10Theme.windowTitleBarHeight,
      color: isActive
          ? Win10Theme.windowTitleBarActive
          : Win10Theme.windowTitleBarInactive,
      child: Row(
        children: [
          // Draggable Title Area (Icon + Title + Empty space)
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onDoubleTap: onMaximize,
              onPanStart: (_) => onFocus(),
              onPanUpdate: (details) => onDragDelta(details.delta.dx, details.delta.dy),
              child: Row(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10.0),
                    child: WinWindow.buildAppIcon(window, size: 16),
                  ),
                  Expanded(
                    child: Text(
                      window.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: isActive
                          ? Win10Theme.windowTitleStyle
                          : Win10Theme.windowTitleInactiveStyle,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Quick Rotate / Orientation Toggle Button (Portrait / Landscape)
          if (showRotate)
            _ControlButton(
              tooltip: window.isLandscape
                  ? 'Rotate to Portrait (Mobile mode)'
                  : 'Rotate to Landscape (Widescreen mode)',
              onTap: onToggleOrientation ?? () {},
              child: Icon(
                window.isLandscape
                    ? Icons.stay_current_portrait_outlined
                    : Icons.stay_current_landscape_outlined,
                size: 14.0,
                color: isActive ? Colors.white : const Color(0xFF9E9E9E),
              ),
            ),

          // Right: Windows 10 Control Buttons
          _ControlButton(
            tooltip: 'Minimize',
            onTap: onMinimize,
            child: CustomPaint(
              size: const Size(10, 10),
              painter: _MinimizeIconPainter(
                color: isActive ? Colors.white : const Color(0xFF9E9E9E),
              ),
            ),
          ),
          _ControlButton(
            tooltip: window.isMaximized ? 'Restore Down' : 'Maximize',
            onTap: onMaximize,
            child: CustomPaint(
              size: const Size(10, 10),
              painter: window.isMaximized
                  ? _RestoreIconPainter(
                      color: isActive ? Colors.white : const Color(0xFF9E9E9E),
                    )
                  : _MaximizeIconPainter(
                      color: isActive ? Colors.white : const Color(0xFF9E9E9E),
                    ),
            ),
          ),
          _ControlButton(
            tooltip: 'Close',
            isClose: true,
            onTap: onClose,
            child: CustomPaint(
              size: const Size(10, 10),
              painter: _CloseIconPainter(
                color: isActive ? Colors.white : const Color(0xFF9E9E9E),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Windows 10 Title Bar Control Button (Minimize, Maximize, Close)
class _ControlButton extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;
  final String tooltip;
  final bool isClose;

  const _ControlButton({
    required this.child,
    required this.onTap,
    required this.tooltip,
    this.isClose = false,
  });

  @override
  State<_ControlButton> createState() => _ControlButtonState();
}

class _ControlButtonState extends State<_ControlButton> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    Color bgColor = Colors.transparent;
    if (_isHovered) {
      bgColor = widget.isClose
          ? Win10Theme.windowCloseHover
          : Win10Theme.windowControlHover;
    }

    return Tooltip(
      message: widget.tooltip,
      waitDuration: const Duration(milliseconds: 600),
      child: MouseRegion(
        onEnter: (_) => setState(() => _isHovered = true),
        onExit: (_) => setState(() => _isHovered = false),
        child: Material(
          color: bgColor,
          child: InkWell(
            onTap: widget.onTap,
            child: SizedBox(
              width: Win10Theme.windowMinButtonWidth,
              height: Win10Theme.windowTitleBarHeight,
              child: Center(child: widget.child),
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Custom Painters for Pixel-Accurate Windows 10 Title Bar Icons
// ---------------------------------------------------------------------------

class _MinimizeIconPainter extends CustomPainter {
  final Color color;
  const _MinimizeIconPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.0;
    canvas.drawLine(
      Offset(0, size.height / 2),
      Offset(size.width, size.height / 2),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _MinimizeIconPainter oldDelegate) =>
      oldDelegate.color != color;
}

class _MaximizeIconPainter extends CustomPainter {
  final Color color;
  const _MaximizeIconPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawRect(
      Rect.fromLTWH(0.5, 0.5, size.width - 1.0, size.height - 1.0),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _MaximizeIconPainter oldDelegate) =>
      oldDelegate.color != color;
}

class _RestoreIconPainter extends CustomPainter {
  final Color color;
  const _RestoreIconPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    // Back rectangle
    final backPath = Path()
      ..moveTo(2.5, 0.5)
      ..lineTo(size.width - 0.5, 0.5)
      ..lineTo(size.width - 0.5, size.height - 2.5)
      ..lineTo(size.width - 2.5, size.height - 2.5);
    canvas.drawPath(backPath, paint);

    // Front rectangle
    canvas.drawRect(
      Rect.fromLTWH(0.5, 2.5, size.width - 3.0, size.height - 3.0),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _RestoreIconPainter oldDelegate) =>
      oldDelegate.color != color;
}

class _CloseIconPainter extends CustomPainter {
  final Color color;
  const _CloseIconPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawLine(Offset.zero, Offset(size.width, size.height), paint);
    canvas.drawLine(Offset(size.width, 0), Offset(0, size.height), paint);
  }

  @override
  bool shouldRepaint(covariant _CloseIconPainter oldDelegate) =>
      oldDelegate.color != color;
}

/// Painter for bottom-right corner resize diagonal grip lines
class _ResizeGripPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0x66FFFFFF)
      ..strokeWidth = 1.0;

    // 3 subtle diagonal dots / lines
    canvas.drawLine(
      Offset(size.width - 3, size.height - 1),
      Offset(size.width - 1, size.height - 3),
      paint,
    );
    canvas.drawLine(
      Offset(size.width - 7, size.height - 1),
      Offset(size.width - 1, size.height - 7),
      paint,
    );
    canvas.drawLine(
      Offset(size.width - 11, size.height - 1),
      Offset(size.width - 1, size.height - 11),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
