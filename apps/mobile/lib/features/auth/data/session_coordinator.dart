import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_error.dart';
import '../domain/auth_models.dart';
import 'token_storage.dart';

final authSessionCoordinatorProvider = Provider<AuthSessionCoordinator>((ref) {
  return AuthSessionCoordinator(
    apiClient: ref.watch(apiClientProvider),
    tokenStorage: ref.watch(tokenStorageProvider),
  );
});

enum SessionTransitionType {
  refreshing,
  refreshed,
  retryableFailure,
  terminated,
}

class SessionTransition {
  const SessionTransition._(this.type, {this.error, this.reason});

  const SessionTransition.refreshing()
    : this._(SessionTransitionType.refreshing);

  const SessionTransition.refreshed() : this._(SessionTransitionType.refreshed);

  const SessionTransition.retryable(ApiException error)
    : this._(SessionTransitionType.retryableFailure, error: error);

  const SessionTransition.terminated(SessionEndReason reason)
    : this._(SessionTransitionType.terminated, reason: reason);

  final SessionTransitionType type;
  final ApiException? error;
  final SessionEndReason? reason;
}

typedef SessionTransitionListener = void Function(SessionTransition event);

class AuthSessionCoordinator {
  AuthSessionCoordinator({
    required this.apiClient,
    required this.tokenStorage,
    this.refreshThreshold = const Duration(seconds: 60),
    DateTime Function()? now,
  }) : _now = now ?? DateTime.now;

  final ApiClient apiClient;
  final TokenStorage tokenStorage;
  final Duration refreshThreshold;
  final DateTime Function() _now;

  AuthTokenBundle? _bundle;
  Future<AuthTokenBundle>? _refreshFuture;
  Future<void>? _terminalFuture;
  SessionTransitionListener? _listener;
  SessionEndReason? _lastTerminationReason;

  AuthTokenBundle? get cachedBundle => _bundle;
  String? get currentSessionId => _bundle?.sessionId;
  SessionEndReason? get lastTerminationReason => _lastTerminationReason;

  void setListener(SessionTransitionListener? listener) {
    _listener = listener;
  }

  Future<AuthTokenBundle?> restoreBundle() async {
    _bundle = await tokenStorage.readBundle();
    _lastTerminationReason = null;
    _terminalFuture = null;
    return _bundle;
  }

  Future<void> installBundle(AuthTokenBundle bundle) async {
    await tokenStorage.saveBundle(bundle);
    _bundle = bundle;
    _lastTerminationReason = null;
    _terminalFuture = null;
  }

  Future<void> promoteLegacyBundle() async {
    final bundle = _bundle;
    if (bundle == null || !bundle.legacyAccessOnly) return;
    final migrated = bundle.asMigratedLegacy();
    await tokenStorage.promoteLegacy(migrated);
    _bundle = migrated;
  }

  Future<void> clearCredentials({SessionEndReason? reason}) async {
    if (reason != null) {
      await _terminate(reason);
      return;
    }
    await tokenStorage.clearAuth();
    _bundle = null;
    _lastTerminationReason = null;
    _terminalFuture = null;
  }

  Future<Map<String, dynamic>> sendAuthenticated(
    Future<Map<String, dynamic>> Function(String accessToken) request,
  ) async {
    var bundle = await _bundleForRequest();
    try {
      return await request(bundle.accessToken);
    } on ApiException catch (error) {
      if (error.message == 'access_token_expired' && bundle.canRefresh) {
        bundle = await refresh();
        try {
          return await request(bundle.accessToken);
        } on ApiException catch (retryError) {
          await _handleFinalAccessError(retryError);
          rethrow;
        }
      }
      await _handleFinalAccessError(error);
      rethrow;
    }
  }

  Future<AuthTokenBundle> refresh() async {
    final active = _refreshFuture;
    if (active != null) return active;

    final future = _performRefresh();
    _refreshFuture = future;
    try {
      return await future;
    } finally {
      if (identical(_refreshFuture, future)) _refreshFuture = null;
    }
  }

  Future<AuthTokenBundle> _bundleForRequest() async {
    final bundle = _bundle ?? await _loadBundle();
    if (bundle == null) {
      await _terminate(SessionEndReason.ended);
      throw const ApiException(
        ApiErrorType.unauthorized,
        'missing_token',
        statusCode: 401,
      );
    }

    final accessExpiry = bundle.accessTokenExpiresAt;
    if (accessExpiry == null) return bundle;

    final remaining = accessExpiry.difference(_now().toUtc());
    if (remaining <= Duration.zero && !bundle.canRefresh) {
      await _terminate(SessionEndReason.expired);
      throw const ApiException(
        ApiErrorType.unauthorized,
        'access_token_expired',
        statusCode: 401,
      );
    }
    if (bundle.canRefresh && remaining < refreshThreshold) {
      return refresh();
    }
    return bundle;
  }

  Future<AuthTokenBundle> _performRefresh() async {
    final bundle = _bundle ?? await _loadBundle();
    final refreshToken = bundle?.refreshToken;
    if (bundle == null || refreshToken == null || refreshToken.isEmpty) {
      await _terminate(SessionEndReason.ended);
      throw const ApiException(
        ApiErrorType.unauthorized,
        'invalid_refresh_token',
        statusCode: 401,
      );
    }
    final refreshExpiry = bundle.refreshTokenExpiresAt;
    if (refreshExpiry != null && !refreshExpiry.isAfter(_now().toUtc())) {
      await _terminate(SessionEndReason.expired);
      throw const ApiException(
        ApiErrorType.unauthorized,
        'session_expired',
        statusCode: 401,
      );
    }

    _emit(const SessionTransition.refreshing());
    try {
      final json = await apiClient.postJson(
        '/auth/refresh',
        body: {'refresh_token': refreshToken},
      );
      final result = LoginResult.fromJson(json, receivedAt: _now().toUtc());
      final replacement = result.bundle;
      if (!replacement.canRefresh ||
          (bundle.sessionId != null &&
              replacement.sessionId != bundle.sessionId)) {
        throw const FormatException('Invalid refresh response');
      }
      await tokenStorage.saveBundle(replacement);
      _bundle = replacement;
      _lastTerminationReason = null;
      _emit(const SessionTransition.refreshed());
      return replacement;
    } on ApiException catch (error) {
      if (_isRetryableRefreshFailure(error)) {
        _emit(SessionTransition.retryable(error));
        rethrow;
      }
      final reason = sessionEndReasonForCode(error.message);
      await _terminate(reason);
      rethrow;
    } on FormatException {
      await _terminate(SessionEndReason.ended);
      throw const ApiException(
        ApiErrorType.validation,
        'invalid_refresh_response',
      );
    } catch (_) {
      await _terminate(SessionEndReason.ended);
      throw const ApiException(
        ApiErrorType.validation,
        'invalid_refresh_response',
      );
    }
  }

  Future<void> _handleFinalAccessError(ApiException error) async {
    if (error.message == 'access_token_expired') {
      await _terminate(SessionEndReason.expired);
      return;
    }
    if (_terminalAccessCodes.contains(error.message)) {
      await _terminate(sessionEndReasonForCode(error.message));
    }
  }

  bool _isRetryableRefreshFailure(ApiException error) {
    return error.type == ApiErrorType.network ||
        error.type == ApiErrorType.timeout ||
        error.type == ApiErrorType.server;
  }

  Future<void> _terminate(SessionEndReason reason) {
    final active = _terminalFuture;
    if (active != null) return active;
    final future = _clearAndNotify(reason);
    _terminalFuture = future;
    return future;
  }

  Future<void> _clearAndNotify(SessionEndReason reason) async {
    await tokenStorage.clearAuth();
    _bundle = null;
    _lastTerminationReason = reason;
    _emit(SessionTransition.terminated(reason));
  }

  void _emit(SessionTransition transition) => _listener?.call(transition);

  Future<AuthTokenBundle?> _loadBundle() async {
    if (_lastTerminationReason != null) return null;
    _bundle = await tokenStorage.readBundle();
    return _bundle;
  }
}

const _terminalAccessCodes = {
  'invalid_token',
  'invalid_session',
  'session_revoked',
  'session_expired',
  'account_unavailable',
  'missing_token',
};
