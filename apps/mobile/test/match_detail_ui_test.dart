import 'package:flutter_test/flutter_test.dart';
import 'package:masari_mobile/features/matching/presentation/match_detail_screen.dart';
import 'package:masari_mobile/l10n/app_localizations_ar.dart';
import 'package:masari_mobile/l10n/app_localizations_en.dart';

void main() {
  test('passenger match statuses use localized presentation labels', () {
    expect(localizedMatchStatus(AppLocalizationsAr(), 'proposed'), 'مقترحة');
    expect(localizedMatchStatus(AppLocalizationsEn(), 'accepted'), 'Accepted');
    expect(localizedMatchStatus(AppLocalizationsEn(), 'unknown'), 'unknown');
  });
}
