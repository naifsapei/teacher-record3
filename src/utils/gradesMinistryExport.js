import * as XLSX from "xlsx";
import { nowArabicDateTime } from "./reportLayout";

/**
 * يُصدّر كشف درجات الطلاب بصيغة Excel جاهزة للطباعة والرفع المباشر
 * للأنظمة الوزارية المعتمدة (ترويسة وزارية، RTL، توقيعات).
 *
 * @param {Object} opts
 * @param {Object} opts.school - { education_admin, school_name, principal_name }
 * @param {string} opts.className
 * @param {string} opts.subjectName
 * @param {string} opts.teacherName
 * @param {string} opts.academicYear
 * @param {string} opts.semester
 * @param {Array<{label:string,max:number}>} opts.fieldHeaders
 * @param {number} opts.maxTotal
 * @param {Array<{index:number,studentNumber:string,name:string,values:number[],total:number,pct:number,gradeLabel:string}>} opts.rows
 * @param {string} [fileName]
 */
export function exportGradesMinistryExcel(opts, fileName) {
  const {
    school = {},
    className = "",
    subjectName = "",
    teacherName = "",
    academicYear = "",
    semester = "",
    fieldHeaders = [],
    maxTotal = 100,
    rows = [],
    sourceLabel = "",
    sourceName = "",
    principalOnly = false,
  } = opts;
  const sLabel = sourceLabel || "معلم المادة";
  const sName = sourceName || teacherName;

  const { dateStr, timeStr } = nowArabicDateTime();
  const aoa = [];

  // Ministry header
  aoa.push(["المملكة العربية السعودية", "وزارة التعليم", school.education_admin || "إدارة التعليم", school.school_name || "المدرسة"]);
  aoa.push(["كشف درجات الطلاب", `الصف: ${className || "—"}`, `المادة: ${subjectName || "—"}`]);
  aoa.push([`${sLabel}: ${sName || "—"}`, `العام الدراسي: ${academicYear || "—"}`, `الفصل الدراسي: ${semester || "—"}`]);
  aoa.push([`التاريخ: ${dateStr}`, `الوقت: ${timeStr}`, "وقت إنشاء وتصدير الكشف"]);
  aoa.push([]);

  // Table header
  const headerRow = ["م", "رقم الطالب", "اسم الطالب", ...fieldHeaders.map((f) => `${f.label} (/${f.max})`), `المجموع (/${maxTotal})`, "النسبة %", "التقدير", "ملاحظات"];
  aoa.push(headerRow);

  rows.forEach((r) => {
    aoa.push([
      r.index,
      r.studentNumber || "-",
      r.name,
      ...r.values,
      r.total,
      `${r.pct}%`,
      r.gradeLabel,
      r.pct < 60 ? "يحتاج متابعة" : "",
    ]);
  });

  // Stats row
  if (rows.length > 0) {
    const totals = rows.map((r) => r.total);
    const avg = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
    const passing = rows.filter((r) => r.pct >= 60).length;
    aoa.push([]);
    aoa.push(["إحصائيات", `عدد الطلاب: ${rows.length}`, `المتوسط: ${avg}`, `الناجحون: ${passing}`, `الراسبون: ${rows.length - passing}`]);
  }

  // Signatures
  aoa.push([]);
  if (principalOnly) {
    aoa.push(["مدير المدرسة", "", "", ""]);
    aoa.push([school.principal_name || "...........................", "", "", ""]);
  } else {
    aoa.push([sLabel, "", "", "مدير المدرسة"]);
    aoa.push([sName || "...........................", "", "", school.principal_name || "..........................."]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!rtl"] = true;

  const colCount = headerRow.length;
  ws["!cols"] = [
    { wch: 5 }, { wch: 12 }, { wch: 26 },
    ...fieldHeaders.map(() => ({ wch: 12 })),
    { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 16 },
  ];
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "كشف الدرجات");
  const defaultName = `كشف_درجات_${subjectName || "المادة"}_${className || "الصف"}.xlsx`;
  XLSX.writeFile(wb, fileName || defaultName);
}