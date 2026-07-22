// أدوات موحّدة لإدارة مفهوم "الصف الدراسي" (grade_name) و"الشعبة" (section) المرتبط به.
// كل سجل Class = شعبة واحدة تابعة لصف دراسي. السجلات القديمة بلا grade_name/section
// تُعامَل على أن grade_name = name (والشعبة تُعرض باسمها الكامل).

export const ALL_SECTIONS = "all";

export function classGradeName(cls) {
  return (cls?.grade_name || "").trim() || (cls?.name || "").trim();
}

export function classSection(cls) {
  return (cls?.section || "").trim();
}

export function classDisplayName(cls) {
  const g = classGradeName(cls);
  const s = classSection(cls);
  if (s) return `${g} ${s}`.trim();
  return g || cls?.name || "";
}

// تسمية خيار الشعبة في القوائم: الحرف إن وُجد، وإلا الاسم الكامل
export function sectionOptionLabel(cls) {
  const s = classSection(cls);
  return s || classDisplayName(cls);
}

// يجمع الصفوف في مجموعات حسب grade_name: [{ gradeName, gradeLevel, classes }]
export function groupClassesByGrade(classes) {
  const map = new Map();
  const order = [];
  (classes || []).forEach((cls) => {
    const g = classGradeName(cls);
    if (!map.has(g)) {
      map.set(g, { gradeName: g, gradeLevel: cls.grade_level || "", classes: [] });
      order.push(g);
    }
    const entry = map.get(g);
    entry.classes.push(cls);
    if (!entry.gradeLevel && cls.grade_level) entry.gradeLevel = cls.grade_level;
  });
  return order.map((g) => map.get(g));
}

// سجلات الشعب لصف دراسي معيّن (مرتّبة)
export function gradeSections(classes, gradeName) {
  return (classes || [])
    .filter((c) => classGradeName(c) === gradeName)
    .sort((a, b) => (classSection(a) || "zzz").localeCompare(classSection(b) || "zzz"));
}

// معرّفات الصفوف المحلولة: الكل → جميع شعب الصف، وإلا الشعبة المحددة فقط
export function resolveClassIds(classes, gradeName, classId) {
  const gradeClasses = (classes || []).filter((c) => classGradeName(c) === gradeName);
  if (!classId || classId === ALL_SECTIONS) return gradeClasses.map((c) => c.id);
  return gradeClasses.filter((c) => c.id === classId).map((c) => c.id);
}

// تسمية النطاق للتصدير/التقارير
export function scopeLabel(classes, gradeName, classId) {
  if (!gradeName) return "";
  if (!classId || classId === ALL_SECTIONS) return gradeName;
  const cls = (classes || []).find((c) => c.id === classId);
  return cls ? classDisplayName(cls) : gradeName;
}