import '../../canonical_assignments/domain/canonical_assignment_models.dart';

const canonicalSharedMatchVersion = 'canonical_shared_trip_match_v1';
const canonicalSharedTripVersion = 'canonical_shared_trip_v1';

enum SharedOfferStatus { offered, accepted, rejected, expired, invalidated }

enum SharedTripComposition { passengerOnly, merchantOnly, mixed }

class SharedStopEvent {
  const SharedStopEvent({
    required this.nameAr,
    required this.nameEn,
    required this.sequence,
    required this.passengerPickups,
    required this.passengerDropoffs,
    required this.parcelPickups,
    required this.parcelDestinations,
  });

  final String nameAr;
  final String nameEn;
  final int sequence;
  final int passengerPickups;
  final int passengerDropoffs;
  final int parcelPickups;
  final int parcelDestinations;

  factory SharedStopEvent.fromJson(Map<String, dynamic> json) {
    final values = [
      _integer(json, 'passenger_pickups'),
      _integer(json, 'passenger_drop_offs'),
      _integer(json, 'parcel_pickups'),
      _integer(json, 'parcel_destinations'),
    ];
    if (values.any((value) => value < 0)) {
      throw const FormatException('Invalid shared stop event');
    }
    return SharedStopEvent(
      nameAr: _string(json, 'name_ar'),
      nameEn: _string(json, 'name_en'),
      sequence: _positiveInteger(json, 'sequence'),
      passengerPickups: values[0],
      passengerDropoffs: values[1],
      parcelPickups: values[2],
      parcelDestinations: values[3],
    );
  }
}

class SharedTripSummary {
  const SharedTripSummary({
    required this.id,
    required this.status,
    required this.routeVersionId,
    required this.departureAt,
    required this.vehicleType,
    required this.createdAt,
  });

  final String id;
  final CanonicalTripStatus status;
  final String routeVersionId;
  final DateTime? departureAt;
  final CanonicalVehicleType? vehicleType;
  final DateTime createdAt;

  factory SharedTripSummary.fromJson(Map<String, dynamic> json) {
    if (_string(json, 'trip_version') != canonicalSharedTripVersion) {
      throw const FormatException('Unsupported shared Trip version');
    }
    return SharedTripSummary(
      id: _string(json, 'id'),
      status: canonicalTripStatusFromApi(_string(json, 'status')),
      routeVersionId: _string(json, 'route_version_id'),
      departureAt: _optionalDate(json, 'departure_at'),
      vehicleType: canonicalVehicleTypeFromApi(
        _optionalString(json, 'vehicle_type'),
      ),
      createdAt: _date(json, 'created_at'),
    );
  }
}

class SharedDriverOffer {
  const SharedDriverOffer({
    required this.id,
    required this.status,
    required this.composition,
    required this.routeVersionId,
    required this.route,
    required this.departureAt,
    required this.offeredAt,
    required this.expiresAt,
    required this.passengerRequestCount,
    required this.passengerSeatCount,
    required this.merchantOrderCount,
    required this.parcelUnitCount,
    required this.stopEvents,
    required this.trip,
    required this.rejectReason,
    required this.createdAt,
  });

  final String id;
  final SharedOfferStatus status;
  final SharedTripComposition composition;
  final String routeVersionId;
  final CanonicalRouteSummary route;
  final DateTime departureAt;
  final DateTime offeredAt;
  final DateTime expiresAt;
  final int passengerRequestCount;
  final int passengerSeatCount;
  final int merchantOrderCount;
  final int parcelUnitCount;
  final List<SharedStopEvent> stopEvents;
  final SharedTripSummary? trip;
  final CanonicalRejectReason? rejectReason;
  final DateTime createdAt;

  bool expiredAt(DateTime serverNow) =>
      status == SharedOfferStatus.expired ||
      !serverNow.toUtc().isBefore(expiresAt);

  bool actionableAt(DateTime serverNow) =>
      status == SharedOfferStatus.offered && !expiredAt(serverNow);

  factory SharedDriverOffer.fromJson(Map<String, dynamic> json) {
    if (_string(json, 'offer_version') != canonicalSharedMatchVersion) {
      throw const FormatException('Unsupported shared offer version');
    }
    final status = switch (_string(json, 'status')) {
      'offered' => SharedOfferStatus.offered,
      'accepted' => SharedOfferStatus.accepted,
      'rejected' => SharedOfferStatus.rejected,
      'expired' => SharedOfferStatus.expired,
      'invalidated' => SharedOfferStatus.invalidated,
      _ => throw const FormatException('Unsupported shared offer status'),
    };
    final composition = switch (_string(json, 'composition')) {
      'passenger_only' => SharedTripComposition.passengerOnly,
      'merchant_only' => SharedTripComposition.merchantOnly,
      'mixed' => SharedTripComposition.mixed,
      _ => throw const FormatException('Unsupported shared composition'),
    };
    final route = CanonicalRouteSummary.fromJson(_object(json, 'route'));
    if (!const {'outbound', 'inbound', 'loop'}.contains(route.direction)) {
      throw const FormatException('Unsupported shared route direction');
    }
    final rawEvents = json['stop_events'];
    if (rawEvents is! List) {
      throw const FormatException('Invalid shared stop events');
    }
    final events = rawEvents
        .map((value) => SharedStopEvent.fromJson(_map(value)))
        .toList(growable: false);
    if (events.isEmpty || events.length > route.stops.length) {
      throw const FormatException('Invalid shared stop events');
    }
    for (var index = 1; index < events.length; index++) {
      if (events[index - 1].sequence >= events[index].sequence) {
        throw const FormatException('Invalid shared stop event order');
      }
    }
    for (final event in events) {
      final routeStops = route.stops.where(
        (stop) => stop.sequence == event.sequence,
      );
      if (routeStops.length != 1) {
        throw const FormatException('Unknown shared stop event');
      }
      final stop = routeStops.single;
      if (stop.nameAr != event.nameAr || stop.nameEn != event.nameEn) {
        throw const FormatException('Mismatched shared stop event');
      }
      if (event.passengerPickups == 0 &&
          event.passengerDropoffs == 0 &&
          event.parcelPickups == 0 &&
          event.parcelDestinations == 0) {
        throw const FormatException('Empty shared stop event');
      }
    }
    final passengerRequests = _integer(json, 'passenger_request_count');
    final passengerSeats = _integer(json, 'passenger_seat_count');
    final merchantOrders = _integer(json, 'merchant_order_count');
    final parcelUnits = _integer(json, 'parcel_unit_count');
    if ([
      passengerRequests,
      passengerSeats,
      merchantOrders,
      parcelUnits,
    ].any((value) => value < 0)) {
      throw const FormatException('Invalid shared aggregate counts');
    }
    final compositionValid = switch (composition) {
      SharedTripComposition.passengerOnly =>
        passengerRequests > 0 &&
            passengerSeats > 0 &&
            merchantOrders == 0 &&
            parcelUnits == 0,
      SharedTripComposition.merchantOnly =>
        passengerRequests == 0 &&
            passengerSeats == 0 &&
            merchantOrders > 0 &&
            parcelUnits > 0,
      SharedTripComposition.mixed =>
        passengerRequests > 0 &&
            passengerSeats > 0 &&
            merchantOrders > 0 &&
            parcelUnits > 0,
    };
    if (!compositionValid) {
      throw const FormatException('Invalid shared composition counts');
    }
    final passengerPickups = events.fold<int>(
      0,
      (total, event) => total + event.passengerPickups,
    );
    final passengerDropoffs = events.fold<int>(
      0,
      (total, event) => total + event.passengerDropoffs,
    );
    final parcelPickups = events.fold<int>(
      0,
      (total, event) => total + event.parcelPickups,
    );
    final parcelDestinations = events.fold<int>(
      0,
      (total, event) => total + event.parcelDestinations,
    );
    if (passengerPickups != passengerSeats ||
        passengerDropoffs != passengerSeats ||
        parcelPickups != parcelUnits ||
        parcelDestinations != parcelUnits) {
      throw const FormatException('Inconsistent shared stop event totals');
    }
    final rawReason = _optionalString(json, 'reject_reason');
    final reason = rawReason == null
        ? null
        : CanonicalRejectReason.values
              .where((value) => value.apiValue == rawReason)
              .firstOrNull;
    if (rawReason != null && reason == null) {
      throw const FormatException('Unsupported shared rejection reason');
    }
    final rawTrip = _optionalObject(json, 'trip');
    final trip = rawTrip == null ? null : SharedTripSummary.fromJson(rawTrip);
    if (status == SharedOfferStatus.accepted && trip == null) {
      throw const FormatException('Accepted shared offer is missing Trip');
    }
    if (status != SharedOfferStatus.accepted && trip != null) {
      throw const FormatException('Terminal shared offer has unexpected Trip');
    }
    final routeVersionId = _string(json, 'route_version_id');
    if (trip != null && trip.routeVersionId != routeVersionId) {
      throw const FormatException('Shared Trip route mismatch');
    }
    return SharedDriverOffer(
      id: _string(json, 'id'),
      status: status,
      composition: composition,
      routeVersionId: routeVersionId,
      route: route,
      departureAt: _date(json, 'departure_at'),
      offeredAt: _date(json, 'offered_at'),
      expiresAt: _date(json, 'expires_at'),
      passengerRequestCount: passengerRequests,
      passengerSeatCount: passengerSeats,
      merchantOrderCount: merchantOrders,
      parcelUnitCount: parcelUnits,
      stopEvents: List.unmodifiable(events),
      trip: trip,
      rejectReason: reason,
      createdAt: _date(json, 'created_at'),
    );
  }
}

class SharedOfferPage {
  const SharedOfferPage({
    required this.offers,
    required this.nextCursor,
    required this.serverNow,
  });

  final List<SharedDriverOffer> offers;
  final String? nextCursor;
  final DateTime serverNow;

  factory SharedOfferPage.fromJson(Map<String, dynamic> json) {
    final rawOffers = json['offers'];
    if (rawOffers is! List) {
      throw const FormatException('Invalid shared offers');
    }
    return SharedOfferPage(
      offers: List.unmodifiable(
        rawOffers.map((value) => SharedDriverOffer.fromJson(_map(value))),
      ),
      nextCursor: _optionalString(json, 'next_cursor'),
      serverNow: _date(json, 'server_now'),
    );
  }
}

class SharedOfferEnvelope {
  const SharedOfferEnvelope({required this.offer, required this.serverNow});

  final SharedDriverOffer offer;
  final DateTime serverNow;

  factory SharedOfferEnvelope.fromJson(Map<String, dynamic> json) =>
      SharedOfferEnvelope(
        offer: SharedDriverOffer.fromJson(_object(json, 'offer')),
        serverNow: _date(json, 'server_now'),
      );
}

class ServerClock {
  ServerClock.sample(DateTime serverNow)
    : _serverNow = serverNow.toUtc(),
      _elapsed = Stopwatch()..start();

  final DateTime _serverNow;
  final Stopwatch _elapsed;

  DateTime get now => _serverNow.add(_elapsed.elapsed);
}

Map<String, dynamic> _map(Object? value) {
  if (value is Map<String, dynamic>) return value;
  throw const FormatException('Expected object');
}

Map<String, dynamic> _object(Map<String, dynamic> json, String key) =>
    _map(json[key]);

Map<String, dynamic>? _optionalObject(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value == null) return null;
  return _map(value);
}

String _string(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Invalid $key');
}

String? _optionalString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Invalid $key');
}

int _integer(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is int) return value;
  throw FormatException('Invalid $key');
}

int _positiveInteger(Map<String, dynamic> json, String key) {
  final value = _integer(json, key);
  if (value < 1) throw FormatException('Invalid $key');
  return value;
}

DateTime _date(Map<String, dynamic> json, String key) {
  final value = _optionalDate(json, key);
  if (value == null) throw FormatException('Invalid $key');
  return value;
}

DateTime? _optionalDate(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is! String) throw FormatException('Invalid $key');
  final parsed = DateTime.tryParse(value);
  if (parsed == null) throw FormatException('Invalid $key');
  return parsed.toUtc();
}
