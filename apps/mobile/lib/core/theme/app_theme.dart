import 'package:flutter/material.dart';

import 'app_tokens.dart';
import 'semantic_colors.dart';

/// Masari's Material 3 theme.
///
/// Built from design-system.html: warm orange ("Professional Orange") is the
/// app's dominant brand colour, with navy kept in reserve for the handful of
/// places the design system requires it regardless — the Tertiary button's
/// text (`.ms-btn-tertiary`) and the passenger's own chat bubble
/// (`.bubble-user`), both pinned to `--ms-secondary` in the source file. The
/// type scale uses IBM Plex Sans Arabic, bundled in `assets/fonts/` so it
/// renders offline in low-bandwidth areas.
///
/// [primary]/[primaryContainer] hold the design system's `--ms-primary`
/// (orange) values, matching the name literally — by product direction this
/// app leans on orange throughout rather than rationing it to one element per
/// screen. [secondary]/[secondaryContainer] hold `--ms-secondary` (navy) for
/// the call sites above. [SemanticColors.action] duplicates the orange under
/// its own name for call sites that want to read by intent ("this is the
/// movement colour") rather than by hue.
///
/// The scheme is written out explicitly rather than generated from a seed, so
/// the values match the design system exactly instead of being approximated by
/// Material's tonal-palette algorithm.
class AppTheme {
  const AppTheme._();

  /// Font family bundled in `assets/fonts/` and declared in `pubspec.yaml`.
  static const fontFamily = 'IBMPlexSansArabic';

  // ---------------------------------------------------------------------------
  // Brand palette — design-system.html §B.
  // ---------------------------------------------------------------------------

  /// Orange — `--ms-primary` / `--ms-orange-600`. The app's dominant brand
  /// colour; see [SemanticColors.action] for the intent-named alias.
  static const primary = Color(0xFFE9561B);
  static const onPrimary = Color(0xFFFFFFFF);
  static const primaryContainer = Color(0xFFFDE0D3); // orange.100
  static const onPrimaryContainer = Color(0xFF783011); // orange.900

  /// Navy — `--ms-secondary` / `--ms-navy-600`. Kept for the call sites the
  /// design system pins to navy regardless of brand emphasis — see the class
  /// doc.
  static const secondary = Color(0xFF28408F);
  static const onSecondary = Color(0xFFFFFFFF);
  static const secondaryContainer = Color(0xFFF4F6FA); // navy.50
  static const onSecondaryContainer = Color(0xFF172554); // navy.900

  /// Teal — `--ms-tertiary`. Merchant and parcel iconography only.
  static const tertiary = Color(0xFF25687E);
  static const onTertiary = Color(0xFFFFFFFF);
  static const tertiaryContainer = Color(0xFFDFF0F6);
  static const onTertiaryContainer = Color(0xFF124454);

  static const background = Color(0xFFFAFAFA); // neutral.50
  static const surface = Color(0xFFFAFAFA);
  static const surfaceDim = Color(0xFFD0D2D8); // neutral.300 — nearest token;
  // the design system does not name a dedicated "dim" surface.
  static const surfaceContainerLowest = Color(0xFFFFFFFF);
  static const surfaceContainerLow = Color(0xFFFAFAFA); // neutral.50
  static const surfaceContainer = Color(0xFFF3F3F4); // neutral.100
  static const surfaceContainerHigh = Color(0xFFE6E7EA); // neutral.200
  static const surfaceContainerHighest = Color(0xFFD0D2D8); // neutral.300

  static const onSurface = Color(0xFF1C1D21); // neutral.900
  static const onSurfaceVariant = Color(0xFF4F525F); // neutral.700
  static const inverseSurface = Color(0xFF1C1D21);
  static const inverseOnSurface = Color(0xFFFAFAFA);
  static const inversePrimary = Color(0xFFFE986C); // orange.300, per spec

  static const outline = Color(0xFF898E9F); // neutral.500
  static const outlineVariant = Color(0xFFE6E7EA); // neutral.200

  /// Legacy alias. The pre-redesign theme exposed `deepGreen` as the brand
  /// colour; it now points at [primary] so existing call sites pick up the
  /// current palette without a sweeping rename. Prefer
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
  // Type scale — design-system.html §C.1.
  //
  // Line heights are expressed as multiples of the font size, computed from
  // the design system's exact px pairs so they match to the fraction rather
  // than a rounded decimal. Letter-spacing is always 0 — Arabic is a joined
  // script and tracking breaks glyph connections (§C, "Not allowed, ever").
  //
  // Flutter's fifteen TextTheme slots line up positionally with the design
  // system's fifteen named steps (display/headline/title/body/label ×
  // large/medium/small), so each maps 1:1 by name.
  // ---------------------------------------------------------------------------

  static const textTheme = TextTheme(
    // display-l 40/52, SemiBold
    displayLarge: TextStyle(
      fontSize: 40,
      fontWeight: FontWeight.w600,
      height: 52 / 40,
    ),
    // display-m 34/46, SemiBold
    displayMedium: TextStyle(
      fontSize: 34,
      fontWeight: FontWeight.w600,
      height: 46 / 34,
    ),
    // display-s 28/40, SemiBold
    displaySmall: TextStyle(
      fontSize: 28,
      fontWeight: FontWeight.w600,
      height: 40 / 28,
    ),
    // headline-l 24/34, SemiBold
    headlineLarge: TextStyle(
      fontSize: 24,
      fontWeight: FontWeight.w600,
      height: 34 / 24,
    ),
    // headline-m 20/30, SemiBold
    headlineMedium: TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w600,
      height: 30 / 20,
    ),
    // headline-s 18/28, Medium
    headlineSmall: TextStyle(
      fontSize: 18,
      fontWeight: FontWeight.w500,
      height: 28 / 18,
    ),
    // title-l 17/26, Medium
    titleLarge: TextStyle(
      fontSize: 17,
      fontWeight: FontWeight.w500,
      height: 26 / 17,
    ),
    // title-m 15/24, Medium
    titleMedium: TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w500,
      height: 24 / 15,
    ),
    // title-s 14/22, Medium
    titleSmall: TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w500,
      height: 22 / 14,
    ),
    // body-l 16/26, Regular
    bodyLarge: TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      height: 26 / 16,
    ),
    // body-m 14/24, Regular — the most-used slot
    bodyMedium: TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      height: 24 / 14,
    ),
    // body-s 13/22, Regular
    bodySmall: TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w400,
      height: 22 / 13,
    ),
    // label-l 15/22, Bold — button labels
    labelLarge: TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w700,
      height: 22 / 15,
    ),
    // label-m 13/20, Medium — chips
    labelMedium: TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w500,
      height: 20 / 13,
    ),
    // label-s 11/18, Medium
    labelSmall: TextStyle(
      fontSize: 11,
      fontWeight: FontWeight.w500,
      height: 18 / 11,
    ),
  );

  static ThemeData get light {
    final buttonShape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppTokens.radiusLarge),
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

      // `.ms-topbar` is unstyled chrome — a plain surface with default text,
      // never a brand colour, so the app bar never competes with the
      // screen's one orange action (§A, principle 1: "no orange as chrome").
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

      // §G.1 buttons — `lg` radius, `label-l` (Bold) text. This styles plain
      // unstyled `FilledButton`/`OutlinedButton`/`TextButton` calls; the
      // dedicated `MasariButton` widget sets its own colours per variant.
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

      // §G.1 has no bordered variant; an outlined button reads as Tertiary
      // (transparent, navy text) with its border kept as the one visual cue
      // that distinguishes it from a text button.
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

      // `.ms-btn-tertiary` — transparent, navy text.
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

      // A floating action button is inherently the one action available on
      // its screen, so it takes the literal orange rather than the
      // structural navy `primary`.
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: SemanticColors.action,
        foregroundColor: SemanticColors.onAction,
      ),

      // §G.3 text field — `sm` radius, orange focus ring.
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

      // Level 3 — pulls focus from the map behind it. §G.18 sheet — `lg`
      // radius on the top corners.
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: surfaceContainerHigh,
        elevation: AppTokens.elevationOverlay,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AppTokens.radiusLarge),
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
      // §G phone-frame bottom nav — the active tab, and the pill behind its
      // icon, both take the orange the design system explicitly gives them
      // (`.ms-nav-item.active` and `.ms-nav-item.active .ms-nav-dot`).
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

      // §G.20 toast — `sm` radius, inverse surface.
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

      // A passive waiting state, not the screen's one actionable/in-motion
      // element, so it stays off orange regardless of the app's general
      // orange emphasis.
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
