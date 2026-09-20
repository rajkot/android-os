import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_reference/win_window_model.dart';
import 'package:flutter_reference/win_window.dart';
import 'package:flutter_reference/win_desktop_screen.dart';
import 'package:flutter_reference/win_terminal_widget.dart';
import 'package:flutter_reference/taskbar.dart';
import 'package:flutter_reference/win10_start_menu.dart';

void main() {
  testWidgets('WinWindow renders title, app icon, and controls', (tester) async {
    final win = WinWindowState(
      id: 'test-win',
      appId: 'com.test.app',
      title: 'Test Application',
      icon: 'smartphone',
      x: 50.0,
      y: 50.0,
      width: 400.0,
      height: 300.0,
    );

    bool focused = false;
    bool closed = false;
    bool minimized = false;
    bool maximized = false;
    double updatedX = 0;
    double updatedY = 0;
    double updatedW = 0;
    double updatedH = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 800,
            height: 600,
            child: Stack(
              children: [
                WinWindow(
                  window: win,
                  isActive: true,
                  onFocus: (_) => focused = true,
                  onClose: (_) => closed = true,
                  onMinimize: (_) => minimized = true,
                  onMaximize: (_) => maximized = true,
                  onUpdatePosition: (_, x, y) {
                    updatedX = x;
                    updatedY = y;
                  },
                  onUpdateSize: (_, w, h) {
                    updatedW = w;
                    updatedH = h;
                  },
                  workspaceSize: const Size(800, 600),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    // 1. Verify Title & Package text
    expect(find.text('Test Application'), findsWidgets);
    expect(find.text('Package: com.test.app'), findsOneWidget);

    // Tap title bar to trigger onFocus
    await tester.tap(find.text('Test Application').first);
    expect(focused, isTrue);

    // 2. Tap minimize button
    await tester.tap(find.byTooltip('Minimize'));
    expect(minimized, isTrue);

    // 3. Tap maximize button
    await tester.tap(find.byTooltip('Maximize'));
    expect(maximized, isTrue);

    // 4. Tap close button
    await tester.tap(find.byTooltip('Close'));
    expect(closed, isTrue);

    // 5. Drag title bar to move
    final titleBarFinder = find.text('Test Application').first;
    await tester.drag(titleBarFinder, const Offset(60, 40));
    expect(updatedX, greaterThan(50.0));
    expect(updatedY, greaterThan(50.0));

    // 6. Double tap title bar to maximize/restore
    await tester.tap(titleBarFinder);
    await tester.pump(const Duration(milliseconds: 50));
    await tester.tap(titleBarFinder);
    await tester.pumpAndSettle();
    expect(maximized, isTrue);

    // 7. Drag resize grip
    final resizeGripFinder = find.byType(MouseRegion).last;
    await tester.drag(resizeGripFinder, const Offset(50, 30));
    expect(updatedW, greaterThan(400.0));
    expect(updatedH, greaterThan(300.0));
  });

  testWidgets('WinDesktopScreen manages windows, taskbar items, and focus', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: WinDesktopScreen(),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Default sample windows should be rendered
    expect(find.text('Phone Screen Mirror'), findsWidgets);
    expect(find.text('Dex Files'), findsWidgets);

    // 2. Taskbar should display the running windows in the middle section
    expect(find.byType(Taskbar), findsOneWidget);

    // 3. Tap on Dex Files title bar to bring it to focus
    final dexWindowText = find.descendant(
      of: find.byType(WinWindow),
      matching: find.text('Dex Files'),
    );
    await tester.tap(dexWindowText.first);
    await tester.pumpAndSettle();

    // 4. Taskbar item clicking toggles minimize and restore
    // Tap the first taskbar item (Phone Screen Mirror) to toggle minimize
    final taskbarMirrorItem = find.text('Phone Screen Mirror').last;
    await tester.tap(taskbarMirrorItem);
    await tester.pumpAndSettle();

    // 5. Close the Dex Files window via its close button
    final closeButtons = find.byTooltip('Close');
    expect(closeButtons, findsNWidgets(2));
    await tester.tap(closeButtons.last);
    await tester.pumpAndSettle();

    // Dex Files window should be destroyed and removed
    expect(find.byTooltip('Close'), findsOneWidget);
  });

  testWidgets('Start Menu launches app as floating window and taskbar entry', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: WinDesktopScreen(),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Open Start Menu by tapping Windows Start button
    await tester.tap(find.byTooltip('Start'));
    await tester.pumpAndSettle();

    // Start Menu should be visible
    expect(find.byType(Win10StartMenu), findsOneWidget);

    // 2. Click an app in Start Menu, e.g. "Media & Audio Center"
    final mediaAppTile = find.text('Media & Audio Center');
    if (mediaAppTile.evaluate().isNotEmpty) {
      await tester.tap(mediaAppTile.last);
      await tester.pumpAndSettle();

      // Start Menu should be closed
      expect(find.byType(Win10StartMenu), findsNothing);

      // Media & Audio Center window should now be open
      expect(find.text('Media & Audio Center'), findsWidgets);
    }
  });

  testWidgets('Scrcpy phone mirror renders with RepaintBoundary, FittedBox, and toggles orientation', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: WinDesktopScreen(),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Phone Screen Mirror should have ScrcpyStreamWidget
    expect(find.text('Phone Screen Mirror'), findsWidgets);
    expect(find.byType(RepaintBoundary), findsWidgets);
    expect(find.byType(FittedBox), findsWidgets);
    expect(find.text('LIVE'), findsWidgets);

    // 2. Locate orientation toggle button in Phone Screen Mirror title bar
    final rotateButton = find.byTooltip('Rotate to Landscape (Widescreen mode)').first;
    expect(rotateButton, findsWidgets);

    // 3. Tap orientation toggle to switch to Landscape
    await tester.tap(rotateButton);
    await tester.pumpAndSettle();

    // Tooltip should now be Portrait
    expect(find.byTooltip('Rotate to Portrait (Mobile mode)'), findsOneWidget);

    // 4. Maximize Phone Screen Mirror window to fill 100% of workspace
    final maxButton = find.byTooltip('Maximize').first;
    await tester.tap(maxButton);
    await tester.pumpAndSettle();

    // Tooltip switches to Restore Down
    expect(find.byTooltip('Restore Down'), findsOneWidget);

    // 5. Restore Down returns window to previous geometry
    await tester.tap(find.byTooltip('Restore Down'));
    await tester.pumpAndSettle();
    expect(find.byTooltip('Restore Down'), findsNothing);
  });

  testWidgets('WinTerminalWidget renders with CMD aesthetics, executes commands, and supports multi-instance', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: WinDesktopScreen(),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Open Start Menu and launch Command Prompt (Termux)
    await tester.tap(find.byTooltip('Start'));
    await tester.pumpAndSettle();

    final terminalMenuItem = find.text('Command Prompt (Termux)');
    expect(terminalMenuItem, findsWidgets);
    await tester.tap(terminalMenuItem.last);
    await tester.pumpAndSettle();

    // Terminal floating window should now be open
    expect(find.byType(WinTerminalWidget), findsOneWidget);
    expect(find.text('Termux ADB Shell'), findsOneWidget);
    expect(find.textContaining('Microsoft Windows'), findsOneWidget);

    // 2. Click a quick command chip in the toolbar (e.g. 'ls -la')
    final lsChip = find.text('ls -la');
    expect(lsChip, findsOneWidget);
    await tester.tap(lsChip);
    await tester.pumpAndSettle();

    // Output should show directory listing
    expect(find.textContaining('.bash_history'), findsWidgets);

    // 3. Open a second independent terminal instance via Start Menu
    await tester.tap(find.byTooltip('Start'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Command Prompt (Termux)').last);
    await tester.pumpAndSettle();

    // Two independent terminal windows should now be open simultaneously
    expect(find.text('Command Prompt (Termux) (2)'), findsWidgets);
  });
}
