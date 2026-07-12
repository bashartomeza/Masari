import 'package:flutter/material.dart';

class AppTheme {
  const AppTheme._();

  static const deepGreen = Color(0xFF163F2D);
  static const warmSurface = Color(0xFFFFFAF0);
  static const warmBackground = Color(0xFFF3EFE6);
  static const amber = Color(0xFFD69028);

  static ThemeData get light {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: deepGreen,
      primary: deepGreen,
      secondary: amber,
      surface: warmSurface,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: warmBackground,
      textTheme: const TextTheme(
        headlineLarge: TextStyle(fontWeight: FontWeight.w800),
        headlineMedium: TextStyle(fontWeight: FontWeight.w800),
        titleLarge: TextStyle(fontWeight: FontWeight.w800),
        bodyLarge: TextStyle(height: 1.35),
      ),
      cardTheme: CardThemeData(
        color: warmSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: deepGreen,
          foregroundColor: warmSurface,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
    );
  }
}
