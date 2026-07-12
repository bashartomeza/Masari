import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'domain_labels.dart';

final sharedPreferencesProvider = FutureProvider<SharedPreferences>((ref) {
  return SharedPreferences.getInstance();
});

final localeControllerProvider =
    AsyncNotifierProvider<LocaleController, Locale>(LocaleController.new);

class LocaleController extends AsyncNotifier<Locale> {
  late SharedPreferences _preferences;

  @override
  Future<Locale> build() async {
    _preferences = await ref.watch(sharedPreferencesProvider.future);
    final saved = _preferences.getString(DomainLabels.localeStorageKey);
    if (DomainLabels.isSupported(saved)) return Locale(saved!);
    return DomainLabels.defaultLocale;
  }

  Future<void> setLocale(Locale locale) async {
    final languageCode = locale.languageCode;
    if (!DomainLabels.isSupported(languageCode)) return;
    state = AsyncData(locale);
    await _preferences.setString(DomainLabels.localeStorageKey, languageCode);
  }
}
