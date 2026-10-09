import 'package:flutter/material.dart';

/// Semantic status colours for Masari.
///
/// Kept separate from [AppTheme]'s `ColorScheme` because Material's scheme has
/// no slot for "pending", "active route", or the per-role map indicators the
/// design system calls for.
///
/// Values are aligned to the supplied Masari task reference and its state
/// vocabulary; the five anchor colours are retained exactly.
class SemanticColors {
  const SemanticColors._();

  // ---------------------------------------------------------------------------
  // Success.
  // ---------------------------------------------------------------------------
  static const success = Color(0xFF2F4A3A);
  static const onSuccess = Color(0xFFFFFFFF);
  static const successContainer = Color(0xFFE7EFE1);
  static const onSuccessContainer = Color(0xFF2F4A3A);

  // ---------------------------------------------------------------------------
  // Warning.
  // ---------------------------------------------------------------------------
  static const warning = Color(0xFFA36B22);
  static const onWarning = Color(0xFF271E02);
  static const warningContainer = Color(0xFFF5E9D3);
  static const onWarningContainer = Color(0xFF66431A);

  // ---------------------------------------------------------------------------
  // Error.
  // ---------------------------------------------------------------------------
  static const error = Color(0xFF8A3F2A);
  static const onError = Color(0xFFFFFFFF);
  static const errorContainer = Color(0xFFF5E1D9);
  static const onErrorContainer = Color(0xFF6B2E1D);

  // ---------------------------------------------------------------------------
  // Info / confirmed — olive, matching the supplied task reference.
  // ---------------------------------------------------------------------------
  static const info = Color(0xFF7A8F5A);
  static const onInfo = Color(0xFFFFFFFF);
  static const infoContainer = Color(0xFFEAF0DD);
  static const onInfoContainer = Color(0xFF40512D);

  // ---------------------------------------------------------------------------
  // Pending / inactive — the neutral ramp. Used for steps that have not
  // happened yet, so they recede rather than compete.
  // ---------------------------------------------------------------------------
  static const pending = Color(0xFF7C776E);
  static const onPending = Color(0xFFFFFFFF);
  static const pendingContainer = Color(0xFFF1ECE4);
  static const onPendingContainer = Color(0xFF5B625D);

  // ---------------------------------------------------------------------------
  // Action / kinetic — reserved for movement: "Start Trip", "Confirm
  // Delivery", the current step of a tracker, and the passenger map marker.
  // Kept under its own intent name so task screens can style movement and
  // transactional actions consistently.
  // ---------------------------------------------------------------------------
  static const action = Color(0xFF2F4A3A);
  static const onAction = Color(0xFFFFFFFF);

  // ---------------------------------------------------------------------------
  // Route state — §G.8 Timeline.
  // ---------------------------------------------------------------------------

  /// A route currently being travelled.
  static const activeRoute = action;

  /// A completed leg.
  static const completedRoute = Color(0xFF7A8F5A);

  /// A leg not yet started. The spec renders this as a hollow ring
  /// (`.ms-tl-node.pending`); [TimelineTracker] fills its node solidly, so
  /// this uses the spec's pending-border shade (neutral.400) as the closest
  /// solid equivalent rather than restructuring the widget to draw a ring.
  static const upcomingRoute = Color(0xFFB7AE9F);

  // ---------------------------------------------------------------------------
  // Role & entity indicators — §B "Semantic & map colors". Used for map
  // markers, avatars and badges so a role reads the same way everywhere.
  // ---------------------------------------------------------------------------

  /// Passenger — terracotta, matching the role accent in the reference.
  static const passenger = Color(0xFFC66A3D);

  /// Driver — deep green, matching the driver surface in the reference.
  static const driver = Color(0xFF2F4A3A);

  /// Merchant — olive, matching the merchant surfaces in the reference.
  static const merchant = Color(0xFF7A8F5A);

  /// Parcel — terracotta to distinguish shipment entities from merchant UI.
  static const parcel = Color(0xFFC66A3D);

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
