import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_error.dart';
import '../data/auth_repository.dart';
import '../domain/auth_models.dart';

enum AuthStatus {
  restoring,
  unauthenticated,
  authenticating,
  authenticated,
  restoreFailed,
}

class AuthState {
  const AuthState({required this.status, this.user, this.error});

  const AuthState.restoring() : this(status: AuthStatus.restoring);

  const AuthState.unauthenticated() : this(status: AuthStatus.unauthenticated);

  const AuthState.authenticating() : this(status: AuthStatus.authenticating);

  const AuthState.authenticated(AuthUser user)
    : this(status: AuthStatus.authenticated, user: user);

  const AuthState.restoreFailed(ApiException error)
    : this(status: AuthStatus.restoreFailed, error: error);

  final AuthStatus status;
  final AuthUser? user;
  final ApiException? error;

  bool get isAuthenticated =>
      status == AuthStatus.authenticated && user != null;
}

final authControllerProvider = AsyncNotifierProvider<AuthController, AuthState>(
  AuthController.new,
);

class AuthController extends AsyncNotifier<AuthState> {
  AuthRepository get _repository => ref.read(authRepositoryProvider);

  @override
  Future<AuthState> build() async {
    final token = await _repository.tokenStorage.readToken();
    if (token == null || token.isEmpty) {
      return const AuthState.unauthenticated();
    }
    return _restore(token);
  }

  Future<void> retryRestore() async {
    state = const AsyncData(AuthState.authenticating());
    final token = await _repository.tokenStorage.readToken();
    if (token == null || token.isEmpty) {
      state = const AsyncData(AuthState.unauthenticated());
      return;
    }
    state = AsyncData(await _restore(token));
  }

  Future<void> login({required String phone, required String password}) async {
    try {
      final result = await _repository.login(phone: phone, password: password);
      await _repository.tokenStorage.saveToken(result.token);
      state = AsyncData(AuthState.authenticated(result.user));
    } on ApiException catch (error) {
      state = AsyncError(error, StackTrace.current);
    }
  }

  Future<void> logout() async {
    await _repository.tokenStorage.clearToken();
    state = const AsyncData(AuthState.unauthenticated());
  }

  Future<AuthState> _restore(String token) async {
    try {
      final user = await _repository.me(token);
      return AuthState.authenticated(user);
    } on ApiException catch (error) {
      if (error.type == ApiErrorType.unauthorized) {
        await _repository.tokenStorage.clearToken();
        return const AuthState.unauthenticated();
      }
      if (error.type == ApiErrorType.network ||
          error.type == ApiErrorType.timeout) {
        return AuthState.restoreFailed(error);
      }
      await _repository.tokenStorage.clearToken();
      return const AuthState.unauthenticated();
    }
  }
}
