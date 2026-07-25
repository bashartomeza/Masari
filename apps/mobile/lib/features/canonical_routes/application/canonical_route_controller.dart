import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_error.dart';
import '../data/canonical_operation_storage.dart';
import '../data/canonical_route_repository.dart';
import '../domain/canonical_route_models.dart';

final mobileCapabilitiesProvider =
    AsyncNotifierProvider<MobileCapabilitiesNotifier, MobileCapabilities>(
      MobileCapabilitiesNotifier.new,
    );

class MobileCapabilitiesNotifier extends AsyncNotifier<MobileCapabilities> {
  @override
  Future<MobileCapabilities> build() {
    return ref.read(canonicalRouteRepositoryProvider).capabilities();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(canonicalRouteRepositoryProvider).capabilities(),
    );
  }
}

final canonicalRouteCatalogProvider =
    AsyncNotifierProvider<CanonicalRouteCatalogNotifier, List<CanonicalRoute>>(
      CanonicalRouteCatalogNotifier.new,
    );

class CanonicalRouteCatalogNotifier
    extends AsyncNotifier<List<CanonicalRoute>> {
  @override
  Future<List<CanonicalRoute>> build() async {
    final capabilities = await ref.watch(mobileCapabilitiesProvider.future);
    if (!capabilities.routeCatalogAvailable ||
        !capabilities.multiRouteEntryAvailable) {
      return const [];
    }
    return ref.read(canonicalRouteRepositoryProvider).routes();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await ref.read(mobileCapabilitiesProvider.notifier).refresh();
      final capabilities = await ref.read(mobileCapabilitiesProvider.future);
      if (!capabilities.routeCatalogAvailable ||
          !capabilities.multiRouteEntryAvailable) {
        return const [];
      }
      return ref.read(canonicalRouteRepositoryProvider).routes();
    });
  }
}

final driverAvailabilitiesProvider =
    AsyncNotifierProvider<
      DriverAvailabilitiesNotifier,
      List<DriverAvailability>
    >(DriverAvailabilitiesNotifier.new);

class DriverAvailabilitiesNotifier
    extends AsyncNotifier<List<DriverAvailability>> {
  bool _mutating = false;

  @override
  Future<List<DriverAvailability>> build() async {
    final capabilities = await ref.watch(mobileCapabilitiesProvider.future);
    if (!capabilities.multiRouteEntryAvailable) return const [];
    return ref.read(canonicalRouteRepositoryProvider).availabilities();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(canonicalRouteRepositoryProvider).availabilities(),
    );
  }

  Future<DriverAvailability> create(Map<String, dynamic> payload) async {
    if (_mutating) throw StateError('operation_in_progress');
    _mutating = true;
    try {
      final value = await ref
          .read(canonicalMutationRunnerProvider)
          .run<DriverAvailability>(
            operation: 'driver_availability_create',
            scope: 'driver',
            payload: payload,
            send: (bundle) => ref
                .read(canonicalRouteRepositoryProvider)
                .createAvailability(
                  payload: bundle.payload,
                  idempotencyKey: bundle.idempotencyKey,
                ),
          );
      await refresh();
      return value;
    } finally {
      _mutating = false;
    }
  }

  Future<DriverAvailability> editAvailability(
    DriverAvailability availability,
    Map<String, dynamic> changes,
  ) async {
    if (_mutating) throw StateError('operation_in_progress');
    _mutating = true;
    try {
      try {
        final value = await ref
            .read(canonicalRouteRepositoryProvider)
            .updateAvailability(availability.id, {
              'expected_revision': availability.revision,
              ...changes,
            });
        await refresh();
        return value;
      } catch (_) {
        await refresh();
        rethrow;
      }
    } finally {
      _mutating = false;
    }
  }

  Future<DriverAvailability> transition(
    DriverAvailability availability,
    String action,
  ) async {
    if (_mutating) throw StateError('operation_in_progress');
    _mutating = true;
    try {
      try {
        final value = await ref
            .read(canonicalRouteRepositoryProvider)
            .transitionAvailability(availability, action);
        await refresh();
        return value;
      } catch (_) {
        // Response loss can leave the mutation committed. Reloading server
        // state prevents a second lifecycle action based on a stale revision.
        await refresh();
        rethrow;
      }
    } finally {
      _mutating = false;
    }
  }
}

final canonicalMutationRunnerProvider = Provider<CanonicalMutationRunner>((
  ref,
) {
  return CanonicalMutationRunner(
    storage: ref.watch(canonicalOperationStorageProvider),
  );
});

class CanonicalMutationRunner {
  CanonicalMutationRunner({required this.storage});

  final CanonicalOperationStorage storage;
  bool _busy = false;

  Future<T> run<T>({
    required String operation,
    required String scope,
    required Map<String, dynamic> payload,
    required Future<T> Function(CanonicalOperationBundle bundle) send,
  }) async {
    if (_busy) throw StateError('operation_in_progress');
    _busy = true;
    try {
      final candidate = CanonicalOperationBundle.create(
        operation: operation,
        scope: scope,
        payload: payload,
      );
      final pending = await storage.read();
      final bundle =
          pending != null &&
              pending.operation == operation &&
              pending.scope == scope &&
              pending.fingerprint == candidate.fingerprint &&
              jsonEncode(pending.payload) == jsonEncode(candidate.payload)
          ? pending
          : candidate;
      await storage.save(bundle);
      try {
        final result = await send(bundle);
        await storage.clear();
        return result;
      } catch (error) {
        if (!_temporary(error)) await storage.clear();
        rethrow;
      }
    } finally {
      _busy = false;
    }
  }
}

bool _temporary(Object error) {
  if (error is! ApiException) return false;
  return error.type == ApiErrorType.network ||
      error.type == ApiErrorType.timeout ||
      error.statusCode == 502 ||
      error.statusCode == 503 ||
      error.message == 'transaction_retry_required';
}
