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

  @override
  String get passengerDashboard => 'لوحة المسافر';

  @override
  String get activeRequest => 'الطلب النشط';

  @override
  String get noActiveRequest => 'لا يوجد طلب نشط حالياً.';

  @override
  String get createRequest => 'إنشاء طلب';

  @override
  String get pickup => 'نقطة الانطلاق';

  @override
  String get ppu => 'بوابة جامعة بوليتكنك فلسطين';

  @override
  String get babAlZawiya => 'باب الزاوية';

  @override
  String get destination => 'الوجهة';

  @override
  String get bethlehem => 'بيت لحم';

  @override
  String get preferredTime => 'الوقت المفضل';

  @override
  String get passengerCount => 'عدد الركاب';

  @override
  String get submitRequest => 'إرسال الطلب';

  @override
  String get requestCreated => 'تم إنشاء الطلب';

  @override
  String get requestDetails => 'تفاصيل الطلب';

  @override
  String get cancelRequest => 'إلغاء الطلب';

  @override
  String get requestCancelled => 'تم إلغاء الطلب';

  @override
  String get requestCannotBeCancelled => 'لا يمكن إلغاء هذا الطلب الآن.';

  @override
  String get findCompatibleRoute => 'البحث عن مسار متوافق';

  @override
  String get retryMatching => 'إعادة محاولة المطابقة';

  @override
  String get noCompatibleDriverFound =>
      'لم يتم العثور على سائق متوافق. يمكنك إعادة المحاولة لاحقاً.';

  @override
  String get createdTime => 'وقت الإنشاء';

  @override
  String get currentStatus => 'الحالة الحالية';

  @override
  String get noConnectedTrip => 'لا توجد رحلة مرتبطة بعد.';

  @override
  String get matchResult => 'نتيجة المطابقة';

  @override
  String get selectedDriver => 'السائق المختار';

  @override
  String get selectedRoute => 'المسار المختار';

  @override
  String get matchScore => 'درجة المطابقة';

  @override
  String get scoringBreakdown => 'تفصيل الدرجات';

  @override
  String get corridorOverlap => 'تطابق المسار';

  @override
  String get pickupDistance => 'قرب نقطة الانطلاق';

  @override
  String get timingFit => 'ملاءمة الوقت';

  @override
  String get trustScore => 'درجة الثقة';

  @override
  String get capacityFit => 'ملاءمة السعة';

  @override
  String get matchExplanation => 'شرح المطابقة';

  @override
  String get passengerTrip => 'رحلة المسافر';

  @override
  String get tripTimeline => 'خط الرحلة الزمني';

  @override
  String get latestLocation => 'آخر موقع';

  @override
  String get waitingForDriver => 'بانتظار السائق';

  @override
  String get noLocationYet => 'لا يوجد موقع بعد.';

  @override
  String get locationIsStale => 'الموقع قديم.';

  @override
  String get latitude => 'خط العرض';

  @override
  String get longitude => 'خط الطول';

  @override
  String get sequence => 'التسلسل';

  @override
  String get source => 'المصدر';

  @override
  String get recordedTime => 'وقت التسجيل';

  @override
  String get refresh => 'تحديث';

  @override
  String get statusPending => 'قيد الانتظار';

  @override
  String get statusMatched => 'تمت المطابقة';

  @override
  String get statusAccepted => 'مقبول';

  @override
  String get statusPickupStarted => 'بدأ التوجه للاستلام';

  @override
  String get statusPickedUp => 'تم الاستلام';

  @override
  String get statusInTransit => 'قيد النقل';

  @override
  String get statusDelivered => 'تم التسليم';

  @override
  String get statusCompleted => 'مكتملة';

  @override
  String get statusCancelled => 'ملغاة';

  @override
  String get driverDashboard => 'لوحة السائق';

  @override
  String get activeRoute => 'المسار النشط';

  @override
  String get noActiveRoute => 'لا يوجد مسار نشط حالياً.';

  @override
  String get createRoute => 'إنشاء مسار';

  @override
  String get viewRoute => 'عرض المسار';

  @override
  String get routeDetails => 'تفاصيل المسار';

  @override
  String get origin => 'نقطة الانطلاق';

  @override
  String get seatsAvailable => 'المقاعد المتاحة';

  @override
  String get parcelCapacity => 'سعة الطرود';

  @override
  String get activateRoute => 'تفعيل المسار';

  @override
  String get deactivateRoute => 'إلغاء تفعيل المسار';

  @override
  String get routeActivated => 'تم تفعيل المسار';

  @override
  String get routeDeactivated => 'تم إلغاء تفعيل المسار';

  @override
  String get routeStatus => 'حالة المسار';

  @override
  String get activationTime => 'وقت التفعيل';

  @override
  String get routeAlreadyActive => 'يوجد مسار تشغيلي بالفعل.';

  @override
  String get routeCannotDeactivate =>
      'لا يمكن إلغاء تفعيل هذا المسار في حالته الحالية.';

  @override
  String get matchInbox => 'صندوق المطابقات';

  @override
  String get noAvailableMatches => 'لا توجد مطابقات متاحة.';

  @override
  String get passengerRequest => 'طلب مسافر';

  @override
  String get merchantOrder => 'طلب تاجر';

  @override
  String get combinedAssignment => 'مهمة مشتركة';

  @override
  String get requestType => 'نوع الطلب';

  @override
  String get parcelCount => 'عدد الطرود';

  @override
  String get parcelBatch => 'دفعة الطرود';

  @override
  String get estimatedDistanceSaved => 'المسافة المقدرة الموفرة';

  @override
  String get acceptMatch => 'قبول المطابقة';

  @override
  String get rejectMatch => 'رفض المطابقة';

  @override
  String get matchAccepted => 'تم قبول المطابقة';

  @override
  String get matchRejected => 'تم رفض المطابقة';

  @override
  String get matchCannotChange =>
      'تغيرت هذه المطابقة مسبقاً. تم تحميل أحدث حالة.';

  @override
  String get allMatches => 'كل المطابقات';

  @override
  String get proposedMatches => 'المطابقات المقترحة';

  @override
  String get viewDetails => 'عرض التفاصيل';

  @override
  String get activeTrip => 'الرحلة النشطة';

  @override
  String get noActiveTrip => 'لا توجد رحلة نشطة حالياً.';

  @override
  String get openActiveTrip => 'فتح الرحلة النشطة';

  @override
  String get driverTrip => 'رحلة السائق';

  @override
  String get statusTimeline => 'الخط الزمني للحالة';

  @override
  String get startPickup => 'بدء التوجه للاستلام';

  @override
  String get pickedUpAction => 'تم الاستلام';

  @override
  String get startTrip => 'بدء الرحلة';

  @override
  String get deliver => 'تسليم';

  @override
  String get completeTrip => 'إكمال الرحلة';

  @override
  String get tripTransitionConflict => 'تغيرت حالة الرحلة. تم تحميل أحدث حالة.';

  @override
  String get trackingSimulation => 'محاكاة التتبع';

  @override
  String get simulateNextPoint => 'محاكاة النقطة التالية';

  @override
  String get resetSimulation => 'إعادة ضبط المحاكاة';

  @override
  String get simulationReset => 'تمت إعادة ضبط المحاكاة';

  @override
  String get routeProgress => 'تقدم المسار';

  @override
  String get statusProposed => 'مقترحة';

  @override
  String get statusSentToDriver => 'أرسلت إلى السائق';

  @override
  String get statusRejected => 'مرفوضة';

  @override
  String get statusExpired => 'منتهية';

  @override
  String get statusActive => 'نشط';

  @override
  String get statusInactive => 'غير نشط';

  @override
  String get statusAssigned => 'مخصص';

  @override
  String get statusOnTrip => 'في رحلة';

  @override
  String get statusCreated => 'منشأ';
}
