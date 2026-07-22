import * as XLSX from "xlsx";
import {
  buildReportHeaderHTML, buildSignaturesHTML, buildFooterHTML, renderHTMLToPDF, nowArabicDateTime
} from "./reportLayout";
import { base44 } from "@/api/base44Client";
import { isPrincipalOnly, subscriberTitle, reportSourceInfo } from "@/lib/permissions";

const STATUS_LABELS = { present: "حضور", late: "تأخر", excused: "استئذان", absent: "غياب" };
const STATUS_SHORT = { present: "ح", late: "ت", excused: "س", absent: "غ" };
const STATUS_COLORS = { present: "#dcfce7", late: "#fef3c7", excused: "#dbeafe", absent: "#fee2e2" };

const pad = (n) => String(n).padStart(2, "0");
function daysInMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}
function recordFor(attendance, sid, classId, date) {
  return attendance.find((a) => a.student_id === sid && a.class_id === classId && a.date === date);
}

function dailyHTML(data) {
  const { school = {}, className = "", teacherName = "", principalName = "", students = [], attendance = [], classId, date, principalOnly = false, teacherTitle = "معلم", sourceLabel = "", sourceName = "" } = data;
  const header = buildReportHeaderHTML({ title: "سجل الحضور والانصراف للطلاب", school });
  const rows = students
    .map((s, i) => {
      const rec = recordFor(attendance, s.id, classId, date);
      const st = rec?.status;
      const label = st ? STATUS_LABELS[st] : "لم يُسجّل";
      const bg = st ? STATUS_COLORS[st] : "#f8fafc";
      return `<tr>
        <td style="padding:5px 4px;border:1px solid #cbd5e1;text-align:center;font-size:10px;">${i + 1}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:right;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.name}</td>
        <td style="padding:5px 4px;border:1px solid #cbd5e1;text-align:center;font-size:10px;">${date}</td>
        <td style="padding:5px 4px;border:1px solid #cbd5e1;text-align:center;background:${bg};font-weight:700;font-size:10px;">${label}</td>
      </tr>`;
    })
    .join("");
  const table = `<table style="width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed;">
    <colgroup><col style="width:8%"><col style="width:52%"><col style="width:20%"><col style="width:20%"></colgroup>
    <thead style="background:#f1f5f9;"><tr>
      <th style="padding:6px 4px;border:1px solid #cbd5e1;">م</th>
      <th style="padding:6px 8px;border:1px solid #cbd5e1;">اسم الطالب</th>
      <th style="padding:6px 4px;border:1px solid #cbd5e1;">التاريخ</th>
      <th style="padding:6px 4px;border:1px solid #cbd5e1;">حالة الحضور</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  const foot = buildSignaturesHTML({ teacherName, principalName, school, principalOnly, teacherTitle, sourceLabel, sourceName });
  const footer = buildFooterHTML({});
  return `<div dir="rtl" style="font-family:'Noto Kufi Arabic',sans-serif;padding:24px;background:#fff;color:#0f172a;">
    ${header}
    <div style="text-align:center;font-size:12px;color:#475569;margin-bottom:10px;">الصف: ${className || "—"} · التاريخ: ${date}</div>
    ${table}${foot}${footer}
  </div>`;
}

function monthlyHTML(data) {
  const { school = {}, className = "", teacherName = "", principalName = "", students = [], attendance = [], classId, month, principalOnly = false, teacherTitle = "معلم", sourceLabel = "", sourceName = "" } = data;
  const [y, m] = month.split("-").map(Number);
  const dim = daysInMonth(month);
  const header = buildReportHeaderHTML({ title: "سجل الحضور والانصراف للطلاب", school });
  const dayHeaders = Array.from({ length: dim }, (_, i) =>
    `<th style="padding:3px;border:1px solid #cbd5e1;font-size:9px;min-width:18px;">${i + 1}</th>`
  ).join("");
  const body = students
    .map((s) => {
      const cells = Array.from({ length: dim }, (_, i) => {
        const d = `${y}-${pad(m)}-${pad(i + 1)}`;
        const rec = recordFor(attendance, s.id, classId, d);
        const st = rec?.status;
        const short = st ? STATUS_SHORT[st] : "";
        const bg = st ? STATUS_COLORS[st] : "transparent";
        return `<td style="padding:2px;border:1px solid #e2e8f0;text-align:center;font-size:9px;background:${bg};">${short}</td>`;
      }).join("");
      return `<tr><td style="padding:4px 6px;border:1px solid #cbd5e1;text-align:right;font-weight:600;white-space:nowrap;min-width:160px;max-width:220px;overflow:hidden;text-overflow:ellipsis;">${s.name}</td>${cells}</tr>`;
    })
    .join("");
  const legend = `<div style="display:flex;gap:14px;font-size:11px;margin-top:10px;flex-wrap:wrap;">
    ${Object.entries(STATUS_LABELS).map(([k, v]) =>
      `<span style="display:inline-flex;align-items:center;gap:4px;"><span style="display:inline-block;width:14px;height:14px;background:${STATUS_COLORS[k]};border:1px solid #94a3b8;"></span>${STATUS_SHORT[k]} = ${v}</span>`
    ).join("")}
  </div>`;
  const table = `<table style="width:100%;border-collapse:collapse;font-size:10px;">
    <thead style="background:#f1f5f9;"><tr><th style="padding:5px;border:1px solid #cbd5e1;">اسم الطالب</th>${dayHeaders}</tr></thead>
    <tbody>${body}</tbody>
  </table>`;
  const foot = buildSignaturesHTML({ teacherName, principalName, school, principalOnly, teacherTitle, sourceLabel, sourceName });
  const footer = buildFooterHTML({});
  return `<div dir="rtl" style="font-family:'Noto Kufi Arabic',sans-serif;padding:20px;background:#fff;color:#0f172a;">
    ${header}
    <div style="text-align:center;font-size:12px;color:#475569;margin-bottom:8px;">الصف: ${className || "—"} · شهر: ${m}/${y}</div>
    ${table}${legend}${foot}${footer}
  </div>`;
}

export async function exportAttendancePDF(data, fileName) {
  const isMonth = data.mode === "monthly";
  const me = await base44.auth.me().catch(() => null);
  const src = reportSourceInfo(me, data.school || {});
  const payload = {
    ...data,
    principalOnly: src.isPrincipalSource,
    teacherTitle: subscriberTitle(me),
    sourceLabel: src.sourceLabel,
    sourceName: src.sourceName,
    principalName: data.principalName || src.principalName,
  };
  const html = isMonth ? monthlyHTML(payload) : dailyHTML(payload);
  const defaultName = isMonth ? `سجل_الحضور_${data.month || ""}.pdf` : `سجل_الحضور_${data.date || ""}.pdf`;
  await renderHTMLToPDF(html, fileName || defaultName, { landscape: isMonth });
}

export function exportAttendanceExcel(data, fileName) {
  const { mode, school = {}, className = "", teacherName = "", principalName = "", students = [], attendance = [], classId, date, month, teacherTitle = "معلم", sourceLabel = "", sourceName = "", principalOnly = false } = data;
  const sLabel = sourceLabel || `${teacherTitle} المادة`;
  const sName = sourceName || teacherName;
  const { dateStr, timeStr } = nowArabicDateTime();
  const aoa = [];
  aoa.push(["المملكة العربية السعودية", "وزارة التعليم", school.education_admin || "إدارة التعليم", school.school_name || "المدرسة"]);
  aoa.push(["سجل الحضور والانصراف للطلاب", `الصف: ${className || "—"}`, `${sLabel}: ${sName || "—"}`]);
  aoa.push([`التاريخ: ${dateStr}`, `الوقت: ${timeStr}`, "وقت إنشاء وتصدير السجل"]);
  aoa.push([]);

  if (mode === "monthly") {
    const [y, m] = month.split("-").map(Number);
    const dim = daysInMonth(month);
    aoa.push(["اسم الطالب", ...Array.from({ length: dim }, (_, i) => i + 1)]);
    students.forEach((s) => {
      const row = [s.name];
      for (let i = 1; i <= dim; i++) {
        const d = `${y}-${pad(m)}-${pad(i)}`;
        const rec = recordFor(attendance, s.id, classId, d);
        row.push(rec ? STATUS_LABELS[rec.status] : "");
      }
      aoa.push(row);
    });
  } else {
    aoa.push(["م", "اسم الطالب", "التاريخ", "حالة الحضور"]);
    students.forEach((s, i) => {
      const rec = recordFor(attendance, s.id, classId, date);
      const st = rec?.status;
      aoa.push([i + 1, s.name, date, st ? STATUS_LABELS[st] : "لم يُسجّل"]);
    });
  }

  aoa.push([]);
  if (principalOnly) {
    aoa.push([`مدير المدرسة: ${principalName || "—"}`, "", ""]);
  } else {
    aoa.push([`${sLabel}: ${sName || "—"}`, "", `مدير المدرسة: ${principalName || "—"}`]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!rtl"] = true;
  if (mode === "monthly") {
    const dim = daysInMonth(month);
    ws["!cols"] = [{ wch: 24 }, ...Array.from({ length: dim }, () => ({ wch: 5 }))];
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
    ];
  } else {
    ws["!cols"] = [{ wch: 5 }, { wch: 24 }, { wch: 14 }, { wch: 16 }];
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
    ];
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "سجل الحضور");
  const defaultName = mode === "monthly" ? `سجل_الحضور_${month || ""}.xlsx` : `سجل_الحضور_${date || ""}.xlsx`;
  XLSX.writeFile(wb, fileName || defaultName);
}