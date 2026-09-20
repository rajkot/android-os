import 'dart:async';
import 'dart:convert';
import 'dart:io';

/// Result of an ADB execution command with stdout, stderr, and error verification
class AdbLaunchResult {
  final bool success;
  final String command;
  final String stdout;
  final String stderr;
  final int exitCode;
  final String? errorMessage;

  const AdbLaunchResult({
    required this.success,
    required this.command,
    this.stdout = '',
    this.stderr = '',
    this.exitCode = 0,
    this.errorMessage,
  });

  @override
  String toString() =>
      'AdbLaunchResult(success: $success, cmd: $command, exitCode: $exitCode, error: $errorMessage)';
}

/// Model representing an enumerated Android Application
class AndroidAppModel {
  final String id;
  final String name;
  final String packageName;
  final String? activity;
  final String? iconBase64;
  final String? iconUrl;
  final String category;

  const AndroidAppModel({
    required this.id,
    required this.name,
    required this.packageName,
    this.activity,
    this.iconBase64,
    this.iconUrl,
    this.category = 'Tools',
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'packageName': packageName,
        'activity': activity,
        'iconBase64': iconBase64,
        'iconUrl': iconUrl,
        'category': category,
      };

  factory AndroidAppModel.fromJson(Map<String, dynamic> json) => AndroidAppModel(
        id: json['id'] as String? ?? json['packageName'] as String,
        name: json['name'] as String? ?? json['packageName'] as String,
        packageName: json['packageName'] as String,
        activity: json['activity'] as String?,
        iconBase64: json['iconBase64'] as String?,
        iconUrl: json['iconUrl'] as String?,
        category: json['category'] as String? ?? 'Tools',
      );
}

/// Robust ADB Service for Android OS Desktop
/// - Device state watcher (auto-invalidation on device swap)
/// - Lock screen swipe & passcode unlock support
/// - Multi-Fallback ADB Launch Engine
class AdbService {
  final String adbPath;
  String? deviceSerial;
  bool _isJarPushed = false;
  List<AndroidAppModel> _cachedApps = [];
  final Map<String, String> _cachedIcons = {};

  // Device State Watcher
  Timer? _deviceWatcherTimer;
  final StreamController<String?> _deviceStreamController =
      StreamController<String?>.broadcast();
  String? _lastKnownSerial;

  AdbService({this.adbPath = 'adb', this.deviceSerial}) {
    _lastKnownSerial = deviceSerial;
  }

  Stream<String?> get onDeviceChanged => _deviceStreamController.stream;
  List<AndroidAppModel> get cachedApps => List.unmodifiable(_cachedApps);

  /// Start background ADB device state watcher
  void startDeviceWatcher({Duration interval = const Duration(seconds: 2)}) {
    _deviceWatcherTimer?.cancel();
    _deviceWatcherTimer = Timer.periodic(interval, (_) => _pollDevices());
  }

  void stopDeviceWatcher() {
    _deviceWatcherTimer?.cancel();
    _deviceWatcherTimer = null;
  }

  /// Polls connected devices and clears state when swapped/disconnected
  Future<void> _pollDevices() async {
    try {
      final res = await Process.run(adbPath, ['devices', '-l']);
      if (res.exitCode != 0) return;

      final lines = LineSplitter.split(res.stdout.toString())
          .where((l) => l.isNotEmpty && !l.startsWith('List of devices'));

      String? primarySerial;
      for (final line in lines) {
        final parts = line.trim().split(RegExp(r'\s+'));
        if (parts.length >= 2 && parts[1] == 'device') {
          primarySerial = parts[0];
          break;
        }
      }

      if (primarySerial != _lastKnownSerial) {
        print('[AdbService] Device swap/change detected: "$_lastKnownSerial" -> "$primarySerial"');
        _lastKnownSerial = primarySerial;
        deviceSerial = primarySerial;

        // Immediately clear cached apps and icons from state
        _cachedApps.clear();
        _cachedIcons.clear();
        _isJarPushed = false;

        _deviceStreamController.add(primarySerial);

        // Automatically trigger clean app query for newly connected device
        if (primarySerial != null) {
          queryLaunchableApps(forceRefresh: true);
        }
      }
    } catch (_) {}
  }

  /// Invalidate all cached apps and force-reload from connected device
  Future<List<AndroidAppModel>> invalidateCacheAndReload({
    String? targetSerial,
    bool force = true,
  }) async {
    print('[AdbService] Force invalidating app cache & reloading...');
    _cachedApps.clear();
    _cachedIcons.clear();
    _isJarPushed = false;
    if (targetSerial != null) {
      deviceSerial = targetSerial;
      _lastKnownSerial = targetSerial;
    }
    return await queryLaunchableApps(forceRefresh: true);
  }

  /// Check if physical phone is attached and authorized
  Future<bool> checkDeviceOnline() async {
    try {
      final res = await Process.run(adbPath, ['devices', '-l']);
      if (res.exitCode != 0) return false;
      final stdout = res.stdout.toString();
      final lines = LineSplitter.split(stdout).where((l) => !l.startsWith('List of devices'));
      for (final line in lines) {
        if (line.contains('device')) {
          if (deviceSerial == null || line.contains(deviceSerial!)) return true;
        }
      }
    } catch (_) {}
    return false;
  }

  /// Wake physical device display and dismiss lock screen
  Future<bool> wakeDevice({bool dismissKeyguard = true}) async {
    try {
      final cmd = dismissKeyguard
          ? 'input keyevent 224 && wm dismiss-keyguard && input keyevent 82'
          : 'input keyevent 224';
      final res = await _runAdb(['shell', cmd]);
      return res.exitCode == 0;
    } catch (_) {
      return false;
    }
  }

  /// Lock screen interaction: Injects upward touchscreen swipe to reveal PIN/Pattern screen
  Future<bool> unlockSwipeUp({int duration = 250}) async {
    try {
      // Swipes vertically from bottom-center to upper-center
      final res = await _runAdb(['shell', 'input swipe 540 1800 540 400 $duration']);
      return res.exitCode == 0;
    } catch (_) {
      return false;
    }
  }

  /// Send Passcode text directly through ADB followed by KEYCODE_ENTER (66)
  Future<bool> sendPasscodeAndUnlock(String passcode) async {
    try {
      final cleanCode = passcode.trim();
      if (cleanCode.isEmpty) return false;
      final escaped = cleanCode.replaceAll(RegExp(r'([\\ "&$*~<>;|#])'), r'\$1');
      final res = await _runAdb(['shell', 'input text "$escaped" && input keyevent 66']);
      return res.exitCode == 0;
    } catch (_) {
      return false;
    }
  }

  /// Send arbitrary single keyevent (e.g. KEYCODE_BACK = 4, KEYCODE_HOME = 3, KEYCODE_ENTER = 66)
  Future<bool> sendKey(int keycode) async {
    try {
      final res = await _runAdb(['shell', 'input keyevent $keycode']);
      return res.exitCode == 0;
    } catch (_) {
      return false;
    }
  }

  /// Send text input via ADB shell input text
  Future<bool> sendText(String text) async {
    try {
      final escaped = text.replaceAll(RegExp(r'([\\ "&$*~<>;|#])'), r'\$1');
      final res = await _runAdb(['shell', 'input text "$escaped"']);
      return res.exitCode == 0;
    } catch (_) {
      return false;
    }
  }

  /// Check whether device screen is awake/on
  Future<bool> isScreenAwake() async {
    try {
      final res = await _runAdb(['shell', 'dumpsys power']);
      if (res.exitCode != 0) return true;
      final out = res.stdout.toString();
      return out.contains('mWakefulness=Awake') || out.contains('Display Power: state=ON');
    } catch (_) {
      return true;
    }
  }

  /// 1. Package Name Sanitization:
  /// Explicitly strip any 'package:', 'phone-app-', query strings, or whitespace
  static String sanitizePackageName(String raw) {
    var clean = raw.trim();
    while (clean.startsWith('package:')) {
      clean = clean.substring('package:'.length).trim();
    }
    if (clean.startsWith('phone-app-')) {
      clean = clean.substring('phone-app-'.length).trim();
    }
    if (clean.contains('?')) {
      clean = clean.split('?').first.trim();
    }
    return clean.replaceAll(RegExp(r'[\r\n\t]'), '').trim();
  }

  /// Run adb command with optional device serial
  Future<ProcessResult> _runAdb(List<String> args) async {
    final finalArgs = <String>[];
    if (deviceSerial != null && deviceSerial!.isNotEmpty) {
      finalArgs.addAll(['-s', deviceSerial!]);
    }
    finalArgs.addAll(args);
    return await Process.run(adbPath, finalArgs);
  }

  /// Execute an ADB shell command (e.g. 'input tap 500 800' or 'input keyevent 4')
  Future<ProcessResult> executeShellCommand(String shellCommand) async {
    return await _runAdb(['shell', shellCommand]);
  }

  /// Run an arbitrary ADB command with arguments
  Future<ProcessResult> runAdbCommand(List<String> args) async {
    return await _runAdb(args);
  }

  /// 2. Query all launchable apps and activities
  /// Uses: `adb shell cmd package query-activities --brief -a android.intent.action.MAIN -c android.intent.category.LAUNCHER`
  Future<List<AndroidAppModel>> queryLaunchableApps({bool forceRefresh = false}) async {
    if (!forceRefresh && _cachedApps.isNotEmpty) {
      return _cachedApps;
    }
    final result = await _runAdb([
      'shell',
      'cmd',
      'package',
      'query-activities',
      '--brief',
      '-a',
      'android.intent.action.MAIN',
      '-c',
      'android.intent.category.LAUNCHER',
    ]);

    if (result.exitCode != 0) {
      final fallback = await _fallbackListPackages();
      if (fallback.isNotEmpty) {
        _cachedApps = fallback;
        return fallback;
      }
      return _cachedApps;
    }

    final lines = LineSplitter.split(result.stdout.toString());
    final apps = <AndroidAppModel>[];
    final seen = <String>{};

    for (final rawLine in lines) {
      final line = rawLine.trim();
      if (line.isEmpty || line.startsWith('Activity Resolver Table:')) continue;

      if (line.contains('/')) {
        final parts = line.split('/');
        final rawPkg = parts[0].trim();
        final pkg = sanitizePackageName(rawPkg);
        var act = parts[1].trim();
        if (act.startsWith('.')) {
          act = '$pkg$act';
        }

        if (seen.contains(pkg)) continue;
        seen.add(pkg);

        final label = _formatPackageLabel(pkg);
        apps.add(AndroidAppModel(
          id: pkg,
          name: label,
          packageName: pkg,
          activity: act,
          category: _categorizePackage(pkg),
        ));
      }
    }

    if (apps.isNotEmpty) {
      _cachedApps = apps;
    }
    return apps.isNotEmpty ? apps : _cachedApps;
  }

  Future<List<AndroidAppModel>> _fallbackListPackages() async {
    final result = await _runAdb(['shell', 'pm', 'list', 'packages', '-3']);
    final lines = LineSplitter.split(result.stdout.toString());
    final apps = <AndroidAppModel>[];

    for (final rawLine in lines) {
      final line = rawLine.trim();
      if (!line.startsWith('package:')) continue;
      final pkg = sanitizePackageName(line);
      apps.add(AndroidAppModel(
        id: pkg,
        name: _formatPackageLabel(pkg),
        packageName: pkg,
        category: _categorizePackage(pkg),
      ));
    }
    if (apps.isNotEmpty) {
      _cachedApps = apps;
    }
    return apps.isNotEmpty ? apps : _cachedApps;
  }

  /// 3. Ensure dex-icon-extractor.jar is installed on device
  Future<bool> ensureExtractorJar(String localJarPath) async {
    if (_isJarPushed) return true;
    try {
      final result = await _runAdb([
        'push',
        localJarPath,
        '/data/local/tmp/dex-icon-extractor.jar',
      ]);
      _isJarPushed = (result.exitCode == 0);
      return _isJarPushed;
    } catch (_) {
      return false;
    }
  }

  /// Extract real app icon binary (Base64 PNG) via Android framework
  Future<String?> extractAppIconBase64(String packageName) async {
    final cleanPkg = sanitizePackageName(packageName);
    try {
      final result = await _runAdb([
        'shell',
        'CLASSPATH=/data/local/tmp/dex-icon-extractor.jar app_process / com.androiddex.IconExtractor $cleanPkg',
      ]);

      if (result.exitCode != 0) return null;

      final stdout = result.stdout.toString().trim();
      const marker = 'ICON_BASE64:';
      final idx = stdout.indexOf(marker);
      if (idx != -1) {
        final b64 = stdout.substring(idx + marker.length).trim();
        if (b64.isNotEmpty) return b64;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// 4. Multi-Fallback ADB Launch Engine
  /// Step 1: Sanitize package name
  /// Step 2: Wake screen & dismiss keyguard
  /// Step 3: Primary Method:
  ///         `adb shell monkey -p <clean_package_name> -c android.intent.category.LAUNCHER 1`
  /// Step 4: Secondary Fallback:
  ///         Query main activity via `adb shell cmd package resolve-activity --brief <clean_package_name>`
  ///         Execute `adb shell am start -n <package_name>/<main_activity>`
  /// Step 5: Capture ProcessResult (stdout, stderr) & print exact commands to Flutter debug console
  Future<AdbLaunchResult> launchApp({
    required String rawPackageName,
  }) async {
    // 1. Sanitize Package Name
    final cleanPkg = sanitizePackageName(rawPackageName);
    if (cleanPkg.isEmpty) {
      const err = 'Package name is empty or invalid after sanitization.';
      print('[Flutter ADB Launcher ERROR] $err (Raw: "$rawPackageName")');
      return const AdbLaunchResult(
        success: false,
        command: '',
        errorMessage: err,
      );
    }

    // Wake device & dismiss keyguard
    final wakeCmd = 'adb ${deviceSerial != null ? "-s $deviceSerial " : ""}shell "input keyevent 224 && wm dismiss-keyguard"';
    print('[Flutter ADB Launcher] Waking screen: $wakeCmd');
    await _runAdb(['shell', 'input keyevent 224 && wm dismiss-keyguard']);

    // PRIMARY METHOD: adb shell monkey -p <clean_package_name> -c android.intent.category.LAUNCHER 1
    final monkeyArgs = [
      'shell',
      'monkey',
      '-p',
      cleanPkg,
      '-c',
      'android.intent.category.LAUNCHER',
      '1',
    ];
    final monkeyCmd = 'adb ${deviceSerial != null ? "-s $deviceSerial " : ""}${monkeyArgs.join(" ")}';
    print('[Flutter ADB Launcher] Executing Primary Method: $monkeyCmd');

    final monkeyResult = await _runAdb(monkeyArgs);
    final monkeyStdout = monkeyResult.stdout.toString().trim();
    final monkeyStderr = monkeyResult.stderr.toString().trim();
    final monkeyCombined = '$monkeyStdout\n$monkeyStderr';

    print('[Flutter ADB Launcher] Primary Result: exitCode=${monkeyResult.exitCode}');
    if (monkeyStdout.isNotEmpty) print('[Flutter ADB Launcher] Primary Stdout:\n$monkeyStdout');
    if (monkeyStderr.isNotEmpty) print('[Flutter ADB Launcher] Primary Stderr:\n$monkeyStderr');

    // Check if monkey succeeded
    final isMonkeySuccess = monkeyResult.exitCode == 0 &&
        !monkeyCombined.contains('No activities found') &&
        !monkeyCombined.contains('monkey aborted') &&
        !monkeyCombined.contains('** Error:') &&
        !monkeyCombined.contains('** Can\'t find');

    if (isMonkeySuccess) {
      print('[Flutter ADB Launcher] ✓ Primary launch succeeded for $cleanPkg');
      return AdbLaunchResult(
        success: true,
        command: monkeyCmd,
        stdout: monkeyStdout,
        stderr: monkeyStderr,
        exitCode: monkeyResult.exitCode,
      );
    }

    // SECONDARY FALLBACK: Query main activity via resolve-activity
    print('[Flutter ADB Launcher] ⚠️ Primary method failed for $cleanPkg. Trying Secondary Fallback (resolve-activity)...');

    final resolveArgs = ['shell', 'cmd', 'package', 'resolve-activity', '--brief', cleanPkg];
    final resolveCmd = 'adb ${deviceSerial != null ? "-s $deviceSerial " : ""}${resolveArgs.join(" ")}';
    print('[Flutter ADB Launcher] Executing Resolve: $resolveCmd');

    final resolveResult = await _runAdb(resolveArgs);
    final resolveOut = resolveResult.stdout.toString().trim();
    print('[Flutter ADB Launcher] Resolve output:\n$resolveOut');

    String? resolvedComponent;
    for (final line in LineSplitter.split(resolveOut)) {
      final trimmed = line.trim();
      if (trimmed.contains('/') && !trimmed.startsWith('priority=')) {
        resolvedComponent = trimmed;
        break;
      }
    }

    if (resolvedComponent != null && resolvedComponent.isNotEmpty) {
      final amArgs = ['shell', 'am', 'start', '-n', resolvedComponent];
      final amCmd = 'adb ${deviceSerial != null ? "-s $deviceSerial " : ""}${amArgs.join(" ")}';
      print('[Flutter ADB Launcher] Executing Secondary Fallback: $amCmd');

      final amResult = await _runAdb(amArgs);
      final amStdout = amResult.stdout.toString().trim();
      final amStderr = amResult.stderr.toString().trim();
      final amCombined = '$amStdout\n$amStderr';

      print('[Flutter ADB Launcher] Fallback Result: exitCode=${amResult.exitCode}');
      if (amStdout.isNotEmpty) print('[Flutter ADB Launcher] Fallback Stdout:\n$amStdout');
      if (amStderr.isNotEmpty) print('[Flutter ADB Launcher] Fallback Stderr:\n$amStderr');

      final isAmSuccess = amResult.exitCode == 0 &&
          !amCombined.contains('Error:') &&
          !amCombined.contains('Exception') &&
          !amCombined.contains('Activity not started');

      if (isAmSuccess) {
        print('[Flutter ADB Launcher] ✓ Secondary fallback succeeded for $resolvedComponent');
        return AdbLaunchResult(
          success: true,
          command: amCmd,
          stdout: amStdout,
          stderr: amStderr,
          exitCode: amResult.exitCode,
        );
      } else {
        final err = amStderr.isNotEmpty ? amStderr : (amStdout.isNotEmpty ? amStdout : 'am start failed');
        return AdbLaunchResult(
          success: false,
          command: amCmd,
          stdout: amStdout,
          stderr: amStderr,
          exitCode: amResult.exitCode,
          errorMessage: err,
        );
      }
    }

    final finalError = monkeyStderr.isNotEmpty
        ? monkeyStderr
        : (monkeyStdout.isNotEmpty ? monkeyStdout : 'Could not launch $cleanPkg via monkey or resolve-activity');
    return AdbLaunchResult(
      success: false,
      command: monkeyCmd,
      stdout: monkeyStdout,
      stderr: monkeyStderr,
      exitCode: monkeyResult.exitCode,
      errorMessage: finalError,
    );
  }

  String _formatPackageLabel(String pkg) {
    final parts = pkg.split('.');
    final last = parts.isNotEmpty ? parts.last : pkg;
    return last
        .replaceAll(RegExp(r'[^a-zA-Z0-9]'), ' ')
        .split(' ')
        .where((s) => s.isNotEmpty)
        .map((s) => s[0].toUpperCase() + s.substring(1))
        .join(' ');
  }

  String _categorizePackage(String pkg) {
    final p = pkg.toLowerCase();
    if (p.contains('game') || p.contains('play') || p.contains('unity') || p.contains('supercell')) {
      return 'Games';
    }
    if (p.contains('video') || p.contains('music') || p.contains('media') || p.contains('vlc') || p.contains('tube')) {
      return 'Media';
    }
    if (p.contains('doc') || p.contains('note') || p.contains('office') || p.contains('pdf')) {
      return 'Productivity';
    }
    if (p.contains('chat') || p.contains('talk') || p.contains('social') || p.contains('whatsapp')) {
      return 'Social';
    }
    return 'Tools';
  }
}
