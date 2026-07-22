import {
  buildReportHeaderHTML, buildSignaturesHTML, buildFooterHTML, renderHTMLToPDF, escapeHTML,
} from "./reportLayout";

const TYPE_LABELS = { remedial: "علاجية", enrichment: "إثرائية" };
const STATUS_LABELS = { draft: "مسودة", active: "قيد التنفيذ", completed: "مكتملة" };

export function buildPlanHTML({ plan, student, cls, school, source }) {
  const typeLabel = TYPE_LABELS[plan.type] || "—";
  const statusLabel = STATUS_LABELS[plan.status] || "—";
  const content = escapeHTML(plan.content || "").replace(/\n/g, "<br>");
  return `
  <div style="font-family:'Noto Kufi Arabic',sans-serif;direction:rtl;padding:24px;color:#0f172a;background:#fff;">
    ${buildReportHeaderHTML({ title: `خطة ${typeLabel}`, school })}
    <table style="width:100%;font-size:12px;margin-bottom:12px;border-collapse:collapse;">
      <tr>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>الطالب:</b> ${escapeHTML(student?.name || "—")}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>الصف:</b> ${escapeHTML(cls?.name || "—")}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>نوع الخطة:</b> ${escapeHTML(typeLabel)}</td>
      </tr>
      <tr>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>الحالة:</b> ${escapeHTML(statusLabel)}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>التاريخ:</b> ${escapeHTML(plan.date || "—")}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;"><b>عنوان الخطة:</b> ${escapeHTML(plan.title || "—")}</td>
      </tr>
    </table>
    <h3 style="font-size:14px;color:#003366;margin:12px 0 6px;">تفاصيل الخطة</h3>
    <div style="font-size:13px;line-height:1.9;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;white-space:normal;">${content || "—"}</div>
    ${buildSignaturesHTML({
      school,
      principalOnly: source?.isPrincipalSource,
      sourceLabel: source?.sourceLabel,
      sourceName: source?.sourceName,
      principalName: source?.principalName,
      principalTitle: source?.principalTitle,
    })}
    ${buildFooterHTML({})}
  </div>`;
}

export async function exportPlanPDF(pieces, fileName = "plan.pdf") {
  await renderHTMLToPDF(buildPlanHTML(pieces), fileName);
}