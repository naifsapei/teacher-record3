// ── Subscription plans ───────────────────────────────────────────────────────
export const PLAN_LABELS = {
  free: "مجاني",
  semester: "فصل دراسي",
  year: "عام دراسي",
  admin: "مدير النظام",
};

export const PLAN_DURATION_MONTHS = { semester: 4, year: 12 };

export const STATUS_LABELS = {
  admin: "مدير النظام",
  active: "مشترك",
  pending: "بانتظار التفعيل",
  expired: "غير مفعّل",
  rejected: "مرفوض",
  free: "مجاني",
};

export const STATUS_TONES = {
  admin: "bg-primary/10 text-primary border-primary/20",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  expired: "bg-amber-50 text-amber-700 border-amber-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  free: "bg-muted text-muted-foreground border-border",
};

export function getSubscriptionPlan(me) {
  if (!me) return "free";
  if (me.role === "admin" || me.subscription_plan === "admin") return "admin";
  const plan = me.subscription_plan;
  if (plan === "semester" || plan === "year") return plan;
  return me.account_type === "subscriber" ? "year" : "free";
}

export function getSubscriptionStatus(me) {
  if (!me) return "free";
  if (me.role === "admin") return "admin";
  const stored = me.subscription_status;
  if (stored === "rejected") return "rejected";
  if (stored === "pending") return "pending";
  if (stored === "free") return "free";
  if (stored === "active") {
    const end = me.subscription_end ? new Date(me.subscription_end) : null;
    if (end && end < new Date()) return "expired";
    return "active";
  }
  if (stored === "expired") return "expired";
  const plan = getSubscriptionPlan(me);
  if (plan === "free") return "free";
  const end = me.subscription_end ? new Date(me.subscription_end) : null;
  if (end && end < new Date()) return "expired";
  return "active";
}

export function isSubscriptionActive(me) {
  const s = getSubscriptionStatus(me);
  return s === "active" || s === "admin";
}

export function canExport(me) {
  if (!me) return false;
  if (me.role === "admin") return true;
  return isSubscriptionActive(me);
}

// الحساب المجاني: غير مشترك (أو انتهى اشتراكه) وغير أدمن
export function isFreeAccount(me) {
  if (!me) return true;
  if (me.role === "admin") return false;
  return !isSubscriptionActive(me);
}

export const FREE_SUBJECT_LIMIT = 1;

// الحساب المجاني يُسمح له بمادة واحدة فقط
export function canAddSubject(me, currentCount = 0) {
  if (!me) return false;
  if (me.role === "admin" || isSubscriptionActive(me)) return true;
  return currentCount < FREE_SUBJECT_LIMIT;
}

export function accountLabel(me) {
  const s = getSubscriptionStatus(me);
  if (s === "admin") return "مدير النظام";
  if (s === "active") return "مشترك";
  if (s === "pending") return "بانتظار التفعيل";
  if (s === "expired") return "غير مفعّل";
  if (s === "rejected") return "مرفوض";
  return "مجاني";
}

// ── App roles ────────────────────────────────────────────────────────────────
// خيارات الأدوار في التطبيق مع المسمى الذكوري/الأنثوي لكل دور
export const APP_ROLE_OPTIONS = [
  { value: "teacher", label: "معلم", male: "معلم", female: "معلمة" },
  { value: "principal", label: "مدير مدرسة", male: "مدير", female: "مديرة" },
  { value: "student_counselor", label: "موجه طلابي", male: "موجه", female: "موجهة" },
  { value: "student_affairs", label: "وكيل شؤون الطلاب", male: "وكيل", female: "وكيلة" },
  { value: "teacher_affairs", label: "وكيل شؤون المعلمين", male: "وكيل", female: "وكيلة" },
];

export const APP_ROLE_LABELS = {
  teacher: "معلم",
  principal: "مدير مدرسة",
  student_counselor: "موجه طلابي",
  student_affairs: "وكيل شؤون الطلاب",
  teacher_affairs: "وكيل شؤون المعلمين",
};

export function appRoleLabel(me) {
  if (!me) return "";
  if (me.role === "admin") return "مدير النظام";
  return APP_ROLE_LABELS[me.app_role] || "مستخدم";
}

// ── Role checks ──────────────────────────────────────────────────────────────
export function isAdmin(me) {
  return !!me && me.role === "admin";
}

export function isPrincipal(me) {
  return !!me && (me.app_role === "principal" || me.role === "admin");
}

export function isTeacher(me) {
  return !!me && me.app_role === "teacher" && me.role !== "admin";
}

export function isStudentAffairs(me) {
  return !!me && me.app_role === "student_affairs" && me.role !== "admin";
}

export function isStudentCounselor(me) {
  return !!me && me.app_role === "student_counselor" && me.role !== "admin";
}

export function isTeacherAffairs(me) {
  return !!me && me.app_role === "teacher_affairs" && me.role !== "admin";
}

// ── School linkage status ────────────────────────────────────────────────────
// حالات الربط بين المستخدم والمدرسة عبر الرقم الوزاري
export const LINK_STATUS_LABELS = {
  approved: "مرتبط بالمدرسة",
  pending: "بانتظار موافقة المدير",
  rejected: "مرفوض",
  independent: "معلم مستقل",
  unlinked: "غير مرتبط بمدرسة",
  suspended: "موقوف",
  invalid_ministry: "رقم وزاري غير صحيح",
  needs_review: "يحتاج مراجعة",
};

export const LINK_STATUS_TONES = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  independent: "bg-blue-50 text-blue-700 border-blue-200",
  unlinked: "bg-muted text-muted-foreground border-border",
  suspended: "bg-red-100 text-red-800 border-red-300",
  invalid_ministry: "bg-orange-50 text-orange-700 border-orange-200",
  needs_review: "bg-purple-50 text-purple-700 border-purple-200",
};

// تحديد حالة الربط للمستخدم (مع التوافق مع الحسابات القديمة قبل نظام الربط)
export function getLinkStatus(me) {
  if (!me) return "unlinked";
  if (me.role === "admin") return "approved";
  if (me.link_status) return me.link_status;
  // حسابات قديمة قبل نظام الربط: وجود school_id أو الرقم الوزاري يُعتبر مرتبطاً
  if (me.school_id) return "approved";
  if (me.app_role === "principal") return me.ministry_number ? "approved" : "unlinked";
  if (me.ministry_number) return "approved";
  return me.app_role === "teacher" ? "independent" : "unlinked";
}

export function isLinkedApproved(me) { return getLinkStatus(me) === "approved"; }
export function isPendingLink(me) { return getLinkStatus(me) === "pending"; }
export function isRejectedLink(me) { return getLinkStatus(me) === "rejected"; }
export function isIndependentTeacher(me) {
  return !!me && me.app_role === "teacher" && getLinkStatus(me) === "independent";
}

// أي دور مدرسي إشرافي (مدير أو وكلاء أو موجه) — يستطيع الاطلاع على بيانات المدرسة
// بعد موافقة المدير على ربطه بالمدرسة. المدير مرتبط تلقائياً بمدرسته.
export function isSchoolSupervisor(me) {
  if (!me || me.role === "admin") return false;
  if (!["principal", "student_affairs", "student_counselor", "teacher_affairs"].includes(me.app_role)) return false;
  if (me.app_role === "principal") return true;
  return getLinkStatus(me) === "approved";
}

// مدير مدرسة مخصص (ليس أدمن المنصة) — يرى نظام المدير فقط
export function isPrincipalOnly(me) {
  return !!me && me.app_role === "principal" && me.role !== "admin";
}

export function canAccessPrincipalPanel(me) {
  return isPrincipal(me);
}

// ── RBAC permissions ─────────────────────────────────────────────────────────
// المعلم وأدمن النظام فقط يستطيعون إدارة المواد والصفوف والطلاب والدرجات.
// مدير المدرسة والأدوار الإشرافية الأخرى: دورهم متابعة وتقارير فقط.
export function canManageAcademicData(me) {
  if (!me) return false;
  if (me.role === "admin") return true;
  return me.app_role === "teacher";
}

export function canManageSubjects(me) {
  return canManageAcademicData(me);
}

export function canManageClasses(me) {
  return canManageAcademicData(me);
}

export function canManageStudents(me) {
  return canManageAcademicData(me);
}

export function canManageGrades(me) {
  return canManageAcademicData(me);
}

export function canManageAttendance(me) {
  return canManageAcademicData(me);
}

// إدارة المعلمين (إضافة/تعديل/حذف): أدمن النظام فقط. المدير والإشراف: متابعة وعرض فقط.
export function canManageTeachers(me) {
  return isAdmin(me);
}

// الاطلاع على المعلمين (للمتابعة): المدير والأدوار الإشرافية وأدمن النظام
export function canViewTeachers(me) {
  if (!me) return false;
  if (me.role === "admin") return true;
  return isSchoolSupervisor(me);
}

// إدارة المستخدمين والأدوار: أدمن النظام فقط
export function canManageUsers(me) {
  return isAdmin(me);
}

export function ministryNumber(me) {
  return me?.ministry_number || "";
}

// مفتاح الربط المُعتمد: school_id أولاً (الثابت المُتحقَّق منه)، ثم ministry_number كاحتياط
export function schoolLinkKey(me) {
  if (!me) return "";
  return me.school_id || me.ministry_number || "";
}

// ── Subject specializations ──────────────────────────────────────────────────
// قائمة تخصصات المواد المتاحة للمعلمين (اختيار واحد عبر قائمة منسدلة)
export const SUBJECT_SPECIALIZATIONS = [
  "القرآن الكريم",
  "الدراسات الإسلامية",
  "اللغة العربية",
  "الرياضيات",
  "العلوم",
  "اللغة الإنجليزية",
  "الدراسات الاجتماعية",
  "المهارات الرقمية",
  "التربية البدنية",
  "التربية الفنية",
  "المهارات الحياتية والأسرية",
];

// Helper: يحوّل حقل التخصص إلى مصفوفة (يدعم القيمة القديمة المصفوفية والقيمة النصية الجديدة)
export function getSpecializations(teacher) {
  const sp = teacher?.specialization;
  if (Array.isArray(sp)) return sp.filter(Boolean);
  if (typeof sp === "string" && sp.trim()) return [sp.trim()];
  return [];
}

// Helper: نص التخصص للعرض
export function specializationsText(teacher) {
  const sp = teacher?.specialization;
  if (Array.isArray(sp)) return sp.filter(Boolean).join("، ");
  return (typeof sp === "string" && sp.trim()) ? sp.trim() : "";
}

// ── Subscriber title (معلم/معلمة ، مدير/مديرة ، وكيل/وكيلة...) ────────────────
export const TITLE_OPTIONS_TEACHER = [
  { value: "معلم", label: "معلم" },
  { value: "معلمة", label: "معلمة" },
];
export const TITLE_OPTIONS_PRINCIPAL = [
  { value: "مدير", label: "مدير" },
  { value: "مديرة", label: "مديرة" },
];
export const TITLE_OPTIONS_COUNSELOR = [
  { value: "موجه", label: "موجه" },
  { value: "موجهة", label: "موجهة" },
];
export const TITLE_OPTIONS_AFFAIRS = [
  { value: "وكيل", label: "وكيل" },
  { value: "وكيلة", label: "وكيلة" },
];

export function titleOptionsFor(me) {
  if (isPrincipalOnly(me)) return TITLE_OPTIONS_PRINCIPAL;
  if (isStudentCounselor(me)) return TITLE_OPTIONS_COUNSELOR;
  if (isStudentAffairs(me) || isTeacherAffairs(me)) return TITLE_OPTIONS_AFFAIRS;
  return TITLE_OPTIONS_TEACHER;
}

// المسمى المخزّن لدى المستخدم، مع افتراض قيمة حسب الدور إذا لم يُحدّد
export function subscriberTitle(me) {
  if (!me) return "";
  if (me.title) return me.title;
  if (isPrincipalOnly(me)) return "مدير";
  if (isStudentCounselor(me)) return "موجه";
  if (isStudentAffairs(me) || isTeacherAffairs(me)) return "وكيل";
  return "معلم";
}

// الاسم مسبوقًا بالمسمى (لعرض بيانات المشترك في التقارير والقوائم)
export function titledSubscriberName(me) {
  const name = me?.display_name || me?.full_name || me?.email || "";
  const title = subscriberTitle(me);
  return title ? `${title} ${name}`.trim() : name;
}

// ── مصدر التقرير حسب الدور الوظيفي ───────────────────────────────────────────
// المسمى الوظيفي الكامل لمصدر التقرير (معلم المادة / مدير المدرسة / الموجه الطلابي /
// وكيل شؤون الطلاب / وكيل شؤون المعلمين) بصيغة مذكّرة ومؤنّثة.
export const SOURCE_LABEL_BY_ROLE = {
  teacher: { male: "معلم المادة", female: "معلمة المادة" },
  principal: { male: "مدير المدرسة", female: "مديرة المدرسة" },
  student_counselor: { male: "الموجّه الطلابي", female: "الموجّهة الطلابية" },
  student_affairs: { male: "وكيل شؤون الطلاب", female: "وكيلة شؤون الطلاب" },
  teacher_affairs: { male: "وكيل شؤون المعلمين", female: "وكيلة شؤون المعلمين" },
};

// تحديد الجنس من المسمى المخزّن (المؤنّث ينتهي بـ "ة")
export function isFemaleSubscriber(me) {
  const t = me?.title || subscriberTitle(me);
  return typeof t === "string" && t.endsWith("ة");
}

// المسمى الوظيفي الكامل لمصدر التقرير بناءً على دور المستخدم وجنسه
export function reportSourceLabel(me) {
  if (!me) return "المستخدم";
  if (me.role === "admin") return "مدير النظام";
  const role = me.app_role || "teacher";
  const gender = isFemaleSubscriber(me) ? "female" : "male";
  return (SOURCE_LABEL_BY_ROLE[role] || SOURCE_LABEL_BY_ROLE.teacher)[gender];
}

// اسم مصدر التقرير (اسم المشترك الظاهر)
export function reportSourceName(me) {
  return me?.display_name || me?.full_name || me?.email || "";
}

// معلومات مصدر التقرير المجمّعة: المسمى الوظيفي + الاسم + اسم المدير + هل المصدر هو المدير
// تستخدم في كل عمليات التصدير (PDF/Excel) لعرض المصدر والمدير بشكل موحّد.
export function reportSourceInfo(me, school = {}) {
  const isPrincipalSource = isPrincipalOnly(me);
  const principalName = me?.principal_name || school?.principal_name || "";
  return {
    isPrincipalSource,
    sourceLabel: isPrincipalSource
      ? (isFemaleSubscriber(me) ? "مديرة المدرسة" : "مدير المدرسة")
      : reportSourceLabel(me),
    sourceName: reportSourceName(me),
    principalName,
    principalTitle: isFemaleSubscriber(me) ? "مديرة" : "مدير",
  };
}

// تصفية سجلات المعلمين بحيث لا يرى المدير/الإشرافيون إلا معلمي مدرستهم
// المطابقة عبر school_id (الربط الثابت) أو الرقم الوزاري (احتياط للبيانات القديمة)
export function scopeTeachersBySchool(teachers, me) {
  if (!me || me.role === "admin") return teachers;
  if (!isSchoolSupervisor(me)) return teachers;
  const sid = me.school_id;
  const mn = ministryNumber(me);
  return teachers.filter((t) =>
    (sid && t.school_id === sid) || (mn && t.ministry_number === mn)
  );
}

// تصفية عامة لأي كيان — يرى المدير/الإشرافيون فقط بيانات مدرستهم.
// المطابقة عبر school_id (الربط الثابت) أو الرقم الوزاري (احتياط للبيانات القديمة).
export function scopeBySchool(items, me) {
  if (!me || me.role === "admin") return items;
  if (!isSchoolSupervisor(me)) return items;
  const sid = me.school_id;
  const mn = ministryNumber(me);
  return items.filter((item) =>
    (sid && item.school_id === sid) || (mn && item.ministry_number === mn)
  );
}

// بيانات المدرسة (إدارة التعليم، اسم المدرسة، اسم مدير المدرسة) مفضّلةً ما سجّله المشترك
// في ملفه أثناء التسجيل/الإعدادات، مع الرجوع لسجل SchoolInfo.
export function resolveSchool(me, schoolInfo = {}) {
  return {
    education_admin: me?.education_admin || schoolInfo?.education_admin || "",
    school_name: me?.school_name || schoolInfo?.school_name || "",
    principal_name: me?.principal_name || schoolInfo?.principal_name || "",
  };
}