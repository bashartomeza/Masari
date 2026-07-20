import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/api/api_error.dart';
import '../../../core/config/app_config.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../../onboarding/application/onboarding_controller.dart';
import '../application/auth_controller.dart';
import '../domain/auth_models.dart';
import 'demo_accounts.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _showPassword = false;
  bool _submitting = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final auth = ref.watch(authControllerProvider);
    final loading =
        _submitting || auth.value?.status == AuthStatus.authenticating;
    final error = auth.error;
    final sessionEndReason = auth.value?.sessionEndReason;
    final config = ref.watch(appConfigProvider);
    final demoAccounts = demoAccountsFor(config);
    final onboarding = ref.watch(onboardingControllerProvider).value;
    final onboardingEnabled = onboarding?.enabled == true;

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
              l10n.signInWelcome,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: AppTokens.spaceLarge),
            MasariCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    l10n.signIn,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: AppTokens.spaceMedium),
                  Directionality(
                    textDirection: TextDirection.ltr,
                    child: TextField(
                      key: const ValueKey('phoneField'),
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'[+0-9]')),
                      ],
                      decoration: InputDecoration(labelText: l10n.phone),
                    ),
                  ),
                  const SizedBox(height: AppTokens.spaceMedium),
                  TextField(
                    key: const ValueKey('passwordField'),
                    controller: _passwordController,
                    obscureText: !_showPassword,
                    decoration: InputDecoration(
                      labelText: l10n.password,
                      suffixIcon: IconButton(
                        tooltip: _showPassword
                            ? l10n.hidePassword
                            : l10n.showPassword,
                        onPressed: () =>
                            setState(() => _showPassword = !_showPassword),
                        icon: Icon(
                          _showPassword
                              ? Icons.visibility_off
                              : Icons.visibility,
                        ),
                      ),
                    ),
                  ),
                  if (error != null) ...[
                    const SizedBox(height: AppTokens.spaceMedium),
                    Text(
                      _errorMessage(l10n, error),
                      key: const ValueKey('loginError'),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  if (sessionEndReason != null) ...[
                    const SizedBox(height: AppTokens.spaceMedium),
                    Text(
                      _sessionEndMessage(l10n, sessionEndReason),
                      key: const ValueKey('sessionEndedMessage'),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: AppTokens.spaceLarge),
                  FilledButton(
                    key: const ValueKey('loginButton'),
                    onPressed: loading ? null : _login,
                    child: loading
                        ? const SizedBox.square(
                            dimension: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(l10n.signIn),
                  ),
                  if (onboardingEnabled) ...[
                    const SizedBox(height: AppTokens.spaceMedium),
                    OutlinedButton(
                      key: const ValueKey('createInvitedAccountButton'),
                      onPressed: loading
                          ? null
                          : () => context.go('/onboarding'),
                      child: Text(l10n.createInvitedAccount),
                    ),
                    TextButton(
                      key: const ValueKey('checkApplicationStatusButton'),
                      onPressed: loading
                          ? null
                          : () => context.go('/onboarding/recover'),
                      child: Text(l10n.checkApplicationStatus),
                    ),
                  ],
                ],
              ),
            ),
            if (demoAccounts.isNotEmpty) ...[
              const SizedBox(height: AppTokens.spaceMedium),
              MasariCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      l10n.demoAccounts,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: AppTokens.spaceSmall),
                    for (final account in demoAccounts)
                      Padding(
                        padding: const EdgeInsets.only(
                          bottom: AppTokens.spaceSmall,
                        ),
                        child: OutlinedButton(
                          key: ValueKey('demo-${account.labelKey}'),
                          onPressed: loading ? null : () => _fillDemo(account),
                          child: Text(_demoLabel(l10n, account)),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _fillDemo(DemoAccount account) {
    _phoneController.text = account.phone;
    _passwordController.text = account.password;
  }

  Future<void> _login() async {
    setState(() => _submitting = true);
    await ref
        .read(authControllerProvider.notifier)
        .login(
          phone: _phoneController.text.trim(),
          password: _passwordController.text,
        );
    if (mounted) {
      setState(() => _submitting = false);
    }
  }
}

String _demoLabel(AppLocalizations l10n, DemoAccount account) {
  final role = switch (account.labelKey) {
    'passenger' => l10n.passenger,
    'driver' => l10n.driver,
    'merchant' => l10n.merchant,
    _ => account.labelKey,
  };
  return '$role  ${account.phone}';
}

String _errorMessage(AppLocalizations l10n, Object error) {
  if (error is! ApiException) {
    return l10n.requestFailed;
  }
  if (error.message == 'account_unavailable') {
    return l10n.accountUnavailable;
  }
  return switch (error.type) {
    ApiErrorType.unauthorized => l10n.invalidCredentials,
    ApiErrorType.network => l10n.networkUnavailable,
    ApiErrorType.timeout => l10n.requestTimedOut,
    ApiErrorType.validation => l10n.validationError,
    ApiErrorType.forbidden => l10n.forbidden,
    ApiErrorType.server => l10n.serverError,
    ApiErrorType.unknown => l10n.requestFailed,
  };
}

String _sessionEndMessage(AppLocalizations l10n, SessionEndReason reason) =>
    switch (reason) {
      SessionEndReason.expired => l10n.sessionExpired,
      SessionEndReason.ended => l10n.sessionEnded,
      SessionEndReason.accountUnavailable => l10n.accountUnavailable,
    };
