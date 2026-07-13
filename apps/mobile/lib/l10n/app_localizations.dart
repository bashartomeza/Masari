import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In ar, this message translates to:
  /// **'مساري'**
  String get appTitle;

  /// No description provided for @tagline.
  ///
  /// In ar, this message translates to:
  /// **'لوجستيات ذكية لتشارك المسار'**
  String get tagline;

  /// No description provided for @welcomeTitle.
  ///
  /// In ar, this message translates to:
  /// **'مرحباً بك في مساري'**
  String get welcomeTitle;

  /// No description provided for @welcomeBody.
  ///
  /// In ar, this message translates to:
  /// **'هذا تطبيق أندرويد التجريبي المخصص للمسافر والسائق والتاجر. تم تجهيز الهيكل الأساسي فقط في هذه المرحلة.'**
  String get welcomeBody;

  /// No description provided for @arabic.
  ///
  /// In ar, this message translates to:
  /// **'العربية'**
  String get arabic;

  /// No description provided for @english.
  ///
  /// In ar, this message translates to:
  /// **'English'**
  String get english;

  /// No description provided for @mobileDemoPreparation.
  ///
  /// In ar, this message translates to:
  /// **'تحضير العرض التجريبي للهاتف'**
  String get mobileDemoPreparation;

  /// No description provided for @apiEnvironment.
  ///
  /// In ar, this message translates to:
  /// **'بيئة واجهة API'**
  String get apiEnvironment;

  /// No description provided for @continueAction.
  ///
  /// In ar, this message translates to:
  /// **'متابعة'**
  String get continueAction;

  /// No description provided for @shellStatusTitle.
  ///
  /// In ar, this message translates to:
  /// **'حالة هيكل التطبيق'**
  String get shellStatusTitle;

  /// No description provided for @shellStatusBody.
  ///
  /// In ar, this message translates to:
  /// **'العربية هي اللغة الافتراضية، واتجاه الواجهة من اليمين إلى اليسار، وتبديل اللغة محفوظ بعد إعادة التشغيل.'**
  String get shellStatusBody;

  /// No description provided for @language.
  ///
  /// In ar, this message translates to:
  /// **'اللغة'**
  String get language;

  /// No description provided for @configuredApiBaseUrl.
  ///
  /// In ar, this message translates to:
  /// **'رابط API المضبوط'**
  String get configuredApiBaseUrl;

  /// No description provided for @androidOnly.
  ///
  /// In ar, this message translates to:
  /// **'هدف أندرويد فقط'**
  String get androidOnly;

  /// No description provided for @businessFlowsPending.
  ///
  /// In ar, this message translates to:
  /// **'تدفقات المسافر والسائق والتاجر ستضاف في مراحل لاحقة.'**
  String get businessFlowsPending;

  /// No description provided for @lockedCorridor.
  ///
  /// In ar, this message translates to:
  /// **'الخليل / جامعة بوليتكنك فلسطين / باب الزاوية ← بيت لحم'**
  String get lockedCorridor;

  /// No description provided for @diagnostics.
  ///
  /// In ar, this message translates to:
  /// **'تشخيصات تقنية'**
  String get diagnostics;

  /// No description provided for @loadingSession.
  ///
  /// In ar, this message translates to:
  /// **'جارٍ استعادة الجلسة...'**
  String get loadingSession;

  /// No description provided for @sessionRestoreFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذرت استعادة الجلسة. يرجى إعادة المحاولة.'**
  String get sessionRestoreFailed;

  /// No description provided for @retry.
  ///
  /// In ar, this message translates to:
  /// **'إعادة المحاولة'**
  String get retry;

  /// No description provided for @signInWelcome.
  ///
  /// In ar, this message translates to:
  /// **'سجل الدخول للمتابعة إلى مساحة عمل دورك.'**
  String get signInWelcome;

  /// No description provided for @signIn.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل الدخول'**
  String get signIn;

  /// No description provided for @phone.
  ///
  /// In ar, this message translates to:
  /// **'رقم الهاتف'**
  String get phone;

  /// No description provided for @password.
  ///
  /// In ar, this message translates to:
  /// **'كلمة المرور'**
  String get password;

  /// No description provided for @showPassword.
  ///
  /// In ar, this message translates to:
  /// **'إظهار كلمة المرور'**
  String get showPassword;

  /// No description provided for @hidePassword.
  ///
  /// In ar, this message translates to:
  /// **'إخفاء كلمة المرور'**
  String get hidePassword;

  /// No description provided for @demoAccounts.
  ///
  /// In ar, this message translates to:
  /// **'حسابات تجريبية'**
  String get demoAccounts;

  /// No description provided for @passenger.
  ///
  /// In ar, this message translates to:
  /// **'مسافر'**
  String get passenger;

  /// No description provided for @driver.
  ///
  /// In ar, this message translates to:
  /// **'سائق'**
  String get driver;

  /// No description provided for @merchant.
  ///
  /// In ar, this message translates to:
  /// **'تاجر'**
  String get merchant;

  /// No description provided for @admin.
  ///
  /// In ar, this message translates to:
  /// **'مسؤول'**
  String get admin;

  /// No description provided for @unsupportedRole.
  ///
  /// In ar, this message translates to:
  /// **'دور غير مدعوم'**
  String get unsupportedRole;

  /// No description provided for @logout.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل الخروج'**
  String get logout;

  /// No description provided for @sessionExpired.
  ///
  /// In ar, this message translates to:
  /// **'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.'**
  String get sessionExpired;

  /// No description provided for @invalidCredentials.
  ///
  /// In ar, this message translates to:
  /// **'رقم الهاتف أو كلمة المرور غير صحيحة.'**
  String get invalidCredentials;

  /// No description provided for @networkUnavailable.
  ///
  /// In ar, this message translates to:
  /// **'الشبكة غير متاحة. تحقق من اتصال واجهة API ثم أعد المحاولة.'**
  String get networkUnavailable;

  /// No description provided for @requestTimedOut.
  ///
  /// In ar, this message translates to:
  /// **'انتهت مهلة الطلب. يرجى إعادة المحاولة.'**
  String get requestTimedOut;

  /// No description provided for @validationError.
  ///
  /// In ar, this message translates to:
  /// **'يرجى التحقق من البيانات المدخلة.'**
  String get validationError;

  /// No description provided for @forbidden.
  ///
  /// In ar, this message translates to:
  /// **'هذا الحساب غير مسموح له بتنفيذ هذا الإجراء.'**
  String get forbidden;

  /// No description provided for @serverError.
  ///
  /// In ar, this message translates to:
  /// **'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.'**
  String get serverError;

  /// No description provided for @requestFailed.
  ///
  /// In ar, this message translates to:
  /// **'فشل الطلب. يرجى إعادة المحاولة.'**
  String get requestFailed;

  /// No description provided for @roleWorkspace.
  ///
  /// In ar, this message translates to:
  /// **'مساحة عمل الدور'**
  String get roleWorkspace;

  /// No description provided for @currentUser.
  ///
  /// In ar, this message translates to:
  /// **'المستخدم الحالي'**
  String get currentUser;

  /// No description provided for @role.
  ///
  /// In ar, this message translates to:
  /// **'الدور'**
  String get role;

  /// No description provided for @lockedCorridorLabel.
  ///
  /// In ar, this message translates to:
  /// **'المسار المثبت'**
  String get lockedCorridorLabel;

  /// No description provided for @workspaceReadyMessage.
  ///
  /// In ar, this message translates to:
  /// **'مساحة عمل هذا الدور جاهزة للمرحلة التالية.'**
  String get workspaceReadyMessage;

  /// No description provided for @comingNext.
  ///
  /// In ar, this message translates to:
  /// **'قريباً'**
  String get comingNext;

  /// No description provided for @businessFeaturesComingNext.
  ///
  /// In ar, this message translates to:
  /// **'ستضاف إجراءات الدور التجارية في مراحل لاحقة. لا توجد حالياً تدفقات طلبات أو مسارات أو طلبات تاجر أو مطابقات أو رحلات أو تتبع.'**
  String get businessFeaturesComingNext;

  /// No description provided for @unsupportedRoleTitle.
  ///
  /// In ar, this message translates to:
  /// **'الدور غير مدعوم على الهاتف'**
  String get unsupportedRoleTitle;

  /// No description provided for @adminWebConsoleMessage.
  ///
  /// In ar, this message translates to:
  /// **'لوحة تحكم المسؤول متاحة عبر تطبيق الويب.'**
  String get adminWebConsoleMessage;

  /// No description provided for @passengerDashboard.
  ///
  /// In ar, this message translates to:
  /// **'لوحة المسافر'**
  String get passengerDashboard;

  /// No description provided for @activeRequest.
  ///
  /// In ar, this message translates to:
  /// **'الطلب النشط'**
  String get activeRequest;

  /// No description provided for @noActiveRequest.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد طلب نشط حالياً.'**
  String get noActiveRequest;

  /// No description provided for @createRequest.
  ///
  /// In ar, this message translates to:
  /// **'إنشاء طلب'**
  String get createRequest;

  /// No description provided for @pickup.
  ///
  /// In ar, this message translates to:
  /// **'نقطة الانطلاق'**
  String get pickup;

  /// No description provided for @ppu.
  ///
  /// In ar, this message translates to:
  /// **'بوابة جامعة بوليتكنك فلسطين'**
  String get ppu;

  /// No description provided for @babAlZawiya.
  ///
  /// In ar, this message translates to:
  /// **'باب الزاوية'**
  String get babAlZawiya;

  /// No description provided for @destination.
  ///
  /// In ar, this message translates to:
  /// **'الوجهة'**
  String get destination;

  /// No description provided for @bethlehem.
  ///
  /// In ar, this message translates to:
  /// **'بيت لحم'**
  String get bethlehem;

  /// No description provided for @preferredTime.
  ///
  /// In ar, this message translates to:
  /// **'الوقت المفضل'**
  String get preferredTime;

  /// No description provided for @passengerCount.
  ///
  /// In ar, this message translates to:
  /// **'عدد الركاب'**
  String get passengerCount;

  /// No description provided for @submitRequest.
  ///
  /// In ar, this message translates to:
  /// **'إرسال الطلب'**
  String get submitRequest;

  /// No description provided for @requestCreated.
  ///
  /// In ar, this message translates to:
  /// **'تم إنشاء الطلب'**
  String get requestCreated;

  /// No description provided for @requestDetails.
  ///
  /// In ar, this message translates to:
  /// **'تفاصيل الطلب'**
  String get requestDetails;

  /// No description provided for @cancelRequest.
  ///
  /// In ar, this message translates to:
  /// **'إلغاء الطلب'**
  String get cancelRequest;

  /// No description provided for @requestCancelled.
  ///
  /// In ar, this message translates to:
  /// **'تم إلغاء الطلب'**
  String get requestCancelled;

  /// No description provided for @requestCannotBeCancelled.
  ///
  /// In ar, this message translates to:
  /// **'لا يمكن إلغاء هذا الطلب الآن.'**
  String get requestCannotBeCancelled;

  /// No description provided for @findCompatibleRoute.
  ///
  /// In ar, this message translates to:
  /// **'البحث عن مسار متوافق'**
  String get findCompatibleRoute;

  /// No description provided for @retryMatching.
  ///
  /// In ar, this message translates to:
  /// **'إعادة محاولة المطابقة'**
  String get retryMatching;

  /// No description provided for @noCompatibleDriverFound.
  ///
  /// In ar, this message translates to:
  /// **'لم يتم العثور على سائق متوافق. يمكنك إعادة المحاولة لاحقاً.'**
  String get noCompatibleDriverFound;

  /// No description provided for @createdTime.
  ///
  /// In ar, this message translates to:
  /// **'وقت الإنشاء'**
  String get createdTime;

  /// No description provided for @currentStatus.
  ///
  /// In ar, this message translates to:
  /// **'الحالة الحالية'**
  String get currentStatus;

  /// No description provided for @noConnectedTrip.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد رحلة مرتبطة بعد.'**
  String get noConnectedTrip;

  /// No description provided for @matchResult.
  ///
  /// In ar, this message translates to:
  /// **'نتيجة المطابقة'**
  String get matchResult;

  /// No description provided for @selectedDriver.
  ///
  /// In ar, this message translates to:
  /// **'السائق المختار'**
  String get selectedDriver;

  /// No description provided for @selectedRoute.
  ///
  /// In ar, this message translates to:
  /// **'المسار المختار'**
  String get selectedRoute;

  /// No description provided for @matchScore.
  ///
  /// In ar, this message translates to:
  /// **'درجة المطابقة'**
  String get matchScore;

  /// No description provided for @scoringBreakdown.
  ///
  /// In ar, this message translates to:
  /// **'تفصيل الدرجات'**
  String get scoringBreakdown;

  /// No description provided for @corridorOverlap.
  ///
  /// In ar, this message translates to:
  /// **'تطابق المسار'**
  String get corridorOverlap;

  /// No description provided for @pickupDistance.
  ///
  /// In ar, this message translates to:
  /// **'قرب نقطة الانطلاق'**
  String get pickupDistance;

  /// No description provided for @timingFit.
  ///
  /// In ar, this message translates to:
  /// **'ملاءمة الوقت'**
  String get timingFit;

  /// No description provided for @trustScore.
  ///
  /// In ar, this message translates to:
  /// **'درجة الثقة'**
  String get trustScore;

  /// No description provided for @capacityFit.
  ///
  /// In ar, this message translates to:
  /// **'ملاءمة السعة'**
  String get capacityFit;

  /// No description provided for @matchExplanation.
  ///
  /// In ar, this message translates to:
  /// **'شرح المطابقة'**
  String get matchExplanation;

  /// No description provided for @routeMatchExplanation.
  ///
  /// In ar, this message translates to:
  /// **'اختار مساري هذا السائق لأن المسار يطابق الممر النشط، ونقطة الالتقاط قريبة من المسار، والسعة متاحة، ودرجة الثقة مرتفعة.'**
  String get routeMatchExplanation;

  /// No description provided for @passengerTrip.
  ///
  /// In ar, this message translates to:
  /// **'رحلة المسافر'**
  String get passengerTrip;

  /// No description provided for @tripTimeline.
  ///
  /// In ar, this message translates to:
  /// **'خط الرحلة الزمني'**
  String get tripTimeline;

  /// No description provided for @latestLocation.
  ///
  /// In ar, this message translates to:
  /// **'آخر موقع'**
  String get latestLocation;

  /// No description provided for @waitingForDriver.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار السائق'**
  String get waitingForDriver;

  /// No description provided for @noLocationYet.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد موقع بعد.'**
  String get noLocationYet;

  /// No description provided for @locationIsStale.
  ///
  /// In ar, this message translates to:
  /// **'الموقع قديم.'**
  String get locationIsStale;

  /// No description provided for @latitude.
  ///
  /// In ar, this message translates to:
  /// **'خط العرض'**
  String get latitude;

  /// No description provided for @longitude.
  ///
  /// In ar, this message translates to:
  /// **'خط الطول'**
  String get longitude;

  /// No description provided for @sequence.
  ///
  /// In ar, this message translates to:
  /// **'التسلسل'**
  String get sequence;

  /// No description provided for @source.
  ///
  /// In ar, this message translates to:
  /// **'المصدر'**
  String get source;

  /// No description provided for @sourceSimulated.
  ///
  /// In ar, this message translates to:
  /// **'محاكى'**
  String get sourceSimulated;

  /// No description provided for @recordedTime.
  ///
  /// In ar, this message translates to:
  /// **'وقت التسجيل'**
  String get recordedTime;

  /// No description provided for @refresh.
  ///
  /// In ar, this message translates to:
  /// **'تحديث'**
  String get refresh;

  /// No description provided for @statusPending.
  ///
  /// In ar, this message translates to:
  /// **'قيد الانتظار'**
  String get statusPending;

  /// No description provided for @statusMatched.
  ///
  /// In ar, this message translates to:
  /// **'تمت المطابقة'**
  String get statusMatched;

  /// No description provided for @statusAccepted.
  ///
  /// In ar, this message translates to:
  /// **'مقبول'**
  String get statusAccepted;

  /// No description provided for @statusPickupStarted.
  ///
  /// In ar, this message translates to:
  /// **'بدأ التوجه للاستلام'**
  String get statusPickupStarted;

  /// No description provided for @statusPickedUp.
  ///
  /// In ar, this message translates to:
  /// **'تم الاستلام'**
  String get statusPickedUp;

  /// No description provided for @statusInTransit.
  ///
  /// In ar, this message translates to:
  /// **'قيد النقل'**
  String get statusInTransit;

  /// No description provided for @statusDelivered.
  ///
  /// In ar, this message translates to:
  /// **'تم التسليم'**
  String get statusDelivered;

  /// No description provided for @statusCompleted.
  ///
  /// In ar, this message translates to:
  /// **'مكتملة'**
  String get statusCompleted;

  /// No description provided for @statusCancelled.
  ///
  /// In ar, this message translates to:
  /// **'ملغاة'**
  String get statusCancelled;

  /// No description provided for @driverDashboard.
  ///
  /// In ar, this message translates to:
  /// **'لوحة السائق'**
  String get driverDashboard;

  /// No description provided for @activeRoute.
  ///
  /// In ar, this message translates to:
  /// **'المسار النشط'**
  String get activeRoute;

  /// No description provided for @noActiveRoute.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد مسار نشط حالياً.'**
  String get noActiveRoute;

  /// No description provided for @createRoute.
  ///
  /// In ar, this message translates to:
  /// **'إنشاء مسار'**
  String get createRoute;

  /// No description provided for @viewRoute.
  ///
  /// In ar, this message translates to:
  /// **'عرض المسار'**
  String get viewRoute;

  /// No description provided for @routeDetails.
  ///
  /// In ar, this message translates to:
  /// **'تفاصيل المسار'**
  String get routeDetails;

  /// No description provided for @origin.
  ///
  /// In ar, this message translates to:
  /// **'نقطة الانطلاق'**
  String get origin;

  /// No description provided for @seatsAvailable.
  ///
  /// In ar, this message translates to:
  /// **'المقاعد المتاحة'**
  String get seatsAvailable;

  /// No description provided for @parcelCapacity.
  ///
  /// In ar, this message translates to:
  /// **'سعة الطرود'**
  String get parcelCapacity;

  /// No description provided for @activateRoute.
  ///
  /// In ar, this message translates to:
  /// **'تفعيل المسار'**
  String get activateRoute;

  /// No description provided for @deactivateRoute.
  ///
  /// In ar, this message translates to:
  /// **'إلغاء تفعيل المسار'**
  String get deactivateRoute;

  /// No description provided for @routeActivated.
  ///
  /// In ar, this message translates to:
  /// **'تم تفعيل المسار'**
  String get routeActivated;

  /// No description provided for @routeDeactivated.
  ///
  /// In ar, this message translates to:
  /// **'تم إلغاء تفعيل المسار'**
  String get routeDeactivated;

  /// No description provided for @routeStatus.
  ///
  /// In ar, this message translates to:
  /// **'حالة المسار'**
  String get routeStatus;

  /// No description provided for @activationTime.
  ///
  /// In ar, this message translates to:
  /// **'وقت التفعيل'**
  String get activationTime;

  /// No description provided for @routeAlreadyActive.
  ///
  /// In ar, this message translates to:
  /// **'يوجد مسار تشغيلي بالفعل.'**
  String get routeAlreadyActive;

  /// No description provided for @routeCannotDeactivate.
  ///
  /// In ar, this message translates to:
  /// **'لا يمكن إلغاء تفعيل هذا المسار في حالته الحالية.'**
  String get routeCannotDeactivate;

  /// No description provided for @matchInbox.
  ///
  /// In ar, this message translates to:
  /// **'صندوق المطابقات'**
  String get matchInbox;

  /// No description provided for @noAvailableMatches.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد مطابقات متاحة.'**
  String get noAvailableMatches;

  /// No description provided for @passengerRequest.
  ///
  /// In ar, this message translates to:
  /// **'طلب مسافر'**
  String get passengerRequest;

  /// No description provided for @merchantOrder.
  ///
  /// In ar, this message translates to:
  /// **'طلب تاجر'**
  String get merchantOrder;

  /// No description provided for @combinedAssignment.
  ///
  /// In ar, this message translates to:
  /// **'مهمة مشتركة'**
  String get combinedAssignment;

  /// No description provided for @requestType.
  ///
  /// In ar, this message translates to:
  /// **'نوع الطلب'**
  String get requestType;

  /// No description provided for @parcelCount.
  ///
  /// In ar, this message translates to:
  /// **'عدد الطرود'**
  String get parcelCount;

  /// No description provided for @parcelBatch.
  ///
  /// In ar, this message translates to:
  /// **'دفعة الطرود'**
  String get parcelBatch;

  /// No description provided for @estimatedDistanceSaved.
  ///
  /// In ar, this message translates to:
  /// **'المسافة المقدرة الموفرة'**
  String get estimatedDistanceSaved;

  /// No description provided for @acceptMatch.
  ///
  /// In ar, this message translates to:
  /// **'قبول المطابقة'**
  String get acceptMatch;

  /// No description provided for @rejectMatch.
  ///
  /// In ar, this message translates to:
  /// **'رفض المطابقة'**
  String get rejectMatch;

  /// No description provided for @matchAccepted.
  ///
  /// In ar, this message translates to:
  /// **'تم قبول المطابقة'**
  String get matchAccepted;

  /// No description provided for @matchRejected.
  ///
  /// In ar, this message translates to:
  /// **'تم رفض المطابقة'**
  String get matchRejected;

  /// No description provided for @matchCannotChange.
  ///
  /// In ar, this message translates to:
  /// **'تغيرت هذه المطابقة مسبقاً. تم تحميل أحدث حالة.'**
  String get matchCannotChange;

  /// No description provided for @allMatches.
  ///
  /// In ar, this message translates to:
  /// **'كل المطابقات'**
  String get allMatches;

  /// No description provided for @proposedMatches.
  ///
  /// In ar, this message translates to:
  /// **'المطابقات المقترحة'**
  String get proposedMatches;

  /// No description provided for @viewDetails.
  ///
  /// In ar, this message translates to:
  /// **'عرض التفاصيل'**
  String get viewDetails;

  /// No description provided for @activeTrip.
  ///
  /// In ar, this message translates to:
  /// **'الرحلة النشطة'**
  String get activeTrip;

  /// No description provided for @noActiveTrip.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد رحلة نشطة حالياً.'**
  String get noActiveTrip;

  /// No description provided for @openActiveTrip.
  ///
  /// In ar, this message translates to:
  /// **'فتح الرحلة النشطة'**
  String get openActiveTrip;

  /// No description provided for @driverTrip.
  ///
  /// In ar, this message translates to:
  /// **'رحلة السائق'**
  String get driverTrip;

  /// No description provided for @statusTimeline.
  ///
  /// In ar, this message translates to:
  /// **'الخط الزمني للحالة'**
  String get statusTimeline;

  /// No description provided for @startPickup.
  ///
  /// In ar, this message translates to:
  /// **'بدء التوجه للاستلام'**
  String get startPickup;

  /// No description provided for @pickedUpAction.
  ///
  /// In ar, this message translates to:
  /// **'تم الاستلام'**
  String get pickedUpAction;

  /// No description provided for @startTrip.
  ///
  /// In ar, this message translates to:
  /// **'بدء الرحلة'**
  String get startTrip;

  /// No description provided for @deliver.
  ///
  /// In ar, this message translates to:
  /// **'تسليم'**
  String get deliver;

  /// No description provided for @completeTrip.
  ///
  /// In ar, this message translates to:
  /// **'إكمال الرحلة'**
  String get completeTrip;

  /// No description provided for @tripTransitionConflict.
  ///
  /// In ar, this message translates to:
  /// **'تغيرت حالة الرحلة. تم تحميل أحدث حالة.'**
  String get tripTransitionConflict;

  /// No description provided for @trackingSimulation.
  ///
  /// In ar, this message translates to:
  /// **'محاكاة التتبع'**
  String get trackingSimulation;

  /// No description provided for @simulateNextPoint.
  ///
  /// In ar, this message translates to:
  /// **'محاكاة النقطة التالية'**
  String get simulateNextPoint;

  /// No description provided for @resetSimulation.
  ///
  /// In ar, this message translates to:
  /// **'إعادة ضبط المحاكاة'**
  String get resetSimulation;

  /// No description provided for @simulationReset.
  ///
  /// In ar, this message translates to:
  /// **'تمت إعادة ضبط المحاكاة'**
  String get simulationReset;

  /// No description provided for @routeProgress.
  ///
  /// In ar, this message translates to:
  /// **'تقدم المسار'**
  String get routeProgress;

  /// No description provided for @statusProposed.
  ///
  /// In ar, this message translates to:
  /// **'مقترحة'**
  String get statusProposed;

  /// No description provided for @statusSentToDriver.
  ///
  /// In ar, this message translates to:
  /// **'أرسلت إلى السائق'**
  String get statusSentToDriver;

  /// No description provided for @statusRejected.
  ///
  /// In ar, this message translates to:
  /// **'مرفوضة'**
  String get statusRejected;

  /// No description provided for @statusExpired.
  ///
  /// In ar, this message translates to:
  /// **'منتهية'**
  String get statusExpired;

  /// No description provided for @statusActive.
  ///
  /// In ar, this message translates to:
  /// **'نشط'**
  String get statusActive;

  /// No description provided for @statusInactive.
  ///
  /// In ar, this message translates to:
  /// **'غير نشط'**
  String get statusInactive;

  /// No description provided for @statusAssigned.
  ///
  /// In ar, this message translates to:
  /// **'مخصص'**
  String get statusAssigned;

  /// No description provided for @statusOnTrip.
  ///
  /// In ar, this message translates to:
  /// **'في رحلة'**
  String get statusOnTrip;

  /// No description provided for @statusCreated.
  ///
  /// In ar, this message translates to:
  /// **'منشأ'**
  String get statusCreated;

  /// No description provided for @merchantDashboard.
  ///
  /// In ar, this message translates to:
  /// **'لوحة التاجر'**
  String get merchantDashboard;

  /// No description provided for @orders.
  ///
  /// In ar, this message translates to:
  /// **'الطلبات'**
  String get orders;

  /// No description provided for @noOrders.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد طلبات بعد.'**
  String get noOrders;

  /// No description provided for @createOrder.
  ///
  /// In ar, this message translates to:
  /// **'إنشاء طلب'**
  String get createOrder;

  /// No description provided for @latestOrder.
  ///
  /// In ar, this message translates to:
  /// **'أحدث طلب'**
  String get latestOrder;

  /// No description provided for @latestBatch.
  ///
  /// In ar, this message translates to:
  /// **'أحدث دفعة طرود'**
  String get latestBatch;

  /// No description provided for @orderDetails.
  ///
  /// In ar, this message translates to:
  /// **'تفاصيل الطلب'**
  String get orderDetails;

  /// No description provided for @fixedPickup.
  ///
  /// In ar, this message translates to:
  /// **'نقطة الاستلام الثابتة'**
  String get fixedPickup;

  /// No description provided for @parcel.
  ///
  /// In ar, this message translates to:
  /// **'طرد'**
  String get parcel;

  /// No description provided for @parcelSize.
  ///
  /// In ar, this message translates to:
  /// **'حجم الطرد'**
  String get parcelSize;

  /// No description provided for @priority.
  ///
  /// In ar, this message translates to:
  /// **'الأولوية'**
  String get priority;

  /// No description provided for @priorityLow.
  ///
  /// In ar, this message translates to:
  /// **'منخفضة'**
  String get priorityLow;

  /// No description provided for @priorityNormal.
  ///
  /// In ar, this message translates to:
  /// **'عادية'**
  String get priorityNormal;

  /// No description provided for @priorityHigh.
  ///
  /// In ar, this message translates to:
  /// **'مرتفعة'**
  String get priorityHigh;

  /// No description provided for @addParcel.
  ///
  /// In ar, this message translates to:
  /// **'إضافة طرد'**
  String get addParcel;

  /// No description provided for @removeParcel.
  ///
  /// In ar, this message translates to:
  /// **'إزالة الطرد'**
  String get removeParcel;

  /// No description provided for @parcelLimit.
  ///
  /// In ar, this message translates to:
  /// **'يجب أن يحتوي الطلب على 1 إلى 10 طرود.'**
  String get parcelLimit;

  /// No description provided for @submitOrder.
  ///
  /// In ar, this message translates to:
  /// **'إرسال الطلب'**
  String get submitOrder;

  /// No description provided for @orderCreated.
  ///
  /// In ar, this message translates to:
  /// **'تم إنشاء الطلب'**
  String get orderCreated;

  /// No description provided for @createBatch.
  ///
  /// In ar, this message translates to:
  /// **'إنشاء دفعة طرود'**
  String get createBatch;

  /// No description provided for @batchCreated.
  ///
  /// In ar, this message translates to:
  /// **'تم إنشاء دفعة الطرود'**
  String get batchCreated;

  /// No description provided for @batchExplanation.
  ///
  /// In ar, this message translates to:
  /// **'شرح الدفعة'**
  String get batchExplanation;

  /// No description provided for @parcelBatchExplanationDemo.
  ///
  /// In ar, this message translates to:
  /// **'يمكن تجميع {parcelCount} طرود متوافقة في رحلة واحدة على ممر مساري بدلاً من رحلات منفصلة، مما يقلل المسافة والتكلفة.'**
  String parcelBatchExplanationDemo(int parcelCount);

  /// No description provided for @runMatching.
  ///
  /// In ar, this message translates to:
  /// **'البحث عن مسار سائق متوافق'**
  String get runMatching;

  /// No description provided for @matchingStarted.
  ///
  /// In ar, this message translates to:
  /// **'أُرسلت المطابقة المقترحة إلى السائق'**
  String get matchingStarted;

  /// No description provided for @merchantMatchInbox.
  ///
  /// In ar, this message translates to:
  /// **'صندوق مطابقات التاجر'**
  String get merchantMatchInbox;

  /// No description provided for @waitingReadOnly.
  ///
  /// In ar, this message translates to:
  /// **'يقرر السائق القبول أو الرفض. هذه الشاشة للقراءة فقط.'**
  String get waitingReadOnly;

  /// No description provided for @openTrip.
  ///
  /// In ar, this message translates to:
  /// **'فتح الرحلة المرتبطة'**
  String get openTrip;

  /// No description provided for @merchantTrip.
  ///
  /// In ar, this message translates to:
  /// **'رحلة التاجر'**
  String get merchantTrip;

  /// No description provided for @orderStatus.
  ///
  /// In ar, this message translates to:
  /// **'حالة الطلب'**
  String get orderStatus;

  /// No description provided for @parcelStatus.
  ///
  /// In ar, this message translates to:
  /// **'حالة الطرد'**
  String get parcelStatus;

  /// No description provided for @statusDraft.
  ///
  /// In ar, this message translates to:
  /// **'مسودة'**
  String get statusDraft;

  /// No description provided for @statusSubmitted.
  ///
  /// In ar, this message translates to:
  /// **'مُرسل'**
  String get statusSubmitted;

  /// No description provided for @statusBatched.
  ///
  /// In ar, this message translates to:
  /// **'مُجمّع'**
  String get statusBatched;

  /// No description provided for @orderAlreadyBatched.
  ///
  /// In ar, this message translates to:
  /// **'يحتوي هذا الطلب على دفعة طرود بالفعل.'**
  String get orderAlreadyBatched;

  /// No description provided for @matchingUnavailable.
  ///
  /// In ar, this message translates to:
  /// **'أنشئ دفعة أولاً أو انتظر المطابقة الحالية.'**
  String get matchingUnavailable;

  /// No description provided for @deliveryProgress.
  ///
  /// In ar, this message translates to:
  /// **'تقدم التوصيل'**
  String get deliveryProgress;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
