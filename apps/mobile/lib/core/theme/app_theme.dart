import 'package:flutter/material.dart';

import 'app_tokens.dart';
import 'semantic_colors.dart';

/// Masari's Material 3 theme.
///
/// Built from the Masari design system: a deep teal base for stability and the
/// "Masar" (path), with warm orange reserved strictly for movement and
/// high-priority action. The type scale uses IBM Plex Sans Arabic, bundled in
/// `assets/fonts/` so it renders offline in low-bandwidth areas.
///
/// The scheme is written out explicitly rather than generated from a seed, so
/// the values match the design system exactly instead of being approximated by
/// Material's tonal-palette algorithm.
class AppTheme {
  const AppTheme._();

  /// Font family bundled in `assets/fonts/` and declared in `pubspec.yaml`.
  static const fontFamily = 'IBMPlexSansArabic';

  // ---------------------------------------------------------------------------
  // Brand palette.
  // ---------------------------------------------------------------------------

  static const primary = Color(0xFF004B4C);
  static const onPrimary = Color(0xFFFFFFFF);
  static const primaryContainer = Color(0xFF116466);
  static const onPrimaryContainer = Color(0xFF97DEE0);

  static const secondary = Color(0xFF006A6A);
  static const onSecondary = Color(0xFFFFFFFF);
  static const secondaryContainer = Color(0xFF90F3F2);
  static const onSecondaryContainer = Color(0xFF007070);

  static const tertiary = Color(0xFF5F3A00);
  static const onTertiary = Color(0xFFFFFFFF);
  static const tertiaryContainer = Color(0xFF7F4F00);
  static const onTertiaryContainer = Color(0xFFFFC784);

  static const background = Color(0xFFF4FAFF);
  static const surface = Color(0xFFF4FAFF);
  static const surfaceDim = Color(0xFFD1DCE2);
  static const surfaceContainerLowest = Color(0xFFFFFFFF);
  static const surfaceContainerLow = Color(0xFFEAF5FC);
  static const surfaceContainer = Color(0xFFE5EFF6);
  static const surfaceContainerHigh = Color(0xFFDFEAF1);
  static const surfaceContainerHighest = Color(0xFFD9E4EB);

  static const onSurface = Color(0xFF131D22);
  static const onSurfaceVariant = Color(0xFF3F4949);
  static const inverseSurface = Color(0xFF283237);
  static const inverseOnSurface = Color(0xFFE8F2F9);
  static const inversePrimary = Color(0xFF8CD3D4);

  static const outline = Color(0xFF6F7979);
  static const outlineVariant = Color(0xFFBEC8C8);

  /// Legacy alias. The pre-redesign theme exposed `deepGreen` as the brand
  /// colour; it now points at the design system's teal [primary] so existing
  /// call sites pick up the new palette without a sweeping rename. Prefer
  /// `Theme.of(context).colorScheme.primary` in new code.
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
    surfaceBright: surface,
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
  // Type scale.
  //
  // Line heights are expressed as multiples of the font size to match the
  // design system's px pairs (e.g. 32/40 -> 1.25). Arabic script needs the
  // generous leading, so these are not reduced.
  // ---------------------------------------------------------------------------

  static const textTheme = TextTheme(
    // display-lg 32/40
    displayLarge: TextStyle(
      fontSize: 32,
      fontWeight: FontWeight.w700,
      height: 1.25,
    ),
    // display-lg-mobile 28/36
    displayMedium: TextStyle(
      fontSize: 28,
      fontWeight: FontWeight.w700,
      height: 1.29,
    ),
    // headline-md 24/32
    headlineLarge: TextStyle(
      fontSize: 24,
      fontWeight: FontWeight.w600,
      height: 1.33,
    ),
    headlineMedium: TextStyle(
      fontSize: 24,
      fontWeight: FontWeight.w600,
      height: 1.33,
    ),
    // headline-sm 20/28
    headlineSmall: TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w600,
      height: 1.4,
    ),
    titleLarge: TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w600,
      height: 1.4,
    ),
    // body-lg 18/28
    titleMedium: TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w600,
      height: 1.5,
    ),
    titleSmall: TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      height: 1.43,
    ),
    bodyLarge: TextStyle(
      fontSize: 18,
      fontWeight: FontWeight.w400,
      height: 1.56,
    ),
    // body-md 16/24
    bodyMedium: TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      height: 1.5,
    ),
    // body-sm 14/20
    bodySmall: TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      height: 1.43,
    ),
    // label-md 12/16, +0.5 tracking
    labelLarge: TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      height: 1.43,
    ),
    labelMedium: TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w600,
      height: 1.33,
      letterSpacing: 0.5,
    ),
    // label-sm 10/14
    labelSmall: TextStyle(
      fontSize: 10,
      fontWeight: FontWeight.w500,
      height: 1.4,
    ),
  );

  static ThemeData get light {
    final baseShape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppTokens.radiusDefault),
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: fontFamily,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      textTheme: textTheme.apply(
        bodyColor: onSurface,
        displayColor: onSurface,
      ),

      // Level 1: a 1px stroke rather than a heavy shadow, so cards stay flat
      // and legible in bright outdoor light.
      cardTheme: CardThemeData(
        color: surfaceContainerLowest,
        elevation: AppTokens.elevationBase,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusLarge),
          side: const BorderSide(color: outlineVariant),
        ),
      ),

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
          color: primary,
        ),
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: onPrimary,
          minimumSize: const Size.fromHeight(AppTokens.buttonHeight),
          shape: baseShape,
          textStyle: const TextStyle(
            fontFamily: fontFamily,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          minimumSize: const Size.fromHeight(AppTokens.minTouchTarget),
          side: const BorderSide(color: primary, width: 1.5),
          shape: baseShape,
          textStyle: const TextStyle(
            fontFamily: fontFamily,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          minimumSize: const Size(0, AppTokens.minTouchTarget),
          shape: baseShape,
          textStyle: const TextStyle(
            fontFamily: fontFamily,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // Arabic placeholder text aligns to the start of the reading direction;
      // Flutter handles that automatically under RTL.
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
          borderSide: const BorderSide(color: primary, width: 2),
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
          fontSize: 12,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
          color: onSurfaceVariant,
        ),
        side: BorderSide.none,
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(
          horizontal: AppTokens.spaceSmall + AppTokens.spaceExtraSmall,
          vertical: AppTokens.spaceExtraSmall,
        ),
      ),

      // Level 3 — pulls focus from the map behind it.
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: surfaceContainerLowest,
        elevation: AppTokens.elevationOverlay,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AppTokens.radiusLarge),
          ),
        ),
        showDragHandle: true,
      ),

      // Labels are mandatory: icon-only navigation is ambiguous in Arabic.
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surfaceContainerLowest,
        indicatorColor: secondaryContainer,
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

      snackBarTheme: SnackBarThemeData(
        backgroundColor: inverseSurface,
        contentTextStyle: const TextStyle(
          fontFamily: fontFamily,
          color: inverseOnSurface,
        ),
        shape: baseShape,
        behavior: SnackBarBehavior.floating,
      ),

      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: primary,
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
