// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Masari';

  @override
  String get tagline => 'Smart route-sharing logistics';

  @override
  String get welcomeTitle => 'Welcome to Masari';

  @override
  String get welcomeBody =>
      'This Android demo app is prepared for passenger, driver, and merchant roles. Only the app shell is enabled in this milestone.';

  @override
  String get arabic => 'Arabic';

  @override
  String get english => 'English';

  @override
  String get mobileDemoPreparation => 'Mobile demo preparation';

  @override
  String get apiEnvironment => 'API environment';

  @override
  String get continueAction => 'Continue';

  @override
  String get shellStatusTitle => 'App-shell status';

  @override
  String get shellStatusBody =>
      'Arabic is the default language, RTL is active for Arabic, and language selection persists after restart.';

  @override
  String get language => 'Language';

  @override
  String get configuredApiBaseUrl => 'Configured API base URL';

  @override
  String get androidOnly => 'Android target only';

  @override
  String get businessFlowsPending =>
      'Passenger, driver, and merchant flows will be added in later milestones.';

  @override
  String get lockedCorridor => 'Hebron / PPU / Bab Al-Zawiya -> Bethlehem';

  @override
  String get diagnostics => 'Technical diagnostics';
}
