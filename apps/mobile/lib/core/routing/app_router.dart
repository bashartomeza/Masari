import 'package:go_router/go_router.dart';

import '../../features/shell/presentation/welcome_screen.dart';

final appRouter = GoRouter(
  routes: [
    GoRoute(path: '/', builder: (context, state) => const WelcomeScreen()),
  ],
);
