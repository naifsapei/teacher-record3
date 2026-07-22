import {
  buildReportHeaderHTML, buildSignaturesHTML, buildFooterHTML, renderHTMLToPDF, escapeHTML,
} from "./reportLayout";
import { base44 } from "@/api/base44Client";
import { isPrincipalOnly, subscriberTitle, resolveSchool } from "@/lib/permissions";

const GRADE_KEYS = ["participation", "homework", "class_activity", "research", "written_exam", "practical_exam"];
const MAX_KEYS = ["participation_max", "homework_max", "class_activity_max", "research_max", "written_exam_max", "practical_exam_max"];
const sum = (obj, keys) => keys.reduce((s, k) => s + (Number(obj?.[k]) || 0), 0);

export async function buildSnapshot({ scope, classId }) {
  const [students, classes, subjects, grades] = await Promise.all([
    base44.entities.Student.list(),
    base44.entities.Class.list(),
    base44.entities.Subject.list(),
    base44.entities.Grade.list(),
  ]);
  const scopedStudents = scope === "class" ? students.filter((s) => s.class_id === classId) : students;
  const scopedClassIds = new Set(scopedStudents.map((s) => s.class_id));
  const scopedClasses = classes.filter((c) => scopedClassIds.has(c.id));
  const scopedSubjects = subjects.filter((s) => scopedClassIds.has(s.class_id));
  const studentIds = new Set(scopedStudents.map((s) => s.id));
  const scopedGrades = grades.filter((g) => studentIds.has(g.student_id));
  return JSON.stringify({
    students: scopedStudents,
    classes: scopedClasses,
    subjects: scopedSubjects,
    grades: scopedGrades,
  });
}

export function buildArchiveHTML({ name, academic_year, scope, dataObj, school, principalOnly, principalTitle = "مدير" }) {
  const { students = [], classes = [], subjects = [], grades = [] } = dataObj || {};
  const className = scope === "class" ? escapeHTML(classes[0]?.name || "—") : "المدرسة كاملة";

  // subject summary
  const subjRows = subjects.map((sub) => {
    const subGrades = grades.filter((g) => g.subject_id === sub.id);
    const max = sum(sub, MAX_KEYS);
    const totals = subGrades.map((g) => sum(g, GRADE_KEYS));
    const avg = totals.length ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1) : "—";
    const avgPct = totals.length && max > 0 ? Math.round((avg / max) * 100) : 0;
    return `<tr>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;">${escapeHTML(sub.name)}</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;">${escapeHTML(classes.find((c) => c.id === sub.class_id)?.name || "—")}</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;">${subGrades.length}</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;">${avg} / ${max}</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;">${avgPct}%</td>
    </tr>`;
  }).join("");

  // student totals
  const studentRows = students.map((st) => {
    const stGrades = grades.filter((g) => g.student_id === st.id);
    let total = 0, maxTotal = 0;
    stGrades.forEach((g) => {
      const sub = subjects.find((s) => s.id === g.subject_id);
      if (sub) { total += sum(g, GRADE_KEYS); maxTotal += sum(sub, MAX_KEYS); }
    });
    const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
    const band = pct >= 90 ? "ممتاز" : pct >= 75 ? "جيد جداً" : pct >= 60 ? "جيد" : pct > 0 ? "مقبول" : "—";
    return `<tr>
      <td style="padding:4px 8px;border:1px solid #cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(st.name)}</td>
      <td style="padding:4px 4px;border:1px solid #cbd5e1;text-align:center;font-size:10px;">${escapeHTML(classes.find((c) => c.id === st.class_id)?.name || "—")}</td>
      <td style="padding:4px 4px;border:1px solid #cbd5e1;text-align:center;font-size:10px;">${stGrades.length}</td>
      <td style="padding:4px 4px;border:1px solid #cbd5e1;text-align:center;font-size:10px;">${total} / ${maxTotal}</td>
      <td style="padding:4px 4px;border:1px solid #cbd5e1;text-align:center;font-size:10px;">${pct}%</td>
      <td style="padding:4px 4px;border:1px solid #cbd5e1;text-align:center;font-size:10px;">${band}</td>
    </tr>`;
  }).sort().join("");

  return `
  <div style="font-family:'Noto Kufi Arabic',sans-serif;direction:rtl;padding:24px;color:#0f172a;background:#fff;">
    ${buildReportHeaderHTML({ title: `تقرير أرشيف — ${academic_year}`, school })}
    <table style="width:100%;font-size:12px;margin-bottom:12px;border-collapse:collapse;">
      <tr>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>اسم الأرشيف:</b> ${escapeHTML(name)}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>العام الدراسي:</b> ${escapeHTML(academic_year)}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>النطاق:</b> ${className}</td>
      </tr>
      <tr>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>عدد الطلاب:</b> ${students.length}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>عدد الصفوف:</b> ${classes.length}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>عدد المواد:</b> ${subjects.length}</td>
      </tr>
    </table>

    <h3 style="font-size:14px;color:#003366;margin:12px 0 6px;">ملخص أداء المواد</h3>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="background:#f1f5f9;">
        <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:right;">المادة</th>
        <th style="padding:5px 8px;border:1px solid #cbd5e1;">الصف</th>
        <th style="padding:5px 8px;border:1px solid #cbd5e1;">عدد الطلاب</th>
        <th style="padding:5px 8px;border:1px solid #cbd5e1;">المتوسط</th>
        <th style="padding:5px 8px;border:1px solid #cbd5e1;">النسبة</th>
      </tr></thead>
      <tbody>${subjRows || `<tr><td colspan="5" style="padding:8px;border:1px solid #cbd5e1;text-align:center;color:#64748b;">لا توجد بيانات</td></tr>`}</tbody>
    </table>

    <h3 style="font-size:14px;color:#003366;margin:14px 0 6px;">نتائج الطلاب</h3>
    <table style="width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed;">
      <colgroup><col style="width:38%"><col style="width:16%"><col style="width:12%"><col style="width:14%"><col style="width:10%"><col style="width:10%"></colgroup>
      <thead><tr style="background:#f1f5f9;">
        <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:right;">الطالب</th>
        <th style="padding:5px 4px;border:1px solid #cbd5e1;text-align:center;">الصف</th>
        <th style="padding:5px 4px;border:1px solid #cbd5e1;text-align:center;">عدد المواد</th>
        <th style="padding:5px 4px;border:1px solid #cbd5e1;text-align:center;">المجموع</th>
        <th style="padding:5px 4px;border:1px solid #cbd5e1;text-align:center;">النسبة</th>
        <th style="padding:5px 4px;border:1px solid #cbd5e1;text-align:center;">التقدير</th>
      </tr></thead>
      <tbody>${studentRows || `<tr><td colspan="6" style="padding:8px;border:1px solid #cbd5e1;text-align:center;color:#64748b;">لا توجد بيانات</td></tr>`}</tbody>
    </table>

    ${buildSignaturesHTML({ teacherName: escapeHTML(school?.principal_name || ""), principalName: escapeHTML(school?.principal_name || ""), school, principalOnly, teacherTitle: principalTitle, principalTitle })}
    ${buildFooterHTML({})}
  </div>`;
}

export async function exportArchivePDF(archive, school) {
  const dataObj = JSON.parse(archive.data || "{}");
  const me = await base44.auth.me().catch(() => null);
  const html = buildArchiveHTML({
    name: archive.name,
    academic_year: archive.academic_year,
    scope: archive.scope,
    dataObj,
    school: resolveSchool(me, school),
    principalOnly: isPrincipalOnly(me),
    principalTitle: subscriberTitle(me),
  });
  await renderHTMLToPDF(html, `أرشيف-${archive.academic_year}.pdf`);
}