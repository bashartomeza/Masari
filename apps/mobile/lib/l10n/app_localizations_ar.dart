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
}
