import 'package:flutter/material.dart';

/// Semantic status colours for Masari.
///
/// Kept separate from [AppTheme]'s `ColorScheme` because Material's scheme has
/// no slot for "pending", "active route", or the per-role map indicators the
/// design system calls for.
///
/// Values come straight from design-system.html §B (semantic ramp) and §B
/// "Semantic & map colors" — nothing here is invented.
class SemanticColors {
  const SemanticColors._();

  // ---------------------------------------------------------------------------
  // Success.
  // ---------------------------------------------------------------------------
  static const success = Color(0xFF327B59);
  static const onSuccess = Color(0xFFFFFFFF);
  static const successContainer = Color(0xFFE5F5EE);
  static const onSuccessContainer = Color(0xFF165A3A);

  // ---------------------------------------------------------------------------
  // Warning.
  // ---------------------------------------------------------------------------
  static const warning = Color(0xFFAE8509);
  static const onWarning = Color(0xFF271E02);
  static const warningContainer = Color(0xFFFCF1CF);
  static const onWarningContainer = Color(0xFF59460D);

  // ---------------------------------------------------------------------------
  // Error.
  // ---------------------------------------------------------------------------
  static const error = Color(0xFFB1252A);
  static const onError = Color(0xFFFFFFFF);
  static const errorContainer = Color(0xFFFBE4E5);
  static const onErrorContainer = Color(0xFF72181B);

  // ---------------------------------------------------------------------------
  // Info — the "confirmed" tone. Navy, since it marks a settled state rather
  // than one awaiting action or currently moving.
  // ---------------------------------------------------------------------------
  static const info = Color(0xFF28408F); // navy.600
  static const onInfo = Color(0xFFFFFFFF);
  static const infoContainer = Color(0xFFF4F6FA); // navy.50
  static const onInfoContainer = Color(0xFF172554); // navy.900

  // ---------------------------------------------------------------------------
  // Pending / inactive — the neutral ramp. Used for steps that have not
  // happened yet, so they recede rather than compete.
  // ---------------------------------------------------------------------------
  static const pending = Color(0xFF6A6F81); // neutral.600
  static const onPending = Color(0xFFFFFFFF);
  static const pendingContainer = Color(0xFFF3F3F4); // neutral.100
  static const onPendingContainer = Color(0xFF4F525F); // neutral.700

  // ---------------------------------------------------------------------------
  // Action / kinetic — reserved for movement: "Start Trip", "Confirm
  // Delivery", the current step of a tracker, and the passenger map marker.
  // Never used for ordinary chrome, so that orange always reads as motion or
  // the one next action. Equal to the brand orange (design-system.html
  // `--ms-primary`) — kept under its own name so call sites read by intent
  // rather than by hue.
  // ---------------------------------------------------------------------------
  static const action = Color(0xFFE9561B); // orange.600
  static const onAction = Color(0xFFFFFFFF);

  // ---------------------------------------------------------------------------
  // Route state — §G.8 Timeline.
  // ---------------------------------------------------------------------------

  /// A route currently being travelled. `.ms-tl-node.active` — orange.600.
  static const activeRoute = action;

  /// A completed leg. `.ms-tl-node.done` — navy.600.
  static const completedRoute = Color(0xFF28408F);

  /// A leg not yet started. The spec renders this as a hollow ring
  /// (`.ms-tl-node.pending`); [TimelineTracker] fills its node solidly, so
  /// this uses the spec's pending-border shade (neutral.400) as the closest
  /// solid equivalent rather than restructuring the widget to draw a ring.
  static const upcomingRoute = Color(0xFFABAEBA); // neutral.400

  // ---------------------------------------------------------------------------
  // Role & entity indicators — §B "Semantic & map colors". Used for map
  // markers, avatars and badges so a role reads the same way everywhere.
  // ---------------------------------------------------------------------------

  /// Passenger — orange, matching the passenger map marker.
  static const passenger = action;

  /// Driver — navy, matching the driver map marker.
  static const driver = Color(0xFF203374); // navy.700

  /// Merchant — teal, matching the merchant map marker.
  static const merchant = Color(0xFF25687E); // teal.base

  /// Parcel — teal, grouped with merchant: the spec's box icon represents
  /// both.
  static const parcel = merchant;

  /// Indicator colour for a role name as used by the API (`passenger`,
  /// `driver`, `merchant`). Falls back to [pending] for anything unmapped,
  /// including `admin`, which has no mobile surface.
  static Color forRole(String? role) => switch (role) {
    'passenger' => passenger,
    'driver' => driver,
    'merchant' => merchant,
    _ => pending,
  };
}
