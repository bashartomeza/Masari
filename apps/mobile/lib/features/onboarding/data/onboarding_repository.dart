import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../../../core/api/api_client.dart';
import '../../../core/api/api_error.dart';
import '../domain/onboarding_models.dart';

final onboardingRepositoryProvider = Provider<OnboardingRepository>((ref) {
  final api = ref.watch(apiClientProvider);
  return OnboardingRepository(
    baseUrl: api.baseUrl,
    client: api.client,
    timeout: api.timeout,
  );
});

class OnboardingRepository {
  const OnboardingRepository({
    required this.baseUrl,
    required this.client,
    this.timeout = const Duration(seconds: 12),
  });

  final String baseUrl;
  final http.Client client;
  final Duration timeout;

  Future<OnboardingConfig> config() async {
    final json = await _get('/onboarding/config');
    try {
      return OnboardingConfig.fromJson(json);
    } on FormatException {
      throw const ApiException(ApiErrorType.validation, 'invalid_response');
    }
  }

  Future<List<ConsentDocument>> consents(String locale) async {
    final json = await _get('/onboarding/consents?locale=$locale');
    try {
      final documents = json['documents'];
      if (documents is! List) throw const FormatException('Missing documents');
      final parsed = documents
          .whereType<Map<String, dynamic>>()
          .map(ConsentDocument.fromJson)
          .toList(growable: false);
      final types = parsed.map((document) => document.type).toSet();
      if (parsed.length != 3 ||
          types.length != 3 ||
          !requiredConsentTypes.every(types.contains) ||
          parsed.any((document) => document.locale != locale)) {
        throw const FormatException('Invalid consent set');
      }
      return parsed;
    } on FormatException {
      throw const ApiException(ApiErrorType.validation, 'invalid_response');
    }
  }

  Future<StartAttemptResult> start({
    required String invitationCode,
    required OnboardingRole role,
    required String phone,
    required String locale,
    required String idempotencyKey,
  }) async {
    final json = await _post(
      '/onboarding/attempts',
      body: {
        'invitation_code': invitationCode.trim(),
        'role': role.apiValue,
        'phone': phone.trim(),
        'region': 'PS',
        'locale': locale,
      },
      idempotencyKey: idempotencyKey,
    );
    try {
      return StartAttemptResult.fromJson(json);
    } on FormatException {
      throw const ApiException(ApiErrorType.validation, 'invalid_response');
    }
  }

  Future<DateTime?> resend({
    required String attemptId,
    required String continuationToken,
    required String idempotencyKey,
  }) async {
    final json = await _post(
      '/onboarding/attempts/$attemptId/resend',
      body: const {},
      onboardingToken: continuationToken,
      idempotencyKey: idempotencyKey,
    );
    final value = json['resend_available_at'];
    return value is String ? DateTime.tryParse(value)?.toUtc() : null;
  }

  Future<VerifyOtpResult> verify({
    required String attemptId,
    required String continuationToken,
    required String otp,
    required String idempotencyKey,
  }) async {
    final json = await _post(
      '/onboarding/attempts/$attemptId/verify',
      body: {'otp': otp},
      onboardingToken: continuationToken,
      idempotencyKey: idempotencyKey,
    );
    try {
      return VerifyOtpResult.fromJson(json);
    } on FormatException {
      throw const ApiException(ApiErrorType.validation, 'invalid_response');
    }
  }

  Future<CompleteRegistrationResult> complete({
    required String attemptId,
    required String continuationToken,
    required String registrationGrant,
    required String displayName,
    required String password,
    required String locale,
    required List<ConsentDocument> consents,
    required String idempotencyKey,
  }) async {
    final json = await _post(
      '/onboarding/attempts/$attemptId/complete',
      body: {
        'registration_grant': registrationGrant,
        'display_name': displayName,
        'password': password,
        'locale': locale,
        'adult_self_attestation': true,
        'consents': consents
            .map(
              (document) => {
                'id': document.id,
                'type': document.type,
                'content_hash': document.contentHash,
              },
            )
            .toList(growable: false),
      },
      onboardingToken: continuationToken,
      idempotencyKey: idempotencyKey,
    );
    try {
      return CompleteRegistrationResult.fromJson(json);
    } on FormatException {
      throw const ApiException(ApiErrorType.validation, 'invalid_response');
    }
  }

  Future<PendingStatusResult> status(String onboardingToken) async {
    final json = await _get(
      '/onboarding/status',
      onboardingToken: onboardingToken,
    );
    try {
      return PendingStatusResult.fromJson(json);
    } on FormatException {
      throw const ApiException(ApiErrorType.validation, 'invalid_response');
    }
  }

  Future<PendingStatusResult> recoverPendingStatus({
    required String phone,
    required String password,
  }) async {
    final json = await _post(
      '/onboarding/status-sessions',
      body: {'phone': phone.trim(), 'region': 'PS', 'password': password},
    );
    try {
      return PendingStatusResult.fromJson(json);
    } on FormatException {
      throw const ApiException(ApiErrorType.validation, 'invalid_response');
    }
  }

  Future<Map<String, dynamic>> _get(String path, {String? onboardingToken}) {
    return _send(() {
      return client.get(_uri(path), headers: _headers(onboardingToken));
    });
  }

  Future<Map<String, dynamic>> _post(
    String path, {
    required Map<String, dynamic> body,
    String? onboardingToken,
    String? idempotencyKey,
  }) {
    return _send(() {
      return client.post(
        _uri(path),
        headers: _headers(onboardingToken, idempotencyKey: idempotencyKey),
        body: jsonEncode(body),
      );
    });
  }

  Uri _uri(String path) => Uri.parse('$baseUrl/api/v1$path');

  Map<String, String> _headers(
    String? onboardingToken, {
    String? idempotencyKey,
  }) {
    final headers = <String, String>{
      HttpHeaders.acceptHeader: 'application/json',
      HttpHeaders.contentTypeHeader: 'application/json',
    };
    if (onboardingToken != null && onboardingToken.isNotEmpty) {
      headers[HttpHeaders.authorizationHeader] = 'Onboarding $onboardingToken';
    }
    if (idempotencyKey != null && idempotencyKey.isNotEmpty) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return headers;
  }

  Future<Map<String, dynamic>> _send(
    Future<http.Response> Function() send,
  ) async {
    try {
      final response = await send().timeout(timeout);
      final decoded = _decodeObject(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return decoded;
      }
      throw _mapStatus(response.statusCode, decoded);
    } on ApiException {
      rethrow;
    } on TimeoutException {
      throw const ApiException(ApiErrorType.timeout, 'request_timeout');
    } on SocketException {
      throw const ApiException(ApiErrorType.network, 'network_unavailable');
    } on http.ClientException {
      throw const ApiException(ApiErrorType.network, 'network_unavailable');
    } on FormatException {
      throw const ApiException(ApiErrorType.validation, 'invalid_response');
    }
  }

  Map<String, dynamic> _decodeObject(String body) {
    final decoded = jsonDecode(body);
    if (decoded is Map<String, dynamic>) return decoded;
    throw const FormatException('Expected JSON object');
  }

  ApiException _mapStatus(int statusCode, Map<String, dynamic> body) {
    final message = body['error'] is String
        ? body['error'] as String
        : 'request_failed';
    final type = switch (statusCode) {
      400 || 422 => ApiErrorType.validation,
      401 => ApiErrorType.unauthorized,
      403 => ApiErrorType.forbidden,
      >= 500 => ApiErrorType.server,
      _ => ApiErrorType.unknown,
    };
    return ApiException(type, message, statusCode: statusCode);
  }
}

String newIdempotencyKey() {
  const alphabet =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._:-';
  final random = Random.secure();
  return List.generate(
    32,
    (_) => alphabet[random.nextInt(alphabet.length)],
  ).join();
}
