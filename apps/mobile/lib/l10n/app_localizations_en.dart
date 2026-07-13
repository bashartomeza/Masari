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

  @override
  String get passengerDashboard => 'Passenger dashboard';

  @override
  String get activeRequest => 'Active request';

  @override
  String get noActiveRequest => 'No active request yet.';

  @override
  String get createRequest => 'Create request';

  @override
  String get pickup => 'Pickup';

  @override
  String get ppu => 'PPU Main Gate';

  @override
  String get babAlZawiya => 'Bab Al-Zawiya';

  @override
  String get destination => 'Destination';

  @override
  String get bethlehem => 'Bethlehem';

  @override
  String get preferredTime => 'Preferred time';

  @override
  String get passengerCount => 'Passenger count';

  @override
  String get submitRequest => 'Submit request';

  @override
  String get requestCreated => 'Request created';

  @override
  String get requestDetails => 'Request details';

  @override
  String get cancelRequest => 'Cancel request';

  @override
  String get requestCancelled => 'Request cancelled';

  @override
  String get requestCannotBeCancelled =>
      'This request cannot be cancelled now.';

  @override
  String get findCompatibleRoute => 'Find compatible route';

  @override
  String get retryMatching => 'Retry matching';

  @override
  String get noCompatibleDriverFound =>
      'No compatible driver found. You can retry later.';

  @override
  String get createdTime => 'Created time';

  @override
  String get currentStatus => 'Current status';

  @override
  String get noConnectedTrip => 'No connected trip yet.';

  @override
  String get matchResult => 'Match result';

  @override
  String get selectedDriver => 'Selected driver';

  @override
  String get selectedRoute => 'Selected route';

  @override
  String get matchScore => 'Match score';

  @override
  String get scoringBreakdown => 'Scoring breakdown';

  @override
  String get corridorOverlap => 'Corridor overlap';

  @override
  String get pickupDistance => 'Pickup distance';

  @override
  String get timingFit => 'Timing fit';

  @override
  String get trustScore => 'Trust score';

  @override
  String get capacityFit => 'Capacity fit';

  @override
  String get matchExplanation => 'Match explanation';

  @override
  String get passengerTrip => 'Passenger trip';

  @override
  String get tripTimeline => 'Trip timeline';

  @override
  String get latestLocation => 'Latest location';

  @override
  String get waitingForDriver => 'Waiting for driver';

  @override
  String get noLocationYet => 'No location yet.';

  @override
  String get locationIsStale => 'Location is stale.';

  @override
  String get latitude => 'Latitude';

  @override
  String get longitude => 'Longitude';

  @override
  String get sequence => 'Sequence';

  @override
  String get source => 'Source';

  @override
  String get recordedTime => 'Recorded time';

  @override
  String get refresh => 'Refresh';

  @override
  String get statusPending => 'Pending';

  @override
  String get statusMatched => 'Matched';

  @override
  String get statusAccepted => 'Accepted';

  @override
  String get statusPickupStarted => 'Pickup started';

  @override
  String get statusPickedUp => 'Picked up';

  @override
  String get statusInTransit => 'In transit';

  @override
  String get statusDelivered => 'Delivered';

  @override
  String get statusCompleted => 'Completed';

  @override
  String get statusCancelled => 'Cancelled';
}
