import 'package:flutter/material.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../theme/app_theme.dart';
import '../theme/app_tokens.dart';
import 'entity_cards.dart';
import 'masari_bottom_nav.dart';
import 'state_views.dart';

/// The top bar shared by every role's home screen: avatar, centred wordmark,
/// notifications.
///
/// The bar's arrangement is pinned left-to-right so it holds its shape in both
/// locales; the text inside still renders in the ambient direction. Roles that
/// lead with the bell rather than the avatar pass [avatarLeading] as false.
class HomeTopBar extends StatelessWidget {
  const HomeTopBar({
    required this.title,
    required this.role,
    this.name,
    this.imageUrl,
    this.avatarLeading = true,
    this.notificationsKey,
    super.key,
  });

  final String title;

  /// API role value, used for the avatar's indicator colour.
  final String role;

  final String? name;
  final String? imageUrl;

  /// Whether the avatar sits on the left and the bell on the right.
  final bool avatarLeading;

  final Key? notificationsKey;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    final avatar = RoleAvatar(
      name: name ?? '',
      role: role,
      imageUrl: imageUrl,
      size: 44,
    );

    final bell = IconButton(
      key: notificationsKey,
      tooltip: l10n.notifications,
      onPressed: () => _showNotifications(context, l10n),
      icon: const Icon(Icons.notifications_none, size: 28),
      color: AppTheme.primary,
    );

    return Row(
      textDirection: TextDirection.ltr,
      children: [
        avatarLeading ? avatar : bell,
        Expanded(
          child: Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: AppTheme.primary,
              fontWeight: FontWeight.w700,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        avatarLeading ? bell : avatar,
      ],
    );
  }

  /// There is no notifications backend, so this opens an honest empty state
  /// rather than a dead button or a fabricated list.
  void _showNotifications(BuildContext context, AppLocalizations l10n) {
    showMasariBottomSheet<void>(
      context: context,
      child: Padding(
        padding: const EdgeInsets.only(bottom: AppTokens.spaceMedium),
        child: EmptyState(
          title: l10n.notifications,
          message: l10n.noNotifications,
          icon: Icons.notifications_none,
        ),
      ),
    );
  }
}

/// Time-aware greeting used across the role dashboards.
String homeGreeting(AppLocalizations l10n, String who, {DateTime? now}) {
  final hour = (now ?? DateTime.now()).hour;
  if (hour < 12) return l10n.greetingMorning(who);
  if (hour < 17) return l10n.greetingAfternoon(who);
  return l10n.greetingEvening(who);
}
