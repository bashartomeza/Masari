import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../canonical_assignments/application/canonical_assignment_controller.dart';
import '../../canonical_assignments/domain/canonical_assignment_models.dart';
import '../../canonical_routes/application/canonical_route_controller.dart';
import '../../canonical_routes/domain/canonical_route_models.dart';

/// What the passenger map has to draw, resolved from the passenger's own data.
///
/// The passenger can always access the map and checkpoint layer.
/// Route and assignment data are optional and are drawn when available.
class PassengerMapView {
  const PassengerMapView({
    required this.mapsAvailable,
    required this.checkpointsAvailable,
    this.route,
    this.pickup,
    this.dropoff,
    this.assignment,
  });

  /// The passenger map is always available.
  final bool mapsAvailable;

  /// Checkpoints are always requested by the passenger map.
  final bool checkpointsAvailable;

  /// The route version the passenger asked for,
  /// with coordinates and geometry.
  final CanonicalRoute? route;

  /// Where this passenger boards and alights.
  final CanonicalStop? pickup;
  final CanonicalStop? dropoff;

  /// Present once a driver route is serving the request.
  final CanonicalAssignment? assignment;

  /// The passenger's own leg, which is what they actually travel.
  ///
  /// Empty when either end is missing or there are not enough
  /// coordinates to draw the leg.
  List<GeoPoint> get leg {
    final current = route;
    final start = pickup;
    final end = dropoff;

    if (current == null || start == null || end == null) {
      return const [];
    }

    final within = current.stops
        .where(
          (stop) =>
              stop.sequence >= start.sequence &&
              stop.sequence <= end.sequence &&
              stop.position != null,
        )
        .map((stop) => stop.position!)
        .toList(growable: false);

    return within.length >= 2
        ? List.unmodifiable(within)
        : const [];
  }

  /// Whether the route has enough points to be drawn on the map.
  bool get hasDrawableRoute =>
      (route?.path.length ?? 0) >= 2;
}

/// Passenger map provider.
///
/// IMPORTANT:
/// The base map and checkpoints must NOT depend on:
/// - mobile capabilities
/// - passenger active state
/// - route availability
/// - assignment availability
///
/// Route and assignment are optional layers.
/// If their APIs fail, the map itself must still open.
final passengerMapViewProvider =
    FutureProvider<PassengerMapView>((ref) async {
  CanonicalRoute? route;
  CanonicalStop? pickup;
  CanonicalStop? dropoff;
  CanonicalAssignment? assignment;

  // ------------------------------------------------------------
  // OPTIONAL ROUTE + ASSIGNMENT DATA
  // ------------------------------------------------------------
  //
  // These are only needed to draw the passenger's route.
  //
  // If one of these APIs fails, we DO NOT allow the whole map
  // screen to fail.
  //
  try {
    final routes =
        await ref.watch(canonicalRouteCatalogProvider.future);

    final assignments =
        await ref.watch(
          passengerCanonicalAssignmentsProvider.future,
        );

    // Assignments that still represent a trip the passenger
    // can travel on.
    const travelling = {
      CanonicalAssignmentStatus.pending,
      CanonicalAssignmentStatus.offered,
      CanonicalAssignmentStatus.assigned,
    };

    final active = assignments
        .where(
          (item) => travelling.contains(item.status),
        )
        .toList(growable: false);

    // Use the newest active assignment.
    assignment = active.isEmpty
        ? null
        : active.last;

    // Resolve the route belonging to the assignment.
    if (assignment != null) {
      route = routes
          .where(
            (value) =>
                value.versionId ==
                assignment!.routeVersionId,
          )
          .firstOrNull;

      // Resolve pickup and dropoff stops.
      if (route != null) {
        pickup = route!.stops
            .where(
              (stop) =>
                  stop.id ==
                  assignment!.pickupStopId,
            )
            .firstOrNull;

        dropoff = route!.stops
            .where(
              (stop) =>
                  stop.id ==
                  assignment!.dropoffStopId,
            )
            .firstOrNull;
      }
    }
  } catch (_) {
    // Route/assignment data is OPTIONAL.
    //
    // If these APIs fail, keep everything null.
    // The base map and checkpoints will still be available.
    route = null;
    pickup = null;
    dropoff = null;
    assignment = null;
  }

  // ------------------------------------------------------------
  // ALWAYS RETURN A MAP VIEW
  // ------------------------------------------------------------
  //
  // We intentionally return mapsAvailable = true and
  // checkpointsAvailable = true.
  //
  // The checkpoint provider is responsible for fetching
  // /checkpoints independently.
  //
  return PassengerMapView(
    mapsAvailable: true,
    checkpointsAvailable: true,
    route: route,
    pickup: pickup,
    dropoff: dropoff,
    assignment: assignment,
  );
});