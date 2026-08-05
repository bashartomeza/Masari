enum CanonicalRouteDirection { outbound, inbound, loop }

enum CanonicalRouteStatus { active, retired }

enum CanonicalRouteVersionStatus { draft, published, paused, retired }

enum DriverAvailabilityStatus {
  draft,
  active,
  paused,
  filled,
  departed,
  completed,
  cancelled,
  expired,
}

class MobileCapabilities {
  const MobileCapabilities({
    required this.routeCatalogAvailable,
    required this.multiRouteEntryAvailable,
    required this.matchingAvailable,
    required this.canonicalTripCreationAvailable,
    required this.driverCanonicalOffersAvailable,
    required this.canonicalAssignmentStatusAvailable,
    this.canonicalSharedTripPresentationAvailable = false,
    this.canonicalSharedDriverOffersAvailable = false,
    this.canonicalSharedAssignmentStatusAvailable = false,
    required this.mapsAvailable,
    required this.liveTrackingAvailable,
  });

  final bool routeCatalogAvailable;
  final bool multiRouteEntryAvailable;
  final bool matchingAvailable;
  final bool canonicalTripCreationAvailable;
  final bool driverCanonicalOffersAvailable;
  final bool canonicalAssignmentStatusAvailable;
  final bool canonicalSharedTripPresentationAvailable;
  final bool canonicalSharedDriverOffersAvailable;
  final bool canonicalSharedAssignmentStatusAvailable;
  final bool mapsAvailable;
  final bool liveTrackingAvailable;

  factory MobileCapabilities.fromJson(Map<String, dynamic> json) {
    _requireKeys(json, const {
      'canonical_route_catalog_available',
      'canonical_multi_route_entry_available',
      'canonical_matching_available',
      'canonical_trip_creation_available',
      'driver_canonical_offers_available',
      'canonical_assignment_status_available',
      'canonical_shared_trip_presentation_available',
      'canonical_shared_driver_offers_available',
      'canonical_shared_assignment_status_available',
      'maps_available',
      'live_tracking_available',
    });
    return MobileCapabilities(
      routeCatalogAvailable: _bool(json, 'canonical_route_catalog_available'),
      multiRouteEntryAvailable: _bool(
        json,
        'canonical_multi_route_entry_available',
      ),
      matchingAvailable: _bool(json, 'canonical_matching_available'),
      canonicalTripCreationAvailable: _bool(
        json,
        'canonical_trip_creation_available',
      ),
      driverCanonicalOffersAvailable: _bool(
        json,
        'driver_canonical_offers_available',
      ),
      canonicalAssignmentStatusAvailable: _bool(
        json,
        'canonical_assignment_status_available',
      ),
      canonicalSharedTripPresentationAvailable: _optionalBool(
        json,
        'canonical_shared_trip_presentation_available',
      ),
      canonicalSharedDriverOffersAvailable: _optionalBool(
        json,
        'canonical_shared_driver_offers_available',
      ),
      canonicalSharedAssignmentStatusAvailable: _optionalBool(
        json,
        'canonical_shared_assignment_status_available',
      ),
      mapsAvailable: _bool(json, 'maps_available'),
      liveTrackingAvailable: _bool(json, 'live_tracking_available'),
    );
  }
}

class CanonicalStop {
  const CanonicalStop({
    required this.id,
    required this.nameAr,
    required this.nameEn,
    required this.sequence,
    required this.passengerPickupAllowed,
    required this.passengerDropoffAllowed,
    required this.parcelPickupAllowed,
    required this.parcelDropoffAllowed,
  });

  final String id;
  final String nameAr;
  final String nameEn;
  final int sequence;
  final bool passengerPickupAllowed;
  final bool passengerDropoffAllowed;
  final bool parcelPickupAllowed;
  final bool parcelDropoffAllowed;

  factory CanonicalStop.fromMembership(Map<String, dynamic> json) {
    _requireKeys(json, const {
      'sequence',
      'passenger_pickup_allowed',
      'passenger_dropoff_allowed',
      'parcel_pickup_allowed',
      'parcel_dropoff_allowed',
      'stop',
    });
    final stop = _object(json, 'stop');
    _requireKeys(stop, const {'id', 'name_ar', 'name_en'});
    return CanonicalStop(
      id: _string(stop, 'id'),
      nameAr: _string(stop, 'name_ar'),
      nameEn: _string(stop, 'name_en'),
      sequence: _integer(json, 'sequence'),
      passengerPickupAllowed: _bool(json, 'passenger_pickup_allowed'),
      passengerDropoffAllowed: _bool(json, 'passenger_dropoff_allowed'),
      parcelPickupAllowed: _bool(json, 'parcel_pickup_allowed'),
      parcelDropoffAllowed: _bool(json, 'parcel_dropoff_allowed'),
    );
  }
}

class CanonicalRoute {
  const CanonicalRoute({
    required this.id,
    required this.routeStatus,
    required this.direction,
    required this.versionId,
    required this.versionNumber,
    required this.nameAr,
    required this.nameEn,
    required this.versionStatus,
    required this.activeFrom,
    required this.activeUntil,
    required this.stops,
  });

  final String id;
  final CanonicalRouteStatus routeStatus;
  final CanonicalRouteDirection direction;
  final String versionId;
  final int versionNumber;
  final String nameAr;
  final String nameEn;
  final CanonicalRouteVersionStatus versionStatus;
  final DateTime? activeFrom;
  final DateTime? activeUntil;
  final List<CanonicalStop> stops;

  bool get currentlyEligible {
    final now = DateTime.now().toUtc();
    return routeStatus == CanonicalRouteStatus.active &&
        versionStatus == CanonicalRouteVersionStatus.published &&
        (activeFrom == null || !activeFrom!.isAfter(now)) &&
        (activeUntil == null || activeUntil!.isAfter(now));
  }

  CanonicalRoute withStops(List<CanonicalStop> value) => CanonicalRoute(
    id: id,
    routeStatus: routeStatus,
    direction: direction,
    versionId: versionId,
    versionNumber: versionNumber,
    nameAr: nameAr,
    nameEn: nameEn,
    versionStatus: versionStatus,
    activeFrom: activeFrom,
    activeUntil: activeUntil,
    stops: _validatedStops(value),
  );

  factory CanonicalRoute.fromJson(Map<String, dynamic> json) {
    _requireKeys(json, const {'id', 'direction', 'status', 'current_version'});
    final version = _object(json, 'current_version');
    _requireKeys(version, const {
      'id',
      'version_number',
      'status',
      'name_ar',
      'name_en',
      'active_from',
      'active_until',
      'stops',
    });
    final direction = CanonicalRouteDirection.values
        .where((value) => value.name == _string(json, 'direction'))
        .firstOrNull;
    if (direction == null) throw const FormatException('Invalid direction');
    final routeStatus = CanonicalRouteStatus.values
        .where((value) => value.name == _string(json, 'status'))
        .firstOrNull;
    final versionStatus = CanonicalRouteVersionStatus.values
        .where((value) => value.name == _string(version, 'status'))
        .firstOrNull;
    if (routeStatus == null || versionStatus == null) {
      throw const FormatException('Invalid route status');
    }
    final rawStops = version['stops'];
    final stops = rawStops is List
        ? rawStops
              .map((value) => CanonicalStop.fromMembership(_map(value)))
              .toList(growable: false)
        : const <CanonicalStop>[];
    return CanonicalRoute(
      id: _string(json, 'id'),
      routeStatus: routeStatus,
      direction: direction,
      versionId: _string(version, 'id'),
      versionNumber: _integer(version, 'version_number'),
      nameAr: _string(version, 'name_ar'),
      nameEn: _string(version, 'name_en'),
      versionStatus: versionStatus,
      activeFrom: _optionalDate(version, 'active_from'),
      activeUntil: _optionalDate(version, 'active_until'),
      stops: _validatedStops(stops),
    );
  }
}

List<CanonicalStop> _validatedStops(List<CanonicalStop> stops) {
  final ids = <String>{};
  final sequences = <int>{};
  for (final stop in stops) {
    if (stop.sequence < 1 ||
        !ids.add(stop.id) ||
        !sequences.add(stop.sequence)) {
      throw const FormatException('Invalid ordered stops');
    }
  }
  return List.unmodifiable(stops);
}

class DriverAvailability {
  const DriverAvailability({
    required this.id,
    required this.routeVersionId,
    required this.nameAr,
    required this.nameEn,
    required this.direction,
    required this.departureAt,
    required this.windowEnd,
    required this.totalSeats,
    required this.remainingSeats,
    required this.totalParcelCapacity,
    required this.remainingParcelCapacity,
    required this.status,
    required this.revision,
  });

  final String id;
  final String routeVersionId;
  final String nameAr;
  final String nameEn;
  final CanonicalRouteDirection direction;
  final DateTime departureAt;
  final DateTime? windowEnd;
  final int totalSeats;
  final int remainingSeats;
  final int totalParcelCapacity;
  final int remainingParcelCapacity;
  final DriverAvailabilityStatus status;
  final int revision;

  bool get isTerminal => const {
    DriverAvailabilityStatus.filled,
    DriverAvailabilityStatus.departed,
    DriverAvailabilityStatus.completed,
    DriverAvailabilityStatus.cancelled,
    DriverAvailabilityStatus.expired,
  }.contains(status);

  factory DriverAvailability.fromJson(Map<String, dynamic> json) {
    final version = _object(json, 'route_version');
    final status = DriverAvailabilityStatus.values
        .where((value) => value.name == _string(json, 'status'))
        .firstOrNull;
    final direction = CanonicalRouteDirection.values
        .where((value) => value.name == _string(version, 'direction'))
        .firstOrNull;
    if (status == null || direction == null) {
      throw const FormatException('Invalid availability enum');
    }
    return DriverAvailability(
      id: _string(json, 'id'),
      routeVersionId: _string(version, 'id'),
      nameAr: _string(version, 'name_ar'),
      nameEn: _string(version, 'name_en'),
      direction: direction,
      departureAt: _date(json, 'departure_at'),
      windowEnd: _optionalDate(json, 'availability_window_end'),
      totalSeats: _integer(json, 'total_seats'),
      remainingSeats: _integer(json, 'remaining_seats'),
      totalParcelCapacity: _integer(json, 'total_parcel_capacity'),
      remainingParcelCapacity: _integer(json, 'remaining_parcel_capacity'),
      status: status,
      revision: _integer(json, 'revision'),
    );
  }
}

class CanonicalPassengerRequest {
  const CanonicalPassengerRequest({
    required this.id,
    required this.routeVersionId,
    required this.pickupStopId,
    required this.dropoffStopId,
    required this.departureFrom,
    required this.departureUntil,
    required this.passengerCount,
    required this.replayed,
  });

  final String id;
  final String routeVersionId;
  final String pickupStopId;
  final String dropoffStopId;
  final DateTime departureFrom;
  final DateTime departureUntil;
  final int passengerCount;
  final bool replayed;

  factory CanonicalPassengerRequest.fromEnvelope(Map<String, dynamic> json) {
    final value = _object(json, 'request');
    return CanonicalPassengerRequest(
      id: _string(value, 'id'),
      routeVersionId: _string(value, 'route_version_id'),
      pickupStopId: _string(value, 'pickup_stop_id'),
      dropoffStopId: _string(value, 'dropoff_stop_id'),
      departureFrom: _date(value, 'requested_departure_from'),
      departureUntil: _date(value, 'requested_departure_until'),
      passengerCount: _integer(value, 'passenger_count'),
      replayed: json['replayed'] == true,
    );
  }
}

class CanonicalParcelInput {
  const CanonicalParcelInput({
    required this.destinationStopId,
    required this.size,
    required this.priority,
  });
  final String destinationStopId;
  final String size;
  final String priority;
  Map<String, dynamic> toJson() => {
    'destination_stop_id': destinationStopId,
    'size': size,
    'priority': priority,
  };
}

class CanonicalMerchantOrder {
  const CanonicalMerchantOrder({
    required this.id,
    required this.parcelCount,
    required this.replayed,
  });
  final String id;
  final int parcelCount;
  final bool replayed;

  factory CanonicalMerchantOrder.fromEnvelope(Map<String, dynamic> json) {
    final order = _object(json, 'order');
    final parcels = order['parcels'];
    if (parcels is! List) throw const FormatException('Invalid parcels');
    return CanonicalMerchantOrder(
      id: _string(order, 'id'),
      parcelCount: parcels.length,
      replayed: json['replayed'] == true,
    );
  }
}

List<CanonicalStop> passengerPickupStops(CanonicalRoute route) =>
    List.unmodifiable(route.stops.where((stop) => stop.passengerPickupAllowed));

List<CanonicalStop> downstreamPassengerStops(
  CanonicalRoute route,
  CanonicalStop pickup,
) => List.unmodifiable(
  route.stops.where(
    (stop) => stop.passengerDropoffAllowed && stop.sequence > pickup.sequence,
  ),
);

List<CanonicalStop> parcelPickupStops(CanonicalRoute route) =>
    List.unmodifiable(route.stops.where((stop) => stop.parcelPickupAllowed));

List<CanonicalStop> downstreamParcelStops(
  CanonicalRoute route,
  CanonicalStop pickup,
) => List.unmodifiable(
  route.stops.where(
    (stop) => stop.parcelDropoffAllowed && stop.sequence > pickup.sequence,
  ),
);

Map<String, dynamic> _map(Object? value) {
  if (value is Map<String, dynamic>) return value;
  throw const FormatException('Expected object');
}

Map<String, dynamic> _object(Map<String, dynamic> json, String key) =>
    _map(json[key]);

String _string(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Invalid $key');
}

bool _bool(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is bool) return value;
  throw FormatException('Invalid $key');
}

bool _optionalBool(Map<String, dynamic> json, String key) {
  if (!json.containsKey(key)) return false;
  return _bool(json, key);
}

int _integer(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is int) return value;
  throw FormatException('Invalid $key');
}

DateTime _date(Map<String, dynamic> json, String key) {
  final value = _optionalDate(json, key);
  if (value != null) return value;
  throw FormatException('Invalid $key');
}

DateTime? _optionalDate(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is! String) throw FormatException('Invalid $key');
  final parsed = DateTime.tryParse(value);
  if (parsed == null) throw FormatException('Invalid $key');
  return parsed.toUtc();
}

void _requireKeys(Map<String, dynamic> json, Set<String> allowed) {
  if (json.keys.any((key) => !allowed.contains(key))) {
    throw const FormatException('Unexpected response field');
  }
}
