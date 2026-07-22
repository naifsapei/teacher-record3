import { calcTotal, calcEffMax, calcFullMax, calcPct } from "@/lib/gradeCalc";

export { calcTotal, calcEffMax, calcFullMax, calcPct };

export const BANDS = [
  { key: "ممتاز", min: 90, color: "#10b981" },
  { key: "جيد جداً", min: 75, color: "#3b82f6" },
  { key: "جيد", min: 60, color: "#f59e0b" },
  { key: "مقبول", min: 50, color: "#f97316" },
  { key: "ضعيف", min: 0, color: "#ef4444" },
];

export function bandOf(pct) {
  if (pct === null || pct === undefined) return { key: "—", color: "#94a3b8" };
  return BANDS.find((b) => pct >= b.min) || BANDS[BANDS.length - 1];
}

// الحد الأقصى الكامل للمادة (للتوافق مع الاستدعاءات القديمة)
export function calcMax(sub) {
  return calcFullMax(sub);
}

export function buildRows(students, subjects, grades) {
  const rows = [];
  students.forEach((stu) => subjects.forEach((sub) => {
    const g = grades.find((gr) => gr.student_id === stu.id && gr.subject_id === sub.id);
    if (!g) return;
    const max = calcEffMax(g, sub);
    if (max === 0) return; // لا توجد درجات مُدخَلة لهذا الطالب في هذه المادة
    const total = calcTotal(g);
    const pct = Math.round((total / max) * 100);
    rows.push({ student: stu.name, subject: sub.name, total, max, pct, band: bandOf(pct).key });
  }));
  return rows;
}

export function buildAnalysis(students, subjects, grades) {
  const rows = buildRows(students, subjects, grades);
  const pcts = rows.map((r) => r.pct);
  const kpis = [
    { label: "عدد الطلاب", value: students.length },
    { label: "عدد المواد", value: subjects.length },
    { label: "عدد السجلات", value: rows.length },
    { label: "المتوسط العام %", value: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0 },
    { label: "نسبة النجاح %", value: pcts.length ? Math.round(pcts.filter((p) => p >= 60).length / pcts.length * 100) : 0 },
    { label: "أعلى نسبة %", value: pcts.length ? Math.max(...pcts) : 0 },
    { label: "أدنى نسبة %", value: pcts.length ? Math.min(...pcts) : 0 },
  ];
  const subjectAverages = subjects.map((sub) => {
    const sr = rows.filter((r) => r.subject === sub.name);
    return { subject: sub.name, count: sr.length, avg: sr.length ? Math.round(sr.reduce((s, r) => s + r.pct, 0) / sr.length) : 0 };
  });
  const bandDist = BANDS.map((b) => ({ band: b.key, count: rows.filter((r) => r.band === b.key).length, color: b.color }));
  return { rows, kpis, subjectAverages, bandDist };
}