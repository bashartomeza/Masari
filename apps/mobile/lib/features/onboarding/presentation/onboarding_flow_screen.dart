import 'dart:async';
import 'dart:convert';

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

class OnboardingFlowScreen extends ConsumerStatefulWidget {
  const OnboardingFlowScreen({super.key});

  @override
  ConsumerState<OnboardingFlowScreen> createState() =>
      _OnboardingFlowScreenState();
}

class _OnboardingFlowScreenState extends ConsumerState<OnboardingFlowScreen> {
  final _invitation = TextEditingController();
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _displayName = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  bool _terms = false;
  bool _privacy = false;
  bool _adult = false;
  Timer? _timer;
  DateTime _now = DateTime.now().toUtc();

  @override
  void dispose() {
    _timer?.cancel();
    _invitation.dispose();
    _phone.dispose();
    _otp.dispose();
    _displayName.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final asyncState = ref.watch(onboardingControllerProvider);
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.createInvitedAccount),
        actions: const [LanguageSwitch()],
      ),
      body: SafeArea(
        child: asyncState.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, _) => _Unavailable(l10n: l10n),
          data: (state) => ListView(
            padding: const EdgeInsets.all(AppTokens.spaceLarge),
            children: [
              if (state.errorCode != null) _ErrorBox(code: state.errorCode!),
              _bodyFor(context, state),
            ],
          ),
        ),
      ),
    );
  }

  Widget _bodyFor(BuildContext context, OnboardingState state) {
    final l10n = AppLocalizations.of(context);
    if (!state.enabled || state.stage == OnboardingStage.unavailable) {
      return _Unavailable(l10n: l10n);
    }
    return switch (state.stage) {
      OnboardingStage.checkingAvailability => const Center(
        child: CircularProgressIndicator(),
      ),
      OnboardingStage.unavailable => _Unavailable(l10n: l10n),
      OnboardingStage.choosingRole => _roleStep(context, state),
      OnboardingStage.enteringInvitation ||
      OnboardingStage.enteringPhone ||
      OnboardingStage.starting => _startStep(context, state),
      OnboardingStage.otpSent ||
      OnboardingStage.resending ||
      OnboardingStage.verifyingOtp => _otpStep(context, state),
      OnboardingStage.phoneVerified ||
      OnboardingStage.loadingConsents ||
      OnboardingStage.enteringAccountDetails ||
      OnboardingStage.reviewingConsents ||
      OnboardingStage.completingRegistration => _accountStep(context, state),
      OnboardingStage.passengerCreated => _passengerResult(context),
      OnboardingStage.pendingReview => _pendingCard(context, state),
      OnboardingStage.retryableFailure => _retryStep(context, state),
      OnboardingStage.terminalFailure => _terminalStep(context, state),
    };
  }

  Widget _roleStep(BuildContext context, OnboardingState state) {
    final l10n = AppLocalizations.of(context);
    final roles = state.config?.registrationRoles ?? const <OnboardingRole>[];
    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.selectAccountType,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: AppTokens.spaceMedium),
          for (final role in roles)
            Padding(
              padding: const EdgeInsets.only(bottom: AppTokens.spaceSmall),
              child: OutlinedButton(
                key: ValueKey('onboarding-role-${role.apiValue}'),
                onPressed: state.busy
                    ? null
                    : () => ref
                          .read(onboardingControllerProvider.notifier)
                          .chooseRole(role),
                child: Text(
                  '${_roleLabel(l10n, role)} — ${_roleHelp(l10n, role)}',
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _startStep(BuildContext context, OnboardingState state) {
    final l10n = AppLocalizations.of(context);
    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            _roleLabel(l10n, state.selectedRole ?? OnboardingRole.passenger),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: AppTokens.spaceMedium),
          Directionality(
            textDirection: TextDirection.ltr,
            child: TextField(
              key: const ValueKey('invitationCodeField'),
              controller: _invitation,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(labelText: l10n.invitationCode),
            ),
          ),
          const SizedBox(height: AppTokens.spaceMedium),
          Directionality(
            textDirection: TextDirection.ltr,
            child: TextField(
              key: const ValueKey('onboardingPhoneField'),
              controller: _phone,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.done,
              decoration: InputDecoration(
                labelText: l10n.phoneNumber,
                prefixText: '+970 ',
              ),
            ),
          ),
          const SizedBox(height: AppTokens.spaceLarge),
          FilledButton(
            key: const ValueKey('sendVerificationCodeButton'),
            onPressed: state.busy ? null : () => _start(state),
            child: state.busy
                ? const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(l10n.sendVerificationCode),
          ),
          TextButton(
            onPressed: state.busy
                ? null
                : () => ref
                      .read(onboardingControllerProvider.notifier)
                      .backToRoles(),
            child: Text(l10n.selectAccountType),
          ),
        ],
      ),
    );
  }

  Widget _otpStep(BuildContext context, OnboardingState state) {
    final l10n = AppLocalizations.of(context);
    _ensureTimer();
    final remaining =
        state.resendAvailableAt?.difference(_now) ?? Duration.zero;
    final canResend = remaining <= Duration.zero && !state.busy;
    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.enterVerificationCode,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          if (state.maskedPhone != null) ...[
            const SizedBox(height: AppTokens.spaceSmall),
            Directionality(
              textDirection: TextDirection.ltr,
              child: Text(
                state.maskedPhone!,
                key: const ValueKey('maskedPhone'),
              ),
            ),
          ],
          const SizedBox(height: AppTokens.spaceMedium),
          Directionality(
            textDirection: TextDirection.ltr,
            child: TextField(
              key: const ValueKey('otpField'),
              controller: _otp,
              keyboardType: TextInputType.number,
              inputFormatters: [LengthLimitingTextInputFormatter(6)],
              decoration: InputDecoration(
                labelText: l10n.enterVerificationCode,
              ),
            ),
          ),
          const SizedBox(height: AppTokens.spaceMedium),
          FilledButton(
            key: const ValueKey('verifyOtpButton'),
            onPressed: state.busy
                ? null
                : () {
                    final otp = _otp.text;
                    _otp.clear();
                    ref
                        .read(onboardingControllerProvider.notifier)
                        .verifyOtp(otp);
                  },
            child: Text(l10n.verify),
          ),
          OutlinedButton(
            key: const ValueKey('resendOtpButton'),
            onPressed: canResend
                ? () => ref.read(onboardingControllerProvider.notifier).resend()
                : null,
            child: Text(
              canResend
                  ? l10n.resendCode
                  : '${l10n.resendAvailableIn} ${remaining.inSeconds.clamp(0, 999)}s',
            ),
          ),
        ],
      ),
    );
  }

  Widget _accountStep(BuildContext context, OnboardingState state) {
    final l10n = AppLocalizations.of(context);
    final docs = state.documents;
    if (docs.isEmpty && !state.busy) {
      return MasariCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(l10n.accountInformation),
            const SizedBox(height: AppTokens.spaceMedium),
            FilledButton(
              onPressed: () => ref
                  .read(onboardingControllerProvider.notifier)
                  .loadConsents(),
              child: Text(l10n.continueRegistration),
            ),
          ],
        ),
      );
    }
    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.accountInformation,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: AppTokens.spaceMedium),
          TextField(
            key: const ValueKey('displayNameField'),
            controller: _displayName,
            decoration: InputDecoration(labelText: l10n.displayName),
          ),
          const SizedBox(height: AppTokens.spaceMedium),
          TextField(
            key: const ValueKey('onboardingPasswordField'),
            controller: _password,
            obscureText: true,
            decoration: InputDecoration(labelText: l10n.password),
          ),
          const SizedBox(height: AppTokens.spaceMedium),
          TextField(
            key: const ValueKey('confirmPasswordField'),
            controller: _confirmPassword,
            obscureText: true,
            decoration: InputDecoration(labelText: l10n.confirmPassword),
          ),
          const SizedBox(height: AppTokens.spaceLarge),
          Text(l10n.terms, style: Theme.of(context).textTheme.titleMedium),
          for (final document in docs)
            Padding(
              padding: const EdgeInsets.only(top: AppTokens.spaceSmall),
              child: Text(
                _safeConsentText(document.content),
                key: ValueKey('consent-${document.type}'),
              ),
            ),
          CheckboxListTile(
            value: _terms,
            onChanged: state.busy
                ? null
                : (value) => setState(() => _terms = value ?? false),
            title: Text(l10n.terms),
          ),
          CheckboxListTile(
            value: _privacy,
            onChanged: state.busy
                ? null
                : (value) => setState(() => _privacy = value ?? false),
            title: Text(l10n.privacyNotice),
          ),
          CheckboxListTile(
            value: _adult,
            onChanged: state.busy
                ? null
                : (value) => setState(() => _adult = value ?? false),
            title: Text(l10n.confirmAdult),
          ),
          const SizedBox(height: AppTokens.spaceMedium),
          FilledButton(
            key: const ValueKey('createAccountButton'),
            onPressed: state.busy
                ? null
                : () => ref
                      .read(onboardingControllerProvider.notifier)
                      .complete(
                        displayName: _displayName.text,
                        password: _password.text,
                        confirmPassword: _confirmPassword.text,
                        acceptedTerms: _terms,
                        acceptedPrivacy: _privacy,
                        adult: _adult,
                      ),
            child: Text(l10n.createAccount),
          ),
        ],
      ),
    );
  }

  Widget _passengerResult(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    _clearSecrets();
    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.accountCreated,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: AppTokens.spaceMedium),
          Text(l10n.signInToContinue),
          const SizedBox(height: AppTokens.spaceMedium),
          FilledButton(
            onPressed: () => context.go('/login'),
            child: Text(l10n.signIn),
          ),
        ],
      ),
    );
  }

  Widget _pendingCard(BuildContext context, OnboardingState state) {
    final l10n = AppLocalizations.of(context);
    _clearSecrets();
    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.applicationUnderReview,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: AppTokens.spaceMedium),
          Text(l10n.pendingReviewBody),
          if (state.selectedRole != null)
            Text(_roleLabel(l10n, state.selectedRole!)),
          const SizedBox(height: AppTokens.spaceMedium),
          OutlinedButton(
            onPressed: () => ref
                .read(onboardingControllerProvider.notifier)
                .checkPendingStatus(),
            child: Text(l10n.refresh),
          ),
          TextButton(
            onPressed: () async {
              await ref.read(onboardingControllerProvider.notifier).clear();
              if (context.mounted) context.go('/login');
            },
            child: Text(l10n.localLogout),
          ),
        ],
      ),
    );
  }

  Widget _retryStep(BuildContext context, OnboardingState state) {
    final l10n = AppLocalizations.of(context);
    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(_safeError(l10n, state.errorCode)),
          if (state.requestId != null)
            Text('${l10n.requestReference}: ${state.requestId}'),
          const SizedBox(height: AppTokens.spaceMedium),
          FilledButton(
            onPressed: () => ref
                .read(onboardingControllerProvider.notifier)
                .refreshAvailability(),
            child: Text(l10n.retry),
          ),
        ],
      ),
    );
  }

  Widget _terminalStep(BuildContext context, OnboardingState state) {
    final l10n = AppLocalizations.of(context);
    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(_safeError(l10n, state.errorCode)),
          const SizedBox(height: AppTokens.spaceMedium),
          FilledButton(
            onPressed: () async {
              await ref.read(onboardingControllerProvider.notifier).clear();
              if (context.mounted) context.go('/login');
            },
            child: Text(l10n.signIn),
          ),
        ],
      ),
    );
  }

  Future<void> _start(OnboardingState state) async {
    final locale =
        ref.read(localeControllerProvider).value?.languageCode ?? 'ar';
    await ref
        .read(onboardingControllerProvider.notifier)
        .start(
          invitationCode: _invitation.text,
          phone: _phone.text,
          locale: locale == 'en' ? 'en' : 'ar',
        );
    _invitation.clear();
    _phone.clear();
  }

  void _ensureTimer() {
    _timer ??= Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now().toUtc());
    });
  }

  void _clearSecrets() {
    _otp.clear();
    _password.clear();
    _confirmPassword.clear();
    _invitation.clear();
    _phone.clear();
  }
}

class _Unavailable extends StatelessWidget {
  const _Unavailable({required this.l10n});

  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.registrationUnavailable),
          const SizedBox(height: AppTokens.spaceMedium),
          FilledButton(
            onPressed: () => context.go('/login'),
            child: Text(l10n.signIn),
          ),
        ],
      ),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.code});

  final String code;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppTokens.spaceMedium),
      child: MasariCard(
        child: Text(
          _safeError(l10n, code),
          style: TextStyle(color: Theme.of(context).colorScheme.error),
        ),
      ),
    );
  }
}

String _roleLabel(AppLocalizations l10n, OnboardingRole role) => switch (role) {
  OnboardingRole.passenger => l10n.passenger,
  OnboardingRole.driver => l10n.driver,
  OnboardingRole.merchant => l10n.merchant,
};

String _roleHelp(AppLocalizations l10n, OnboardingRole role) => switch (role) {
  OnboardingRole.passenger => l10n.passengerActiveAfterRegistration,
  OnboardingRole.driver ||
  OnboardingRole.merchant => l10n.pendingAfterRegistration,
};

String _safeError(AppLocalizations l10n, String? code) => switch (code) {
  'onboarding_unavailable' => l10n.unableToStartRegistration,
  'verification_failed' => l10n.incorrectVerificationCode,
  'verification_expired' => l10n.codeExpired,
  'verification_locked' => l10n.tooManyAttempts,
  'rate_limited' => l10n.tooManyAttempts,
  'consent_version_changed' => l10n.consentDocumentsChanged,
  'invalid_credentials' => l10n.invalidCredentials,
  'validation_error' => l10n.validationError,
  _ => l10n.requestFailed,
};

String _safeConsentText(String value) {
  try {
    final decoded = jsonDecode(value);
    if (decoded is Map) {
      return decoded.values.whereType<String>().join('\n');
    }
  } catch (_) {
    // Treat content_reference as plain text; never execute markup.
  }
  return value;
}
