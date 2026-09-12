import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/api/api_error.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../application/auth_controller.dart';
import 'widgets/auth_divider.dart';
import 'widgets/google_auth_button.dart';

class SignUpScreen extends ConsumerStatefulWidget {
  const SignUpScreen({super.key});

  @override
  ConsumerState<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends ConsumerState<SignUpScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _showPassword = false;
  bool _submitting = false;
  bool _googleBusy = false;
  bool _googleFailed = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final auth = ref.watch(authControllerProvider);
    final loading =
        _submitting ||
        _googleBusy ||
        auth.value?.status == AuthStatus.authenticating;
    final error = auth.error;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.createAccount)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppTokens.spaceMedium),
          children: [
            const Align(
              alignment: AlignmentDirectional.centerEnd,
              child: LanguageSwitch(),
            ),
            const SizedBox(height: AppTokens.spaceMedium),
            Text(
              l10n.createAccount,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: AppTokens.spaceExtraSmall),
            Text(
              l10n.createAccountSubtitle,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppTheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppTokens.spaceLarge),
            MasariCard(
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      key: const ValueKey('nameField'),
                      controller: _nameController,
                      textCapitalization: TextCapitalization.words,
                      autofillHints: const [AutofillHints.name],
                      textInputAction: TextInputAction.next,
                      inputFormatters: [LengthLimitingTextInputFormatter(120)],
                      decoration: InputDecoration(labelText: l10n.fullName),
                      validator: (value) =>
                          (value == null || value.trim().isEmpty)
                          ? l10n.nameRequired
                          : null,
                    ),
                    const SizedBox(height: AppTokens.spaceMedium),
                    TextFormField(
                      key: const ValueKey('emailField'),
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      textInputAction: TextInputAction.next,
                      inputFormatters: [
                        FilteringTextInputFormatter.deny(RegExp(r'\s')),
                        LengthLimitingTextInputFormatter(191),
                      ],
                      decoration: InputDecoration(labelText: l10n.email),
                      validator: (value) => _validateEmail(l10n, value),
                    ),
                    const SizedBox(height: AppTokens.spaceMedium),
                    TextFormField(
                      key: const ValueKey('passwordField'),
                      controller: _passwordController,
                      obscureText: !_showPassword,
                      autofillHints: const [AutofillHints.newPassword],
                      onFieldSubmitted: (_) => _register(),
                      decoration: InputDecoration(
                        labelText: l10n.password,
                        helperText: l10n.passwordTooShort,
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
                      validator: (value) => (value == null || value.length < 8)
                          ? l10n.passwordTooShort
                          : null,
                    ),
                    if (error != null || _googleFailed) ...[
                      const SizedBox(height: AppTokens.spaceMedium),
                      Text(
                        _googleFailed
                            ? l10n.googleSignInFailed
                            : _errorMessage(l10n, error!),
                        key: const ValueKey('signUpError'),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ],
                    const SizedBox(height: AppTokens.spaceLarge),
                    FilledButton(
                      key: const ValueKey('signUpButton'),
                      onPressed: loading ? null : _register,
                      child: loading
                          ? const SizedBox.square(
                              dimension: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(l10n.signUp),
                    ),
                    const SizedBox(height: AppTokens.spaceMedium),
                    AuthDivider(label: l10n.orSeparator),
                    const SizedBox(height: AppTokens.spaceMedium),
                    GoogleAuthButton(
                      enabled: !loading,
                      onIdToken: _registerWithGoogle,
                      onError: (_) {
                        if (mounted) {
                          setState(() {
                            _googleBusy = false;
                            _googleFailed = true;
                          });
                        }
                      },
                    ),
                    const SizedBox(height: AppTokens.spaceSmall),
                    TextButton(
                      key: const ValueKey('goToSignInButton'),
                      onPressed: loading ? null : () => context.pop(),
                      child: Text(l10n.alreadyHaveAccount),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _register() async {
    setState(() => _googleFailed = false);
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _submitting = true);
    await ref
        .read(authControllerProvider.notifier)
        .register(
          name: _nameController.text.trim(),
          email: _emailController.text.trim().toLowerCase(),
          password: _passwordController.text,
        );
    if (mounted) setState(() => _submitting = false);
  }

  Future<void> _registerWithGoogle(String idToken) async {
    setState(() {
      _googleFailed = false;
      _googleBusy = true;
    });
    await ref
        .read(authControllerProvider.notifier)
        .loginWithGoogle(idToken: idToken);
    if (mounted) setState(() => _googleBusy = false);
  }
}

String? _validateEmail(AppLocalizations l10n, String? value) {
  final email = value?.trim() ?? '';
  if (email.isEmpty) return l10n.emailRequired;
  final pattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
  return pattern.hasMatch(email) ? null : l10n.emailInvalid;
}

String _errorMessage(AppLocalizations l10n, Object error) {
  if (error is! ApiException) return l10n.requestFailed;
  if (error.message == 'email_taken') return l10n.emailAlreadyRegistered;
  if (error.message == 'account_unavailable') return l10n.accountUnavailable;
  if (error.message == 'google_email_unverified' ||
      error.message == 'invalid_google_token') {
    return l10n.googleSignInFailed;
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
