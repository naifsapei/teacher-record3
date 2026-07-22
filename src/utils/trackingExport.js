import * as XLSX from "xlsx";
import {
  buildReportHeaderHTML, buildSignaturesHTML, buildFooterHTML, renderHTMLToPDF, nowArabicDateTime
} from "./reportLayout";
import { base44 } from "@/api/base44Client";
import { isPrincipalOnly, subscriberTitle, reportSourceInfo } from "@/lib/permissions";

export const TRACKING_COLUMNS = [
  { key: "homework", label: "الواجبات" },
  { key: "participation", label: "المشاركات" },
  { key: "class_activity", label: "المشاركة الصفية" },
  { key: "research", label: "البحوث" },
  { key: "written_exam", label: "الاختبار التحريري" },
  { key: "practical_exam", label: "الاختبار العملي" },
];

const PERFORMANCE_GROUPS = [
  {
    title: "المهام الأدائية",
    columns: [
      { key: "homework", label: "الواجبات" },
      { key: "participation", label: "المشاركات" },
      { key: "class_activity", label: "المشاركة الصفية" },
      { key: "research", label: "البحوث" },
    ],
  },
  {
    title: "الاختبارات الصفية",
    columns: [
      { key: "written_exam", label: "الاختبار التحريري" },
      { key: "practical_exam", label: "الاختبار العملي" },
    ],
  },
];

const perfSum = (r) => (r.homework || 0) + (r.participation || 0) + (r.class_activity || 0) + (r.research || 0);
const examSum = (r) => (r.written_exam || 0) + (r.practical_exam || 0);

export function buildTrackingRows(students, grades, subjectId) {
  return students.map((s) => {
    const g = grades.find((gr) => gr.student_id === s.id && gr.subject_id === subjectId) || {};
    return {
      name: s.name,
      participation: g.participation || 0,
      homework: g.homework || 0,
      class_activity: g.class_activity || 0,
      research: g.research || 0,
      written_exam: g.written_exam || 0,
      practical_exam: g.practical_exam || 0,
    };
  });
}

function gradeScale(total) {
  if (total >= 90) return "ممتاز";
  if (total >= 80) return "جيد جداً";
  if (total >= 70) return "جيد";
  if (total >= 60) return "مقبول";
  return "ضعيف";
}

function reportHTML(data) {
  const { school = {}, teacherName = "", className = "", subjectName = "", rows = [], principalOnly = false, teacherTitle = "معلم", sourceLabel = "", sourceName = "", principalName = "" } = data;
  const header = buildReportHeaderHTML({ title: "سجل متابعة الدرجات", school });
  const perfCols = PERFORMANCE_GROUPS[0].columns;
  const examCols = PERFORMANCE_GROUPS[1].columns;

  const groupRow = `<tr>
    <th rowspan="2" style="padding:5px 3px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:10px;">م</th>
    <th rowspan="2" style="padding:5px 6px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:10px;">اسم الطالب</th>
    <th colspan="${perfCols.length}" style="padding:5px 3px;border:1px solid #cbd5e1;background:#dcfce7;color:#003366;font-size:10px;">المهام الأدائية</th>
    <th rowspan="2" style="padding:5px 3px;border:1px solid #cbd5e1;background:#e0f2fe;font-size:9px;">مجموع المهام</th>
    <th colspan="${examCols.length}" style="padding:5px 3px;border:1px solid #cbd5e1;background:#fef3c7;color:#003366;font-size:10px;">الاختبارات</th>
    <th rowspan="2" style="padding:5px 3px;border:1px solid #cbd5e1;background:#e0f2fe;font-size:9px;">مجموع الاختبارات</th>
    <th rowspan="2" style="padding:5px 3px;border:1px solid #cbd5e1;background:#dbeafe;font-size:9px;">المجموع الكلي</th>
    <th rowspan="2" style="padding:5px 3px;border:1px solid #cbd5e1;background:#ede9fe;font-size:9px;">التقدير</th>
  </tr>`;

  const colRow = `<tr>
    ${perfCols.map((c) => `<th style="padding:5px 3px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:9px;">${c.label}</th>`).join("")}
    ${examCols.map((c) => `<th style="padding:5px 3px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:9px;">${c.label}</th>`).join("")}
  </tr>`;

  const bodyRows = rows
    .map((r, i) => {
      const p = perfSum(r);
      const e = examSum(r);
      const total = p + e;
      return `<tr>
        <td style="padding:6px;border:1px solid #e2e8f0;text-align:center;">${i + 1}</td>
        <td style="padding:4px 6px;border:1px solid #e2e8f0;text-align:right;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;">${r.name}</td>
        ${perfCols.map((c) => `<td style="padding:4px 3px;border:1px solid #e2e8f0;text-align:center;font-size:10px;">${r[c.key] || 0}</td>`).join("")}
        <td style="padding:4px 3px;border:1px solid #e2e8f0;text-align:center;font-weight:700;background:#f0fdfa;font-size:10px;">${p}</td>
        ${examCols.map((c) => `<td style="padding:4px 3px;border:1px solid #e2e8f0;text-align:center;font-size:10px;">${r[c.key] || 0}</td>`).join("")}
        <td style="padding:4px 3px;border:1px solid #e2e8f0;text-align:center;font-weight:700;background:#fffbeb;font-size:10px;">${e}</td>
        <td style="padding:4px 3px;border:1px solid #e2e8f0;text-align:center;font-weight:800;background:#eff6ff;font-size:10px;">${total}</td>
        <td style="padding:4px 3px;border:1px solid #e2e8f0;text-align:center;font-weight:700;background:#f5f3ff;font-size:10px;">${gradeScale(total)}</td>
      </tr>`;
    })
    .join("");

  const table = `<table style="width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed;">
    <colgroup>
      <col style="width:4%"><col style="width:26%">
      <col style="width:5%"><col style="width:5%"><col style="width:5%"><col style="width:5%">
      <col style="width:9%">
      <col style="width:5%"><col style="width:5%">
      <col style="width:8%"><col style="width:8%"><col style="width:8%">
    </colgroup>
    <thead>${groupRow}${colRow}</thead>
    <tbody>${bodyRows}</tbody>
  </table>`;

  const foot = buildSignaturesHTML({ teacherName, principalName: principalName || school.principal_name, school, principalOnly, teacherTitle, sourceLabel, sourceName });
  const footer = buildFooterHTML({});
  const sub = `الصف: ${className || "—"}${subjectName ? " · المادة: " + subjectName : ""}`;

  return `<div dir="rtl" style="font-family:'Noto Kufi Arabic',sans-serif;padding:24px;background:#fff;color:#0f172a;">
    ${header}
    <div style="text-align:center;font-size:12px;color:#475569;margin-bottom:10px;">${sub}</div>
    ${table}
    ${foot}
    ${footer}
  </div>`;
}

export async function exportTrackingPDF(data, fileName = "سجل_متابعة_الدرجات.pdf") {
  const me = await base44.auth.me().catch(() => null);
  const src = reportSourceInfo(me, data.school || {});
  await renderHTMLToPDF(reportHTML({
    ...data,
    principalOnly: src.isPrincipalSource,
    teacherTitle: subscriberTitle(me),
    sourceLabel: src.sourceLabel,
    sourceName: src.sourceName,
    principalName: data.principalName || src.principalName,
  }), fileName);
}

export function exportTrackingExcel(data, fileName = "سجل_متابعة_الدرجات.xlsx") {
  const { school = {}, teacherName = "", className = "", subjectName = "", rows = [], teacherTitle = "معلم", sourceLabel = "", sourceName = "", principalName = "", principalOnly = false } = data;
  const sLabel = sourceLabel || `${teacherTitle} المادة`;
  const sName = sourceName || teacherName;
  const { dateStr, timeStr } = nowArabicDateTime();
  const perfCols = PERFORMANCE_GROUPS[0].columns;
  const examCols = PERFORMANCE_GROUPS[1].columns;

  const headerCols = [
    "م", "اسم الطالب",
    ...perfCols.map((c) => c.label),
    "مجموع المهام الأدائية",
    ...examCols.map((c) => c.label),
    "مجموع الاختبارات", "المجموع الكلي", "سلالم التقدير",
  ];
  const N = headerCols.length; // 12

  const aoa = [];
  aoa.push(["المملكة العربية السعودية", "", "", "وزارة التعليم", "", "", `التاريخ: ${dateStr}`, "", "", "", "", ""]);
  aoa.push([school.education_admin || "إدارة التعليم", "", "", school.school_name || "المدرسة", "", "", `الوقت: ${timeStr}`, "", "", "", "", ""]);
  aoa.push(["سجل متابعة الدرجات"]);
  aoa.push([`الصف: ${className || "—"}    المادة: ${subjectName || "—"}    ${sLabel}: ${sName || "—"}`]);
  aoa.push([]);

  // group header row (index 5) — cells with rowspan hold the value
  const groupRow = new Array(N).fill("");
  groupRow[0] = "م";
  groupRow[1] = "اسم الطالب";
  groupRow[2] = "المهام الأدائية"; // spans 2-5
  groupRow[6] = "مجموع المهام الأدائية";
  groupRow[7] = "الاختبارات الصفية"; // spans 7-8
  groupRow[9] = "مجموع الاختبارات";
  groupRow[10] = "المجموع الكلي";
  groupRow[11] = "سلالم التقدير";
  // column header row (index 6) — blank cells covered by group-row rowspan
  const colHeaderRow = headerCols.map((v, idx) =>
    [0, 1, 6, 9, 10, 11].includes(idx) ? "" : v
  );
  aoa.push(groupRow);
  aoa.push(colHeaderRow);

  rows.forEach((r, i) => {
    const p = perfSum(r);
    const e = examSum(r);
    const total = p + e;
    aoa.push([
      i + 1, r.name,
      ...perfCols.map((c) => r[c.key] || 0), p,
      ...examCols.map((c) => r[c.key] || 0), e, total, gradeScale(total),
    ]);
  });

  aoa.push([]);
  if (principalOnly) {
    aoa.push([`مدير المدرسة: ${principalName || school.principal_name || "—"}`, "", "", "", "", "", ""]);
  } else {
    aoa.push([`${sLabel}: ${sName || "—"}`, "", "", "", "", "", `مدير المدرسة: ${principalName || school.principal_name || "—"}`]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!rtl"] = true;
  ws["!cols"] = [{ wch: 5 }, { wch: 30 }, ...perfCols.map(() => ({ wch: 10 })), { wch: 12 }, ...examCols.map(() => ({ wch: 10 })), { wch: 12 }, { wch: 10 }, { wch: 10 }];
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: N - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: N - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: N - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: N - 1 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 5 } },
    { s: { r: 5, c: 7 }, e: { r: 5, c: 8 } },
    { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } },
    { s: { r: 5, c: 1 }, e: { r: 6, c: 1 } },
    { s: { r: 5, c: 6 }, e: { r: 6, c: 6 } },
    { s: { r: 5, c: 9 }, e: { r: 6, c: 9 } },
    { s: { r: 5, c: 10 }, e: { r: 6, c: 10 } },
    { s: { r: 5, c: 11 }, e: { r: 6, c: 11 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "سجل المتابعة");
  XLSX.writeFile(wb, fileName);
}