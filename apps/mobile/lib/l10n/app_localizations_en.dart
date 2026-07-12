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

  @override
  String get loadingSession => 'Restoring your session...';

  @override
  String get sessionRestoreFailed =>
      'We could not restore your session. Please retry.';

  @override
  String get retry => 'Retry';

  @override
  String get signInWelcome => 'Sign in to continue to your role workspace.';

  @override
  String get signIn => 'Sign in';

  @override
  String get phone => 'Phone';

  @override
  String get password => 'Password';

  @override
  String get showPassword => 'Show password';

  @override
  String get hidePassword => 'Hide password';

  @override
  String get demoAccounts => 'Demo accounts';

  @override
  String get passenger => 'Passenger';

  @override
  String get driver => 'Driver';

  @override
  String get merchant => 'Merchant';

  @override
  String get admin => 'Admin';

  @override
  String get unsupportedRole => 'Unsupported role';

  @override
  String get logout => 'Logout';

  @override
  String get sessionExpired => 'Your session expired. Please sign in again.';

  @override
  String get invalidCredentials => 'Invalid phone or password.';

  @override
  String get networkUnavailable =>
      'Network unavailable. Check the API connection and retry.';

  @override
  String get requestTimedOut => 'The request timed out. Please retry.';

  @override
  String get validationError => 'Please check the entered details.';

  @override
  String get forbidden => 'This account is not allowed to use this action.';

  @override
  String get serverError => 'Server error. Please retry later.';

  @override
  String get requestFailed => 'Request failed. Please retry.';

  @override
  String get roleWorkspace => 'Role workspace';

  @override
  String get currentUser => 'Current user';

  @override
  String get role => 'Role';

  @override
  String get lockedCorridorLabel => 'Locked corridor';

  @override
  String get workspaceReadyMessage =>
      'This role workspace is ready for the next milestone.';

  @override
  String get comingNext => 'Coming next';

  @override
  String get businessFeaturesComingNext =>
      'Role business actions will be added in later milestones. No request, route, order, match, trip, or tracking flow is enabled yet.';

  @override
  String get unsupportedRoleTitle => 'Mobile role not supported';

  @override
  String get adminWebConsoleMessage =>
      'The admin console is available through the web application.';
}
