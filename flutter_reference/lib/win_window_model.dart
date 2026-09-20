import 'package:flutter/material.dart';

/// State and geometry representation of a Windows 10 style floating window
class WinWindowState {
  final String id;
  final String appId;
  String title;
  String icon;
  String? iconUrl;
  String? iconBase64;
  double x;
  double y;
  double width;
  double height;
  double minWidth;
  double minHeight;
  bool isMinimized;
  bool isMaximized;
  bool isLandscape;
  bool isScreenMirror;
  int zIndex;

  // Stored dimensions for restore after un-maximizing
  double restoreX;
  double restoreY;
  double restoreWidth;
  double restoreHeight;

  // Optional custom content widget
  final Widget? content;

  WinWindowState({
    required this.id,
    required this.appId,
    required this.title,
    this.icon = 'window',
    this.iconUrl,
    this.iconBase64,
    this.x = 100.0,
    this.y = 60.0,
    this.width = 640.0,
    this.height = 480.0,
    this.minWidth = 320.0,
    this.minHeight = 220.0,
    this.isMinimized = false,
    this.isMaximized = false,
    this.isLandscape = false,
    this.isScreenMirror = false,
    this.zIndex = 1,
    double? restoreX,
    double? restoreY,
    double? restoreWidth,
    double? restoreHeight,
    this.content,
  })  : restoreX = restoreX ?? x,
        restoreY = restoreY ?? y,
        restoreWidth = restoreWidth ?? width,
        restoreHeight = restoreHeight ?? height;

  WinWindowState copyWith({
    String? id,
    String? appId,
    String? title,
    String? icon,
    String? iconUrl,
    String? iconBase64,
    double? x,
    double? y,
    double? width,
    double? height,
    double? minWidth,
    double? minHeight,
    bool? isMinimized,
    bool? isMaximized,
    bool? isLandscape,
    bool? isScreenMirror,
    int? zIndex,
    Widget? content,
  }) {
    return WinWindowState(
      id: id ?? this.id,
      appId: appId ?? this.appId,
      title: title ?? this.title,
      icon: icon ?? this.icon,
      iconUrl: iconUrl ?? this.iconUrl,
      iconBase64: iconBase64 ?? this.iconBase64,
      x: x ?? this.x,
      y: y ?? this.y,
      width: width ?? this.width,
      height: height ?? this.height,
      minWidth: minWidth ?? this.minWidth,
      minHeight: minHeight ?? this.minHeight,
      isMinimized: isMinimized ?? this.isMinimized,
      isMaximized: isMaximized ?? this.isMaximized,
      isLandscape: isLandscape ?? this.isLandscape,
      isScreenMirror: isScreenMirror ?? this.isScreenMirror,
      zIndex: zIndex ?? this.zIndex,
      restoreX: restoreX,
      restoreY: restoreY,
      restoreWidth: restoreWidth,
      restoreHeight: restoreHeight,
      content: content ?? this.content,
    );
  }
}
