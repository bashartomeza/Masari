import 'package:flutter_test/flutter_test.dart';
import 'package:masari_mobile/features/passenger/domain/smart_trip_request.dart';

void main() {
  test('extracts the English review fields before search', () {
    final request = SmartTripRequest.extract(
      'From: Bab Al-Zawiya To: Bethlehem Time: 3:00 PM Passengers: 2',
      now: DateTime(2026, 8, 27, 10),
    );

    expect(request.pickup.key, 'bab_al_zawiya');
    expect(request.destinationLabel, 'Bethlehem Center');
    expect(request.preferredTime, DateTime(2026, 8, 27, 15));
    expect(request.passengerCount, 2);
  });

  test('understands Arabic digits and rolls a past time to tomorrow', () {
    final request = SmartTripRequest.extract(
      'من باب الزاوية إلى بيت لحم الساعة ٣:٣٠ م، ٣ ركاب',
      now: DateTime(2026, 8, 27, 18),
    );

    expect(request.pickup.key, 'bab_al_zawiya');
    expect(request.preferredTime, DateTime(2026, 8, 28, 15, 30));
    expect(request.passengerCount, 3);
  });
}
