enum PassengerAssistantReplyType { clarification, requestReview, result }

class PassengerAssistantTripDraft {
  const PassengerAssistantTripDraft({
    required this.pickupKey,
    required this.pickupLabel,
    required this.destinationKey,
    required this.destinationLabel,
    required this.preferredTime,
    required this.passengerCount,
  });

  factory PassengerAssistantTripDraft.fromJson(Map<String, dynamic> json) {
    final preferredTime = json['preferred_time'];
    final passengerCount = json['passenger_count'];
    if (preferredTime is! String || passengerCount is! num) {
      throw const FormatException('Invalid extracted trip data');
    }
    return PassengerAssistantTripDraft(
      pickupKey: _requiredString(json, 'pickup_key'),
      pickupLabel: _requiredString(json, 'pickup_label'),
      destinationKey: _requiredString(json, 'destination_key'),
      destinationLabel: _requiredString(json, 'destination_label'),
      preferredTime: DateTime.parse(preferredTime).toLocal(),
      passengerCount: passengerCount.toInt(),
    );
  }

  final String pickupKey;
  final String pickupLabel;
  final String destinationKey;
  final String destinationLabel;
  final DateTime preferredTime;
  final int passengerCount;

  PassengerAssistantTripDraft copyWith({
    String? pickupKey,
    String? pickupLabel,
    String? destinationKey,
    String? destinationLabel,
    DateTime? preferredTime,
    int? passengerCount,
  }) => PassengerAssistantTripDraft(
    pickupKey: pickupKey ?? this.pickupKey,
    pickupLabel: pickupLabel ?? this.pickupLabel,
    destinationKey: destinationKey ?? this.destinationKey,
    destinationLabel: destinationLabel ?? this.destinationLabel,
    preferredTime: preferredTime ?? this.preferredTime,
    passengerCount: passengerCount ?? this.passengerCount,
  );
}

class PassengerAssistantTripOption {
  const PassengerAssistantTripOption({
    required this.id,
    required this.driverName,
    required this.fromLabel,
    required this.toLabel,
    required this.seatsAvailable,
    required this.score,
    this.departureAt,
    this.availabilityWindowEnd,
    this.vehicleType,
    this.trustScore,
  });

  factory PassengerAssistantTripOption.fromJson(Map<String, dynamic> json) {
    final rawDriver = json['driver'];
    if (rawDriver is! Map) {
      throw const FormatException('Missing trip driver');
    }
    final driver = rawDriver.map(
      (key, value) => MapEntry(key.toString(), value),
    );
    final rawDeparture = json['departure_at'];
    final rawWindowEnd = json['availability_window_end'];
    final rawSeats = json['seats_available'];
    final rawScore = json['score'];
    if (rawSeats is! num || rawScore is! num) {
      throw const FormatException('Invalid trip result');
    }

    return PassengerAssistantTripOption(
      id: _requiredString(json, 'id'),
      driverName: _requiredString(driver, 'name'),
      fromLabel: _requiredString(json, 'origin_label'),
      toLabel: _requiredString(json, 'destination_label'),
      departureAt: rawDeparture is String
          ? DateTime.parse(rawDeparture).toLocal()
          : null,
      availabilityWindowEnd: rawWindowEnd is String
          ? DateTime.parse(rawWindowEnd).toLocal()
          : null,
      seatsAvailable: rawSeats.toInt(),
      vehicleType: driver['vehicle_type'] as String?,
      trustScore: (driver['trust_score'] as num?)?.toInt(),
      score: rawScore.toDouble(),
    );
  }

  final String id;
  final String driverName;
  final String fromLabel;
  final String toLabel;
  final DateTime? departureAt;
  final DateTime? availabilityWindowEnd;
  final int seatsAvailable;
  final String? vehicleType;
  final int? trustScore;
  final double score;
}

class PassengerAssistantReply {
  const PassengerAssistantReply({
    required this.type,
    required this.message,
    this.conversationId,
    this.suggestions = const [],
    this.draft,
  });

  factory PassengerAssistantReply.fromJson(Map<String, dynamic> json) {
    final nested = json['reply'];
    final payload = nested is Map<String, dynamic> ? nested : json;
    final status = payload['status'];
    final type = switch (status) {
      'clarification' => PassengerAssistantReplyType.clarification,
      'request_review' => PassengerAssistantReplyType.requestReview,
      'result' => PassengerAssistantReplyType.result,
      _ => throw const FormatException('Unsupported assistant reply status'),
    };
    final rawMessage = switch (type) {
      PassengerAssistantReplyType.clarification =>
        payload['question'] ?? payload['message'],
      PassengerAssistantReplyType.requestReview => payload['message'],
      PassengerAssistantReplyType.result =>
        payload['answer'] ?? payload['message'],
    };
    if (rawMessage is! String || rawMessage.trim().isEmpty) {
      throw const FormatException('Missing assistant reply message');
    }

    final rawSuggestions = payload['suggestions'];
    final suggestions = rawSuggestions is List
        ? rawSuggestions
              .whereType<String>()
              .map((value) => value.trim())
              .where((value) => value.isNotEmpty)
              .toList(growable: false)
        : const <String>[];
    final rawConversationId =
        payload['conversation_id'] ?? json['conversation_id'];
    final rawDraft = payload['extracted'];
    final draft =
        type == PassengerAssistantReplyType.requestReview && rawDraft is Map
        ? PassengerAssistantTripDraft.fromJson(
            rawDraft.map((key, value) => MapEntry(key.toString(), value)),
          )
        : null;
    if (type == PassengerAssistantReplyType.requestReview && draft == null) {
      throw const FormatException('Missing extracted trip data');
    }

    return PassengerAssistantReply(
      type: type,
      message: rawMessage.trim(),
      conversationId:
          rawConversationId is String && rawConversationId.trim().isNotEmpty
          ? rawConversationId.trim()
          : null,
      suggestions: suggestions,
      draft: draft,
    );
  }

  final PassengerAssistantReplyType type;
  final String message;
  final String? conversationId;
  final List<String> suggestions;
  final PassengerAssistantTripDraft? draft;
}

enum PassengerAssistantMessageRole { passenger, assistant }

class PassengerAssistantMessage {
  const PassengerAssistantMessage({required this.role, required this.text});

  const PassengerAssistantMessage.passenger(String text)
    : this(role: PassengerAssistantMessageRole.passenger, text: text);

  const PassengerAssistantMessage.assistant(String text)
    : this(role: PassengerAssistantMessageRole.assistant, text: text);

  final PassengerAssistantMessageRole role;
  final String text;
}

enum PassengerAssistantPhase {
  ready,
  processing,
  clarification,
  requestReview,
  searching,
  result,
  error,
}

enum PassengerAssistantFailure { unavailable, network, generic }

class PassengerAssistantState {
  const PassengerAssistantState({
    this.phase = PassengerAssistantPhase.ready,
    this.messages = const [],
    this.suggestions = const [],
    this.conversationId,
    this.lastQuery,
    this.lastLocale = 'ar',
    this.failure,
    this.draft,
    this.searchFailure,
    this.tripOptions = const [],
    this.selectingTripId,
    this.selectionFailure,
  });

  final PassengerAssistantPhase phase;
  final List<PassengerAssistantMessage> messages;
  final List<String> suggestions;
  final String? conversationId;
  final String? lastQuery;
  final String lastLocale;
  final PassengerAssistantFailure? failure;
  final PassengerAssistantTripDraft? draft;
  final PassengerAssistantFailure? searchFailure;
  final List<PassengerAssistantTripOption> tripOptions;
  final String? selectingTripId;
  final PassengerAssistantFailure? selectionFailure;
}

String _requiredString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String && value.trim().isNotEmpty) return value.trim();
  throw FormatException('Missing $key');
}
