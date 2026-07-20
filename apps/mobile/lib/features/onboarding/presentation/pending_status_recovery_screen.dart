import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/i18n/locale_controller.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../application/onboarding_controller.dart';
import '../domain/onboarding_models.dart';

class PendingStatusRecoveryScreen extends ConsumerStatefulWidget {
  const PendingStatusRecoveryScreen({super.key});

  @override
  ConsumerState<PendingStatusRecoveryScreen> createState() =>
      _PendingStatusRecoveryScreenState();
}

class _PendingStatusRecoveryScreenState
    extends ConsumerState<PendingStatusRecoveryScreen> {
  final _phone = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(onboardingControllerProvider).value;
    final busy = state?.busy == true;

    if (state?.stage == OnboardingStage.pendingReview) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/onboarding');
      });
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.checkApplicationStatus),
        actions: const [LanguageSwitch()],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppTokens.spaceLarge),
          children: [
            MasariCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    l10n.checkApplicationStatus,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: AppTokens.spaceMedium),
                  Directionality(
                    textDirection: TextDirection.ltr,
                    child: TextField(
                      key: const ValueKey('pendingRecoveryPhoneField'),
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(
                          RegExp(r'[+0-9٠-٩۰-۹ ]'),
                        ),
                      ],
                      decoration: InputDecoration(
                        labelText: l10n.phoneNumber,
                        prefixText: '+970 ',
                      ),
                    ),
                  ),
                  const SizedBox(height: AppTokens.spaceMedium),
                  TextField(
                    key: const ValueKey('pendingRecoveryPasswordField'),
                    controller: _password,
                    obscureText: true,
                    decoration: InputDecoration(labelText: l10n.password),
                  ),
                  if (state?.errorCode != null) ...[
                    const SizedBox(height: AppTokens.spaceMedium),
                    Text(
                      state!.errorCode == 'invalid_credentials'
                          ? l10n.invalidCredentials
                          : l10n.requestFailed,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: AppTokens.spaceLarge),
                  FilledButton(
                    key: const ValueKey('pendingRecoveryButton'),
                    onPressed: busy ? null : _recover,
                    child: busy
                        ? const SizedBox.square(
                            dimension: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(l10n.checkApplicationStatus),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _recover() async {
    final locale =
        ref.read(localeControllerProvider).value?.languageCode == 'en'
        ? 'en'
        : 'ar';
    final password = _password.text;
    _password.clear();
    await ref
        .read(onboardingControllerProvider.notifier)
        .recoverPending(phone: _phone.text, password: password, locale: locale);
  }
}
