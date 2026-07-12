import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../i18n/domain_labels.dart';
import '../i18n/locale_controller.dart';

class LanguageSwitch extends ConsumerWidget {
  const LanguageSwitch({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale =
        ref.watch(localeControllerProvider).value ?? DomainLabels.defaultLocale;
    final l10n = AppLocalizations.of(context);

    return SegmentedButton<String>(
      segments: [
        ButtonSegment(value: 'ar', label: Text(l10n.arabic)),
        ButtonSegment(value: 'en', label: Text(l10n.english)),
      ],
      selected: {locale.languageCode},
      onSelectionChanged: (selection) {
        ref
            .read(localeControllerProvider.notifier)
            .setLocale(Locale(selection.first));
      },
    );
  }
}
