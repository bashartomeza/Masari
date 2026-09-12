import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/checkpoint_repository.dart';
import '../domain/checkpoint_models.dart';

final checkpointsProvider =
    AsyncNotifierProvider<CheckpointsNotifier, CheckpointSnapshot>(
  CheckpointsNotifier.new,
);

class CheckpointsNotifier extends AsyncNotifier<CheckpointSnapshot> {
  @override
  Future<CheckpointSnapshot> build() async {
    return ref.read(checkpointRepositoryProvider).checkpoints();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();

    state = await AsyncValue.guard(() async {
      return ref.read(checkpointRepositoryProvider).checkpoints();
    });
  }
}