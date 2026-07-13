import 'package:masari_mobile/l10n/app_localizations.dart';

String localizedLocationSource(AppLocalizations l10n, String source) =>
    switch (source) {
      'simulated' => l10n.sourceSimulated,
      _ => source,
    };
