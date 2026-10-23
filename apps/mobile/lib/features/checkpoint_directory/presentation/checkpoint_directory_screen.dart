import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/widgets/masari_card.dart';
import '../../../core/widgets/masari_section.dart';
import '../../../core/widgets/state_views.dart';
import '../../../l10n/app_localizations.dart';
import '../application/checkpoint_directory_controller.dart';
import '../domain/checkpoint_directory.dart';

class CheckpointDirectoryAction extends ConsumerWidget {
  const CheckpointDirectoryAction({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final owner = ref.watch(checkpointDirectoryOwnerProvider);
    if (owner == null ||
        ref.watch(checkpointDirectoryCapabilityProvider(owner)).asData?.value !=
            true) {
      return const SizedBox.shrink();
    }
    return IconButton(
      tooltip: AppLocalizations.of(context).checkpointDirectoryTitle,
      icon: const Icon(Icons.list_alt_rounded),
      onPressed: () => Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => const CheckpointDirectoryScreen(),
        ),
      ),
    );
  }
}

class CheckpointDirectoryScreen extends ConsumerWidget {
  const CheckpointDirectoryScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context),
        owner = ref.watch(checkpointDirectoryOwnerProvider);
    Widget disabled() => EmptyState(title: l10n.checkpointDirectoryDisabled);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.checkpointDirectoryTitle)),
      body: SafeArea(
        child: owner == null
            ? disabled()
            : ref
                  .watch(checkpointDirectoryProvider(owner))
                  .when(
                    skipLoadingOnReload: false,
                    skipLoadingOnRefresh: false,
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (_, _) => ErrorStateView(
                      title: l10n.checkpointDirectoryLoadFailed,
                      retryLabel: l10n.retry,
                      onRetry: () {
                        ref.invalidate(
                          checkpointDirectoryCapabilityProvider(owner),
                        );
                        ref.invalidate(checkpointDirectoryProvider(owner));
                      },
                    ),
                    data: (value) => value == null
                        ? disabled()
                        : _DirectoryList(
                            key: ValueKey(owner),
                            directory: value,
                          ),
                  ),
      ),
    );
  }
}

class _DirectoryList extends StatefulWidget {
  const _DirectoryList({required this.directory, super.key});
  final CheckpointDirectory directory;
  @override
  State<_DirectoryList> createState() => _DirectoryListState();
}

class _DirectoryListState extends State<_DirectoryList> {
  final search = TextEditingController();
  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final groups = <String, List<DirectoryRecord>>{};
    for (final row in widget.directory.records.where(
      (row) => row.matches(search.text),
    )) {
      groups.putIfAbsent(row.cityAr, () => []).add(row);
    }
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: search,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              labelText: l10n.checkpointDirectorySearch,
              prefixIcon: const Icon(Icons.search),
            ),
          ),
        ),
        Expanded(
          child: groups.isEmpty
              ? EmptyState(title: l10n.checkpointDirectoryNoResults)
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    for (final group in groups.entries)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: MasariSection(
                          title: group.key,
                          child: Column(
                            children: [
                              for (final row in group.value)
                                MasariCard(
                                  key: ValueKey(row.researchKey),
                                  child: ListTile(
                                    title: Text(row.nameAr),
                                    subtitle: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(row.cityAr),
                                        Text(
                                          l10n.checkpointDirectoryTrafficUnavailable,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
        ),
      ],
    );
  }
}
