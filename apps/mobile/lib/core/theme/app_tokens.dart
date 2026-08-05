/// Masari design tokens.
///
/// Values come from the Masari design system: an 8-point grid, a
/// "Soft-Technical" radius scale, and touch targets sized for one-handed
/// mobile use.
///
/// [spaceSmall], [spaceMedium] and [spaceLarge] predate the design system but
/// already match its `sm`/`md`/`lg` steps, so they are kept as-is — the wider
/// codebase refers to them in hundreds of places.
class AppTokens {
  const AppTokens._();

  // ---------------------------------------------------------------------------
  // Spacing — 8pt grid.
  // ---------------------------------------------------------------------------

  /// 4px — tight pairings (icon to its label).
  static const spaceExtraSmall = 4.0;

  /// 8px — `sm`.
  static const spaceSmall = 8.0;

  /// 12px — mobile gutter between grid columns.
  static const gutterMobile = 12.0;

  /// 16px — `md`. Standard spacing between components, and the mobile side
  /// margin.
  static const spaceMedium = 16.0;

  /// 16px — screen side margin on mobile.
  static const marginMobile = 16.0;

  /// 24px — `lg`. Separates major content sections.
  static const spaceLarge = 24.0;

  /// 32px — `xl`.
  static const spaceExtraLarge = 32.0;

  // ---------------------------------------------------------------------------
  // Radii — "Soft-Technical": approachable, never fully clinical.
  // ---------------------------------------------------------------------------

  /// 4px.
  static const radiusSmall = 4.0;

  /// 8px — the base radius. Buttons and inputs.
  static const radiusDefault = 8.0;

  /// 12px.
  static const radiusMedium = 12.0;

  /// 16px — cards, and the top corners of bottom sheets.
  static const radiusLarge = 16.0;

  /// 24px.
  static const radiusExtraLarge = 24.0;

  /// Fully round — status chips and badges, which must stay visually distinct
  /// from actionable buttons.
  static const radiusFull = 9999.0;

  // ---------------------------------------------------------------------------
  // Touch targets & controls.
  // ---------------------------------------------------------------------------

  /// Minimum height for anything interactive, per the design system.
  static const minTouchTarget = 48.0;

  /// Standard full-width button height.
  static const buttonHeight = 52.0;

  /// Edge of a bottom navigation bar icon.
  static const navIconSize = 24.0;

  // ---------------------------------------------------------------------------
  // Elevation — used functionally, to signal stacking in the user's workflow.
  // ---------------------------------------------------------------------------

  /// Level 0 — page background.
  static const elevationBase = 0.0;

  /// Level 1 — cards.
  static const elevationCard = 1.0;

  /// Level 2 — floating and interactive surfaces (role cards, map markers).
  static const elevationFloating = 3.0;

  /// Level 3 — overlays that must pull focus from the map.
  static const elevationOverlay = 8.0;
}
