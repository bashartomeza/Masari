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
  /// **'مصاري'**
  String get appTitle;

  /// No description provided for @tagline.
  ///
  /// In ar, this message translates to:
  /// **'لوجستيات ذكية لتشارك المسار'**
  String get tagline;

  /// No description provided for @welcomeTitle.
  ///
  /// In ar, this message translates to:
  /// **'مرحباً بك في مصاري'**
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
