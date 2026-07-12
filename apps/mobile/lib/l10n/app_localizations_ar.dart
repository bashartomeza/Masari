// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appTitle => 'مصاري';

  @override
  String get tagline => 'لوجستيات ذكية لتشارك المسار';

  @override
  String get welcomeTitle => 'مرحباً بك في مصاري';

  @override
  String get welcomeBody =>
      'هذا تطبيق أندرويد التجريبي المخصص للمسافر والسائق والتاجر. تم تجهيز الهيكل الأساسي فقط في هذه المرحلة.';

  @override
  String get arabic => 'العربية';

  @override
  String get english => 'English';

  @override
  String get mobileDemoPreparation => 'تحضير العرض التجريبي للهاتف';

  @override
  String get apiEnvironment => 'بيئة واجهة API';

  @override
  String get continueAction => 'متابعة';

  @override
  String get shellStatusTitle => 'حالة هيكل التطبيق';

  @override
  String get shellStatusBody =>
      'العربية هي اللغة الافتراضية، واتجاه الواجهة من اليمين إلى اليسار، وتبديل اللغة محفوظ بعد إعادة التشغيل.';

  @override
  String get language => 'اللغة';

  @override
  String get configuredApiBaseUrl => 'رابط API المضبوط';

  @override
  String get androidOnly => 'هدف أندرويد فقط';

  @override
  String get businessFlowsPending =>
      'تدفقات المسافر والسائق والتاجر ستضاف في مراحل لاحقة.';

  @override
  String get lockedCorridor =>
      'الخليل / جامعة بوليتكنك فلسطين / باب الزاوية ← بيت لحم';

  @override
  String get diagnostics => 'تشخيصات تقنية';

  @override
  String get loadingSession => 'جارٍ استعادة الجلسة...';

  @override
  String get sessionRestoreFailed =>
      'تعذرت استعادة الجلسة. يرجى إعادة المحاولة.';

  @override
  String get retry => 'إعادة المحاولة';

  @override
  String get signInWelcome => 'سجل الدخول للمتابعة إلى مساحة عمل دورك.';

  @override
  String get signIn => 'تسجيل الدخول';

  @override
  String get phone => 'رقم الهاتف';

  @override
  String get password => 'كلمة المرور';

  @override
  String get showPassword => 'إظهار كلمة المرور';

  @override
  String get hidePassword => 'إخفاء كلمة المرور';

  @override
  String get demoAccounts => 'حسابات تجريبية';

  @override
  String get passenger => 'مسافر';

  @override
  String get driver => 'سائق';

  @override
  String get merchant => 'تاجر';

  @override
  String get admin => 'مسؤول';

  @override
  String get unsupportedRole => 'دور غير مدعوم';

  @override
  String get logout => 'تسجيل الخروج';

  @override
  String get sessionExpired => 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.';

  @override
  String get invalidCredentials => 'رقم الهاتف أو كلمة المرور غير صحيحة.';

  @override
  String get networkUnavailable =>
      'الشبكة غير متاحة. تحقق من اتصال واجهة API ثم أعد المحاولة.';

  @override
  String get requestTimedOut => 'انتهت مهلة الطلب. يرجى إعادة المحاولة.';

  @override
  String get validationError => 'يرجى التحقق من البيانات المدخلة.';

  @override
  String get forbidden => 'هذا الحساب غير مسموح له بتنفيذ هذا الإجراء.';

  @override
  String get serverError => 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.';

  @override
  String get requestFailed => 'فشل الطلب. يرجى إعادة المحاولة.';

  @override
  String get roleWorkspace => 'مساحة عمل الدور';

  @override
  String get currentUser => 'المستخدم الحالي';

  @override
  String get role => 'الدور';

  @override
  String get lockedCorridorLabel => 'المسار المثبت';

  @override
  String get workspaceReadyMessage =>
      'مساحة عمل هذا الدور جاهزة للمرحلة التالية.';

  @override
  String get comingNext => 'قريباً';

  @override
  String get businessFeaturesComingNext =>
      'ستضاف إجراءات الدور التجارية في مراحل لاحقة. لا توجد حالياً تدفقات طلبات أو مسارات أو طلبات تاجر أو مطابقات أو رحلات أو تتبع.';

  @override
  String get unsupportedRoleTitle => 'الدور غير مدعوم على الهاتف';

  @override
  String get adminWebConsoleMessage =>
      'لوحة تحكم المسؤول متاحة عبر تطبيق الويب.';
}
