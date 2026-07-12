import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'api_error.dart';

final httpClientProvider = Provider<http.Client>((ref) {
  final client = http.Client();
  ref.onDispose(client.close);
  return client;
});

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    baseUrl: const AppConfig.fromEnvironment().apiBaseUrl,
    client: ref.watch(httpClientProvider),
  );
});

class ApiClient {
  const ApiClient({
    required this.baseUrl,
    required this.client,
    this.timeout = const Duration(seconds: 12),
  });

  final String baseUrl;
  final http.Client client;
  final Duration timeout;

  Future<Map<String, dynamic>> getJson(String path, {String? token}) async {
    return _sendJson(() {
      return client.get(_uri(path), headers: _headers(token));
    });
  }

  Future<Map<String, dynamic>> postJson(
    String path, {
    required Map<String, dynamic> body,
    String? token,
  }) async {
    return _sendJson(() {
      return client.post(
        _uri(path),
        headers: _headers(token),
        body: jsonEncode(body),
      );
    });
  }

  Uri _uri(String path) => Uri.parse('$baseUrl/api/v1$path');

  Map<String, String> _headers(String? token) {
    final headers = <String, String>{
      HttpHeaders.acceptHeader: 'application/json',
      HttpHeaders.contentTypeHeader: 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers[HttpHeaders.authorizationHeader] = 'Bearer $token';
    }
    return headers;
  }

  Future<Map<String, dynamic>> _sendJson(
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
    if (decoded is Map<String, dynamic>) {
      return decoded;
    }
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
