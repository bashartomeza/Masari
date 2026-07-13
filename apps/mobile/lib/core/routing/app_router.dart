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
import '../../features/trips/presentation/passenger_trip_screen.dart';

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
      if (path == target || path.startsWith('$target/')) {
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
