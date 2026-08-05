import 'package:flutter/material.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/theme/app_tokens.dart';

/// The "where do you want to go?" entry point.
///
/// The field is a button, not a text input: the corridor is fixed, so there is
/// nothing to free-text search against. Tapping opens the request flow, which
/// is where a destination is actually chosen. Styling it as a search field
/// keeps the familiar affordance without implying a search API that does not
/// exist.
class DestinationSearchCard extends StatelessWidget {
  const DestinationSearchCard({required this.onTap, super.key});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context);

    return Container(
      padding: const EdgeInsets.all(AppTokens.spaceMedium),
      decoration: BoxDecoration(
        color: AppTheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppTokens.radiusLarge),
        border: Border.all(color: AppTheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.whereToGo,
            textAlign: TextAlign.center,
            style: theme.textTheme.titleLarge?.copyWith(
              color: AppTheme.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: AppTokens.spaceMedium),
          Material(
            color: AppTheme.surfaceContainerLowest,
            borderRadius: BorderRadius.circular(AppTokens.radiusMedium),
            child: InkWell(
              key: const ValueKey('openDestinationSearch'),
              onTap: onTap,
              borderRadius: BorderRadius.circular(AppTokens.radiusMedium),
              child: Container(
                constraints: const BoxConstraints(
                  minHeight: AppTokens.buttonHeight,
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppTokens.gutterMobile,
                  vertical: AppTokens.spaceSmall,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppTokens.radiusMedium),
                  border: Border.all(color: AppTheme.outlineVariant),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.search,
                      size: 22,
                      color: AppTheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: AppTokens.spaceSmall),
                    Expanded(
                      child: Text(
                        l10n.destinationSearchHint,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppTheme.onSurfaceVariant,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: AppTokens.spaceSmall),
                    const _SmartSearchBadge(),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The accent badge on the search field.
class _SmartSearchBadge extends StatelessWidget {
  const _SmartSearchBadge();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.gutterMobile,
        vertical: AppTokens.spaceExtraSmall + 2,
      ),
      decoration: BoxDecoration(
        // Warm accent, reserved by the design system for movement and
        // high-priority action.
        color: AppTheme.tertiaryContainer,
        borderRadius: BorderRadius.circular(AppTokens.radiusDefault),
      ),
      child: Text(
        l10n.smartSearch,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          color: AppTheme.onTertiary,
          fontWeight: FontWeight.w700,
        ),
        maxLines: 1,
      ),
    );
  }
}

/// One tappable shortcut to a destination.
class QuickDestinationChip {
  const QuickDestinationChip({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;
}

/// A horizontally scrolling row of destination shortcuts.
///
/// Scrolls rather than wraps so the row keeps a predictable height whatever the
/// catalog returns, and long Arabic route names do not reflow the screen.
class QuickDestinationChips extends StatelessWidget {
  const QuickDestinationChips({required this.chips, super.key});

  final List<QuickDestinationChip> chips;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SizedBox(
      height: AppTokens.minTouchTarget + AppTokens.spaceSmall,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.zero,
        itemCount: chips.length,
        separatorBuilder: (context, _) =>
            const SizedBox(width: AppTokens.spaceSmall),
        itemBuilder: (context, index) {
          final chip = chips[index];
          return Material(
            color: AppTheme.surfaceContainerLowest,
            borderRadius: BorderRadius.circular(AppTokens.radiusFull),
            child: InkWell(
              onTap: chip.onTap,
              borderRadius: BorderRadius.circular(AppTokens.radiusFull),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppTokens.spaceMedium,
                ),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppTokens.radiusFull),
                  border: Border.all(color: AppTheme.outlineVariant),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(chip.icon, size: 18, color: AppTheme.primary),
                    const SizedBox(width: AppTokens.spaceSmall),
                    Text(
                      chip.label,
                      style: theme.textTheme.bodyMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
