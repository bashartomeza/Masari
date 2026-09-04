import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../canonical_assignments/application/canonical_assignment_controller.dart';
import '../../canonical_assignments/domain/canonical_assignment_models.dart';
import '../../canonical_routes/application/canonical_route_controller.dart';
import '../../canonical_routes/domain/canonical_route_models.dart';

/// What the passenger map has to draw, resolved from the passenger's own data.
///
/// The diagram this serves is: current location -> requested route -> the
/// driver route serving it -> barriers -> destination. Location and barriers
/// are watched separately by the screen so that a refused permission or a
/// failing barrier feed still leaves the route on screen.
class PassengerMapView {
  const PassengerMapView({
    required this.mapsAvailable,
    required this.checkpointsAvailable,
    this.route,
    this.pickup,
    this.dropoff,
    this.assignment,
  });

  /// False when the server has not switched maps on; the screen then says so
  /// rather than rendering an empty world.
  final bool mapsAvailable;
  final bool checkpointsAvailable;

  /// The route version the passenger asked for, with coordinates and geometry.
  final CanonicalRoute? route;

  /// Where this passenger boards and alights — a subset of [route]'s stops.
  final CanonicalStop? pickup;
  final CanonicalStop? dropoff;

  /// Present once a driver route is serving the request.
  final CanonicalAssignment? assignment;

  /// The passenger's own leg, which is what they actually travel. Empty when
  /// either end is missing coordinates, so nothing is drawn on a guess.
  List<GeoPoint> get leg {
    final current = route;
    final start = pickup;
    final end = dropoff;
    if (current == null || start == null || end == null) return const [];
    final within = current.stops
        .where(
          (stop) =>
              stop.sequence >= start.sequence &&
              stop.sequence <= end.sequence &&
              stop.position != null,
        )
        .map((stop) => stop.position!)
        .toList(growable: false);
    return within.length >= 2 ? List.unmodifiable(within) : const [];
  }

  bool get hasDrawableRoute => (route?.path.length ?? 0) >= 2;
}

final passengerMapViewProvider = FutureProvider<PassengerMapView>((ref) async {
  final capabilities = await ref.watch(mobileCapabilitiesProvider.future);
  if (!capabilities.mapsAvailable) {
    return PassengerMapView(
      mapsAvailable: false,
      checkpointsAvailable: capabilities.checkpointsAvailable,
    );
  }

  final routes = await ref.watch(canonicalRouteCatalogProvider.future);
  final assignments = await ref.watch(
    passengerCanonicalAssignmentsProvider.future,
  );

  // The newest assignment the passenger can still travel on. A settled or
  // cancelled one must not keep drawing a line they are no longer taking.
  const travelling = {
    CanonicalAssignmentStatus.pending,
    CanonicalAssignmentStatus.offered,
    CanonicalAssignmentStatus.assigned,
  };
  final active = assignments
      .where((assignment) => travelling.contains(assignment.status))
      .toList(growable: false);
  final assignment = active.isEmpty ? null : active.last;

  final route = assignment == null
      ? null
      : routes
            .where((value) => value.versionId == assignment.routeVersionId)
            .firstOrNull;

  CanonicalStop? stopById(String? id) => id == null || route == null
      ? null
      : route.stops.where((stop) => stop.id == id).firstOrNull;

  return PassengerMapView(
    mapsAvailable: true,
    checkpointsAvailable: capabilities.checkpointsAvailable,
    route: route,
    pickup: stopById(assignment?.pickupStopId),
    dropoff: stopById(assignment?.dropoffStopId),
    assignment: assignment,
  );
});
