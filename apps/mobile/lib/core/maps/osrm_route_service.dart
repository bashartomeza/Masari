import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

class OsrmRouteResult {
  const OsrmRouteResult({
    required this.points,
    required this.durationSeconds,
    required this.distanceMeters,
  });

  final List<LatLng> points;
  final double durationSeconds;
  final double distanceMeters;

  /// Estimated travel time in minutes.
  int get durationMinutes =>
      (durationSeconds / 60).ceil();

  /// Estimated travel time in hours and minutes.
  String get formattedDuration {
    final totalMinutes = durationMinutes;

    if (totalMinutes < 60) {
      return '$totalMinutes min';
    }

    final hours = totalMinutes ~/ 60;
    final minutes = totalMinutes % 60;

    if (minutes == 0) {
      return '${hours}h';
    }

    return '${hours}h ${minutes}min';
  }

  /// Distance in kilometers.
  double get distanceKilometers =>
      distanceMeters / 1000;
}

class OsrmRouteService {
  const OsrmRouteService();

  Future<OsrmRouteResult> getRoute({
    required LatLng start,
    required LatLng end,
  }) async {
    final url = Uri.parse(
      'https://router.project-osrm.org/route/v1/driving/'
      '${start.longitude},${start.latitude};'
      '${end.longitude},${end.latitude}'
      '?overview=full&geometries=geojson',
    );

    final response = await http.get(url);

    if (response.statusCode != 200) {
      throw Exception(
        'OSRM request failed: ${response.statusCode}',
      );
    }

    final data = jsonDecode(response.body)
        as Map<String, dynamic>;

    if (data['code'] != 'Ok') {
      throw Exception('OSRM returned an invalid route');
    }

    final routes = data['routes'] as List<dynamic>;

    if (routes.isEmpty) {
      return const OsrmRouteResult(
        points: [],
        durationSeconds: 0,
        distanceMeters: 0,
      );
    }

    final route = routes.first as Map<String, dynamic>;

    final durationSeconds =
        (route['duration'] as num?)?.toDouble() ?? 0;

    final distanceMeters =
        (route['distance'] as num?)?.toDouble() ?? 0;

    final geometry =
        route['geometry'] as Map<String, dynamic>;

    final coordinates =
        geometry['coordinates'] as List<dynamic>;

    final points = coordinates.map((coordinate) {
      final point = coordinate as List<dynamic>;

      return LatLng(
        (point[1] as num).toDouble(),
        (point[0] as num).toDouble(),
      );
    }).toList(growable: false);

    return OsrmRouteResult(
      points: points,
      durationSeconds: durationSeconds,
      distanceMeters: distanceMeters,
    );
  }
}