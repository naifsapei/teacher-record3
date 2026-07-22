import * as XLSX from "xlsx";
import {
  buildReportHeaderHTML, buildFooterHTML, renderHTMLToPDF, escapeHTML,
} from "./reportLayout";
import { specializationsText } from "@/lib/permissions";

const FIELDS = ["participation", "homework", "class_activity", "research", "written_exam", "practical_exam"];
const MAX_FIELDS = ["participation_max", "homework_max", "class_activity_max", "research_max", "written_exam_max", "practical_exam_max"];
const calcTotal = (g) => FIELDS.reduce((s, k) => s + (g?.[k] || 0), 0);
const calcMax = (sub) => MAX_FIELDS.reduce((s, k) => s + (sub?.[k] || 0), 0) || 100;
export const bandColor = (pct) => (pct >= 90 ? "#10b981" : pct >= 75 ? "#3b82f6" : pct >= 60 ? "#f59e0b" : "#ef4444");

export function calcTeacherStats(teacher, subjects, grades, attendance) {
  const mySubjects = subjects.filter((s) => s.teacher_id === teacher.id);
  const subIds = new Set(mySubjects.map((s) => s.id));
  const myGrades = grades.filter((g) => subIds.has(g.subject_id));
  const classIds = new Set(mySubjects.map((s) => s.class_id).filter(Boolean));
  const studentIds = new Set(myGrades.map((g) => g.student_id));

  const pcts = myGrades.map((g) => {
    const sub = mySubjects.find((s) => s.id === g.subject_id);
    const max = calcMax(sub);
    return max > 0 ? (calcTotal(g) / max) * 100 : 0;
  });
  const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;

  const myAttendance = attendance.filter((a) => studentIds.has(a.student_id));
  const attSummary = { present: 0, absent: 0, late: 0, excused: 0 };
  myAttendance.forEach((a) => { if (attSummary[a.status] !== undefined) attSummary[a.status]++; });

  return {
    teacher,
    subjects: mySubjects,
    subjectCount: mySubjects.length,
    classCount: classIds.size,
    studentCount: studentIds.size,
    gradeCount: myGrades.length,
    avg,
    attendance: attSummary,
    attendanceTotal: myAttendance.length,
    accountStatus: teacher.user_id ? "linked" : "unlinked",
  };
}

export function calcAllTeachersStats(teachers, subjects, grades, attendance) {
  return teachers.map((t) => calcTeacherStats(t, subjects, grades, attendance));
}

export function buildAllTeachersReportHTML(teachers, stats, school = {}) {
  const rows = teachers.map((t, i) => {
    const s = stats.find((st) => st.teacher.id === t.id) || {};
    const att = s.attendance || {};
    return `<tr>
      <td style="padding:5px 7px;border:1px solid #cbd5e1;text-align:center;">${i + 1}</td>
      <td style="padding:5px 7px;border:1px solid #cbd5e1;font-weight:600;">${escapeHTML(t.name || "—")}</td>
      <td style="padding:5px 7px;border:1px solid #cbd5e1;">${escapeHTML(t.employee_number || "—")}</td>
      <td style="padding:5px 7px;border:1px solid #cbd5e1;">${escapeHTML(specializationsText(t) || "—")}</td>
      <td style="padding:5px 7px;border:1px solid #cbd5e1;">${escapeHTML(t.grade_level || "—")}</td>
      <td style="padding:5px 7px;border:1px solid #cbd5e1;text-align:center;">${s.subjectCount || 0}</td>
      <td style="padding:5px 7px;border:1px solid #cbd5e1;text-align:center;">${s.classCount || 0}</td>
      <td style="padding:5px 7px;border:1px solid #cbd5e1;text-align:center;">${s.studentCount || 0}</td>
      <td style="padding:5px 7px;border:1px solid #cbd5e1;text-align:center;font-weight:700;color:${bandColor(s.avg || 0)};">${s.avg || 0}%</td>
      <td style="padding:5px 7px;border:1px solid #cbd5e1;text-align:center;">${att.present || 0}</td>
      <td style="padding:5px 7px;border:1px solid #cbd5e1;text-align:center;">${att.absent || 0}</td>
      <td style="padding:5px 7px;border:1px solid #cbd5e1;text-align:center;">${att.late || 0}</td>
    </tr>`;
  }).join("");

  return `
  <div style="font-family:'Noto Kufi Arabic',sans-serif;direction:rtl;padding:24px;color:#0f172a;background:#fff;">
    ${buildReportHeaderHTML({ title: "تقرير أداء جميع المعلمين", school })}
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:5px 7px;border:1px solid #cbd5e1;">#</th>
          <th style="padding:5px 7px;border:1px solid #cbd5e1;text-align:right;">اسم المعلم</th>
          <th style="padding:5px 7px;border:1px solid #cbd5e1;text-align:right;">رقم الموظف</th>
          <th style="padding:5px 7px;border:1px solid #cbd5e1;text-align:right;">التخصص</th>
          <th style="padding:5px 7px;border:1px solid #cbd5e1;text-align:right;">المرحلة</th>
          <th style="padding:5px 7px;border:1px solid #cbd5e1;">المواد</th>
          <th style="padding:5px 7px;border:1px solid #cbd5e1;">الصفوف</th>
          <th style="padding:5px 7px;border:1px solid #cbd5e1;">الطلاب</th>
          <th style="padding:5px 7px;border:1px solid #cbd5e1;">المتوسط</th>
          <th style="padding:5px 7px;border:1px solid #cbd5e1;">الحضور</th>
          <th style="padding:5px 7px;border:1px solid #cbd5e1;">الغياب</th>
          <th style="padding:5px 7px;border:1px solid #cbd5e1;">التأخر</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${buildFooterHTML({})}
  </div>`;
}

export async function exportAllTeachersPDF(teachers, stats, school) {
  const html = buildAllTeachersReportHTML(teachers, stats, school);
  await renderHTMLToPDF(html, "تقرير-أداء-المعلمين.pdf", { landscape: true });
}

export function exportAllTeachersExcel(teachers, stats) {
  const data = teachers.map((t, i) => {
    const s = stats.find((st) => st.teacher.id === t.id) || {};
    const att = s.attendance || {};
    return {
      "#": i + 1,
      "اسم المعلم": t.name || "",
      "رقم الموظف": t.employee_number || "",
      "التخصص": specializationsText(t),
      "المرحلة": t.grade_level || "",
      "عدد المواد": s.subjectCount || 0,
      "عدد الصفوف": s.classCount || 0,
      "عدد الطلاب": s.studentCount || 0,
      "المتوسط": `${s.avg || 0}%`,
      "الحضور": att.present || 0,
      "الغياب": att.absent || 0,
      "التأخر": att.late || 0,
      "المعذور": att.excused || 0,
    };
  });
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = Object.keys(data[0] || {}).map(() => ({ wch: 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "تقرير المعلمين");
  XLSX.writeFile(wb, "تقرير-أداء-المعلمين.xlsx");
}