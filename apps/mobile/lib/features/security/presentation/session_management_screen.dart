import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../../auth/domain/auth_models.dart';
import '../application/session_controller.dart';
import 'security_actions.dart';
import 'session_status_banner.dart';

class SessionManagementScreen extends ConsumerStatefulWidget {
  const SessionManagementScreen({super.key});

  @override
  ConsumerState<SessionManagementScreen> createState() =>
      _SessionManagementScreenState();
}

class _SessionManagementScreenState
    extends ConsumerState<SessionManagementScreen> {
  bool _busy = false;
  bool _actionFailed = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final sessions = ref.watch(sessionControllerProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.securityAndSessions)),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () =>
              ref.read(sessionControllerProvider.notifier).refresh(),
          child: ListView(
            padding: const EdgeInsets.all(AppTokens.spaceLarge),
            children: [
              const Align(
                alignment: AlignmentDirectional.centerEnd,
                child: LanguageSwitch(),
              ),
              const SizedBox(height: AppTokens.spaceMedium),
              const SessionStatusBanner(),
              if (_actionFailed) ...[
                const SizedBox(height: AppTokens.spaceMedium),
                Text(
                  l10n.sessionActionFailed,
                  key: const ValueKey('sessionActionError'),
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: AppTokens.spaceMedium),
              Text(
                l10n.activeSessions,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: AppTokens.spaceMedium),
              sessions.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, stackTrace) => MasariCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(l10n.sessionActionFailed),
                      FilledButton(
                        onPressed: _busy
                            ? null
                            : () => ref
                                  .read(sessionControllerProvider.notifier)
                                  .refresh(),
                        child: Text(l10n.retry),
                      ),
                    ],
                  ),
                ),
                data: (items) => items.isEmpty
                    ? MasariCard(child: Text(l10n.noActiveSessions))
                    : Column(
                        children: [
                          for (final session in items) ...[
                            _SessionCard(
                              session: session,
                              busy: _busy,
                              onRevoke: () => _confirmRevoke(session),
                            ),
                            const SizedBox(height: AppTokens.spaceMedium),
                          ],
                        ],
                      ),
              ),
              OutlinedButton(
                key: const ValueKey('logoutCurrentSession'),
                onPressed: _busy ? null : _confirmLogout,
                child: Text(l10n.logout),
              ),
              FilledButton(
                key: const ValueKey('logoutAllSessions'),
                onPressed: _busy ? null : _confirmLogoutAll,
                child: Text(l10n.logoutAllDevices),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _confirmRevoke(AuthSessionSummary session) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await confirmSecurityAction(
      context,
      title: session.isCurrent ? l10n.revokeThisDevice : l10n.revokeSession,
      message: l10n.confirmRevokeSession,
      confirmLabel: session.isCurrent
          ? l10n.revokeThisDevice
          : l10n.revokeSession,
    );
    if (confirmed) {
      await _runAction(
        () => ref.read(sessionControllerProvider.notifier).revoke(session),
      );
    }
  }

  Future<void> _confirmLogout() async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await confirmSecurityAction(
      context,
      title: l10n.confirmLogout,
      message: l10n.confirmLogoutMessage,
      confirmLabel: l10n.logout,
    );
    if (confirmed) {
      await _runAction(
        () => ref.read(sessionControllerProvider.notifier).logoutCurrent(),
      );
    }
  }

  Future<void> _confirmLogoutAll() async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await confirmSecurityAction(
      context,
      title: l10n.confirmLogoutAll,
      message: l10n.confirmLogoutAllMessage,
      confirmLabel: l10n.logoutAllDevices,
    );
    if (confirmed) {
      await _runAction(
        () => ref.read(sessionControllerProvider.notifier).logoutAll(),
      );
    }
  }

  Future<void> _runAction(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _actionFailed = false;
    });
    try {
      await action();
    } catch (_) {
      if (mounted) setState(() => _actionFailed = true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

class _SessionCard extends StatelessWidget {
  const _SessionCard({
    required this.session,
    required this.busy,
    required this.onRevoke,
  });

  final AuthSessionSummary session;
  final bool busy;
  final VoidCallback onRevoke;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final label =
        session.deviceName ??
        (session.isCurrent ? l10n.currentDevice : l10n.otherDevice);
    final client = switch (session.clientType) {
      'mobile' => l10n.mobileSession,
      'admin' => l10n.adminSession,
      _ => l10n.otherDevice,
    };
    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              if (session.isCurrent) Chip(label: Text(l10n.currentDevice)),
            ],
          ),
          Text(client),
          Text(
            '${l10n.created}: ${_formatDateTime(context, session.createdAt)}',
          ),
          Text(
            '${l10n.lastActive}: ${_formatDateTime(context, session.lastUsedAt)}',
          ),
          Text(
            '${l10n.expires}: ${_formatDateTime(context, session.expiresAt)}',
          ),
          if (session.revoked)
            Text(l10n.sessionRevoked)
          else
            OutlinedButton(
              key: ValueKey(
                session.isCurrent ? 'revokeCurrentSession' : 'revokeSession',
              ),
              onPressed: busy ? null : onRevoke,
              child: Text(
                session.isCurrent ? l10n.revokeThisDevice : l10n.revokeSession,
              ),
            ),
        ],
      ),
    );
  }
}

String _formatDateTime(BuildContext context, DateTime value) {
  final material = MaterialLocalizations.of(context);
  final local = value.toLocal();
  return '${material.formatMediumDate(local)} ${material.formatTimeOfDay(TimeOfDay.fromDateTime(local))}';
}
