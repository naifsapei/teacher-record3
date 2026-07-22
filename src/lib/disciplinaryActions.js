// لائحة الإجراءات السلوكية وفق لائحة تنظيم السلوك والمواظبة بوزارة التعليم السعودية
export const DISCIPLINARY_ACTIONS = [
  { id: "verbal_warning", label: "تنبيه شفوي", level: "المستوى الأول — المخالفات الصفية" },
  { id: "written_warning", label: "تنبيه كتابي", level: "المستوى الأول" },
  { id: "parent_notify", label: "إبلاغ ولي الأمر", level: "المستوى الأول" },
  { id: "parent_meeting", label: "استدعاء ولي الأمر", level: "المستوى الثاني — المخالفات غير الصفية" },
  { id: "activity_ban", label: "الحرمان من النشاط غير الصفي", level: "المستوى الثاني" },
  { id: "suspend_1", label: "إيقاف الطالب يوماً دراسياً واحداً", level: "المستوى الثالث — المخالفات المؤثرة" },
  { id: "suspend_2", label: "إيقاف الطالب يومين دراسيين", level: "المستوى الثالث" },
  { id: "school_service", label: "تكليف الطالب بخدمة المدرسة", level: "المستوى الثالث" },
  { id: "behavior_contract", label: "توقيع عقد سلوك مع الطالب وولي أمره", level: "المستوى الثالث" },
  { id: "suspend_3", label: "إيقاف الطالب ثلاثة أيام دراسية", level: "المستوى الرابع — المخالفات الأشد" },
  { id: "transfer_committee", label: "التحويل إلى لجنة التوجيه والإرشاد بالمدرسة", level: "المستوى الرابع" },
  { id: "transfer_admin", label: "التحويل لإدارة شؤون الطلاب بالإدارة التعليمية", level: "المستوى الرابع" },
  { id: "other", label: "إجراء آخر (يُحدد في الملاحظات)", level: "إجراءات أخرى" },
];

export const DISCIPLINARY_ACTION_LABEL = (id) =>
  DISCIPLINARY_ACTIONS.find((a) => a.id === id)?.label || "";

export const DISCIPLINARY_GROUPS = DISCIPLINARY_ACTIONS.reduce((acc, a) => {
  if (!acc[a.level]) acc[a.level] = [];
  acc[a.level].push(a);
  return acc;
}, {});