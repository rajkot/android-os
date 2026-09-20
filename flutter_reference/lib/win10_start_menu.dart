import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'adb_service.dart';
import 'win10_theme.dart';

class FlutterAppDef {
  final String id;
  final String name;
  final String packageName;
  final String? activity;
  final IconData icon;
  final String? iconUrl;
  final String? iconBase64;
  final String category;
  final bool isPinned;

  const FlutterAppDef({
    required this.id,
    required this.name,
    required this.packageName,
    this.activity,
    required this.icon,
    this.iconUrl,
    this.iconBase64,
    required this.category,
    this.isPinned = false,
  });
}

/// Helper to render real app icon (Network or Memory Base64) with fallback to IconData
class AppIconWidget extends StatelessWidget {
  final FlutterAppDef app;
  final double size;
  final Color fallbackColor;

  const AppIconWidget({
    super.key,
    required this.app,
    this.size = 20.0,
    this.fallbackColor = Colors.cyanAccent,
  });

  @override
  Widget build(BuildContext context) {
    if (app.iconUrl != null && app.iconUrl!.isNotEmpty) {
      return Image.network(
        app.iconUrl!,
        width: size,
        height: size,
        fit: BoxFit.contain,
        errorBuilder: (_, __, ___) => Icon(app.icon, size: size * 0.85, color: fallbackColor),
      );
    }
    if (app.iconBase64 != null && app.iconBase64!.isNotEmpty) {
      try {
        return Image.memory(
          base64Decode(app.iconBase64!),
          width: size,
          height: size,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => Icon(app.icon, size: size * 0.85, color: fallbackColor),
        );
      } catch (_) {
        return Icon(app.icon, size: size * 0.85, color: fallbackColor);
      }
    }
    return Icon(app.icon, size: size * 0.85, color: fallbackColor);
  }
}

/// Windows 10 Start Menu Widget (Flutter)
/// - Left Navigation Rail (expandable User, Documents, Settings, Power)
/// - App Drawer (search bar at top, category chips, installed apps list with pin actions)
/// - Right Live Tiles Grid (Metro/Fluent accent colored tiles)
class Win10StartMenu extends StatefulWidget {
  final List<FlutterAppDef> apps;
  final Function(String appId) onOpenApp;
  final VoidCallback? onSettingsTap;
  final VoidCallback? onRefreshApps;
  final List<String> pinnedDesktopAppIds;
  final Function(String appId)? onTogglePinDesktop;
  final AdbService? adbService;
  final VoidCallback? onStreamRefresh;

  const Win10StartMenu({
    super.key,
    required this.apps,
    required this.onOpenApp,
    this.onSettingsTap,
    this.onRefreshApps,
    this.pinnedDesktopAppIds = const [],
    this.onTogglePinDesktop,
    this.adbService,
    this.onStreamRefresh,
  });

  @override
  State<Win10StartMenu> createState() => _Win10StartMenuState();
}

class _Win10StartMenuState extends State<Win10StartMenu> {
  String _searchQuery = '';
  String _selectedCategory = 'All';
  bool _isRailExpanded = false;
  bool _isRefreshing = false;

  final List<String> _categories = ['All', 'Tools', 'Media', 'Games', 'Productivity', 'Social'];

  Future<void> _handleRefreshDeviceAndApps() async {
    if (_isRefreshing) return;
    setState(() => _isRefreshing = true);
    try {
      if (widget.adbService != null) {
        await widget.adbService!.invalidateCacheAndReload(force: true);
      }
      widget.onRefreshApps?.call();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle_outline, color: Colors.white, size: 16),
                SizedBox(width: 8),
                Text('Device state & apps reloaded cleanly from ADB', style: TextStyle(fontSize: 12)),
              ],
            ),
            duration: Duration(seconds: 2),
            backgroundColor: Color(0xFF107C41),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Refresh error: $e', style: const TextStyle(fontSize: 12)),
            duration: const Duration(seconds: 3),
            backgroundColor: const Color(0xFFC42B1C),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isRefreshing = false);
      }
    }
  }

  final List<Color> _tileColors = const [
    Color(0xFF0078D7), // Windows Blue
    Color(0xFF107C41), // Xbox Green
    Color(0xFFD83B01), // Orange Red
    Color(0xFF5C2D91), // Purple
    Color(0xFF008272), // Teal
    Color(0xFFE81123), // Crimson
  ];

  Future<void> _handleAppClick(BuildContext context, FlutterAppDef app) async {
    final cleanPkg = AdbService.sanitizePackageName(app.packageName);
    debugPrint('[Win10StartMenu] Clicked app: ${app.name} -> sanitized: "$cleanPkg" (raw: "${app.packageName}")');

    if (widget.adbService != null && !app.packageName.startsWith('com.androiddex.')) {
      final result = await widget.adbService!.launchApp(rawPackageName: cleanPkg);
      debugPrint('[Win10StartMenu] Executed ADB command: ${result.command}');
      debugPrint('[Win10StartMenu] Result: success=${result.success}, exitCode=${result.exitCode}');

      if (!result.success) {
        if (context.mounted) {
          final errorMsg = result.errorMessage ??
              (result.stderr.isNotEmpty ? result.stderr : (result.stdout.isNotEmpty ? result.stdout : 'Launch failed'));
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.white, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Launch Error (${app.name}): $errorMsg',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
              backgroundColor: const Color(0xFFC42B1C),
              duration: const Duration(seconds: 5),
              action: SnackBarAction(
                label: 'DISMISS',
                textColor: Colors.white,
                onPressed: () {},
              ),
            ),
          );
        }
        return;
      }

      // Successful launch -> trigger screen mirror focus/refresh
      widget.onStreamRefresh?.call();
      widget.onOpenApp(app.id);
    } else {
      widget.onOpenApp(app.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = widget.apps.filter((app) {
      final matchesSearch = _searchQuery.isEmpty ||
          app.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          app.packageName.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesCat = _selectedCategory == 'All' || app.category == _selectedCategory;
      return matchesSearch && matchesCat;
    }).toList();

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
        child: Container(
          width: 640.0,
          height: 540.0,
          decoration: BoxDecoration(
            color: const Color(0xED181818),
            border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
            boxShadow: const [
              BoxShadow(color: Colors.black87, blurRadius: 30.0, offset: Offset(0, 10)),
            ],
          ),
          child: Row(
            children: [
              // 1. Left Navigation Rail
              AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: _isRailExpanded ? 160.0 : 48.0,
                color: const Color(0xE6181818),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Top: Hamburger toggle
                    IconButton(
                      icon: const Icon(Icons.menu, size: 18.0, color: Colors.white70),
                      onPressed: () => setState(() => _isRailExpanded = !_isRailExpanded),
                    ),

                    // Bottom items: User, Documents, Settings, Power
                    Column(
                      children: [
                        _RailItem(
                          icon: Icons.person_outline,
                          label: 'Android User',
                          isExpanded: _isRailExpanded,
                          onTap: () {},
                        ),
                        _RailItem(
                          icon: Icons.folder_open,
                          label: 'Documents',
                          isExpanded: _isRailExpanded,
                          onTap: () => widget.onOpenApp('dex-files'),
                        ),
                        _RailItem(
                          icon: Icons.settings_outlined,
                          label: 'Settings',
                          isExpanded: _isRailExpanded,
                          onTap: widget.onSettingsTap,
                        ),
                        _RailItem(
                          icon: Icons.power_settings_new,
                          label: 'Power',
                          isExpanded: _isRailExpanded,
                          onTap: widget.onRefreshApps,
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // 2. Middle Column: App Drawer (Search + Categorized Apps List)
              Expanded(
                flex: 5,
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0x661F1F1F),
                    border: Border(
                      right: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
                    ),
                  ),
                  child: Column(
                    children: [
                      // Top: Search Bar + Refresh Device & Apps Button
                      Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                onChanged: (val) => setState(() => _searchQuery = val),
                                style: const TextStyle(color: Colors.white, fontSize: 12.0),
                                decoration: InputDecoration(
                                  hintText: 'Search apps or packages...',
                                  hintStyle: const TextStyle(color: Colors.white38, fontSize: 12.0),
                                  prefixIcon: const Icon(Icons.search, size: 16.0, color: Colors.white54),
                                  filled: true,
                                  fillColor: const Color(0xFF141414),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 8.0),
                                  enabledBorder: OutlineInputBorder(
                                    borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.12)),
                                    borderRadius: BorderRadius.zero,
                                  ),
                                  focusedBorder: const OutlineInputBorder(
                                    borderSide: BorderSide(color: Win10Theme.accentBlue),
                                    borderRadius: BorderRadius.zero,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 6.0),
                            Tooltip(
                              message: 'Refresh Device & Apps',
                              child: InkWell(
                                onTap: _isRefreshing ? null : _handleRefreshDeviceAndApps,
                                child: Container(
                                  height: 36.0,
                                  width: 36.0,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF141414),
                                    border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                                  ),
                                  child: _isRefreshing
                                      ? const Center(
                                          child: SizedBox(
                                            width: 14.0,
                                            height: 14.0,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2.0,
                                              color: Colors.cyanAccent,
                                            ),
                                          ),
                                        )
                                      : const Icon(Icons.refresh, size: 18.0, color: Colors.white70),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Category Chips
                      SizedBox(
                        height: 26.0,
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 8.0),
                          scrollDirection: Axis.horizontal,
                          itemCount: _categories.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 4.0),
                          itemBuilder: (context, i) {
                            final cat = _categories[i];
                            final isSel = _selectedCategory == cat;
                            return GestureDetector(
                              onTap: () => setState(() => _selectedCategory = cat),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                                color: isSel ? Win10Theme.accentBlue : Colors.white.withValues(alpha: 0.06),
                                child: Text(
                                  cat,
                                  style: TextStyle(
                                    color: isSel ? Colors.white : Colors.white70,
                                    fontSize: 10.0,
                                    fontWeight: isSel ? FontWeight.w600 : FontWeight.normal,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),

                      // Installed Apps List
                      Expanded(
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(vertical: 6.0),
                          itemCount: filtered.length,
                          itemBuilder: (context, index) {
                            final app = filtered[index];
                            final isPinned = widget.pinnedDesktopAppIds.contains(app.id);
                            return Material(
                              color: Colors.transparent,
                              child: ListTile(
                                dense: true,
                                visualDensity: VisualDensity.compact,
                                leading: AppIconWidget(app: app, size: 22.0),
                                title: Text(
                                  app.name,
                                  style: const TextStyle(color: Colors.white, fontSize: 12.0),
                                ),
                                subtitle: Text(
                                  app.packageName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(color: Colors.white38, fontSize: 9.5),
                                ),
                                trailing: widget.onTogglePinDesktop != null
                                    ? IconButton(
                                        icon: Icon(
                                          Icons.push_pin,
                                          size: 14.0,
                                          color: isPinned ? Win10Theme.accentBlue : Colors.white24,
                                        ),
                                        onPressed: () => widget.onTogglePinDesktop!(app.id),
                                      )
                                    : null,
                                onTap: () => _handleAppClick(context, app),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // 3. Right Column: Windows 10 Live Tiles Grid
              Expanded(
                flex: 6,
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Quick Launch & Games',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 11.0,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 10.0),
                      Expanded(
                        child: GridView.builder(
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            mainAxisSpacing: 6.0,
                            crossAxisSpacing: 6.0,
                            childAspectRatio: 1.1,
                          ),
                          itemCount: widget.apps.length.clamp(0, 9),
                          itemBuilder: (context, i) {
                            final app = widget.apps[i];
                            final tileColor = _tileColors[i % _tileColors.length];
                            return GestureDetector(
                              onTap: () => _handleAppClick(context, app),
                              child: Container(
                                color: tileColor,
                                padding: const EdgeInsets.all(6.0),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Align(
                                      alignment: Alignment.topRight,
                                      child: AppIconWidget(app: app, size: 24.0, fallbackColor: Colors.white),
                                    ),
                                    Text(
                                      app.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10.0,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RailItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isExpanded;
  final VoidCallback? onTap;

  const _RailItem({
    required this.icon,
    required this.label,
    required this.isExpanded,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        height: 38.0,
        padding: const EdgeInsets.symmetric(horizontal: 14.0),
        child: Row(
          children: [
            Icon(icon, size: 18.0, color: Colors.white70),
            if (isExpanded) ...[
              const SizedBox(width: 12.0),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 11.5),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

extension _FilterExt on List<FlutterAppDef> {
  List<FlutterAppDef> filter(bool Function(FlutterAppDef) test) {
    return where(test).toList();
  }
}
