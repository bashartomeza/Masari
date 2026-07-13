class MatchResult {
  const MatchResult({
    required this.id,
    required this.status,
    required this.score,
    required this.explanation,
    required this.driverName,
    required this.routeLabel,
    required this.breakdown,
  });

  final String id;
  final String status;
  final double score;
  final String explanation;
  final String driverName;
  final String routeLabel;
  final ScoringBreakdown breakdown;

  factory MatchResult.fromJson(
    Map<String, dynamic> json,
    Map<String, dynamic> scoring,
  ) {
    final route = json['driver_route'] as Map<String, dynamic>;
    final driver = route['driver'] as Map<String, dynamic>?;
    return MatchResult(
      id: _string(json, 'id'),
      status: _string(json, 'status'),
      score: _double(json, 'score'),
      explanation: _string(json, 'explanation'),
      driverName: driver?['vehicle_type'] as String? ?? 'Driver route',
      routeLabel:
          '${_string(route, 'origin_label')} -> ${_string(route, 'destination_label')}',
      breakdown: ScoringBreakdown.fromJson(scoring),
    );
  }
}

class ScoringBreakdown {
  const ScoringBreakdown({
    required this.corridorOverlap,
    required this.pickupDistanceScore,
    required this.timingFit,
    required this.trustScore,
    required this.capacityFit,
    required this.finalScore,
  });

  final double corridorOverlap;
  final double pickupDistanceScore;
  final double timingFit;
  final double trustScore;
  final double capacityFit;
  final double finalScore;

  factory ScoringBreakdown.fromJson(Map<String, dynamic> json) {
    return ScoringBreakdown(
      corridorOverlap: _double(json, 'corridorOverlap'),
      pickupDistanceScore: _double(json, 'pickupDistanceScore'),
      timingFit: _double(json, 'timingFit'),
      trustScore: _double(json, 'trustScore'),
      capacityFit: _double(json, 'capacityFit'),
      finalScore: _double(json, 'finalScore'),
    );
  }
}

String _string(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String) return value;
  throw FormatException('Missing $key');
}

double _double(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is num) return value.toDouble();
  if (value is String) return double.parse(value);
  throw FormatException('Missing $key');
}
