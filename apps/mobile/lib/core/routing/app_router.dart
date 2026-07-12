import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/application/auth_controller.dart';
import '../../features/auth/domain/auth_models.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/auth/presentation/unsupported_role_screen.dart';
import '../../features/home/presentation/role_home_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);
  final authenticating = auth.value?.status == AuthStatus.authenticating;

  return GoRouter(
    initialLocation: authenticating ? '/login' : '/splash',
    routes: [
      GoRoute(path: '/', redirect: (context, state) => '/splash'),
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/passenger',
        builder: (context, state) =>
            const RoleHomeScreen(role: UserRole.passenger),
      ),
      GoRoute(
        path: '/driver',
        builder: (context, state) =>
            const RoleHomeScreen(role: UserRole.driver),
      ),
      GoRoute(
        path: '/merchant',
        builder: (context, state) =>
            const RoleHomeScreen(role: UserRole.merchant),
      ),
      GoRoute(
        path: '/unsupported-role',
        builder: (context, state) => const UnsupportedRoleScreen(),
      ),
    ],
    redirect: (context, state) {
      final path = state.uri.path;
      if (auth.isLoading) {
        if (authenticating || path == '/login') {
          return null;
        }
        return path == '/splash' ? null : '/splash';
      }
      if (auth.hasError) {
        return path == '/login' ? null : '/login';
      }

      final authState = auth.value ?? const AuthState.restoring();
      if (authState.status == AuthStatus.restoring ||
          authState.status == AuthStatus.restoreFailed) {
        return path == '/splash' ? null : '/splash';
      }

      if (authState.status == AuthStatus.authenticating) {
        return path == '/login' ? null : '/login';
      }

      if (!authState.isAuthenticated) {
        return path == '/login' ? null : '/login';
      }

      final target = routeForRole(authState.user!.role);
      if (path == target) {
        return null;
      }
      return target;
    },
  );
});

String routeForRole(UserRole role) {
  return switch (role) {
    UserRole.passenger => '/passenger',
    UserRole.driver => '/driver',
    UserRole.merchant => '/merchant',
    UserRole.admin || UserRole.unsupported => '/unsupported-role',
  };
}
