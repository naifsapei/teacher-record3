// مصطلحات موحّدة للنظام:
// - المرحلة الدراسية = stage (حقل grade_level على الصف): روضة / ابتدائي / متوسط / ثانوي
// - اسم الصف / الشعبة = section (كيان Class) — يمثّل الصف/الشعبة الفعلية للطلاب داخل النظام
// - الفصل الدراسي = semester (الأول / الثاني) — بُعد منفصل على الطلاب والمواد والدرجات
export const STAGES = [
  { value: "روضة", label: "روضة" },
  { value: "ابتدائي", label: "ابتدائي" },
  { value: "متوسط", label: "متوسط" },
  { value: "ثانوي", label: "ثانوي" },
];

export const STAGE_LABELS = { "روضة": "روضة", "ابتدائي": "ابتدائي", "متوسط": "متوسط", "ثانوي": "ثانوي" };
export const stageLabel = (s) => STAGE_LABELS[s] || (s ? s : "—");

export const SEMESTERS = [
  { value: "first", label: "الفصل الدراسي الأول" },
  { value: "second", label: "الفصل الدراسي الثاني" },
];

export const SEMESTER_LABELS = { first: "الفصل الدراسي الأول", second: "الفصل الدراسي الثاني" };

export const semesterLabel = (s) => SEMESTER_LABELS[s] || (s ? s : "—");

export const SECTION_LABEL = "اسم الصف/الشعبة";
export const GRADE_LEVEL_LABEL = "المرحلة الدراسية";
export const SEMESTER_LABEL = "الفصل الدراسي";