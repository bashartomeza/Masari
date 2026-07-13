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
  String get routeMatchExplanation =>
      'Masari selected this driver because the route matches the active corridor, pickup is near the route, capacity is available, and trust score is high.';

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
  String get sourceSimulated => 'Simulated';

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

  @override
  String get driverDashboard => 'Driver dashboard';

  @override
  String get activeRoute => 'Active route';

  @override
  String get noActiveRoute => 'No active route yet.';

  @override
  String get createRoute => 'Create route';

  @override
  String get viewRoute => 'View route';

  @override
  String get routeDetails => 'Route details';

  @override
  String get origin => 'Origin';

  @override
  String get seatsAvailable => 'Seats available';

  @override
  String get parcelCapacity => 'Parcel capacity';

  @override
  String get activateRoute => 'Activate route';

  @override
  String get deactivateRoute => 'Deactivate route';

  @override
  String get routeActivated => 'Route activated';

  @override
  String get routeDeactivated => 'Route deactivated';

  @override
  String get routeStatus => 'Route status';

  @override
  String get activationTime => 'Activation time';

  @override
  String get routeAlreadyActive => 'An operational route already exists.';

  @override
  String get routeCannotDeactivate =>
      'This route cannot be deactivated in its current state.';

  @override
  String get matchInbox => 'Match inbox';

  @override
  String get noAvailableMatches => 'No available matches.';

  @override
  String get passengerRequest => 'Passenger request';

  @override
  String get merchantOrder => 'Merchant order';

  @override
  String get combinedAssignment => 'Combined assignment';

  @override
  String get requestType => 'Request type';

  @override
  String get parcelCount => 'Parcel count';

  @override
  String get parcelBatch => 'Parcel batch';

  @override
  String get estimatedDistanceSaved => 'Estimated distance saved';

  @override
  String get acceptMatch => 'Accept match';

  @override
  String get rejectMatch => 'Reject match';

  @override
  String get matchAccepted => 'Match accepted';

  @override
  String get matchRejected => 'Match rejected';

  @override
  String get matchCannotChange =>
      'This match was already changed. The latest state has been loaded.';

  @override
  String get allMatches => 'All matches';

  @override
  String get proposedMatches => 'Proposed matches';

  @override
  String get viewDetails => 'View details';

  @override
  String get activeTrip => 'Active trip';

  @override
  String get noActiveTrip => 'No active trip yet.';

  @override
  String get openActiveTrip => 'Open active trip';

  @override
  String get driverTrip => 'Driver trip';

  @override
  String get statusTimeline => 'Status timeline';

  @override
  String get startPickup => 'Start pickup';

  @override
  String get pickedUpAction => 'Picked up';

  @override
  String get startTrip => 'Start trip';

  @override
  String get deliver => 'Deliver';

  @override
  String get completeTrip => 'Complete trip';

  @override
  String get tripTransitionConflict =>
      'The trip state changed. The latest status has been loaded.';

  @override
  String get trackingSimulation => 'Tracking simulation';

  @override
  String get simulateNextPoint => 'Simulate next point';

  @override
  String get resetSimulation => 'Reset simulation';

  @override
  String get simulationReset => 'Simulation reset';

  @override
  String get routeProgress => 'Route progress';

  @override
  String get statusProposed => 'Proposed';

  @override
  String get statusSentToDriver => 'Sent to driver';

  @override
  String get statusRejected => 'Rejected';

  @override
  String get statusExpired => 'Expired';

  @override
  String get statusActive => 'Active';

  @override
  String get statusInactive => 'Inactive';

  @override
  String get statusAssigned => 'Assigned';

  @override
  String get statusOnTrip => 'On trip';

  @override
  String get statusCreated => 'Created';

  @override
  String get merchantDashboard => 'Merchant dashboard';

  @override
  String get orders => 'Orders';

  @override
  String get noOrders => 'No orders yet.';

  @override
  String get createOrder => 'Create order';

  @override
  String get latestOrder => 'Latest order';

  @override
  String get latestBatch => 'Latest parcel batch';

  @override
  String get orderDetails => 'Order details';

  @override
  String get fixedPickup => 'Fixed pickup';

  @override
  String get parcel => 'Parcel';

  @override
  String get parcelSize => 'Parcel size';

  @override
  String get priority => 'Priority';

  @override
  String get priorityLow => 'Low';

  @override
  String get priorityNormal => 'Normal';

  @override
  String get priorityHigh => 'High';

  @override
  String get addParcel => 'Add parcel';

  @override
  String get removeParcel => 'Remove parcel';

  @override
  String get parcelLimit => 'An order must contain 1 to 10 parcels.';

  @override
  String get submitOrder => 'Submit order';

  @override
  String get orderCreated => 'Order created';

  @override
  String get createBatch => 'Create parcel batch';

  @override
  String get batchCreated => 'Parcel batch created';

  @override
  String get batchExplanation => 'Batch explanation';

  @override
  String parcelBatchExplanationDemo(int parcelCount) {
    return '$parcelCount compatible parcels can use one Masari corridor trip instead of separate trips, reducing distance and cost.';
  }

  @override
  String get runMatching => 'Find a compatible driver route';

  @override
  String get matchingStarted => 'Match proposed to the driver';

  @override
  String get merchantMatchInbox => 'Merchant match inbox';

  @override
  String get waitingReadOnly =>
      'The driver decides whether to accept or reject. This screen is read-only.';

  @override
  String get openTrip => 'Open connected trip';

  @override
  String get merchantTrip => 'Merchant trip';

  @override
  String get orderStatus => 'Order status';

  @override
  String get parcelStatus => 'Parcel status';

  @override
  String get statusDraft => 'Draft';

  @override
  String get statusSubmitted => 'Submitted';

  @override
  String get statusBatched => 'Batched';

  @override
  String get orderAlreadyBatched => 'This order already has a parcel batch.';

  @override
  String get matchingUnavailable =>
      'Create a batch first or wait for the current match.';

  @override
  String get deliveryProgress => 'Delivery progress';
}
