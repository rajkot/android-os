import 'dart:async';
import 'package:flutter/material.dart';
import 'win10_theme.dart';

/// System Tray widget displayed on the far right of the Windows 10 Taskbar
class SystemTray extends StatefulWidget {
  final VoidCallback? onNotificationCenterTap;
  final VoidCallback? onShowDesktopTap;

  const SystemTray({
    super.key,
    this.onNotificationCenterTap,
    this.onShowDesktopTap,
  });

  @override
  State<SystemTray> createState() => _SystemTrayState();
}

class _SystemTrayState extends State<SystemTray> {
  late Timer _timer;
  late DateTime _now;

  @override
  void initState() {
    super.initState();
    _now = DateTime.now();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() {
          _now = DateTime.now();
        });
      }
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String _formatTime(DateTime dt) {
    final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final minute = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $period';
  }

  String _formatDate(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}-${dt.month.toString().padLeft(2, '0')}-${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Hidden icons overflow arrow
        _TrayIconButton(
          icon: Icons.keyboard_arrow_up,
          tooltip: 'Show hidden icons',
          onTap: () {},
        ),

        // System indicators: Wi-Fi, Volume, Battery
        _TrayIconButton(
          icon: Icons.wifi,
          tooltip: 'Internet access',
          onTap: () {},
        ),
        _TrayIconButton(
          icon: Icons.volume_up,
          tooltip: 'Speakers: 100%',
          onTap: () {},
        ),
        _TrayIconButton(
          icon: Icons.battery_charging_full,
          tooltip: 'Battery: 100%',
          iconColor: Colors.greenAccent,
          onTap: () {},
        ),

        // Windows 10 Live Clock (2-line)
        InkWell(
          onTap: () {},
          hoverColor: Win10Theme.taskbarHover,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(_formatTime(_now), style: Win10Theme.clockTimeStyle),
                Text(_formatDate(_now), style: Win10Theme.clockDateStyle),
              ],
            ),
          ),
        ),

        // Action Center / Notifications
        _TrayIconButton(
          icon: Icons.chat_bubble_outline,
          tooltip: 'Action Center',
          onTap: widget.onNotificationCenterTap,
        ),

        // Windows 10 Peek / Show Desktop strip
        InkWell(
          onTap: widget.onShowDesktopTap,
          hoverColor: Colors.white.withValues(alpha: 0.2),
          child: Container(
            width: Win10Theme.showDesktopWidth,
            decoration: const BoxDecoration(
              border: Border(
                left: BorderSide(color: Win10Theme.taskbarBorder, width: 1.0),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _TrayIconButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback? onTap;
  final Color? iconColor;

  const _TrayIconButton({
    required this.icon,
    required this.tooltip,
    this.onTap,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        hoverColor: Win10Theme.taskbarHover,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6.0),
          child: Icon(
            icon,
            size: 16.0,
            color: iconColor ?? Colors.white70,
          ),
        ),
      ),
    );
  }
}
