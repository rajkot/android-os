import 'dart:convert';
import 'package:flutter/material.dart';
import 'win10_theme.dart';

/// Windows 10 Desktop Icon Widget
/// - Icon on top (supports real image or fallback IconData)
/// - Label text underneath with high-contrast drop shadow
/// - Single tap to select, double tap to launch
/// - Secondary tap (right-click) for context menu (Open, Unpin)
class Win10DesktopIcon extends StatefulWidget {
  final String id;
  final String name;
  final String packageName;
  final IconData icon;
  final String? iconUrl;
  final String? iconBase64;
  final bool isSelected;
  final VoidCallback onSelect;
  final VoidCallback onOpen;
  final VoidCallback? onUnpin;

  const Win10DesktopIcon({
    super.key,
    required this.id,
    required this.name,
    required this.packageName,
    required this.icon,
    this.iconUrl,
    this.iconBase64,
    this.isSelected = false,
    required this.onSelect,
    required this.onOpen,
    this.onUnpin,
  });

  @override
  State<Win10DesktopIcon> createState() => _Win10DesktopIconState();
}

class _Win10DesktopIconState extends State<Win10DesktopIcon> {
  bool _isHovered = false;

  void _showContextMenu(BuildContext context, Offset globalPos) {
    final overlay = Overlay.of(context).context.findRenderObject() as RenderBox;
    showMenu(
      context: context,
      position: RelativeRect.fromRect(
        globalPos & const Size(40, 40),
        Offset.zero & overlay.size,
      ),
      color: const Color(0xFF2B2B2B),
      shape: const RoundedRectangleBorder(
        side: BorderSide(color: Color(0xFF404040)),
      ),
      items: [
        PopupMenuItem(
          onTap: widget.onOpen,
          child: const Text('Open', style: TextStyle(color: Colors.white, fontSize: 12.0)),
        ),
        if (widget.onUnpin != null)
          PopupMenuItem(
            onTap: widget.onUnpin,
            child: const Text('Unpin from Desktop', style: TextStyle(color: Colors.white, fontSize: 12.0)),
          ),
      ],
    );
  }

  Widget _buildIcon() {
    if (widget.iconUrl != null && widget.iconUrl!.isNotEmpty) {
      return Image.network(
        widget.iconUrl!,
        width: 36.0,
        height: 36.0,
        fit: BoxFit.contain,
        errorBuilder: (_, __, ___) => _buildFallbackIcon(),
      );
    }
    if (widget.iconBase64 != null && widget.iconBase64!.isNotEmpty) {
      try {
        return Image.memory(
          base64Decode(widget.iconBase64!),
          width: 36.0,
          height: 36.0,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => _buildFallbackIcon(),
        );
      } catch (_) {
        return _buildFallbackIcon();
      }
    }
    return _buildFallbackIcon();
  }

  Widget _buildFallbackIcon() {
    return Icon(
      widget.icon,
      size: 34.0,
      color: Colors.cyanAccent.shade200,
      shadows: const [
        Shadow(color: Colors.black54, blurRadius: 4.0, offset: Offset(0, 2)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final bg = widget.isSelected
        ? Win10Theme.accentBlue.withValues(alpha: 0.35)
        : _isHovered
            ? Colors.white.withValues(alpha: 0.1)
            : Colors.transparent;

    final border = widget.isSelected
        ? Border.all(color: Win10Theme.accentBlue.withValues(alpha: 0.8), width: 1.0)
        : _isHovered
            ? Border.all(color: Colors.white.withValues(alpha: 0.2), width: 1.0)
            : Border.all(color: Colors.transparent, width: 1.0);

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: widget.onSelect,
        onDoubleTap: widget.onOpen,
        onSecondaryTapUp: (details) => _showContextMenu(context, details.globalPosition),
        child: Container(
          width: 76.0,
          height: 84.0,
          padding: const EdgeInsets.all(4.0),
          decoration: BoxDecoration(
            color: bg,
            border: border,
            borderRadius: BorderRadius.circular(2.0),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Real Icon Image or Fallback Icon
              SizedBox(
                width: 36.0,
                height: 36.0,
                child: Center(child: _buildIcon()),
              ),
              const SizedBox(height: 3.0),
              // Text label with Windows 10 drop shadow
              Text(
                widget.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11.0,
                  fontWeight: FontWeight.w400,
                  shadows: [
                    Shadow(color: Colors.black, blurRadius: 3.0, offset: Offset(0, 1)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
