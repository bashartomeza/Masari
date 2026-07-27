// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appTitle => 'مساري';

  @override
  String get tagline => 'لوجستيات ذكية لتشارك المسار';

  @override
  String get welcomeTitle => 'مرحباً بك في مساري';

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
  String get sessionExpired => 'انتهت جلستك، يرجى تسجيل الدخول مرة أخرى';

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
  String get routeMatchExplanation =>
      'اختار مساري هذا السائق لأن المسار يطابق الممر النشط، ونقطة الالتقاط قريبة من المسار، والسعة متاحة، ودرجة الثقة مرتفعة.';

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
  String get sourceSimulated => 'محاكى';

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
  String get statusActive => 'نشطة';

  @override
  String get statusInactive => 'غير نشط';

  @override
  String get statusAssigned => 'مخصص';

  @override
  String get statusOnTrip => 'في رحلة';

  @override
  String get statusCreated => 'منشأ';

  @override
  String get merchantDashboard => 'لوحة التاجر';

  @override
  String get orders => 'الطلبات';

  @override
  String get noOrders => 'لا توجد طلبات بعد.';

  @override
  String get createOrder => 'إنشاء طلب';

  @override
  String get latestOrder => 'أحدث طلب';

  @override
  String get latestBatch => 'أحدث دفعة طرود';

  @override
  String get orderDetails => 'تفاصيل الطلب';

  @override
  String get fixedPickup => 'نقطة الاستلام الثابتة';

  @override
  String get parcel => 'طرد';

  @override
  String get parcelSize => 'حجم الطرد';

  @override
  String get priority => 'الأولوية';

  @override
  String get priorityLow => 'منخفضة';

  @override
  String get priorityNormal => 'عادية';

  @override
  String get priorityHigh => 'مرتفعة';

  @override
  String get addParcel => 'إضافة طرد';

  @override
  String get removeParcel => 'إزالة الطرد';

  @override
  String get parcelLimit => 'يجب أن يحتوي الطلب على 1 إلى 10 طرود.';

  @override
  String get submitOrder => 'إرسال الطلب';

  @override
  String get orderCreated => 'تم إنشاء الطلب';

  @override
  String get createBatch => 'إنشاء دفعة طرود';

  @override
  String get batchCreated => 'تم إنشاء دفعة الطرود';

  @override
  String get batchExplanation => 'شرح الدفعة';

  @override
  String parcelBatchExplanationDemo(int parcelCount) {
    return 'يمكن تجميع $parcelCount طرود متوافقة في رحلة واحدة على ممر مساري بدلاً من رحلات منفصلة، مما يقلل المسافة والتكلفة.';
  }

  @override
  String get runMatching => 'البحث عن مسار سائق متوافق';

  @override
  String get matchingStarted => 'أُرسلت المطابقة المقترحة إلى السائق';

  @override
  String get merchantMatchInbox => 'صندوق مطابقات التاجر';

  @override
  String get waitingReadOnly =>
      'يقرر السائق القبول أو الرفض. هذه الشاشة للقراءة فقط.';

  @override
  String get openTrip => 'فتح الرحلة المرتبطة';

  @override
  String get merchantTrip => 'رحلة التاجر';

  @override
  String get orderStatus => 'حالة الطلب';

  @override
  String get parcelStatus => 'حالة الطرد';

  @override
  String get statusDraft => 'مسودة';

  @override
  String get statusSubmitted => 'مُرسل';

  @override
  String get statusBatched => 'مُجمّع';

  @override
  String get orderAlreadyBatched => 'يحتوي هذا الطلب على دفعة طرود بالفعل.';

  @override
  String get matchingUnavailable =>
      'أنشئ دفعة أولاً أو انتظر المطابقة الحالية.';

  @override
  String get deliveryProgress => 'تقدم التوصيل';

  @override
  String get securityAndSessions => 'الأمان والجلسات';

  @override
  String get activeSessions => 'الجلسات النشطة';

  @override
  String get currentDevice => 'الجهاز الحالي';

  @override
  String get otherDevice => 'جهاز آخر';

  @override
  String get mobileSession => 'تطبيق الهاتف';

  @override
  String get adminSession => 'متصفح المسؤول';

  @override
  String get created => 'تاريخ الإنشاء';

  @override
  String get lastActive => 'آخر نشاط';

  @override
  String get expires => 'تنتهي في';

  @override
  String get revokeSession => 'إلغاء الجلسة';

  @override
  String get revokeThisDevice => 'إلغاء جلسة هذا الجهاز';

  @override
  String get logoutAllDevices => 'تسجيل الخروج من جميع الأجهزة';

  @override
  String get confirmLogout => 'تأكيد تسجيل الخروج';

  @override
  String get confirmLogoutMessage => 'هل تريد تسجيل الخروج من هذا الجهاز؟';

  @override
  String get confirmLogoutAll => 'تأكيد تسجيل الخروج من جميع الأجهزة';

  @override
  String get confirmLogoutAllMessage =>
      'ستنتهي جميع الجلسات النشطة، وستحتاج إلى تسجيل الدخول مجدداً على كل جهاز.';

  @override
  String get confirmRevokeSession => 'هل تريد إلغاء هذه الجلسة؟';

  @override
  String get cancel => 'إلغاء';

  @override
  String get sessionRevoked => 'تم إلغاء الجلسة';

  @override
  String get sessionEnded => 'انتهت جلستك، يرجى تسجيل الدخول مرة أخرى';

  @override
  String get accountUnavailable =>
      'هذا الحساب غير متاح. تواصل مع المسؤول إذا كنت بحاجة إلى مساعدة.';

  @override
  String get refreshingSession => 'جارٍ تحديث الجلسة...';

  @override
  String get unableToRefresh =>
      'تعذر تحديث الجلسة. تحقق من الاتصال ثم أعد المحاولة.';

  @override
  String get localLogout => 'تسجيل الخروج من هذا الجهاز';

  @override
  String get noActiveSessions => 'لم يتم إرجاع جلسات نشطة.';

  @override
  String get sessionActionFailed =>
      'تعذر إكمال إجراء الجلسة. يرجى إعادة المحاولة.';

  @override
  String get createInvitedAccount => 'إنشاء حساب بدعوة';

  @override
  String get selectAccountType => 'اختر نوع الحساب';

  @override
  String get passengerActiveAfterRegistration =>
      'يصبح الحساب نشطاً بعد التسجيل';

  @override
  String get pendingAfterRegistration =>
      'يبقى الحساب قيد المراجعة حتى الموافقة';

  @override
  String get invitationCode => 'رمز الدعوة';

  @override
  String get phoneNumber => 'رقم الهاتف';

  @override
  String get sendVerificationCode => 'إرسال رمز التحقق';

  @override
  String get enterVerificationCode => 'أدخل رمز التحقق';

  @override
  String get resendCode => 'إعادة إرسال الرمز';

  @override
  String get resendAvailableIn => 'تتوفر إعادة الإرسال خلال';

  @override
  String get verify => 'تحقق';

  @override
  String get accountInformation => 'معلومات الحساب';

  @override
  String get displayName => 'الاسم الظاهر';

  @override
  String get confirmPassword => 'تأكيد كلمة المرور';

  @override
  String get terms => 'الشروط';

  @override
  String get privacyNotice => 'إشعار الخصوصية';

  @override
  String get confirmAdult => 'أؤكد أن عمري 18 عاماً أو أكثر';

  @override
  String get acceptAndContinue => 'قبول ومتابعة';

  @override
  String get createAccount => 'إنشاء الحساب';

  @override
  String get accountCreated => 'تم إنشاء الحساب';

  @override
  String get signInToContinue => 'تم إنشاء حسابك. سجّل الدخول للمتابعة.';

  @override
  String get applicationUnderReview => 'الطلب قيد المراجعة';

  @override
  String get pendingReviewBody =>
      'تم إنشاء حسابك وهو قيد المراجعة. ستتمكن من تسجيل الدخول بعد الموافقة على الحساب.';

  @override
  String get checkApplicationStatus => 'متابعة حالة طلب سابق';

  @override
  String get registrationUnavailable => 'التسجيل غير متاح مؤقتاً.';

  @override
  String get unableToStartRegistration =>
      'تعذر بدء التسجيل. تحقق من بيانات الدعوة وحاول مرة أخرى.';

  @override
  String get incorrectVerificationCode => 'رمز التحقق غير صحيح.';

  @override
  String get codeExpired => 'انتهت صلاحية الرمز.';

  @override
  String get tooManyAttempts => 'محاولات كثيرة جداً. يرجى المحاولة لاحقاً.';

  @override
  String get consentDocumentsChanged =>
      'تغيرت مستندات الموافقة. يرجى مراجعتها مرة أخرى.';

  @override
  String get requestReference => 'مرجع الطلب';

  @override
  String get leaveRegistration => 'مغادرة التسجيل';

  @override
  String get continueRegistration => 'متابعة التسجيل';

  @override
  String get leaveRegistrationWarning =>
      'سيؤدي الخروج إلى مسح حالة التسجيل المحفوظة على هذا الجهاز. هل تريد المتابعة؟';

  @override
  String get secondsShort => 'ثانية';

  @override
  String get consentVersion => 'الإصدار';

  @override
  String get accountApproved => 'تمت الموافقة على الحساب';

  @override
  String get signInAfterApproval =>
      'تمت الموافقة على حسابك. سجّل الدخول للمتابعة.';

  @override
  String get canonicalRoutes => 'خدمات المسارات المتعددة';

  @override
  String get canonicalRoutesBody =>
      'اختر من المسارات الحالية والمحطات المعتمدة.';

  @override
  String get featureUnavailable => 'هذه الخدمة غير متاحة في هذه البيئة.';

  @override
  String get routeCatalogUnavailable =>
      'المسارات غير متاحة مؤقتاً. حدّثها قبل الإرسال.';

  @override
  String get noPublishedRoutes => 'لا توجد مسارات منشورة ومؤهلة حالياً.';

  @override
  String get selectRoute => 'اختر المسار';

  @override
  String get routeDirection => 'الاتجاه';

  @override
  String get directionOutbound => 'ذهاب';

  @override
  String get directionInbound => 'عودة';

  @override
  String get directionLoop => 'دائري';

  @override
  String get orderedStops => 'المحطات بالترتيب';

  @override
  String stopSequence(int sequence) {
    return 'المحطة $sequence';
  }

  @override
  String get driverAvailabilities => 'إتاحة المسار';

  @override
  String get newAvailability => 'إنشاء إتاحة لمسار';

  @override
  String get noAvailabilities => 'لم تُنشأ إتاحة لمسار بعد.';

  @override
  String get departureTime => 'وقت الانطلاق';

  @override
  String get availabilityWindowEnd => 'نهاية نافذة الإتاحة (اختياري)';

  @override
  String get seatCapacity => 'سعة المقاعد';

  @override
  String get reviewAndConfirm => 'مراجعة وتأكيد';

  @override
  String get availabilityRecorded => 'تم تسجيل الإتاحة';

  @override
  String remainingCapacity(int seats, int parcels) {
    return 'المتبقي: $seats مقاعد، $parcels طرود';
  }

  @override
  String get activateAvailability => 'تفعيل الإتاحة';

  @override
  String get pauseAvailability => 'إيقاف الإتاحة مؤقتاً';

  @override
  String get resumeAvailability => 'استئناف الإتاحة';

  @override
  String get cancelAvailability => 'إلغاء الإتاحة';

  @override
  String get editAvailability => 'تعديل الإتاحة';

  @override
  String get canonicalPassengerRequest => 'طلب مسار';

  @override
  String get canonicalPassengerRequestBody =>
      'اطلب التنقل عبر مسار ومحطات معتمدة.';

  @override
  String get pickupStop => 'محطة الصعود';

  @override
  String get dropoffStop => 'محطة النزول';

  @override
  String get departureFrom => 'بداية وقت الانطلاق';

  @override
  String get departureUntil => 'نهاية وقت الانطلاق';

  @override
  String get requestRecorded => 'تم تسجيل طلب المسار.';

  @override
  String get matchingDisabledNotice =>
      'المطابقة غير مفعلة في هذه المرحلة. لم يُعيَّن سائق ولم تُنشأ رحلة.';

  @override
  String get canonicalMerchantOrder => 'طلب طرود عبر مسار';

  @override
  String get canonicalMerchantOrderBody =>
      'أنشئ طلباً واحداً متكاملاً على مسار معتمد.';

  @override
  String get parcelPickupStop => 'محطة استلام الطرود';

  @override
  String get parcelDestination => 'وجهة الطرد';

  @override
  String get parcelPriority => 'أولوية الطرد';

  @override
  String get orderRecorded => 'تم تسجيل طلب الطرود عبر المسار.';

  @override
  String get batchingMatchingDisabledNotice =>
      'التجميع والمطابقة غير مفعلين في هذه المرحلة. لم يُعيَّن سائق ولم تُنشأ رحلة توصيل.';

  @override
  String get submitAvailability => 'إرسال الإتاحة';

  @override
  String get selectDateTime => 'اختر التاريخ والوقت';

  @override
  String get invalidDepartureWindow => 'اختر نافذة انطلاق مستقبلية وصحيحة.';

  @override
  String get invalidStopOrder => 'اختر محطة معتمدة لاحقة في المسار.';

  @override
  String get operationTemporaryFailure =>
      'نتيجة العملية غير مؤكدة. أعد محاولة العملية نفسها عند توفر الاتصال.';

  @override
  String get canonicalRecoveryRequired =>
      'توجد عملية سابقة غير محسومة. سجّل الدخول بالحساب الأصلي وأعد العملية نفسها، أو تواصل مع الدعم إذا انتهت مهلة الاسترداد.';

  @override
  String get transactionRetryRequired =>
      'حدث تعارض مؤقت في المعاملة. أعد محاولة هذه العملية.';

  @override
  String get refreshRoutes => 'تحديث المسارات';

  @override
  String get statusPaused => 'متوقفة مؤقتاً';

  @override
  String get statusFilled => 'ممتلئة';

  @override
  String get statusDeparted => 'انطلقت';

  @override
  String get returnToDashboard => 'العودة إلى لوحة التحكم';

  @override
  String get canonicalDriverOffers => 'عروض المسار';

  @override
  String get canonicalDriverOffersBody =>
      'راجع طلبات الركاب والطرود الحالية المرتبطة بإتاحة مسارك.';

  @override
  String get noCanonicalOffers => 'لا توجد عروض مسار حالياً.';

  @override
  String get loadMore => 'تحميل المزيد';

  @override
  String get offerDetails => 'تفاصيل العرض';

  @override
  String get offerExpires => 'ينتهي العرض';

  @override
  String get offerExpired => 'انتهت صلاحية هذا العرض.';

  @override
  String get demandPassenger => 'طلب راكب';

  @override
  String get demandMerchant => 'طلب طرود';

  @override
  String get acceptOffer => 'قبول العرض';

  @override
  String get rejectOffer => 'رفض العرض';

  @override
  String get rejectReason => 'سبب الرفض';

  @override
  String get rejectDriverDeclined => 'لا أستطيع تنفيذ هذه المهمة';

  @override
  String get rejectScheduleConflict => 'تعارض في الموعد';

  @override
  String get rejectCapacityUnavailable => 'السعة غير متوفرة';

  @override
  String get confirmAcceptOffer => 'هل تريد قبول مهمة المسار هذه؟';

  @override
  String get confirmRejectOffer => 'هل تريد رفض مهمة المسار هذه؟';

  @override
  String get offerAccepted => 'تم قبول المهمة.';

  @override
  String get offerRejected => 'تم رفض المهمة.';

  @override
  String get operationResultUncertain =>
      'نتيجة العملية غير مؤكدة. احتفظ بهذه العملية وقم بمطابقتها قبل محاولة عملية أخرى.';

  @override
  String get recoverOperation => 'مطابقة نتيجة العملية';

  @override
  String get canonicalAssignmentStatus => 'حالة إسناد المسار';

  @override
  String get canonicalAssignments => 'طلبات المسار والإسناد';

  @override
  String get noCanonicalAssignments => 'لم تُسجل إسنادات مسار بعد.';

  @override
  String get statusOffered => 'معروض على سائق';

  @override
  String get statusUnavailable => 'لا يوجد إسناد متاح';

  @override
  String get canonicalTrip => 'الرحلة المسندة';

  @override
  String get vehicleType => 'نوع المركبة';

  @override
  String get trackingNotAvailable =>
      'التتبع المباشر والخرائط وتقديرات الوصول غير متوفرة في هذه المرحلة.';

  @override
  String get manualRefreshNotice =>
      'اسحب للأسفل أو استخدم زر التحديث للتحقق من المستجدات.';

  @override
  String get assignmentPendingBody => 'طلبك بانتظار المطابقة.';

  @override
  String get assignmentOfferedBody => 'العرض بانتظار قرار السائق.';

  @override
  String get assignmentAssignedBody => 'قبل السائق وتم إنشاء رحلة.';

  @override
  String get assignmentUnavailableBody => 'لا يوجد إسناد نشط لسائق.';

  @override
  String get assignmentCancelledBody => 'تم إلغاء هذا الطلب.';

  @override
  String get leaveRejectionWarning =>
      'لم يتم إرسال سبب الرفض المحدد. هل تريد مغادرة الشاشة؟';

  @override
  String get routeStops => 'محطات المسار';
}
