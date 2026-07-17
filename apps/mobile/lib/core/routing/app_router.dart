import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/application/auth_controller.dart';
import '../../features/auth/domain/auth_models.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/auth/presentation/unsupported_role_screen.dart';
import '../../features/driver/presentation/driver_home_screen.dart';
import '../../features/driver/presentation/driver_match_detail_screen.dart';
import '../../features/driver/presentation/driver_match_inbox_screen.dart';
import '../../features/driver/presentation/driver_route_screen.dart';
import '../../features/driver/presentation/driver_trip_screen.dart';
import '../../features/matching/presentation/match_detail_screen.dart';
import '../../features/merchant/presentation/create_merchant_order_screen.dart';
import '../../features/merchant/presentation/merchant_home_screen.dart';
import '../../features/merchant/presentation/merchant_match_detail_screen.dart';
import '../../features/merchant/presentation/merchant_match_inbox_screen.dart';
import '../../features/merchant/presentation/merchant_order_detail_screen.dart';
import '../../features/merchant/presentation/merchant_trip_screen.dart';
import '../../features/passenger/presentation/create_request_screen.dart';
import '../../features/passenger/presentation/passenger_home_screen.dart';
import '../../features/passenger/presentation/request_detail_screen.dart';
import '../../features/security/presentation/session_management_screen.dart';
import '../../features/trips/presentation/passenger_trip_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider.select(authRoutingSnapshotFor));
  final authenticating = auth.status == AuthStatus.authenticating;

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
        builder: (context, state) => const PassengerHomeScreen(),
        routes: [
          GoRoute(
            path: 'request/new',
            builder: (context, state) => const CreateRequestScreen(),
          ),
          GoRoute(
            path: 'request/:id',
            builder: (context, state) =>
                RequestDetailScreen(requestId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: 'match/:id',
            builder: (context, state) =>
                MatchDetailScreen(matchId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: 'trip/:id',
            builder: (context, state) =>
                PassengerTripScreen(tripId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/driver',
        builder: (context, state) => const DriverHomeScreen(),
        routes: [
          GoRoute(
            path: 'route',
            builder: (context, state) => const DriverRouteScreen(),
          ),
          GoRoute(
            path: 'matches',
            builder: (context, state) => const DriverMatchInboxScreen(),
          ),
          GoRoute(
            path: 'match/:id',
            builder: (context, state) =>
                DriverMatchDetailScreen(matchId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: 'trip/:id',
            builder: (context, state) =>
                DriverTripScreen(tripId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/merchant',
        builder: (context, state) => const MerchantHomeScreen(),
        routes: [
          GoRoute(
            path: 'order/new',
            builder: (context, state) => const CreateMerchantOrderScreen(),
          ),
          GoRoute(
            path: 'order/:id',
            builder: (context, state) =>
                MerchantOrderDetailScreen(orderId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: 'matches',
            builder: (context, state) => const MerchantMatchInboxScreen(),
          ),
          GoRoute(
            path: 'match/:id',
            builder: (context, state) =>
                MerchantMatchDetailScreen(matchId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: 'trip/:id',
            builder: (context, state) =>
                MerchantTripScreen(tripId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/unsupported-role',
        builder: (context, state) => const UnsupportedRoleScreen(),
      ),
      GoRoute(
        path: '/security/sessions',
        builder: (context, state) => const SessionManagementScreen(),
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

      if (auth.status == AuthStatus.restoring ||
          auth.status == AuthStatus.restoreFailed) {
        return path == '/splash' ? null : '/splash';
      }

      if (auth.status == AuthStatus.authenticating) {
        return path == '/login' ? null : '/login';
      }

      if (auth.status != AuthStatus.authenticated || auth.user == null) {
        return path == '/login' ? null : '/login';
      }

      final target = routeForRole(auth.user!.role);
      if (path == '/security/sessions' &&
          auth.user!.role != UserRole.admin &&
          auth.user!.role != UserRole.unsupported) {
        return null;
      }
      if (path == target || path.startsWith('$target/')) {
        return null;
      }
      return target;
    },
  );
});

typedef AuthRoutingSnapshot = ({
  bool isLoading,
  bool hasError,
  AuthStatus status,
  AuthUser? user,
});

AuthRoutingSnapshot authRoutingSnapshotFor(AsyncValue<AuthState> auth) {
  final status = switch (auth.value?.status) {
    AuthStatus.refreshing ||
    AuthStatus.retryableFailure => AuthStatus.authenticated,
    final status? => status,
    null => AuthStatus.restoring,
  };
  return (
    isLoading: auth.isLoading,
    hasError: auth.hasError,
    status: status,
    user: auth.value?.user,
  );
}

String routeForRole(UserRole role) {
  return switch (role) {
    UserRole.passenger => '/passenger',
    UserRole.driver => '/driver',
    UserRole.merchant => '/merchant',
    UserRole.admin || UserRole.unsupported => '/unsupported-role',
  };
}
