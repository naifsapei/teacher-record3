import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid, Legend } from "recharts";
import { buildAnalysis, BANDS } from "@/utils/reportAnalysis";
import { MINISTRY_LOGO_URL } from "@/utils/reportLayout";

export default function ReportDocument({ title, subtitle, dateLabel, students, subjects, grades, forwardedRef, school = {}, teacherName = "", principalName = "", subjectName = "جميع المواد", className = "", principalOnly = false, teacherTitle = "معلم", principalTitle = "مدير", sourceLabel = "", sourceName = "" }) {
  const sLabel = sourceLabel || `${teacherTitle} المادة`;
  const sName = sourceName || teacherName;
  const { rows, kpis, subjectAverages, bandDist } = buildAnalysis(students, subjects, grades);
  const hasRows = rows.length > 0;

  // أبعاد ثابتة للمخططات لضمان رسمها فورًا (ResponsiveContainer يعتمد ResizeObserver
  // الذي لا يطلق النار داخل الحاوية المخفية، فتظهر المخططات فارغة/صفحة بيضاء في PDF).
  const BAR_W = 560;
  const PIE_W = 380;
  const CHART_H = 240;

  return (
    <div ref={forwardedRef} dir="rtl" style={{ width: 1100, background: "#ffffff", padding: 40, boxSizing: "border-box", fontFamily: "Noto Kufi Arabic, sans-serif" }}>
      {/* Official 3-column ministry header */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 16, borderBottom: "3px solid #149684", paddingBottom: 16, marginBottom: 10 }}>
        {/* Right column — ministry/school info */}
        <div style={{ flex: 1, textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>المملكة العربية السعودية</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f766e", marginTop: 3 }}>وزارة التعليم</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>{school.education_admin || "—"}</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 1 }}>{school.school_name || "—"}</div>
        </div>
        {/* Center column — logo + title */}
        <div style={{ flex: 1.1, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderLeft: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", padding: "0 12px" }}>
          <img src={MINISTRY_LOGO_URL} crossOrigin="anonymous" alt="وزارة التعليم" style={{ width: 64, height: "auto", objectFit: "contain", marginBottom: 6 }} />
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", lineHeight: 1.3 }}>{title}</div>
        </div>
        {/* Left column — subject + date */}
        <div style={{ flex: 1, textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>المادة الدراسية</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{subjectName}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>تاريخ الإصدار</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>{dateLabel}</div>
        </div>
      </div>

      {/* Subtitle bar */}
      <div style={{ background: "#f0fdfa", color: "#0f766e", borderRadius: 10, padding: "10px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #ccfbf1" }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{subtitle || ""}</div>
        {className && <div style={{ fontSize: 12, color: "#475569" }}>الصف: {className}</div>}
      </div>

      {/* KPIs — flexbox بدل grid (html2canvas لا يدعم CSS Grid) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 22 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ flex: "1 1 130px", minWidth: 130, border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 8px", textAlign: "center", background: "#f8fafc", boxSizing: "border-box" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#149684" }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Charts — flexbox بدل grid + أبعاد ثابتة للمخططات */}
      {hasRows && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 22 }}>
          <div style={{ flex: "1.4 1 0", minWidth: 300, border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, boxSizing: "border-box" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: "#0f172a" }}>متوسط الأداء لكل مادة</div>
            <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
              <BarChart data={subjectAverages} width={BAR_W} height={CHART_H} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="subject" tick={{ fontSize: 10, fontFamily: "inherit" }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="avg" name="المتوسط %" fill="#149684" radius={[6, 6, 0, 0]} />
              </BarChart>
            </div>
          </div>
          <div style={{ flex: "1 1 0", minWidth: 260, border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, boxSizing: "border-box" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: "#0f172a" }}>توزيع التقديرات</div>
            <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
              <PieChart width={PIE_W} height={CHART_H}>
                <Pie data={bandDist} dataKey="count" nameKey="band" cx="50%" cy="50%" outerRadius={75} label={{ fontSize: 11 }}>
                  {bandDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </div>
          </div>
        </div>
      )}

      {/* Data table */}
      <div style={{ fontSize: 13 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>تفاصيل درجات الطلاب</div>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "38%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr style={{ background: "#149684", color: "#ffffff" }}>
              <th style={{ padding: "8px 10px", textAlign: "right", fontSize: 11, fontWeight: 700 }}>الطالب</th>
              <th style={{ padding: "8px 6px", textAlign: "right", fontSize: 10, fontWeight: 700 }}>المادة</th>
              <th style={{ padding: "8px 6px", textAlign: "center", fontSize: 10, fontWeight: 700 }}>المجموع</th>
              <th style={{ padding: "8px 6px", textAlign: "center", fontSize: 10, fontWeight: 700 }}>النسبة %</th>
              <th style={{ padding: "8px 6px", textAlign: "center", fontSize: 10, fontWeight: 700 }}>التقدير</th>
            </tr>
          </thead>
          <tbody>
            {hasRows ? rows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 ? "#ffffff" : "#f1f5f9" }}>
                <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>{r.student}</td>
                <td style={{ padding: "6px 6px", textAlign: "right", borderBottom: "1px solid #e2e8f0", fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.subject}</td>
                <td style={{ padding: "6px 6px", textAlign: "center", borderBottom: "1px solid #e2e8f0", fontSize: 10 }}>{r.total} / {r.max}</td>
                <td style={{ padding: "6px 6px", textAlign: "center", borderBottom: "1px solid #e2e8f0", fontSize: 10 }}>{r.pct}%</td>
                <td style={{ padding: "6px 6px", textAlign: "center", borderBottom: "1px solid #e2e8f0", fontSize: 10, color: bandColor(r.band), fontWeight: 700 }}>{r.band}</td>
              </tr>
            )) : (
              <tr><td colSpan={5} style={{ padding: 18, textAlign: "center", color: "#94a3b8" }}>لا توجد بيانات</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Signatures */}
      {principalOnly ? (
        <div style={{ marginTop: 28, padding: "16px 20px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#003366" }}>{sLabel}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{principalName || "—"}</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>{school.school_name || "—"}</div>
          <div style={{ width: 170, height: 1, background: "#cbd5e1", margin: "18px auto 0" }} />
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>التوقيع والختم</div>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, paddingTop: 18, borderTop: "1px solid #e2e8f0" }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{sLabel}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{sName || "—"}</div>
            <div style={{ width: 160, height: 1, background: "#cbd5e1", margin: "14px auto 0" }} />
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{principalTitle} المدرسة</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{principalName || "—"}</div>
            <div style={{ width: 160, height: 1, background: "#cbd5e1", margin: "14px auto 0" }} />
          </div>
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 10, color: "#94a3b8", textAlign: "center" }}>
        تم إنشاء هذا التقرير تلقائياً بواسطة نظام إدارة الصف — {dateLabel}
      </div>
    </div>
  );
}

function bandColor(key) {
  const b = BANDS.find((x) => x.key === key);
  return b ? b.color : "#0f172a";
}