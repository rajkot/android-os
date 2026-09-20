import 'package:flutter/material.dart';

/// DesktopBackground widget taking up the main screen space
/// Allows holding a Windows-style wallpaper image or a solid dark color/gradient
class DesktopBackground extends StatelessWidget {
  final String? wallpaperUrl;
  final Color backgroundColor;
  final Widget? child;
  final VoidCallback? onTap;
  final VoidCallback? onSecondaryTap;

  const DesktopBackground({
    super.key,
    this.wallpaperUrl,
    this.backgroundColor = const Color(0xFF0C0C0C),
    this.child,
    this.onTap,
    this.onSecondaryTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      onSecondaryTap: onSecondaryTap,
      child: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          color: backgroundColor,
          gradient: wallpaperUrl == null
              ? const RadialGradient(
                  center: Alignment(0.0, -0.1),
                  radius: 0.9,
                  colors: [
                    Color(0xFF001B3A),
                    Color(0xFF050A14),
                    Color(0xFF020408),
                  ],
                )
              : null,
          image: wallpaperUrl != null
              ? DecorationImage(
                  image: NetworkImage(wallpaperUrl!),
                  fit: BoxFit.cover,
                )
              : null,
        ),
        child: Stack(
          children: [
            // Ambient vignette
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.2),
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.4),
                    ],
                  ),
                ),
              ),
            ),
            if (child != null) Positioned.fill(child: child!),
          ],
        ),
      ),
    );
  }
}
