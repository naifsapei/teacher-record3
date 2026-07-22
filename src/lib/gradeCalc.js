// حقول الدرجات ومساعدات الحساب المتوافقة مع منطق "الخانة الفارغة لا تُحسب صفرًا".
// الخانة الفارغة = null (غير مُدخَلة)، والصفر المدخل يدويًا = 0.
// في الحساب: تُستبعد الخانات الفارغة من المجموع ومن الحد الأقصى الفعلي.

export const GRADE_FIELDS = [
  { key: "participation",  maxKey: "participation_max",  label: "مشاركة",        def: 10 },
  { key: "homework",       maxKey: "homework_max",       label: "واجبات",         def: 10 },
  { key: "class_activity", maxKey: "class_activity_max", label: "مشاركة صفية",   def: 10 },
  { key: "research",       maxKey: "research_max",       label: "بحوث/مشاريع",   def: 10 },
  { key: "written_exam",   maxKey: "written_exam_max",   label: "اختبار تحريري", def: 30 },
  { key: "practical_exam", maxKey: "practical_exam_max", label: "اختبار عملي",   def: 30 },
];

// قيمة الحقل كرقم، أو null إذا كانت الخانة فارغة/غير مُدخَلة
export function gradeValue(g, key) {
  if (!g) return null;
  const v = g[key];
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// مجموع الدرجات المُدخَلة فقط (الخانات الفارغة لا تُضاف)
export function calcTotal(g) {
  return GRADE_FIELDS.reduce((s, f) => {
    const v = gradeValue(g, f.key);
    return v === null ? s : s + v;
  }, 0);
}

// الحد الأقصى الفعلي = مجموع حدود الحقول المُدخَلة فقط
export function calcEffMax(g, sub) {
  return GRADE_FIELDS.reduce((s, f) => {
    if (gradeValue(g, f.key) === null) return s;
    return s + (Number(sub?.[f.maxKey]) || f.def);
  }, 0);
}

// الحد الأقصى الكامل للمادة (كل الحقول)
export function calcFullMax(sub) {
  return GRADE_FIELDS.reduce((s, f) => s + (Number(sub?.[f.maxKey]) || f.def), 0);
}

// النسبة المئوية بناءً على الحد الفعلي، أو null إذا لا توجد درجات مُدخَلة
export function calcPct(g, sub) {
  const m = calcEffMax(g, sub);
  if (m === 0) return null;
  return Math.round((calcTotal(g) / m) * 100);
}

// عرض القيمة: null → "" (فارغ)، غير ذلك النص
export function formatGrade(v) {
  return v === null || v === undefined ? "" : String(v);
}