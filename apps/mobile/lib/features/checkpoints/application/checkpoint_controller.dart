import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../canonical_routes/application/canonical_route_controller.dart';
import '../data/checkpoint_repository.dart';
import '../domain/checkpoint_models.dart';

final checkpointsProvider =
    AsyncNotifierProvider<CheckpointsNotifier, CheckpointSnapshot>(
      CheckpointsNotifier.new,
    );

/// Barriers for the map layer.
///
/// Failure is left to surface as an [AsyncError] rather than being swallowed
/// into an empty list: an empty list means "no barriers on this corridor", and
/// a rider must never read a failed fetch as a clear road.
class CheckpointsNotifier extends AsyncNotifier<CheckpointSnapshot> {
  @override
  Future<CheckpointSnapshot> build() async {
    final capabilities = await ref.watch(mobileCapabilitiesProvider.future);
    if (!capabilities.checkpointsAvailable) return CheckpointSnapshot.empty;
    return ref.read(checkpointRepositoryProvider).checkpoints();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final capabilities = await ref.read(mobileCapabilitiesProvider.future);
      if (!capabilities.checkpointsAvailable) return CheckpointSnapshot.empty;
      return ref.read(checkpointRepositoryProvider).checkpoints();
    });
  }
}
