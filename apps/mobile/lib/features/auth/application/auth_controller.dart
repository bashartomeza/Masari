import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_error.dart';
import '../../driver/application/driver_controller.dart';
import '../../merchant/application/merchant_controller.dart';
import '../../passenger/application/passenger_controller.dart';
import '../../security/data/session_repository.dart';
import '../../trips/application/passenger_trip_controller.dart';
import '../data/auth_repository.dart';
import '../data/session_coordinator.dart';
import '../domain/auth_models.dart';

enum AuthStatus {
  restoring,
  unauthenticated,
  authenticating,
  authenticated,
  refreshing,
  retryableFailure,
  restoreFailed,
  sessionEnded,
}

class AuthState {
  const AuthState({
    required this.status,
    this.user,
    this.error,
    this.sessionEndReason,
  });

  const AuthState.restoring() : this(status: AuthStatus.restoring);

  const AuthState.unauthenticated() : this(status: AuthStatus.unauthenticated);

  const AuthState.authenticating() : this(status: AuthStatus.authenticating);

  const AuthState.authenticated(AuthUser user)
    : this(status: AuthStatus.authenticated, user: user);

  const AuthState.refreshing(AuthUser user)
    : this(status: AuthStatus.refreshing, user: user);

  const AuthState.retryableFailure(AuthUser user, ApiException error)
    : this(status: AuthStatus.retryableFailure, user: user, error: error);

  const AuthState.restoreFailed(ApiException error)
    : this(status: AuthStatus.restoreFailed, error: error);

  const AuthState.sessionEnded(SessionEndReason reason)
    : this(status: AuthStatus.sessionEnded, sessionEndReason: reason);

  final AuthStatus status;
  final AuthUser? user;
  final ApiException? error;
  final SessionEndReason? sessionEndReason;

  bool get isAuthenticated =>
      user != null &&
      (status == AuthStatus.authenticated ||
          status == AuthStatus.refreshing ||
          status == AuthStatus.retryableFailure);
}

final authControllerProvider = AsyncNotifierProvider<AuthController, AuthState>(
  AuthController.new,
);

class AuthController extends AsyncNotifier<AuthState> {
  AuthRepository get _repository => ref.read(authRepositoryProvider);
  late AuthSessionCoordinator _coordinator;
  SessionRepository get _sessionRepository =>
      ref.read(sessionRepositoryProvider);

  AuthUser? _currentUser;

  @override
  Future<AuthState> build() async {
    _coordinator = ref.read(authSessionCoordinatorProvider);
    _coordinator.setListener(_handleSessionTransition);
    ref.onDispose(() => _coordinator.setListener(null));
    final bundle = await _coordinator.restoreBundle();
    if (bundle == null) return const AuthState.unauthenticated();
    return _restoreLoadedSession();
  }

  Future<void> retryRestore() async {
    state = const AsyncData(AuthState.authenticating());
    final bundle = await _coordinator.restoreBundle();
    if (bundle == null) {
      state = const AsyncData(AuthState.unauthenticated());
      return;
    }
    state = AsyncData(await _restoreLoadedSession());
  }

  Future<void> login({required String phone, required String password}) async {
    state = const AsyncData(AuthState.authenticating());
    try {
      final result = await _repository.login(phone: phone, password: password);
      await _coordinator.installBundle(result.bundle);
      _currentUser = result.user;
      state = AsyncData(AuthState.authenticated(result.user));
    } on ApiException catch (error, stackTrace) {
      state = AsyncError(error, stackTrace);
    }
  }

  Future<void> retryRefresh() async {
    try {
      await _coordinator.retryRefresh();
    } on ApiException {
      // The coordinator publishes either retryable or terminal state.
    }
  }

  Future<void> logout() async {
    try {
      await _sessionRepository.logout();
    } catch (_) {
      // Explicit logout is local-first safe even when server revocation cannot
      // be confirmed because the network is unavailable.
    }
    await _clearLocalSession();
  }

  Future<void> logoutAll() async {
    await _sessionRepository.logoutAll();
    await _clearLocalSession();
  }

  Future<void> completeCurrentSessionRevocation() async {
    await _coordinator.clearCredentials();
    _currentUser = null;
    _invalidateAuthenticatedWork();
    state = const AsyncData(AuthState.sessionEnded(SessionEndReason.ended));
  }

  Future<AuthState> _restoreLoadedSession() async {
    try {
      final user = await _repository.me();
      await _coordinator.promoteLegacyBundle();
      _currentUser = user;
      return AuthState.authenticated(user);
    } on ApiException catch (error) {
      if (error.type == ApiErrorType.network ||
          error.type == ApiErrorType.timeout ||
          error.type == ApiErrorType.server) {
        return AuthState.restoreFailed(error);
      }
      final reason = _coordinator.lastTerminationReason;
      if (reason != null) return AuthState.sessionEnded(reason);
      await _coordinator.clearCredentials();
      return const AuthState.unauthenticated();
    }
  }

  Future<void> _clearLocalSession() async {
    await _coordinator.clearCredentials();
    _currentUser = null;
    _invalidateAuthenticatedWork();
    state = const AsyncData(AuthState.unauthenticated());
  }

  void _handleSessionTransition(SessionTransition transition) {
    switch (transition.type) {
      case SessionTransitionType.refreshing:
        final user = _currentUser;
        if (user != null) state = AsyncData(AuthState.refreshing(user));
        break;
      case SessionTransitionType.refreshed:
        final user = _currentUser;
        if (user != null) state = AsyncData(AuthState.authenticated(user));
        break;
      case SessionTransitionType.retryableFailure:
        final user = _currentUser;
        final error = transition.error;
        if (user != null && error != null) {
          state = AsyncData(AuthState.retryableFailure(user, error));
        }
        break;
      case SessionTransitionType.terminated:
        _currentUser = null;
        _invalidateAuthenticatedWork();
        state = AsyncData(
          AuthState.sessionEnded(transition.reason ?? SessionEndReason.ended),
        );
        break;
    }
  }

  void _invalidateAuthenticatedWork() {
    ref.invalidate(passengerDashboardProvider);
    ref.invalidate(passengerRequestDetailProvider);
    ref.invalidate(passengerTripControllerProvider);
    ref.invalidate(driverDashboardProvider);
    ref.invalidate(driverRouteControllerProvider);
    ref.invalidate(driverMatchInboxProvider);
    ref.invalidate(driverMatchDetailProvider);
    ref.invalidate(driverTripControllerProvider);
    ref.invalidate(merchantDashboardProvider);
    ref.invalidate(merchantOrderDraftProvider);
    ref.invalidate(merchantOrderProvider);
    ref.invalidate(merchantMatchInboxProvider);
    ref.invalidate(merchantMatchDetailProvider);
    ref.invalidate(merchantTripProvider);
  }
}
