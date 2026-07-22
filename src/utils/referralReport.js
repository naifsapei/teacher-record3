import {
  buildReportHeaderHTML, buildSignaturesHTML, buildFooterHTML, renderHTMLToPDF, escapeHTML,
} from "./reportLayout";
import { base44 } from "@/api/base44Client";
import { isPrincipalOnly, subscriberTitle, resolveSchool, reportSourceInfo } from "@/lib/permissions";

export const RECIPIENT_LABELS = {
  guidance_counselor: "الموجه الطلابي",
  student_affairs: "وكيل شؤون الطلاب",
  vice_principal: "وكيل شؤون الطلاب",
};

export const REFERRAL_STATUS_LABELS = {
  open: "مفتوحة",
  in_review: "قيد المراجعة",
  resolved: "تمت المعالجة",
  closed: "مغلقة",
};

export const REFERRAL_STATUS_COLORS = {
  open: "bg-blue-100 text-blue-700",
  in_review: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const ATT_LABELS = { present: "حاضر", absent: "غائب", late: "متأخر", excused: "معذور" };

const GRADE_FIELDS = [
  { key: "participation", max: "participation_max", label: "المشاركة" },
  { key: "homework", max: "homework_max", label: "الواجبات" },
  { key: "class_activity", max: "class_activity_max", label: "النشاط الصفي" },
  { key: "research", max: "research_max", label: "البحوث" },
  { key: "written_exam", max: "written_exam_max", label: "الاختبار التحريري" },
  { key: "practical_exam", max: "practical_exam_max", label: "الاختبار العملي" },
];

export function buildReferralHTML(p) {
  const student = p.student || {};
  const cls = p.cls;
  const subject = p.subject;
  const recipientLabel = RECIPIENT_LABELS[p.recipient] || "—";
  const violations = p.violations || [];
  const tracking = p.trackingRecords || [];
  const attendance = p.attendance || [];
  const achievements = p.achievements || [];
  const gradeRow = p.gradeRow;
  const school = p.school || {};
  const teacherName = p.teacherName || "—";
  const principalOnly = !!p.principalOnly;
  const sourceLabel = p.sourceLabel || "";
  const sourceName = p.sourceName || "";

  const attSummary = {};
  attendance.forEach((a) => { attSummary[a.status] = (attSummary[a.status] || 0) + 1; });
  const attTotal = attendance.length;
  const attLine = Object.keys(ATT_LABELS).map((k) => `${ATT_LABELS[k]}: ${attSummary[k] || 0}`).join(" · ");

  const trackingRows = tracking.length
    ? tracking.map((t) => `
      <tr>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;">${escapeHTML(t.date || "—")}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;">${escapeHTML(t.action_label || "—")}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;">${escapeHTML(t.points ?? 0)}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;">${escapeHTML(t.category || "—")}</td>
      </tr>`).join("")
    : `<tr><td colspan="4" style="padding:8px;border:1px solid #cbd5e1;text-align:center;color:#64748b;">لا توجد سجلات مرصودة</td></tr>`;

  let gradeHTML = "";
  if (subject && gradeRow) {
    const rows = GRADE_FIELDS.map((f) => {
      const val = Number(gradeRow[f.key]) || 0;
      const max = Number(subject[f.max]) || 0;
      return `<tr><td style="padding:5px 8px;border:1px solid #cbd5e1;">${f.label}</td><td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;">${val} / ${max}</td></tr>`;
    }).join("");
    gradeHTML = `
      <h3 style="font-size:14px;color:#003366;margin:12px 0 6px;">تقييم المادة (${escapeHTML(subject.name)})</h3>
      <table style="width:60%;border-collapse:collapse;font-size:12px;">${rows}</table>`;
  }

  const skills = achievements.filter((a) => a.type === "skill");
  const activities = achievements.filter((a) => a.type === "activity");
  const skillsHTML = skills.length
    ? `<ul style="margin:6px 0;padding-right:18px;">${skills.map((s) => `<li style="margin:3px 0;">${escapeHTML(s.title)}${s.status ? ` — <span style="color:#64748b;">${escapeHTML(s.status)}</span>` : ""}</li>`).join("")}</ul>`
    : `<p style="color:#64748b;">لا توجد مهارات مسجلة.</p>`;
  const activitiesHTML = activities.length
    ? `<h3 style="font-size:14px;color:#003366;margin:12px 0 6px;">الأنشطة</h3><ul style="margin:6px 0;padding-right:18px;">${activities.map((a) => `<li style="margin:3px 0;">${escapeHTML(a.title)}${a.activity_result ? ` — <span style="color:#64748b;">${escapeHTML(a.activity_result)}</span>` : ""}</li>`).join("")}</ul>`
    : "";

  const violationsHTML = violations.length
    ? `<ul style="margin:6px 0;padding-right:18px;">${violations.map((v) => `<li style="margin:3px 0;">${escapeHTML(v)}</li>`).join("")}</ul>`
    : `<p style="color:#64748b;">لا توجد مخالفات محددة.</p>`;

  return `
  <div style="font-family:'Noto Kufi Arabic',sans-serif;direction:rtl;padding:24px;color:#0f172a;background:#fff;">
    ${buildReportHeaderHTML({ title: "نموذج تحويل طالب", school })}
    <table style="width:100%;font-size:12px;margin-bottom:12px;border-collapse:collapse;">
      <tr>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>الطالب:</b> ${escapeHTML(student.name || "—")}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>رقم الطالب:</b> ${escapeHTML(student.student_number || "—")}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>الصف:</b> ${escapeHTML(cls?.name || "—")}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>المادة:</b> ${escapeHTML(subject?.name || "—")}</td>
      </tr>
      <tr>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>الجهة المحوّل إليها:</b> ${escapeHTML(recipientLabel)}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;" colspan="3"><b>تاريخ التحويل:</b> ${escapeHTML(p.date || "—")}</td>
      </tr>
    </table>

    <h3 style="font-size:14px;color:#003366;margin:12px 0 6px;">المخالفات المحددة</h3>
    ${violationsHTML}
    ${p.notes ? `<p style="font-size:12px;margin:6px 0;"><b>ملاحظات:</b> ${escapeHTML(p.notes)}</p>` : ""}

    <h3 style="font-size:14px;color:#003366;margin:12px 0 6px;">سجل الحضور والغياب (الإجمالي: ${attTotal})</h3>
    <p style="font-size:12px;">${attLine}</p>

    <h3 style="font-size:14px;color:#003366;margin:12px 0 6px;">التقييمات والملاحظات المرصودة في سجل المتابعة</h3>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="background:#f1f5f9;">
        <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:right;">التاريخ</th>
        <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:right;">التصرف</th>
        <th style="padding:5px 8px;border:1px solid #cbd5e1;">النقاط</th>
        <th style="padding:5px 8px;border:1px solid #cbd5e1;">النوع</th>
      </tr></thead>
      <tbody>${trackingRows}</tbody>
    </table>

    ${gradeHTML}

    <h3 style="font-size:14px;color:#003366;margin:12px 0 6px;">المهارات المكتسبة</h3>
    ${skillsHTML}
    ${activitiesHTML}

    ${p.actionTaken ? `
    <div style="margin:14px 0;border:2px solid #b91c1c;border-radius:10px;background:#fef2f2;padding:12px;">
      <h3 style="font-size:14px;color:#b91c1c;margin:0 0 6px;">الإجراء المتخذ وفق لائحة تنظيم السلوك والمواظبة</h3>
      <p style="font-size:13px;font-weight:700;margin:0;">${escapeHTML(p.actionTaken)}</p>
      ${p.actionNotes ? `<p style="font-size:12px;margin:6px 0 0;color:#475569;">${escapeHTML(p.actionNotes)}</p>` : ""}
    </div>
    <div style="display:flex;justify-content:center;margin-top:18px;font-size:13px;">
      <div style="text-align:center;">
        <div style="font-weight:700;">${escapeHTML(p.actionByLabel || "وكيل شؤون الطلاب")}</div>
        <div style="margin-top:34px;border-top:1px solid #94a3b8;padding-top:4px;width:180px;">التوقيع والختم</div>
      </div>
    </div>` : ""}

    ${buildSignaturesHTML({ teacherName, principalName: school.principal_name, school, principalOnly, teacherTitle: p.teacherTitle || "معلم", principalTitle: p.teacherTitle || "مدير", sourceLabel, sourceName })}
    <div style="display:flex;justify-content:center;margin-top:18px;font-size:13px;">
      <div style="text-align:center;">
        <div style="font-weight:700;">${escapeHTML(recipientLabel)}</div>
        <div style="margin-top:34px;border-top:1px solid #94a3b8;padding-top:4px;width:160px;">التوقيع والختم</div>
      </div>
    </div>
    ${buildFooterHTML({})}
  </div>`;
}

export async function loadPieces({ studentId, classId, subjectId, recipient, violations, notes, date }) {
  const [students, classes, subjects, tracking, attendance, achievements, grades, schoolArr, me] = await Promise.all([
    base44.entities.Student.list(),
    base44.entities.Class.list(),
    base44.entities.Subject.list(),
    base44.entities.TrackingRecord.filter({ student_id: studentId }),
    base44.entities.Attendance.filter({ student_id: studentId }),
    base44.entities.Achievement.filter({ student_id: studentId }),
    base44.entities.Grade.filter({ student_id: studentId }),
    base44.entities.SchoolInfo.list(),
    base44.auth.me().catch(() => null),
  ]);
  const student = students.find((s) => s.id === studentId);
  const cls = classes.find((c) => c.id === classId);
  const subject = subjectId ? subjects.find((s) => s.id === subjectId) : null;
  const gradeRow = subject ? grades.find((g) => g.subject_id === subject.id) : null;
  return {
    student, cls, subject, recipient, violations, notes, date,
    trackingRecords: tracking, attendance, achievements, gradeRow,
    school: resolveSchool(me, schoolArr[0]), teacherName: me?.display_name || me?.full_name,
    teacherTitle: subscriberTitle(me),
    principalOnly: isPrincipalOnly(me),
    ...reportSourceInfo(me, schoolArr[0] || {}),
  };
}

export async function exportReferralPDF(pieces, fileName) {
  const html = buildReferralHTML(pieces);
  await renderHTMLToPDF(html, fileName);
}