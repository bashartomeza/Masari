import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/domain/auth_models.dart';

class RoleHomeScreen extends ConsumerWidget {
  const RoleHomeScreen({required this.role, super.key});

  final UserRole role;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final user = ref.watch(authControllerProvider).value?.user;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppTokens.spaceLarge),
          children: [
            const Align(
              alignment: AlignmentDirectional.centerEnd,
              child: LanguageSwitch(),
            ),
            const SizedBox(height: AppTokens.spaceLarge),
            Text(
              l10n.appTitle,
              style: Theme.of(
                context,
              ).textTheme.headlineLarge?.copyWith(color: AppTheme.deepGreen),
            ),
            const SizedBox(height: AppTokens.spaceSmall),
            Text(
              l10n.roleWorkspace,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: AppTokens.spaceLarge),
            MasariCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _roleLabel(l10n, role),
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: AppTokens.spaceMedium),
                  Text('${l10n.currentUser}: ${user?.name ?? ''}'),
                  const SizedBox(height: AppTokens.spaceSmall),
                  Text('${l10n.role}: ${_roleLabel(l10n, role)}'),
                  const SizedBox(height: AppTokens.spaceLarge),
                  Text(
                    l10n.lockedCorridorLabel,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: AppTokens.spaceSmall),
                  Text(l10n.lockedCorridor),
                  const SizedBox(height: AppTokens.spaceLarge),
                  Text(l10n.workspaceReadyMessage),
                ],
              ),
            ),
            const SizedBox(height: AppTokens.spaceMedium),
            MasariCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.comingNext,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: AppTokens.spaceSmall),
                  Text(l10n.businessFeaturesComingNext),
                ],
              ),
            ),
            const SizedBox(height: AppTokens.spaceLarge),
            FilledButton(
              key: const ValueKey('logoutButton'),
              onPressed: () =>
                  ref.read(authControllerProvider.notifier).logout(),
              child: Text(l10n.logout),
            ),
          ],
        ),
      ),
    );
  }
}

String _roleLabel(AppLocalizations l10n, UserRole role) {
  return switch (role) {
    UserRole.passenger => l10n.passenger,
    UserRole.driver => l10n.driver,
    UserRole.merchant => l10n.merchant,
    UserRole.admin => l10n.admin,
    UserRole.unsupported => l10n.unsupportedRole,
  };
}
