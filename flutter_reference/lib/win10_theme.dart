import 'package:flutter/material.dart';

/// Windows 10 Dark Theme Design Tokens
class Win10Theme {
  // Dimensions
  static const double taskbarHeight = 48.0;
  static const double startButtonWidth = 48.0;
  static const double showDesktopWidth = 6.0;
  static const double windowTitleBarHeight = 32.0;
  static const double windowMinButtonWidth = 46.0;
  static const double taskbarItemWidth = 48.0;
  static const double taskbarIndicatorHeight = 2.5;

  // Colors
  static const Color background = Color(0xFF0C0C0C);
  static const Color taskbarBackground = Color(0xD9101010); // ~85% opacity
  static const Color taskbarHover = Color(0x1AFFFFFF); // white 10%
  static const Color taskbarActive = Color(0x26FFFFFF); // white 15%
  static const Color taskbarBorder = Color(0x1FFFFFFF); // white 12%

  // Window Colors
  static const Color windowBackground = Color(0xF21C1C1C); // 95% opacity acrylic
  static const Color windowTitleBarActive = Color(0xFF202020);
  static const Color windowTitleBarInactive = Color(0xFF181818);
  static const Color windowBorderActive = Color(0xFF0078D7); // Windows blue accent
  static const Color windowBorderInactive = Color(0x26FFFFFF); // Subtle white/grey
  static const Color windowCloseHover = Color(0xFFE81123); // Windows red close
  static const Color windowControlHover = Color(0x1AFFFFFF);

  // Windows 10 Accent (Classic Windows Blue)
  static const Color accentBlue = Color(0xFF0078D7);
  static const Color accentHover = Color(0xFF1C86EE);

  // Typography
  static const TextStyle clockTimeStyle = TextStyle(
    color: Colors.white,
    fontSize: 11.5,
    fontWeight: FontWeight.w400,
    letterSpacing: -0.2,
  );

  static const TextStyle clockDateStyle = TextStyle(
    color: Color(0xFFA3A3A3),
    fontSize: 10.0,
    fontWeight: FontWeight.w300,
  );

  static const TextStyle searchPlaceholderStyle = TextStyle(
    color: Color(0xFF9E9E9E),
    fontSize: 12.0,
  );

  static const TextStyle windowTitleStyle = TextStyle(
    color: Colors.white,
    fontSize: 12.0,
    fontWeight: FontWeight.w400,
    letterSpacing: -0.1,
  );

  static const TextStyle windowTitleInactiveStyle = TextStyle(
    color: Color(0xFF9E9E9E),
    fontSize: 12.0,
    fontWeight: FontWeight.w400,
    letterSpacing: -0.1,
  );
}
