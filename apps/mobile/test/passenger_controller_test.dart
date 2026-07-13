import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:masari_mobile/core/api/api_client.dart';
import 'package:masari_mobile/core/config/app_config.dart';
import 'package:masari_mobile/features/auth/data/token_storage.dart';
import 'package:masari_mobile/features/passenger/application/passenger_controller.dart';

import 'test_app_config.dart';

void main() {
  test('dashboard refresh promotes a request failure to error state', () async {
    var fail = false;
    final container = ProviderContainer(
      overrides: [
        appConfigProvider.overrideWithValue(demoTestAppConfig),
        tokenStorageProvider.overrideWithValue(_TokenStorage()),
        httpClientProvider.overrideWithValue(
          MockClient((request) async {
            if (fail) throw StateError('dashboard unavailable');
            return http.Response('{"requests":[],"trips":[]}', 200);
          }),
        ),
      ],
    );
    addTearDown(container.dispose);

    final initial = await container.read(passengerDashboardProvider.future);
    expect(initial.activeRequest, isNull);
    expect(initial.activeTrip, isNull);

    fail = true;
    await expectLater(
      container.read(passengerDashboardProvider.notifier).refresh(),
      throwsStateError,
    );
    expect(container.read(passengerDashboardProvider).hasError, isTrue);
  });
}

class _TokenStorage extends TokenStorage {
  _TokenStorage() : super(const FlutterSecureStorage());

  @override
  Future<String?> readToken() async => 'test-token';
}
