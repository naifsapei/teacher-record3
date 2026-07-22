import { captureNodeToPdf } from "./pdfExport";

export const SITE_NAME = "سجل المعلم";

export function escapeHTML(value = "") {
  return String(value).replace(/[&<>"'`=]/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;", "=": "&#61;",
  })[ch]);
}

export const MINISTRY_LOGO_URL = "https://media.base44.com/images/public/6a18d47e827f674eacf047fc/06e6f1e1e_images5.png";

export function ministryEmblemHTML(size = 72) {
  return `<img src="${MINISTRY_LOGO_URL}" alt="وزارة التعليم" crossorigin="anonymous" style="width:${size}px;height:auto;display:block;margin:0 auto;object-fit:contain;border-radius:8px;" />`;
}

export function nowArabicDateTime() {
  const n = new Date();
  return {
    dateStr: new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "long", day: "numeric" }).format(n),
    timeStr: new Intl.DateTimeFormat("ar-SA", { hour: "2-digit", minute: "2-digit" }).format(n),
  };
}

export function buildReportHeaderHTML({ title, school = {} }) {
  const { dateStr, timeStr } = nowArabicDateTime();
  const edu = escapeHTML(school.education_admin || "إدارة التعليم");
  const sch = escapeHTML(school.school_name || "المدرسة");
  const safeTitle = escapeHTML(title);
  return `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:3px solid #003366;padding-bottom:12px;margin-bottom:14px;">
    <div style="text-align:right;font-size:12px;color:#0f172a;line-height:1.7;min-width:140px;">
      <div style="font-weight:800;">المملكة العربية السعودية</div>
      <div style="font-weight:700;">وزارة التعليم</div>
      <div>${edu}</div>
      <div>${sch}</div>
    </div>
    <div style="text-align:center;">
      ${ministryEmblemHTML(62)}
      <div style="font-size:18px;font-weight:800;color:#003366;margin-top:6px;">${safeTitle}</div>
    </div>
    <div style="text-align:left;font-size:12px;color:#0f172a;line-height:1.7;min-width:140px;">
      <div><span style="font-weight:700;">التاريخ:</span> ${dateStr}</div>
      <div><span style="font-weight:700;">الوقت:</span> ${timeStr}</div>
      <div style="font-size:10px;color:#64748b;">وقت إنشاء وتصدير السجل</div>
    </div>
  </div>`;
}

export function buildSignaturesHTML({
  teacherName = "", principalName = "", school = {},
  principalOnly = false, teacherTitle = "معلم", principalTitle = "مدير",
  sourceName = "", sourceLabel = "",
}) {
  // توحيد مصدر التقرير: استخدم sourceLabel/sourceName إن وُجدا (مبنيان على الدور الوظيفي)،
  // وإلا ارجع لـ teacherName/teacherTitle للتوافق مع الاستدعاءات القديمة.
  const sName = sourceName || teacherName || "—";
  const sLabel = sourceLabel || `${teacherTitle || "معلم"} المادة`;
  const safeSource = escapeHTML(sName);
  const safeSourceLabel = escapeHTML(sLabel);
  const safePrincipal = escapeHTML(principalName || "—");
  const safePTitle = escapeHTML(principalTitle || "مدير");
  if (principalOnly) {
    const sch = escapeHTML(school.school_name || "المدرسة");
    return `
  <div style="margin-top:36px;border:1px solid #cbd5e1;border-radius:10px;padding:16px 20px;background:#f8fafc;">
    <div style="text-align:center;font-size:13px;">
      <div style="font-weight:800;color:#003366;">${safeSourceLabel}</div>
      <div style="margin-top:4px;font-weight:700;">${safePrincipal}</div>
      <div style="margin-top:4px;color:#475569;font-size:12px;">${sch}</div>
      <div style="margin-top:24px;border-top:1px solid #94a3b8;padding-top:4px;width:170px;margin-left:auto;margin-right:auto;">التوقيع والختم</div>
    </div>
  </div>`;
  }
  return `
  <div style="display:flex;justify-content:space-between;margin-top:36px;font-size:13px;">
    <div style="text-align:center;">
      <div style="font-weight:700;">${safeSourceLabel}</div>
      <div style="margin-top:4px;">${safeSource}</div>
      <div style="margin-top:34px;border-top:1px solid #94a3b8;padding-top:4px;width:150px;">التوقيع</div>
    </div>
    <div style="text-align:center;">
      <div style="font-weight:700;">${safePTitle} المدرسة</div>
      <div style="margin-top:4px;">${safePrincipal}</div>
      <div style="margin-top:34px;border-top:1px solid #94a3b8;padding-top:4px;width:150px;">التوقيع</div>
    </div>
  </div>`;
}

export function buildFooterHTML({ siteName = SITE_NAME }) {
  const { dateStr, timeStr } = nowArabicDateTime();
  return `
  <div style="display:flex;justify-content:space-between;border-top:1px solid #cbd5e1;padding-top:8px;margin-top:16px;font-size:11px;color:#475569;">
    <div>${escapeHTML(siteName)}</div>
    <div>صفحة 1</div>
    <div>${dateStr} - ${timeStr}</div>
  </div>`;
}

export async function renderHTMLToPDF(html, fileName, opts = {}) {
  if (typeof document === "undefined") return;
  const container = document.createElement("div");
  container.setAttribute("dir", "rtl");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = opts.landscape ? "1123px" : "794px";
  container.style.maxWidth = "1123px";
  container.style.padding = "18px";
  container.style.background = "#ffffff";
  container.style.color = "#0f172a";
  container.style.fontFamily = "Noto Kufi Arabic, sans-serif";
  container.style.textAlign = "right";
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    await captureNodeToPdf(container, fileName, opts);
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}