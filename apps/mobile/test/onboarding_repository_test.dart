import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:masari_mobile/core/api/api_error.dart';
import 'package:masari_mobile/features/onboarding/data/onboarding_repository.dart';
import 'package:masari_mobile/features/onboarding/domain/onboarding_models.dart';

void main() {
  test('disabled config parses and exposes no registration roles', () async {
    final repository = _repository((request) async {
      expect(request.headers[HttpHeaders.authorizationHeader], isNull);
      return http.Response(
        '{"enabled":false,"registration_roles":[],"request_id":"req"}',
        200,
      );
    });

    final config = await repository.config();

    expect(config.enabled, isFalse);
    expect(config.registrationRoles, isEmpty);
  });

  test(
    'start sends public request with idempotency and no bearer token',
    () async {
      final repository = _repository((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/api/v1/onboarding/attempts');
        expect(request.headers['Idempotency-Key'], 'idem-start');
        expect(request.headers[HttpHeaders.authorizationHeader], isNull);
        expect(request.body, contains('invitation_code'));
        return http.Response(
          '{"attempt":{"id":"attempt_1","status":"otp_sent","phone":"+970*****01","expires_at":"2026-07-20T10:00:00.000Z","resend_available_at":"2026-07-20T09:01:00.000Z"},"onboarding_token":"continuation","next_action":"verify_otp","request_id":"req"}',
          201,
        );
      });

      final result = await repository.start(
        invitationCode: 'INVITE-CODE-1234567890',
        role: OnboardingRole.passenger,
        phone: '0590000001',
        locale: 'ar',
        idempotencyKey: 'idem-start',
      );

      expect(result.attemptId, 'attempt_1');
      expect(result.onboardingToken, 'continuation');
    },
  );

  test('continuation requests use Onboarding authorization only', () async {
    final repository = _repository((request) async {
      expect(
        request.headers[HttpHeaders.authorizationHeader],
        'Onboarding continuation',
      );
      expect(request.headers['Idempotency-Key'], 'idem-verify');
      return http.Response(
        '{"status":"phone_verified","registration_grant":"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNO12","next_action":"complete_registration","request_id":"req"}',
        200,
      );
    });

    final result = await repository.verify(
      attemptId: 'attempt_1',
      continuationToken: 'continuation',
      otp: '123456',
      idempotencyKey: 'idem-verify',
    );

    expect(result.registrationGrant, isNotEmpty);
  });

  test(
    'completion rejects operational token fields as contract violation',
    () async {
      final repository = _repository((request) async {
        return http.Response(
          '{"result":"account_created","role":"passenger","account_status":"active","next_action":"login","access_token":"bad","request_id":"req"}',
          201,
        );
      });

      await expectLater(
        repository.complete(
          attemptId: 'attempt_1',
          continuationToken: 'continuation',
          registrationGrant: 'grant',
          displayName: 'Name',
          password: 'long-password-value',
          locale: 'ar',
          consents: [
            _doc('terms'),
            _doc('privacy'),
            _doc('adult_self_attestation'),
          ],
          idempotencyKey: 'idem-complete',
        ),
        throwsA(isA<ApiException>()),
      );
    },
  );

  test('pending recovery maps generic invalid credentials safely', () async {
    final repository = _repository((request) async {
      expect(request.headers[HttpHeaders.authorizationHeader], isNull);
      return http.Response('{"error":"invalid_credentials"}', 401);
    });

    await expectLater(
      repository.recoverPendingStatus(phone: '0590000002', password: 'bad'),
      throwsA(
        isA<ApiException>().having(
          (error) => error.message,
          'message',
          'invalid_credentials',
        ),
      ),
    );
  });
}

OnboardingRepository _repository(
  Future<http.Response> Function(http.Request request) handler,
) {
  return OnboardingRepository(
    baseUrl: 'http://api.test',
    client: MockClient(handler),
  );
}

ConsentDocument _doc(String type) => ConsentDocument(
  id: 'doc_$type',
  type: type,
  version: 'v1',
  locale: 'ar',
  content: '$type content',
  contentHash: 'a' * 64,
  effectiveAt: DateTime.utc(2026, 7, 20),
);
