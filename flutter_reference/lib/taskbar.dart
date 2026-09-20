import 'dart:ui';
import 'package:flutter/material.dart';
import 'win10_theme.dart';
import 'system_tray.dart';

import 'win_window_model.dart';
import 'win_window.dart';

/// Windows 10 Taskbar Widget
/// Height: 48px
/// Features:
/// - Start Button on the far left
/// - Middle Row for running app icons with active bottom indicator
/// - System Tray on the far right with live clock and system icons
class Taskbar extends StatelessWidget {
  final VoidCallback? onStartPressed;
  final bool isStartOpen;
  final VoidCallback? onSearchPressed;
  final VoidCallback? onNotificationCenterPressed;
  final VoidCallback? onShowDesktopPressed;
  final List<WinWindowState> runningWindows;
  final String? activeWindowId;
  final ValueChanged<String>? onWindowTap;
  final List<Widget> runningAppIcons;

  const Taskbar({
    super.key,
    this.onStartPressed,
    this.isStartOpen = false,
    this.onSearchPressed,
    this.onNotificationCenterPressed,
    this.onShowDesktopPressed,
    this.runningWindows = const [],
    this.activeWindowId,
    this.onWindowTap,
    this.runningAppIcons = const [],
  });

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: Win10Theme.taskbarHeight,
          decoration: const BoxDecoration(
            color: Win10Theme.taskbarBackground,
            border: Border(
              top: BorderSide(color: Win10Theme.taskbarBorder, width: 1.0),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Far Left: Windows 10 Start Button
              _StartButton(
                isOpen: isStartOpen,
                onPressed: onStartPressed,
              ),

              // Search Bar Placeholder
              _SearchBox(onTap: onSearchPressed),

              // 2. Middle Section: Running app icons with Windows 10 bottom highlight
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      // Active Running Windows
                      ...runningWindows.map((win) {
                        final isFocused = activeWindowId == win.id && !win.isMinimized;
                        return _TaskbarAppIcon(
                          window: win,
                          isFocused: isFocused,
                          onTap: () => onWindowTap?.call(win.id),
                        );
                      }),
                      // Fallback running app icons (if any)
                      ...runningAppIcons,
                    ],
                  ),
                ),
              ),

              // 3. Far Right: System Tray
              SystemTray(
                onNotificationCenterTap: onNotificationCenterPressed,
                onShowDesktopTap: onShowDesktopPressed,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Windows 10 Taskbar Active App Tile
class _TaskbarAppIcon extends StatefulWidget {
  final WinWindowState window;
  final bool isFocused;
  final VoidCallback onTap;

  const _TaskbarAppIcon({
    required this.window,
    required this.isFocused,
    required this.onTap,
  });

  @override
  State<_TaskbarAppIcon> createState() => _TaskbarAppIconState();
}

class _TaskbarAppIconState extends State<_TaskbarAppIcon> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    Color bgColor = Colors.transparent;
    if (widget.isFocused) {
      bgColor = Win10Theme.taskbarActive;
    } else if (_isHovered) {
      bgColor = Win10Theme.taskbarHover;
    }

    return Tooltip(
      message: widget.window.title,
      waitDuration: const Duration(milliseconds: 500),
      child: MouseRegion(
        onEnter: (_) => setState(() => _isHovered = true),
        onExit: (_) => setState(() => _isHovered = false),
        child: Material(
          color: bgColor,
          child: InkWell(
            onTap: widget.onTap,
            child: SizedBox(
              width: Win10Theme.taskbarItemWidth,
              height: Win10Theme.taskbarHeight,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // App Icon (22x22)
                  WinWindow.buildAppIcon(widget.window, size: 22),

                  // Bottom Active Highlight Indicator
                  Positioned(
                    bottom: 0,
                    left: 4,
                    right: 4,
                    height: Win10Theme.taskbarIndicatorHeight,
                    child: Container(
                      decoration: BoxDecoration(
                        color: widget.isFocused
                            ? Win10Theme.accentBlue
                            : (widget.window.isMinimized
                                ? const Color(0x66FFFFFF)
                                : const Color(0xB3FFFFFF)),
                        borderRadius: BorderRadius.circular(1.0),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _StartButton extends StatelessWidget {
  final bool isOpen;
  final VoidCallback? onPressed;

  const _StartButton({
    required this.isOpen,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Start',
      child: Material(
        color: isOpen ? Win10Theme.taskbarActive : Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          hoverColor: Win10Theme.taskbarHover,
          splashColor: Win10Theme.taskbarActive,
          child: SizedBox(
            width: Win10Theme.startButtonWidth,
            height: Win10Theme.taskbarHeight,
            child: Center(
              child: CustomPaint(
                size: const Size(16, 16),
                painter: _Windows10LogoPainter(
                  color: isOpen ? Win10Theme.accentBlue : Colors.white,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SearchBox extends StatelessWidget {
  final VoidCallback? onTap;

  const _SearchBox({this.onTap});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4.0),
        child: InkWell(
          onTap: onTap,
          child: Container(
            height: 32.0,
            constraints: const BoxConstraints(maxWidth: 160.0),
            padding: const EdgeInsets.symmetric(horizontal: 8.0),
            decoration: BoxDecoration(
              color: const Color(0x33FFFFFF),
              border: Border.all(color: Win10Theme.taskbarBorder),
            ),
            child: const Row(
              children: [
                Icon(Icons.search, size: 15.0, color: Color(0xFFBDBDBD)),
                SizedBox(width: 6.0),
                Expanded(
                  child: Text(
                    'Search...',
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                    style: Win10Theme.searchPlaceholderStyle,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Custom painter for the angled 4-pane Windows 10 Start logo
class _Windows10LogoPainter extends CustomPainter {
  final Color color;

  const _Windows10LogoPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    // Top-left pane
    final path1 = Path()
      ..moveTo(0, size.height * 0.14)
      ..lineTo(size.width * 0.42, size.height * 0.08)
      ..lineTo(size.width * 0.42, size.height * 0.46)
      ..lineTo(0, size.height * 0.46)
      ..close();

    // Bottom-left pane
    final path2 = Path()
      ..moveTo(0, size.height * 0.54)
      ..lineTo(size.width * 0.42, size.height * 0.54)
      ..lineTo(size.width * 0.42, size.height * 0.92)
      ..lineTo(0, size.height * 0.86)
      ..close();

    // Top-right pane
    final path3 = Path()
      ..moveTo(size.width * 0.48, size.height * 0.07)
      ..lineTo(size.width, 0)
      ..lineTo(size.width, size.height * 0.46)
      ..lineTo(size.width * 0.48, size.height * 0.46)
      ..close();

    // Bottom-right pane
    final path4 = Path()
      ..moveTo(size.width * 0.48, size.height * 0.54)
      ..lineTo(size.width, size.height * 0.54)
      ..lineTo(size.width, size.height)
      ..lineTo(size.width * 0.48, size.height * 0.93)
      ..close();

    canvas.drawPath(path1, paint);
    canvas.drawPath(path2, paint);
    canvas.drawPath(path3, paint);
    canvas.drawPath(path4, paint);
  }

  @override
  bool shouldRepaint(covariant _Windows10LogoPainter oldDelegate) =>
      oldDelegate.color != color;
}
