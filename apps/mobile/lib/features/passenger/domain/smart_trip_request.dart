import '../data/passenger_models.dart';

/// Structured fields extracted from the passenger's natural-language request.
///
/// Masari currently operates on one locked corridor, so extraction is kept
/// deterministic and local: it recognizes the supported pickup points, a
/// requested time, and a passenger count without sending private trip text to
/// a third party. The review screen remains authoritative and lets the
/// passenger correct every value before the API is called.
class SmartTripRequest {
  const SmartTripRequest({
    required this.pickup,
    required this.destinationLabel,
    required this.preferredTime,
    required this.passengerCount,
  });

  final PickupPreset pickup;
  final String destinationLabel;
  final DateTime preferredTime;
  final int passengerCount;

  factory SmartTripRequest.extract(String request, {DateTime? now}) {
    final reference = now ?? DateTime.now();
    final normalized = _latinDigits(request).toLowerCase();

    return SmartTripRequest(
      pickup: _pickupFrom(normalized),
      destinationLabel: lockedDestinationLabel,
      preferredTime: _timeFrom(normalized, reference),
      passengerCount: _passengersFrom(normalized),
    );
  }
}

PickupPreset _pickupFrom(String request) {
  final asksForBabAlZawiya =
      request.contains('bab al-zawiya') ||
      request.contains('bab al zawiya') ||
      request.contains('bab alzawiya') ||
      request.contains('باب الزاوية');
  if (asksForBabAlZawiya) return lockedPickupPresets[1];

  return lockedPickupPresets.first;
}

int _passengersFrom(String request) {
  const passengerWords =
      r'(?:passengers?|people|persons?|ركاب|راكب|مسافرين|مسافر|أشخاص|اشخاص)';
  final afterLabel = RegExp(
    '$passengerWords\\s*[:=\u061b,.-]?\\s*(\\d+)',
    caseSensitive: false,
  ).firstMatch(request);
  final beforeLabel = RegExp(
    '(\\d+)\\s*$passengerWords',
    caseSensitive: false,
  ).firstMatch(request);
  final numeric = afterLabel?.group(1) ?? beforeLabel?.group(1);
  final parsed = numeric == null ? null : int.tryParse(numeric);
  if (parsed != null) return parsed.clamp(1, 4);

  if (RegExp(
    r'(?:راكبين|شخصين|مسافرين اثنين|two passengers)',
  ).hasMatch(request)) {
    return 2;
  }
  if (RegExp(r'(?:ثلاثة|ثلاث اشخاص|three passengers)').hasMatch(request)) {
    return 3;
  }
  if (RegExp(r'(?:أربعة|اربعة|four passengers)').hasMatch(request)) {
    return 4;
  }
  return 1;
}

DateTime _timeFrom(String request, DateTime reference) {
  final labelled = RegExp(
    r'(?:time|at|الساعة|ساعة)\s*[:=،,.-]?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|ص|م|صباحا|صباحًا|مساء|مساءً)?',
    caseSensitive: false,
  ).firstMatch(request);
  final withMeridiem = RegExp(
    r'(\d{1,2})(?::(\d{2}))\s*(am|pm|a\.m\.|p\.m\.|ص|م)',
    caseSensitive: false,
  ).firstMatch(request);
  final match = labelled ?? withMeridiem;
  if (match == null) return reference.add(const Duration(hours: 1));

  var hour = int.tryParse(match.group(1) ?? '') ?? reference.hour;
  final minute = (int.tryParse(match.group(2) ?? '') ?? 0).clamp(0, 59);
  final marker = (match.group(3) ?? '').toLowerCase();
  final isPm =
      marker == 'pm' ||
      marker == 'p.m.' ||
      marker == 'م' ||
      marker.startsWith('مساء');
  final isAm =
      marker == 'am' ||
      marker == 'a.m.' ||
      marker == 'ص' ||
      marker.startsWith('صباح');
  if (isPm && hour < 12) hour += 12;
  if (isAm && hour == 12) hour = 0;
  hour = hour.clamp(0, 23);

  var result = DateTime(
    reference.year,
    reference.month,
    reference.day,
    hour,
    minute,
  );
  if (!result.isAfter(reference)) result = result.add(const Duration(days: 1));
  return result;
}

String _latinDigits(String input) {
  const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
  const easternArabic = '۰۱۲۳۴۵۶۷۸۹';
  var result = input;
  for (var index = 0; index < 10; index += 1) {
    result = result
        .replaceAll(arabicIndic[index], '$index')
        .replaceAll(easternArabic[index], '$index');
  }
  return result;
}
