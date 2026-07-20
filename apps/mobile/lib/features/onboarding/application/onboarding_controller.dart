import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_error.dart';
import '../../../core/i18n/domain_labels.dart';
import '../data/onboarding_repository.dart';
import '../data/onboarding_storage.dart';
import '../domain/onboarding_models.dart';

final onboardingControllerProvider =
    AsyncNotifierProvider<OnboardingController, OnboardingState>(
      OnboardingController.new,
    );

class OnboardingState {
  const OnboardingState({
    required this.stage,
    this.config,
    this.selectedRole,
    this.attemptId,
    this.maskedPhone,
    this.attemptExpiresAt,
    this.resendAvailableAt,
    this.documents = const [],
    this.requestId,
    this.errorCode,
    this.restored = false,
  });

  const OnboardingState.checking()
    : this(stage: OnboardingStage.checkingAvailability);

  final OnboardingStage stage;
  final OnboardingConfig? config;
  final OnboardingRole? selectedRole;
  final String? attemptId;
  final String? maskedPhone;
  final DateTime? attemptExpiresAt;
  final DateTime? resendAvailableAt;
  final List<ConsentDocument> documents;
  final String? requestId;
  final String? errorCode;
  final bool restored;

  bool get enabled => config?.enabled == true;
  bool get busy => switch (stage) {
    OnboardingStage.checkingAvailability ||
    OnboardingStage.starting ||
    OnboardingStage.resending ||
    OnboardingStage.verifyingOtp ||
    OnboardingStage.loadingConsents ||
    OnboardingStage.completingRegistration => true,
    _ => false,
  };

  OnboardingState copyWith({
    OnboardingStage? stage,
    OnboardingConfig? config,
    OnboardingRole? selectedRole,
    String? attemptId,
    String? maskedPhone,
    DateTime? attemptExpiresAt,
    DateTime? resendAvailableAt,
    List<ConsentDocument>? documents,
    String? requestId,
    String? errorCode,
    bool? restored,
    bool clearError = false,
  }) {
    return OnboardingState(
      stage: stage ?? this.stage,
      config: config ?? this.config,
      selectedRole: selectedRole ?? this.selectedRole,
      attemptId: attemptId ?? this.attemptId,
      maskedPhone: maskedPhone ?? this.maskedPhone,
      attemptExpiresAt: attemptExpiresAt ?? this.attemptExpiresAt,
      resendAvailableAt: resendAvailableAt ?? this.resendAvailableAt,
      documents: documents ?? this.documents,
      requestId: requestId ?? this.requestId,
      errorCode: clearError ? null : errorCode ?? this.errorCode,
      restored: restored ?? this.restored,
    );
  }
}

class OnboardingController extends AsyncNotifier<OnboardingState> {
  OnboardingRepository get _repository =>
      ref.read(onboardingRepositoryProvider);
  OnboardingStorage get _storage => ref.read(onboardingStorageProvider);

  OnboardingBundle? _bundle;
  final Map<String, String> _pendingIdempotencyKeys = {};
  int _generation = 0;
  bool _inFlight = false;

  @override
  Future<OnboardingState> build() async {
    final config = await _safeConfig();
    if (!config.enabled) {
      await _storage.clear();
      return OnboardingState(
        stage: OnboardingStage.unavailable,
        config: config,
      );
    }
    _bundle = await _storage.readBundle();
    final restored = _bundle;
    if (restored != null) return _stateFromBundle(config, restored);
    return OnboardingState(stage: OnboardingStage.choosingRole, config: config);
  }

  Future<void> refreshAvailability() async {
    state = const AsyncData(OnboardingState.checking());
    state = AsyncData(await build());
  }

  void chooseRole(OnboardingRole role) {
    final current = state.value;
    if (current == null || !current.enabled || current.busy) return;
    state = AsyncData(
      current.copyWith(
        stage: OnboardingStage.enteringInvitation,
        selectedRole: role,
        clearError: true,
      ),
    );
  }

  void backToRoles() {
    final current = state.value;
    if (current == null || current.attemptId != null || current.busy) return;
    state = AsyncData(current.copyWith(stage: OnboardingStage.choosingRole));
  }

  Future<void> start({
    required String invitationCode,
    required String phone,
    required String locale,
  }) async {
    final current = state.value;
    final role = current?.selectedRole;
    if (current == null || role == null || _inFlight || !current.enabled) {
      return;
    }
    final payload = _payloadDigest({
      'invitation': invitationCode.trim(),
      'phone': phone.trim(),
      'role': role.apiValue,
      'locale': locale,
      'region': 'PS',
    });
    final key = _keyFor('start', payload);
    await _guarded(() async {
      state = AsyncData(current.copyWith(stage: OnboardingStage.starting));
      final result = await _repository.start(
        invitationCode: invitationCode,
        role: role,
        phone: phone,
        locale: locale,
        idempotencyKey: key,
      );
      final bundle = OnboardingBundle(
        type: OnboardingBundleType.continuation,
        safeStage: OnboardingStage.otpSent,
        locale: locale,
        selectedRole: role,
        attemptId: result.attemptId,
        continuationToken: result.onboardingToken,
        continuationExpiresAt: result.expiresAt,
        maskedPhone: result.maskedPhone,
        resendAvailableAt: result.resendAvailableAt,
      );
      await _persistBeforePublish(bundle);
      state = AsyncData(
        current.copyWith(
          stage: OnboardingStage.otpSent,
          attemptId: result.attemptId,
          maskedPhone: result.maskedPhone,
          attemptExpiresAt: result.expiresAt,
          resendAvailableAt: result.resendAvailableAt,
          requestId: result.requestId,
          clearError: true,
        ),
      );
    });
  }

  Future<void> resend() async {
    final current = state.value;
    final bundle = _bundle;
    if (current == null || bundle?.attemptId == null || _inFlight) return;
    final key = _keyFor('resend', bundle!.attemptId!);
    await _guarded(() async {
      state = AsyncData(current.copyWith(stage: OnboardingStage.resending));
      final resendAt = await _repository.resend(
        attemptId: bundle.attemptId!,
        continuationToken: bundle.continuationToken!,
        idempotencyKey: key,
      );
      final updated = bundle.copyWith(
        safeStage: OnboardingStage.otpSent,
        resendAvailableAt: resendAt,
        idempotency: const {},
      );
      await _persistBeforePublish(updated);
      state = AsyncData(
        current.copyWith(
          stage: OnboardingStage.otpSent,
          resendAvailableAt: resendAt,
          clearError: true,
        ),
      );
    });
  }

  Future<void> verifyOtp(String otp) async {
    final current = state.value;
    final bundle = _bundle;
    final normalizedOtp = normalizeOtpDigits(otp);
    if (current == null ||
        bundle?.attemptId == null ||
        normalizedOtp.length != 6 ||
        _inFlight) {
      return;
    }
    final key = _keyFor('verify', normalizedOtp);
    await _guarded(() async {
      state = AsyncData(current.copyWith(stage: OnboardingStage.verifyingOtp));
      final result = await _repository.verify(
        attemptId: bundle!.attemptId!,
        continuationToken: bundle.continuationToken!,
        otp: normalizedOtp,
        idempotencyKey: key,
      );
      final updated = bundle.copyWith(
        safeStage: OnboardingStage.phoneVerified,
        registrationGrant: result.registrationGrant,
        registrationGrantExpiresAt: bundle.continuationExpiresAt,
        idempotency: const {},
      );
      await _persistBeforePublish(updated);
      final documents = await _repository.consents(bundle.locale);
      final ready = updated.copyWith(
        safeStage: OnboardingStage.enteringAccountDetails,
      );
      await _persistBeforePublish(ready);
      state = AsyncData(
        current.copyWith(
          stage: OnboardingStage.enteringAccountDetails,
          documents: documents,
          requestId: result.requestId,
          clearError: true,
        ),
      );
    });
  }

  Future<void> loadConsents() async {
    final current = state.value;
    final bundle = _bundle;
    if (current == null || bundle == null || _inFlight) return;
    await _guarded(() async {
      state = AsyncData(
        current.copyWith(stage: OnboardingStage.loadingConsents),
      );
      final documents = await _repository.consents(bundle.locale);
      final updated = bundle.copyWith(
        safeStage: OnboardingStage.enteringAccountDetails,
      );
      await _persistBeforePublish(updated);
      state = AsyncData(
        current.copyWith(
          stage: OnboardingStage.enteringAccountDetails,
          documents: documents,
          clearError: true,
        ),
      );
    });
  }

  Future<void> complete({
    required String displayName,
    required String password,
    required String confirmPassword,
    required bool acceptedTerms,
    required bool acceptedPrivacy,
    required bool adult,
  }) async {
    final current = state.value;
    final bundle = _bundle;
    if (current == null || bundle?.attemptId == null || _inFlight) return;
    if (password != confirmPassword ||
        !acceptedTerms ||
        !acceptedPrivacy ||
        !adult ||
        bundle!.registrationGrant == null) {
      state = AsyncData(current.copyWith(errorCode: 'validation_error'));
      return;
    }
    final payload = _payloadDigest({
      'attempt': bundle.attemptId,
      'display': displayName.trim(),
      'locale': bundle.locale,
      'consents': current.documents.map((document) => document.id).join(','),
    });
    final key = _keyFor('complete', payload);
    await _guarded(() async {
      state = AsyncData(
        current.copyWith(stage: OnboardingStage.completingRegistration),
      );
      final result = await _repository.complete(
        attemptId: bundle.attemptId!,
        continuationToken: bundle.continuationToken!,
        registrationGrant: bundle.registrationGrant!,
        displayName: displayName,
        password: password,
        locale: bundle.locale,
        consents: current.documents,
        idempotencyKey: key,
      );
      if (result.role == OnboardingRole.passenger &&
          result.accountStatus == 'active' &&
          result.pendingStatusToken == null) {
        await clear();
        state = AsyncData(
          current.copyWith(
            stage: OnboardingStage.passengerCreated,
            requestId: result.requestId,
            clearError: true,
          ),
        );
        return;
      }
      if ((result.role == OnboardingRole.driver ||
              result.role == OnboardingRole.merchant) &&
          result.accountStatus == 'pending' &&
          result.pendingStatusToken != null) {
        final pending = OnboardingBundle(
          type: OnboardingBundleType.pendingStatus,
          safeStage: OnboardingStage.pendingReview,
          locale: bundle.locale,
          selectedRole: result.role,
          pendingStatusToken: result.pendingStatusToken,
          pendingStatusExpiresAt: DateTime.now().toUtc().add(
            const Duration(days: 30),
          ),
        );
        await _persistBeforePublish(pending);
        state = AsyncData(
          current.copyWith(
            stage: OnboardingStage.pendingReview,
            selectedRole: result.role,
            requestId: result.requestId,
            clearError: true,
          ),
        );
        return;
      }
      throw const ApiException(ApiErrorType.validation, 'invalid_response');
    });
  }

  Future<void> checkPendingStatus() async {
    final current = state.value;
    final bundle = _bundle;
    final token = bundle?.pendingStatusToken;
    if (current == null || token == null || _inFlight) return;
    await _guarded(() async {
      final result = await _repository.status(token);
      if (result.status == 'approved_sign_in') {
        await clear();
        state = AsyncData(
          current.copyWith(
            stage: OnboardingStage.passengerCreated,
            requestId: result.requestId,
          ),
        );
      } else if (result.status == 'pending_review') {
        state = AsyncData(
          current.copyWith(
            stage: OnboardingStage.pendingReview,
            selectedRole: result.role,
            requestId: result.requestId,
          ),
        );
      } else {
        await clear();
        state = AsyncData(current.copyWith(stage: OnboardingStage.unavailable));
      }
    });
  }

  Future<void> recoverPending({
    required String phone,
    required String password,
    required String locale,
  }) async {
    final current = state.value ?? const OnboardingState.checking();
    if (_inFlight) return;
    await _guarded(() async {
      state = AsyncData(current.copyWith(stage: OnboardingStage.starting));
      final result = await _repository.recoverPendingStatus(
        phone: phone,
        password: password,
      );
      if (result.pendingStatusToken == null) {
        throw const ApiException(ApiErrorType.validation, 'invalid_response');
      }
      final pending = OnboardingBundle(
        type: OnboardingBundleType.pendingStatus,
        safeStage: OnboardingStage.pendingReview,
        locale: locale,
        selectedRole: result.role,
        pendingStatusToken: result.pendingStatusToken,
        pendingStatusExpiresAt: DateTime.now().toUtc().add(
          const Duration(days: 30),
        ),
      );
      await _persistBeforePublish(pending);
      state = AsyncData(
        current.copyWith(
          stage: OnboardingStage.pendingReview,
          selectedRole: result.role,
          requestId: result.requestId,
          clearError: true,
        ),
      );
    });
  }

  Future<void> clear() async {
    _generation += 1;
    _bundle = null;
    await _storage.clear();
  }

  Future<OnboardingConfig> _safeConfig() async {
    try {
      return await _repository.config();
    } on ApiException {
      return const OnboardingConfig(
        enabled: false,
        registrationRoles: [],
        supportedLocales: [],
        minimumPasswordCharacters: 15,
        maximumPasswordCharacters: 64,
        maximumPasswordUtf8Bytes: 72,
        otpDigits: 6,
        resendCooldownSeconds: 60,
      );
    }
  }

  OnboardingState _stateFromBundle(
    OnboardingConfig config,
    OnboardingBundle bundle,
  ) {
    if (bundle.type == OnboardingBundleType.pendingStatus) {
      return OnboardingState(
        stage: OnboardingStage.pendingReview,
        config: config,
        selectedRole: bundle.selectedRole,
        restored: true,
      );
    }
    return OnboardingState(
      stage: bundle.registrationGrant == null
          ? OnboardingStage.otpSent
          : OnboardingStage.enteringAccountDetails,
      config: config,
      selectedRole: bundle.selectedRole,
      attemptId: bundle.attemptId,
      maskedPhone: bundle.maskedPhone,
      attemptExpiresAt: bundle.continuationExpiresAt,
      resendAvailableAt: bundle.resendAvailableAt,
      restored: true,
    );
  }

  Future<void> _persistBeforePublish(OnboardingBundle bundle) async {
    await _storage.saveBundle(bundle);
    _bundle = bundle;
    _generation += 1;
  }

  String _keyFor(String operation, String payload) {
    final current = _bundle?.idempotency ?? const <String, String>{};
    final marker = '$operation:$payload';
    final existing = current[marker];
    if (existing != null) return existing;
    return _pendingIdempotencyKeys.putIfAbsent(marker, newIdempotencyKey);
  }

  Future<void> _guarded(Future<void> Function() action) async {
    if (_inFlight) return;
    final generation = _generation;
    _inFlight = true;
    try {
      await action();
    } on ApiException catch (error) {
      final current = state.value;
      if (current != null && generation <= _generation) {
        state = AsyncData(
          current.copyWith(
            stage: _terminalCodes.contains(error.message)
                ? OnboardingStage.terminalFailure
                : OnboardingStage.retryableFailure,
            errorCode: error.message,
          ),
        );
      } else {
        state = AsyncError(error, StackTrace.current);
      }
    } finally {
      _inFlight = false;
    }
  }
}

String normalizeOtpDigits(String value) {
  const arabicZero = 0x0660;
  const easternZero = 0x06F0;
  final buffer = StringBuffer();
  for (final rune in value.runes) {
    if (rune >= 0x30 && rune <= 0x39) {
      buffer.writeCharCode(rune);
    } else if (rune >= arabicZero && rune <= arabicZero + 9) {
      buffer.writeCharCode(0x30 + rune - arabicZero);
    } else if (rune >= easternZero && rune <= easternZero + 9) {
      buffer.writeCharCode(0x30 + rune - easternZero);
    }
  }
  return buffer.toString();
}

String localeCodeFromObject(Object? locale) {
  final value = locale?.toString();
  if (value == 'en') return 'en';
  return DomainLabels.defaultLocale.languageCode;
}

String _payloadDigest(Map<String, Object?> payload) {
  final sorted = Map.fromEntries(
    payload.entries.toList()..sort((a, b) => a.key.compareTo(b.key)),
  );
  return base64Url.encode(utf8.encode(jsonEncode(sorted)));
}

const _terminalCodes = {
  'verification_expired',
  'verification_locked',
  'registration_grant_invalid',
  'account_unavailable',
};
