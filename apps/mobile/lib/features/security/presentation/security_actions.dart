import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../auth/application/auth_controller.dart';

class RoleSecurityActions extends ConsumerWidget {
  const RoleSecurityActions({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        OutlinedButton.icon(
          key: const ValueKey('securitySessionsButton'),
          onPressed: () => context.go('/security/sessions'),
          icon: const Icon(Icons.security_outlined),
          label: Text(l10n.securityAndSessions),
        ),
        FilledButton(
          key: const ValueKey('logoutButton'),
          onPressed: () async {
            final confirmed = await confirmSecurityAction(
              context,
              title: l10n.confirmLogout,
              message: l10n.confirmLogoutMessage,
              confirmLabel: l10n.logout,
            );
            if (confirmed && context.mounted) {
              await ref.read(authControllerProvider.notifier).logout();
            }
          },
          child: Text(l10n.logout),
        ),
      ],
    );
  }
}

Future<bool> confirmSecurityAction(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
}) async {
  return await showDialog<bool>(
        context: context,
        builder: (dialogContext) {
          final l10n = AppLocalizations.of(dialogContext);
          return AlertDialog(
            title: Text(title),
            content: Text(message),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: Text(l10n.cancel),
              ),
              FilledButton(
                key: const ValueKey('confirmSecurityActionButton'),
                onPressed: () => Navigator.of(dialogContext).pop(true),
                child: Text(confirmLabel),
              ),
            ],
          );
        },
      ) ??
      false;
}
