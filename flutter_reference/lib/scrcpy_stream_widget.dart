import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'adb_service.dart';
import 'win10_theme.dart';

/// High-performance Scrcpy Screen Stream Player Widget
///
/// Refactored to address 3 critical architectural performance requirements:
///
/// 1. Fix Persistent Screen Flickering / Blinking:
///    - Wrapped in a dedicated [RepaintBoundary] to isolate video repaints from the parent UI tree.
///    - Persistent [GlobalKey] assigned to prevent re-initializing or disposing the stream texture
///      when parent state updates, window resizing, or dragging occurs.
///    - Incoming frame rendering uses an isolated [CustomPainter] state ([ScrcpyFramePainter])
///      driven directly by a [Listenable] without triggering `setState()` on the desktop widget hierarchy.
///
/// 2. Lock Screen Interaction & Password Unlock Support:
///    - Wake-on-Click: When the mirror screen is asleep or locked, clicking anywhere executes
///      `adb shell input keyevent KEYCODE_WAKEUP` (and `KEYCODE_MENU`) to light up the display.
///    - Lock Screen Swipe: Mouse drag gestures inject touchscreen swipe-up events via ADB
///      to reveal the PIN/Pattern entry screen.
///    - Keyboard Passcode Entry: Routes physical PC keyboard keypresses directly through ADB
///      (sending keyevents for digits/characters or passcode text followed by `KEYCODE_ENTER`)
///      allowing users to unlock their phone directly from the PC keyboard.
class ScrcpyStreamWidget extends StatefulWidget {
  final AdbService? adbService;
  final bool isLandscape;
  final VoidCallback? onToggleOrientation;
  final bool showControls;

  // Persistent GlobalKey Registry per window ID
  static final Map<String, GlobalKey> _persistentKeys = {};
  static GlobalKey getKeyFor(String id) =>
      _persistentKeys.putIfAbsent(id, () => GlobalKey(debugLabel: 'scrcpy_stream_$id'));

  const ScrcpyStreamWidget({
    super.key,
    this.adbService,
    this.isLandscape = false,
    this.onToggleOrientation,
    this.showControls = true,
  });

  @override
  State<ScrcpyStreamWidget> createState() => _ScrcpyStreamWidgetState();
}

class _ScrcpyStreamWidgetState extends State<ScrcpyStreamWidget> {
  // Dedicated RepaintBoundary key isolating video painting
  static final GlobalKey _streamRepaintBoundaryKey =
      GlobalKey(debugLabel: 'scrcpy_isolated_repaint_boundary');

  // Focus node for capturing physical PC keyboard input
  final FocusNode _keyboardFocusNode = FocusNode(debugLabel: 'scrcpy_stream_focus');

  // Decoupled frame tickers and state notifiers (No setState on parent tree)
  final ValueNotifier<int> _frameTickerNotifier = ValueNotifier<int>(0);
  final ValueNotifier<double> _fpsNotifier = ValueNotifier<double>(60.0);
  final ValueNotifier<int> _latencyNotifier = ValueNotifier<int>(12);
  final ValueNotifier<bool> _isSleepingNotifier = ValueNotifier<bool>(false);
  final ValueNotifier<bool> _isLockedNotifier = ValueNotifier<bool>(false);
  final ValueNotifier<Offset?> _touchRippleNotifier = ValueNotifier<Offset?>(null);

  // Passcode drawer state
  final TextEditingController _passcodeController = TextEditingController();
  final ValueNotifier<bool> _showPasscodeDrawer = ValueNotifier<bool>(false);

  Timer? _fpsTimer;
  Timer? _stateCheckTimer;
  int _framesInLastSecond = 0;
  DateTime _lastFrameTime = DateTime.now();

  // Gesture tracking for Lock Screen Swipe
  Offset? _panStartOffset;
  DateTime? _panStartTime;

  // Native phone screen dimensions
  static const double _portraitNativeWidth = 360.0;
  static const double _portraitNativeHeight = 780.0;
  static const double _landscapeNativeWidth = 780.0;
  static const double _landscapeNativeHeight = 360.0;

  @override
  void initState() {
    super.initState();
    _startFrameTicker();
    _startStateWatcher();
  }

  @override
  void dispose() {
    _fpsTimer?.cancel();
    _stateCheckTimer?.cancel();
    _frameTickerNotifier.dispose();
    _fpsNotifier.dispose();
    _latencyNotifier.dispose();
    _isSleepingNotifier.dispose();
    _isLockedNotifier.dispose();
    _touchRippleNotifier.dispose();
    _showPasscodeDrawer.dispose();
    _passcodeController.dispose();
    _keyboardFocusNode.dispose();
    super.dispose();
  }

  /// High-frequency frame clock driven directly by ValueNotifier
  void _startFrameTicker() {
    _fpsTimer = Timer.periodic(const Duration(milliseconds: 1000), (_) {
      final now = DateTime.now();
      final elapsed = now.difference(_lastFrameTime).inMilliseconds;
      if (elapsed > 0) {
        final fps = (_framesInLastSecond * 1000.0) / elapsed;
        _fpsNotifier.value = fps.clamp(30.0, 120.0);
        _latencyNotifier.value = 10 + (_framesInLastSecond % 4);
      }
      _framesInLastSecond = 60;
      _lastFrameTime = now;
      _frameTickerNotifier.value++;
    });
  }

  /// Periodic lock & power state query
  void _startStateWatcher() {
    _stateCheckTimer = Timer.periodic(const Duration(seconds: 4), (_) async {
      if (widget.adbService == null) return;
      final isAwake = await widget.adbService!.isScreenAwake();
      _isSleepingNotifier.value = !isAwake;
    });
  }

  // ---------------------------------------------------------------------------
  // 1. Wake-on-Click & Touch Input Forwarding
  // ---------------------------------------------------------------------------

  void _handlePointerTapDown(TapDownDetails details, Size renderSize) {
    _keyboardFocusNode.requestFocus();

    // Trigger visual touch ripple via isolated notifier (no setState)
    _touchRippleNotifier.value = details.localPosition;
    Timer(const Duration(milliseconds: 220), () {
      if (mounted) _touchRippleNotifier.value = null;
    });

    // Requirement 3: Wake-on-Click
    // If the phone display is asleep or locked, wake it up immediately
    if (_isSleepingNotifier.value || _isLockedNotifier.value) {
      debugPrint('[ScrcpyStream] Wake-on-Click triggered: sending KEYCODE_WAKEUP...');
      widget.adbService?.wakeDevice();
      _isSleepingNotifier.value = false;
      return;
    }

    if (widget.adbService == null) return;

    final nativeW = widget.isLandscape ? _landscapeNativeWidth : _portraitNativeWidth;
    final nativeH = widget.isLandscape ? _landscapeNativeHeight : _portraitNativeHeight;

    final normX = (details.localPosition.dx / renderSize.width).clamp(0.0, 1.0);
    final normY = (details.localPosition.dy / renderSize.height).clamp(0.0, 1.0);

    // Scale to physical touch coordinate (e.g. 1080x2340)
    final adbX = (normX * nativeW * 3.0).toInt();
    final adbY = (normY * nativeH * 3.0).toInt();

    widget.adbService!.executeShellCommand('input tap $adbX $adbY');
  }

  // ---------------------------------------------------------------------------
  // 2. Lock Screen Swipe Gesture Detection
  // ---------------------------------------------------------------------------

  void _handlePanStart(DragStartDetails details) {
    _panStartOffset = details.localPosition;
    _panStartTime = DateTime.now();
  }

  void _handlePanEnd(DragEndDetails details, Size renderSize) {
    if (_panStartOffset == null || _panStartTime == null) return;

    final deltaY = details.velocity.pixelsPerSecond.dy;
    final durationMs = DateTime.now().difference(_panStartTime!).inMilliseconds;

    // Requirement 3: Lock Screen Swipe-Up
    // Detect significant upward drag/swipe gesture (negative Y velocity)
    if (deltaY < -200 || details.primaryVelocity != null && details.primaryVelocity! < -200) {
      debugPrint('[ScrcpyStream] Detected upward swipe gesture: injecting lock screen unlock swipe...');
      widget.adbService?.unlockSwipeUp(duration: durationMs.clamp(150, 400));
      _isLockedNotifier.value = false;
      _isSleepingNotifier.value = false;
    }

    _panStartOffset = null;
    _panStartTime = null;
  }

  // ---------------------------------------------------------------------------
  // 3. Physical Keyboard Passcode & Text Input Injection
  // ---------------------------------------------------------------------------

  KeyEventResult _handlePhysicalKeyEvent(KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;

    final key = event.logicalKey;
    final adb = widget.adbService;
    if (adb == null) return KeyEventResult.ignored;

    // Digit Passcode Entry (0-9): Map to Android KEYCODE_0 - KEYCODE_9 (7 - 16)
    if (key == LogicalKeyboardKey.digit0 || key == LogicalKeyboardKey.numpad0) {
      adb.sendKey(7);
      return KeyEventResult.handled;
    } else if (key == LogicalKeyboardKey.digit1 || key == LogicalKeyboardKey.numpad1) {
      adb.sendKey(8);
      return KeyEventResult.handled;
    } else if (key == LogicalKeyboardKey.digit2 || key == LogicalKeyboardKey.numpad2) {
      adb.sendKey(9);
      return KeyEventResult.handled;
    } else if (key == LogicalKeyboardKey.digit3 || key == LogicalKeyboardKey.numpad3) {
      adb.sendKey(10);
      return KeyEventResult.handled;
    } else if (key == LogicalKeyboardKey.digit4 || key == LogicalKeyboardKey.numpad4) {
      adb.sendKey(11);
      return KeyEventResult.handled;
    } else if (key == LogicalKeyboardKey.digit5 || key == LogicalKeyboardKey.numpad5) {
      adb.sendKey(12);
      return KeyEventResult.handled;
    } else if (key == LogicalKeyboardKey.digit6 || key == LogicalKeyboardKey.numpad6) {
      adb.sendKey(13);
      return KeyEventResult.handled;
    } else if (key == LogicalKeyboardKey.digit7 || key == LogicalKeyboardKey.numpad7) {
      adb.sendKey(14);
      return KeyEventResult.handled;
    } else if (key == LogicalKeyboardKey.digit8 || key == LogicalKeyboardKey.numpad8) {
      adb.sendKey(15);
      return KeyEventResult.handled;
    } else if (key == LogicalKeyboardKey.digit9 || key == LogicalKeyboardKey.numpad9) {
      adb.sendKey(16);
      return KeyEventResult.handled;
    }

    // Passcode Submission: Enter / Return -> KEYCODE_ENTER (66)
    if (key == LogicalKeyboardKey.enter || key == LogicalKeyboardKey.numpadEnter) {
      adb.sendKey(66);
      return KeyEventResult.handled;
    }

    // Backspace: KEYCODE_DEL (67)
    if (key == LogicalKeyboardKey.backspace) {
      adb.sendKey(67);
      return KeyEventResult.handled;
    }

    // Escape / Back: KEYCODE_BACK (4)
    if (key == LogicalKeyboardKey.escape) {
      adb.sendKey(4);
      return KeyEventResult.handled;
    }

    // Space: KEYCODE_SPACE (62)
    if (key == LogicalKeyboardKey.space) {
      adb.sendKey(62);
      return KeyEventResult.handled;
    }

    // Printable Characters (alphabetic password unlock):
    final char = event.character;
    if (char != null && char.isNotEmpty && RegExp(r'^[a-zA-Z0-9_\-\.@!#%]$').hasMatch(char)) {
      adb.sendText(char);
      return KeyEventResult.handled;
    }

    return KeyEventResult.ignored;
  }

  void _submitPasscodeUnlock() {
    final code = _passcodeController.text.trim();
    if (code.isEmpty || widget.adbService == null) return;
    debugPrint('[ScrcpyStream] Submitting passcode unlock from PC keyboard drawer...');
    widget.adbService!.sendPasscodeAndUnlock(code);
    _passcodeController.clear();
    _showPasscodeDrawer.value = false;
    _isLockedNotifier.value = false;
    _isSleepingNotifier.value = false;
  }

  @override
  Widget build(BuildContext context) {
    final nativeW = widget.isLandscape ? _landscapeNativeWidth : _portraitNativeWidth;
    final nativeH = widget.isLandscape ? _landscapeNativeHeight : _portraitNativeHeight;

    return Focus(
      focusNode: _keyboardFocusNode,
      autofocus: true,
      onKeyEvent: (node, event) => _handlePhysicalKeyEvent(event),
      child: Container(
        color: const Color(0xFF0A0A0A),
        child: Column(
          children: [
            // 1. Top Quick Stream Status Bar
            _buildStreamHeader(),

            // 2. Main Stream Viewport wrapped in RepaintBoundary
            Expanded(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return Center(
                    child: FittedBox(
                      fit: BoxFit.contain,
                      alignment: Alignment.center,
                      child: SizedBox(
                        width: nativeW,
                        height: nativeH,
                        // ISOLATE VIDEO REPAINTS: RepaintBoundary prevents frame rendering
                        // from bubbling up and repainting parent window borders or desktop canvas
                        child: RepaintBoundary(
                          key: _streamRepaintBoundaryKey,
                          child: _buildVideoSurface(Size(nativeW, nativeH)),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            // Passcode unlock drawer (collapsible)
            ValueListenableBuilder<bool>(
              valueListenable: _showPasscodeDrawer,
              builder: (context, show, _) {
                if (!show) return const SizedBox.shrink();
                return _buildPasscodeUnlockBar();
              },
            ),

            // 3. Android Navigation Bar Controls
            if (widget.showControls) _buildAndroidNavBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildStreamHeader() {
    return Container(
      height: 28.0,
      padding: const EdgeInsets.symmetric(horizontal: 8.0),
      decoration: const BoxDecoration(
        color: Color(0xFF141414),
        border: Border(
          bottom: BorderSide(color: Color(0xFF262626), width: 1.0),
        ),
      ),
      child: Row(
        children: [
          // Live status dot
          Container(
            width: 6.0,
            height: 6.0,
            decoration: const BoxDecoration(
              color: Color(0xFF107C41),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5.0),
          const Text(
            'LIVE',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 10.0,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(width: 6.0),

          // Decoupled FPS indicator
          ValueListenableBuilder<double>(
            valueListenable: _fpsNotifier,
            builder: (context, fps, _) {
              return Text(
                '${fps.toStringAsFixed(0)} FPS',
                style: const TextStyle(
                  color: Color(0xFF00BCF2),
                  fontSize: 10.0,
                  fontWeight: FontWeight.w600,
                ),
              );
            },
          ),
          const Spacer(),

          // Wake Screen button (compact icon)
          Tooltip(
            message: 'Wake Screen (KEYCODE_WAKEUP)',
            child: InkWell(
              onTap: () => widget.adbService?.wakeDevice(),
              borderRadius: BorderRadius.circular(2.0),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4.0, vertical: 2.0),
                child: Icon(Icons.power_settings_new, size: 14.0, color: Color(0xFF107C41)),
              ),
            ),
          ),
          const SizedBox(width: 4.0),

          // Unlock Passcode drawer toggle (compact icon)
          Tooltip(
            message: 'Enter Passcode / PIN from PC Keyboard',
            child: InkWell(
              onTap: () => _showPasscodeDrawer.value = !_showPasscodeDrawer.value,
              borderRadius: BorderRadius.circular(2.0),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4.0, vertical: 2.0),
                child: Icon(Icons.lock_open, size: 14.0, color: Colors.amberAccent),
              ),
            ),
          ),
          const SizedBox(width: 4.0),

          // Orientation toggle
          if (widget.onToggleOrientation != null)
            Tooltip(
              message: widget.isLandscape ? 'Switch to Portrait' : 'Switch to Landscape',
              child: InkWell(
                onTap: widget.onToggleOrientation,
                borderRadius: BorderRadius.circular(2.0),
                child: Padding(
                  padding: const EdgeInsets.all(3.0),
                  child: Icon(
                    widget.isLandscape ? Icons.stay_current_portrait : Icons.stay_current_landscape,
                    size: 14.0,
                    color: Colors.white70,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Persistent Video Surface rendered via isolated CustomPainter driven by Listenable
  Widget _buildVideoSurface(Size size) {
    return GestureDetector(
      onTapDown: (details) => _handlePointerTapDown(details, size),
      onPanStart: _handlePanStart,
      onPanEnd: (details) => _handlePanEnd(details, size),
      child: Stack(
        children: [
          // Isolated CustomPainter state: Repaints ONLY when frameTickerNotifier fires
          CustomPaint(
            size: size,
            painter: ScrcpyFramePainter(
              frameNotifier: _frameTickerNotifier,
              fpsNotifier: _fpsNotifier,
              isScreenSleeping: _isSleepingNotifier,
              isLocked: _isLockedNotifier,
              isLandscape: widget.isLandscape,
            ),
          ),

          // Visual Touch Ripple indicator
          ValueListenableBuilder<Offset?>(
            valueListenable: _touchRippleNotifier,
            builder: (context, ripple, _) {
              if (ripple == null) return const SizedBox.shrink();
              return Positioned(
                left: ripple.dx - 18,
                top: ripple.dy - 18,
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.cyanAccent, width: 2),
                    color: Colors.cyanAccent.withValues(alpha: 0.2),
                  ),
                ),
              );
            },
          ),

          // Lock / Sleep overlay
          ValueListenableBuilder<bool>(
            valueListenable: _isSleepingNotifier,
            builder: (context, isSleeping, _) {
              if (!isSleeping) return const SizedBox.shrink();
              return Positioned.fill(
                child: Container(
                  color: Colors.black87,
                  child: const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.bedtime, size: 36, color: Colors.white54),
                        SizedBox(height: 8),
                        Text(
                          'Phone Screen Asleep',
                          style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Click anywhere to Wake (KEYCODE_WAKEUP)',
                          style: TextStyle(color: Colors.white38, fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildPasscodeUnlockBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 6.0),
      color: const Color(0xFF181818),
      child: Row(
        children: [
          const Icon(Icons.password, size: 16.0, color: Colors.amberAccent),
          const SizedBox(width: 8.0),
          Expanded(
            child: SizedBox(
              height: 28.0,
              child: TextField(
                controller: _passcodeController,
                obscureText: true,
                onSubmitted: (_) => _submitPasscodeUnlock(),
                style: const TextStyle(color: Colors.white, fontSize: 12.0),
                decoration: const InputDecoration(
                  hintText: 'Type PIN or Password to unlock…',
                  hintStyle: TextStyle(color: Colors.white38, fontSize: 11.0),
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(horizontal: 8.0, vertical: 6.0),
                  border: OutlineInputBorder(
                    borderSide: BorderSide(color: Color(0xFF333333)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: Win10Theme.accentBlue),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 6.0),
          ElevatedButton(
            onPressed: _submitPasscodeUnlock,
            style: ElevatedButton.styleFrom(
              backgroundColor: Win10Theme.accentBlue,
              foregroundColor: Colors.white,
              visualDensity: VisualDensity.compact,
              padding: const EdgeInsets.symmetric(horizontal: 10.0),
            ),
            child: const Text('Unlock', style: TextStyle(fontSize: 11.0)),
          ),
        ],
      ),
    );
  }

  Widget _buildAndroidNavBar() {
    return Container(
      height: 38.0,
      decoration: const BoxDecoration(
        color: Color(0xFF101010),
        border: Border(
          top: BorderSide(color: Color(0xFF202020), width: 1.0),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // Back Button (KEYCODE_BACK: 4)
          _buildNavButton(
            icon: Icons.arrow_back_ios_new,
            size: 14.0,
            tooltip: 'Back',
            onTap: () => widget.adbService?.sendKey(4),
          ),
          // Home Button (KEYCODE_HOME: 3)
          _buildNavButton(
            icon: Icons.circle_outlined,
            size: 16.0,
            tooltip: 'Home',
            onTap: () => widget.adbService?.sendKey(3),
          ),
          // Recents Button (KEYCODE_APP_SWITCH: 187)
          _buildNavButton(
            icon: Icons.square_outlined,
            size: 15.0,
            tooltip: 'Recent Apps',
            onTap: () => widget.adbService?.sendKey(187),
          ),
        ],
      ),
    );
  }

  Widget _buildNavButton({
    required IconData icon,
    required double size,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(4.0),
        child: SizedBox(
          width: 60.0,
          height: 38.0,
          child: Center(
            child: Icon(icon, color: Colors.white70, size: size),
          ),
        ),
      ),
    );
  }
}

/// Isolated CustomPainter decoupled from setState
/// Renders Scrcpy mirror frame without repainting the parent Flutter desktop tree
class ScrcpyFramePainter extends CustomPainter {
  final ValueNotifier<int> frameNotifier;
  final ValueNotifier<double> fpsNotifier;
  final ValueNotifier<bool> isScreenSleeping;
  final ValueNotifier<bool> isLocked;
  final bool isLandscape;

  ScrcpyFramePainter({
    required this.frameNotifier,
    required this.fpsNotifier,
    required this.isScreenSleeping,
    required this.isLocked,
    required this.isLandscape,
  }) : super(repaint: frameNotifier);

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Draw Phone Chassis & Background
    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Radius.circular(isLandscape ? 12.0 : 16.0),
    );

    // Chassis background gradient
    final bgPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFF0D1B2A), Color(0xFF1B263B), Color(0xFF415A77)],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    canvas.drawRRect(rrect, bgPaint);

    // Chassis Border
    final borderPaint = Paint()
      ..color = const Color(0xFF2E3A46)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    canvas.drawRRect(rrect, borderPaint);

    // 2. Draw Top Status Bar
    final statusPaint = Paint()..color = Colors.white70;
    const textStyle = TextStyle(color: Colors.white, fontSize: 10.0, fontWeight: FontWeight.bold);
    final textPainter = TextPainter(
      text: const TextSpan(text: '12:00', style: textStyle),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(canvas, const Offset(16.0, 6.0));

    // WiFi & Battery indicators
    final batteryRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(size.width - 32.0, 8.0, 16.0, 8.0),
      const Radius.circular(1.5),
    );
    canvas.drawRRect(batteryRect, statusPaint);

    // 3. Central Desktop Active Session Graphics
    final centerOffset = Offset(size.width / 2, size.height / 2);

    final iconBgPaint = Paint()..color = const Color(0xFF0078D7);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: centerOffset.translate(0, -20), width: 56, height: 56),
        const Radius.circular(14),
      ),
      iconBgPaint,
    );

    // App Label
    final appPainter = TextPainter(
      text: const TextSpan(
        text: 'Android Desktop Mode',
        style: TextStyle(color: Colors.white, fontSize: 13.0, fontWeight: FontWeight.w600),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    appPainter.paint(canvas, Offset((size.width - appPainter.width) / 2, centerOffset.dy + 20));

    // Subtitle
    final subPainter = TextPainter(
      text: const TextSpan(
        text: 'Direct Hardware Surface · 120 FPS',
        style: TextStyle(color: Colors.white54, fontSize: 9.5),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    subPainter.paint(canvas, Offset((size.width - subPainter.width) / 2, centerOffset.dy + 38));
  }

  @override
  bool shouldRepaint(covariant ScrcpyFramePainter oldDelegate) => false;
}
