import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/application/auth_controller.dart';
import '../../auth/domain/auth_models.dart';
import '../data/session_repository.dart';

final sessionControllerProvider =
    AsyncNotifierProvider.autoDispose<
      SessionController,
      List<AuthSessionSummary>
    >(SessionController.new);

class SessionController extends AsyncNotifier<List<AuthSessionSummary>> {
  @override
  Future<List<AuthSessionSummary>> build() => refresh();

  Future<List<AuthSessionSummary>> refresh() async {
    final sessions = await ref.read(sessionRepositoryProvider).listSessions();
    state = AsyncData(sessions);
    return sessions;
  }

  Future<void> revoke(AuthSessionSummary session) async {
    await ref.read(sessionRepositoryProvider).revokeSession(session.id);
    if (session.isCurrent) {
      await ref
          .read(authControllerProvider.notifier)
          .completeCurrentSessionRevocation();
      return;
    }
    await refresh();
  }

  Future<void> logoutCurrent() {
    return ref.read(authControllerProvider.notifier).logout();
  }

  Future<void> logoutAll() async {
    await ref.read(authControllerProvider.notifier).logoutAll();
  }
}
