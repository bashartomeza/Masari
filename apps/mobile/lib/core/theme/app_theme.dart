import 'package:flutter/material.dart';

import 'app_tokens.dart';
import 'semantic_colors.dart';

/// Masari's Material 3 theme.
///
/// Masari's Material 3 theme.
///
/// The supplied task UI reference was used as the visual source for the
/// passenger request/matching/trip flows, driver request/trip flows, and
/// merchant shipment/batching/tracking flows. Its five anchor colours are
/// retained exactly while the existing bundled Arabic font is preserved for
/// offline rendering. Shared Material components stay in one theme so the
/// task screens do not need a second parallel styling system.
class AppTheme {
  const AppTheme._();

  /// Font family bundled in `assets/fonts/` and declared in `pubspec.yaml`.
  static const fontFamily = 'IBMPlexSansArabic';

  // ---------------------------------------------------------------------------
  // Masari reference palette — aligned with the supplied task UI reference.
  // The five anchor colours are the exact swatches from the reference:
  // #2F4A3A, #7A8F5A, #E6D2B3, #C66A3D, #8A3F2A.
  // ---------------------------------------------------------------------------

  /// Deep green — primary navigation and main actions.
  static const primary = Color(0xFF2F4A3A);
  static const onPrimary = Color(0xFFFFFFFF);
  static const primaryContainer = Color(0xFFE6D2B3);
  static const onPrimaryContainer = Color(0xFF2F4A3A);

  /// Olive — secondary controls and active/supporting states.
  static const secondary = Color(0xFF7A8F5A);
  static const onSecondary = Color(0xFFFFFFFF);
  static const secondaryContainer = Color(0xFFEAF0DD);
  static const onSecondaryContainer = Color(0xFF40512D);

  /// Terracotta — highlights, progress and delivery emphasis.
  static const tertiary = Color(0xFFC66A3D);
  static const onTertiary = Color(0xFFFFFFFF);
  static const tertiaryContainer = Color(0xFFF2DED1);
  static const onTertiaryContainer = Color(0xFF6D3420);

  static const background = Color(0xFFF9F5EE);
  static const surface = Color(0xFFFFFCF8);
  static const surfaceDim = Color(0xFFD9D0C2);
  static const surfaceContainerLowest = Color(0xFFFFFFFF);
  static const surfaceContainerLow = Color(0xFFF5EFE6);
  static const surfaceContainer = Color(0xFFEFE6DA);
  static const surfaceContainerHigh = Color(0xFFE6D2B3);
  static const surfaceContainerHighest = Color(0xFFD8C2A1);

  static const onSurface = Color(0xFF243129);
  static const onSurfaceVariant = Color(0xFF5B625D);
  static const inverseSurface = Color(0xFF243129);
  static const inverseOnSurface = Color(0xFFFFFCF8);
  static const inversePrimary = Color(0xFFB8C7A9);

  static const outline = Color(0xFF9C968C);
  static const outlineVariant = Color(0xFFD7CEC1);

  /// Dark terracotta used for destructive/failure emphasis.
  static const darkTerracotta = Color(0xFF8A3F2A);

  /// Legacy alias retained for existing call sites.
  static const deepGreen = primary;

  static const colorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: primary,
    onPrimary: onPrimary,
    primaryContainer: primaryContainer,
    onPrimaryContainer: onPrimaryContainer,
    secondary: secondary,
    onSecondary: onSecondary,
    secondaryContainer: secondaryContainer,
    onSecondaryContainer: onSecondaryContainer,
    tertiary: tertiary,
    onTertiary: onTertiary,
    tertiaryContainer: tertiaryContainer,
    onTertiaryContainer: onTertiaryContainer,
    error: SemanticColors.error,
    onError: SemanticColors.onError,
    errorContainer: SemanticColors.errorContainer,
    onErrorContainer: SemanticColors.onErrorContainer,
    surface: surface,
    onSurface: onSurface,
    surfaceDim: surfaceDim,
    surfaceBright: Color(0xFFFFFFFF),
    surfaceContainerLowest: surfaceContainerLowest,
    surfaceContainerLow: surfaceContainerLow,
    surfaceContainer: surfaceContainer,
    surfaceContainerHigh: surfaceContainerHigh,
    surfaceContainerHighest: surfaceContainerHighest,
    onSurfaceVariant: onSurfaceVariant,
    inverseSurface: inverseSurface,
    onInverseSurface: inverseOnSurface,
    inversePrimary: inversePrimary,
    outline: outline,
    outlineVariant: outlineVariant,
  );

  // ---------------------------------------------------------------------------
  // Type scale — adapted from the supplied reference's mobile hierarchy.
  // Arabic text keeps the existing bundled IBM Plex Sans Arabic family so the
  // app still renders without downloading fonts at runtime.
  // ---------------------------------------------------------------------------

  static const textTheme = TextTheme(
    displayLarge: TextStyle(
      fontSize: 32,
      fontWeight: FontWeight.w700,
      height: 40 / 32,
    ),
    displayMedium: TextStyle(
      fontSize: 28,
      fontWeight: FontWeight.w700,
      height: 36 / 28,
    ),
    displaySmall: TextStyle(
      fontSize: 24,
      fontWeight: FontWeight.w700,
      height: 32 / 24,
    ),
    headlineLarge: TextStyle(
      fontSize: 22,
      fontWeight: FontWeight.w600,
      height: 30 / 22,
    ),
    headlineMedium: TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w600,
      height: 28 / 20,
    ),
    headlineSmall: TextStyle(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      height: 28 / 18,
    ),
    titleLarge: TextStyle(
      fontSize: 17,
      fontWeight: FontWeight.w600,
      height: 26 / 17,
    ),
    titleMedium: TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w600,
      height: 24 / 15,
    ),
    titleSmall: TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      height: 22 / 14,
    ),
    bodyLarge: TextStyle(
      fontSize: 18,
      fontWeight: FontWeight.w400,
      height: 26 / 18,
    ),
    bodyMedium: TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      height: 24 / 16,
    ),
    bodySmall: TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w400,
      height: 18 / 12,
    ),
    labelLarge: TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      height: 20 / 14,
    ),
    labelMedium: TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w500,
      height: 20 / 13,
    ),
    labelSmall: TextStyle(
      fontSize: 11,
      fontWeight: FontWeight.w500,
      height: 16 / 11,
    ),
  );

  static ThemeData get light {
    final buttonShape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppTokens.radiusDefault),
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: fontFamily,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      textTheme: textTheme.apply(bodyColor: onSurface, displayColor: onSurface),

      // Level 1: a 1px stroke rather than a heavy shadow, so cards stay flat
      // and legible in bright outdoor light. §G.2 card — `md` radius.
      cardTheme: CardThemeData(
        color: surfaceContainerLowest,
        elevation: AppTokens.elevationBase,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusMedium),
          side: const BorderSide(color: outlineVariant),
        ),
      ),

      // App chrome stays quiet in the reference: a warm surface with a thin
      // divider so the page action remains the visual focus.
      appBarTheme: const AppBarTheme(
        backgroundColor: background,
        foregroundColor: onSurface,
        elevation: AppTokens.elevationBase,
        scrolledUnderElevation: AppTokens.elevationCard,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontFamily: fontFamily,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          color: onSurface,
        ),
      ),

      // Shared buttons use the compact 8px radius visible in the reference.
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: onPrimary,
          minimumSize: const Size.fromHeight(AppTokens.buttonHeight),
          shape: buttonShape,
          textStyle: const TextStyle(
            fontFamily: fontFamily,
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),

      // Outlined controls use the olive secondary colour to stay distinct from
      // the green primary CTA.
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: secondary,
          minimumSize: const Size(0, AppTokens.minTouchTarget),
          side: const BorderSide(color: secondary, width: 1.5),
          shape: buttonShape,
          textStyle: const TextStyle(
            fontFamily: fontFamily,
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),

      // Low-emphasis text actions use the olive secondary colour.
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: secondary,
          minimumSize: const Size(0, AppTokens.minTouchTarget),
          shape: buttonShape,
          textStyle: const TextStyle(
            fontFamily: fontFamily,
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),

      // A floating action button uses the same primary action treatment.
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: SemanticColors.action,
        foregroundColor: SemanticColors.onAction,
      ),

      // Reference fields use a light surface, thin outline and a terracotta
      // focus accent. Arabic alignment remains controlled by ambient RTL.
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceContainerLowest,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppTokens.spaceMedium,
          vertical: AppTokens.spaceMedium,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusDefault),
          borderSide: const BorderSide(color: outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusDefault),
          borderSide: const BorderSide(color: outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusDefault),
          borderSide: const BorderSide(color: SemanticColors.action, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusDefault),
          borderSide: const BorderSide(color: SemanticColors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusDefault),
          borderSide: const BorderSide(color: SemanticColors.error, width: 2),
        ),
        hintStyle: const TextStyle(color: onSurfaceVariant),
      ),

      // Pill shape keeps status chips visually distinct from buttons.
      chipTheme: ChipThemeData(
        backgroundColor: surfaceContainerHigh,
        labelStyle: const TextStyle(
          fontFamily: fontFamily,
          fontSize: 13,
          fontWeight: FontWeight.w500,
          color: onSurfaceVariant,
        ),
        side: BorderSide.none,
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(
          horizontal: AppTokens.spaceSmall + AppTokens.spaceExtraSmall,
          vertical: AppTokens.spaceExtraSmall,
        ),
      ),

      // Level 3 — pulls focus from the map behind it. Reference sheets use a
      // compact 12px top radius rather than a pill-like corner.
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: surfaceContainerLowest,
        elevation: AppTokens.elevationOverlay,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AppTokens.radiusMedium),
          ),
        ),
        showDragHandle: true,
      ),

      // §G.19 dialog — `md` radius, `surface-container-highest` background.
      dialogTheme: const DialogThemeData(
        backgroundColor: surfaceContainerHighest,
        elevation: AppTokens.elevationOverlay,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(
            Radius.circular(AppTokens.radiusMedium),
          ),
        ),
      ),

      // Labels are mandatory: icon-only navigation is ambiguous in Arabic.
      // The active item uses the light beige/olive treatment from the
      // reference.
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surfaceContainerLowest,
        indicatorColor: primaryContainer,
        elevation: AppTokens.elevationCard,
        height: 72,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            size: AppTokens.navIconSize,
            color: states.contains(WidgetState.selected) ? primary : outline,
          ),
        ),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontFamily: fontFamily,
            fontSize: 12,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w600
                : FontWeight.w500,
            color: states.contains(WidgetState.selected) ? primary : outline,
          ),
        ),
      ),

      dividerTheme: const DividerThemeData(
        color: outlineVariant,
        thickness: 1,
        space: AppTokens.spaceMedium,
      ),

      // Toasts remain compact and quiet.
      snackBarTheme: SnackBarThemeData(
        backgroundColor: inverseSurface,
        contentTextStyle: const TextStyle(
          fontFamily: fontFamily,
          color: inverseOnSurface,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusDefault),
        ),
        behavior: SnackBarBehavior.floating,
      ),

      // Waiting is deliberately subdued; action colour is reserved for the
      // next thing the user can actually do.
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: secondary,
        linearTrackColor: surfaceContainerHigh,
        circularTrackColor: surfaceContainerHigh,
      ),

      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? onPrimary
              : surfaceContainerLowest,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (states) =>
              states.contains(WidgetState.selected) ? primary : outlineVariant,
        ),
      ),

      listTileTheme: const ListTileThemeData(
        iconColor: onSurfaceVariant,
        textColor: onSurface,
      ),
    );
  }
}
