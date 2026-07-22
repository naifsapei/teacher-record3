export const GRADE_FIELD_OPTIONS = [
  { key: "none", label: "غير مرتبط" },
  { key: "participation", label: "مشاركة" },
  { key: "homework", label: "واجبات" },
  { key: "class_activity", label: "مشاركة صفية" },
  { key: "research", label: "بحوث/مشاريع" },
  { key: "written_exam", label: "اختبار تحريري" },
  { key: "practical_exam", label: "اختبار عملي" },
];

export function gradeFieldLabel(key) {
  return GRADE_FIELD_OPTIONS.find((f) => f.key === key)?.label || "غير مرتبط";
}