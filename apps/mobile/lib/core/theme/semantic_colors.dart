import 'package:flutter/material.dart';

/// Semantic status colours for Masari.
///
/// Kept separate from [AppTheme]'s `ColorScheme` because Material's scheme has
/// no slot for "pending", "active route", or the per-role map indicators the
/// design system calls for.
///
/// Values marked *derived* are not given explicitly by the design system; they
/// are built from its tertiary (warm) and neutral ramps so they sit in the same
/// tonal family rather than being invented independently.
class SemanticColors {
  const SemanticColors._();

  // ---------------------------------------------------------------------------
  // Success — *derived*, kept in the cool family so it reads as "settled"
  // next to the teal primary rather than competing with the warm action colour.
  // ---------------------------------------------------------------------------
  static const success = Color(0xFF146C43);
  static const onSuccess = Color(0xFFFFFFFF);
  static const successContainer = Color(0xFFC7F0D8);
  static const onSuccessContainer = Color(0xFF04361D);

  // ---------------------------------------------------------------------------
  // Warning — *derived* from the design system's tertiary (warm) ramp so
  // warnings and the action colour stay visibly related.
  // ---------------------------------------------------------------------------
  static const warning = Color(0xFF8A5300);
  static const onWarning = Color(0xFFFFFFFF);
  static const warningContainer = Color(0xFFFFDDB8); // tertiary-fixed
  static const onWarningContainer = Color(0xFF2A1700); // on-tertiary-fixed

  // ---------------------------------------------------------------------------
  // Error — taken directly from the design system.
  // ---------------------------------------------------------------------------
  static const error = Color(0xFFBA1A1A);
  static const onError = Color(0xFFFFFFFF);
  static const errorContainer = Color(0xFFFFDAD6);
  static const onErrorContainer = Color(0xFF93000A);

  // ---------------------------------------------------------------------------
  // Pending / inactive — the design system's neutral ramp. Used for steps that
  // have not happened yet, so they recede rather than compete.
  // ---------------------------------------------------------------------------
  static const pending = Color(0xFF6F7979); // outline
  static const onPending = Color(0xFFFFFFFF);
  static const pendingContainer = Color(0xFFDFEAF1); // surface-container-high
  static const onPendingContainer = Color(0xFF3F4949); // on-surface-variant

  // ---------------------------------------------------------------------------
  // Action / kinetic — reserved for movement: "Start Trip", "Confirm Delivery",
  // the current step of a tracker, and the live driver marker. Never used for
  // ordinary navigation, so that motion always reads as motion.
  // ---------------------------------------------------------------------------

  /// Filled action buttons. From the design system's `tertiary-container`.
  static const action = Color(0xFF7F4F00);
  static const onAction = Color(0xFFFFFFFF);

  /// The live-movement accent: active tracker steps and the driver marker.
  /// *Derived* — a brighter stop on the same warm ramp so it stays legible at
  /// map-marker size against street tiles.
  static const actionBright = Color(0xFFFFB95F); // tertiary-fixed-dim
  static const onActionBright = Color(0xFF2A1700);

  // ---------------------------------------------------------------------------
  // Route state.
  // ---------------------------------------------------------------------------

  /// A route currently being travelled.
  static const activeRoute = action;

  /// A completed leg.
  static const completedRoute = Color(0xFF004B4C); // primary

  /// A leg not yet started.
  static const upcomingRoute = pending;

  // ---------------------------------------------------------------------------
  // Role & entity indicators — used for map markers, avatars and badges so a
  // role reads the same way everywhere in the app.
  // ---------------------------------------------------------------------------

  /// Passenger — teal circle with a person icon.
  static const passenger = Color(0xFF004B4C); // primary

  /// Driver — warm action colour, matching the moving car marker.
  static const driver = action;

  /// Merchant — the secondary teal, distinct from passenger without leaving
  /// the brand family.
  static const merchant = Color(0xFF006A6A); // secondary

  /// Parcel / stop — teal pin with a centred dot.
  static const parcel = Color(0xFF004B4C); // primary

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
