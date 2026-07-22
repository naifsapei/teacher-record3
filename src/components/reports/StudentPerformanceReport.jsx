import { BANDS, bandOf, calcTotal, calcEffMax } from "@/utils/reportAnalysis";
import { MINISTRY_LOGO_URL } from "@/utils/reportLayout";

export default function StudentPerformanceReport({
  student, classObj, subjects, grades, achievements, school = {},
  behavioralNotes = [],
  teacherName = "", principalName = "", dateLabel, forwardedRef,
  teacherTitle = "معلم", principalTitle = "مدير",
  sourceLabel = "", sourceName = "", principalOnly = false,
}) {
  const sLabel = sourceLabel || `${teacherTitle} المادة`;
  const sName = sourceName || teacherName;
  const subRows = subjects.map((sub) => {
    const g = grades.find((gr) => gr.student_id === student.id && gr.subject_id === sub.id);
    if (!g) return null;
    const total = calcTotal(g);
    const max = calcEffMax(g, sub);
    if (max === 0) return null;
    const pct = Math.round((total / max) * 100);
    return { sub, g, total, max, pct, band: bandOf(pct) };
  }).filter(Boolean);

  const totalScore = subRows.reduce((s, r) => s + r.total, 0);
  const totalMax = subRows.reduce((s, r) => s + r.max, 0);
  const overallPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const overallBand = bandOf(overallPct);

  const stuAch = (achievements || []).filter((a) => a.student_id === student.id);
  const acquiredSkills = stuAch.filter((a) => a.type === "skill" && a.status === "acquired");
  const inProgressSkills = stuAch.filter((a) => a.type === "skill" && a.status === "in_progress");
  const activities = stuAch.filter((a) => a.type === "activity");

  const cell = { padding: "7px 9px", borderBottom: "1px solid #e2e8f0", fontSize: 11 };

  return (
    <div ref={forwardedRef} dir="rtl" style={{ width: 1100, background: "#ffffff", padding: 40, boxSizing: "border-box", fontFamily: "Noto Kufi Arabic, sans-serif" }}>
      {/* Official 3-column header */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 16, borderBottom: "3px solid #149684", paddingBottom: 16, marginBottom: 12 }}>
        <div style={{ flex: 1, textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>المملكة العربية السعودية</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f766e", marginTop: 3 }}>وزارة التعليم</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>{school.education_admin || "—"}</div>
          <div style={{ fontSize: 12, color: "#475569" }}>{school.school_name || "—"}</div>
        </div>
        <div style={{ flex: 1.1, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderLeft: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", padding: "0 12px" }}>
          <img src={MINISTRY_LOGO_URL} crossOrigin="anonymous" alt="وزارة التعليم" style={{ width: 60, height: "auto", objectFit: "contain", marginBottom: 6 }} />
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>تقرير تقييم أداء الطالب</div>
        </div>
        <div style={{ flex: 1, textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>الطالب</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{student.name}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>الصف / التاريخ</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>{classObj?.name || "—"} — {dateLabel}</div>
        </div>
      </div>

      {/* Student info + overall summary */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
        <div style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>بيانات الطالب</div>
          <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.9 }}>
            <div>الاسم: <b style={{ color: "#0f172a" }}>{student.name}</b></div>
            <div>رقم الطالب: <b style={{ color: "#0f172a" }}>{student.student_number || "—"}</b></div>
            <div>الصف: <b style={{ color: "#0f172a" }}>{classObj?.name || "—"}</b></div>
          </div>
        </div>
        <div style={{ flex: 1.2, border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#f0fdfa", borderColor: "#ccfbf1" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>ملخص الأداء العام</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: overallBand.color }}>{overallPct}%</div>
              <div style={{ fontSize: 12, color: overallBand.color, fontWeight: 700 }}>{overallBand.key}</div>
            </div>
            <div style={{ textAlign: "left", fontSize: 12, color: "#475569", lineHeight: 1.9 }}>
              <div>المجموع الكلي: <b style={{ color: "#0f172a" }}>{totalScore} / {totalMax}</b></div>
              <div>عدد المواد: <b style={{ color: "#0f172a" }}>{subRows.length}</b></div>
              <div>المهارات المكتسبة: <b style={{ color: "#0f172a" }}>{acquiredSkills.length}</b></div>
            </div>
          </div>
        </div>
      </div>

      {/* Grades table */}
      <div style={{ fontSize: 13, marginBottom: 22 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>أولاً: نتائج الدرجات حسب المادة</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#149684", color: "#ffffff" }}>
              <th style={{ ...cell, color: "#fff", borderBottom: "none", textAlign: "right" }}>المادة</th>
              <th style={{ ...cell, color: "#fff", borderBottom: "none", textAlign: "center" }}>المشاركة</th>
              <th style={{ ...cell, color: "#fff", borderBottom: "none", textAlign: "center" }}>الواجبات</th>
              <th style={{ ...cell, color: "#fff", borderBottom: "none", textAlign: "center" }}>النشاط الصفي</th>
              <th style={{ ...cell, color: "#fff", borderBottom: "none", textAlign: "center" }}>البحوث</th>
              <th style={{ ...cell, color: "#fff", borderBottom: "none", textAlign: "center" }}>التحريري</th>
              <th style={{ ...cell, color: "#fff", borderBottom: "none", textAlign: "center" }}>العملي</th>
              <th style={{ ...cell, color: "#fff", borderBottom: "none", textAlign: "center" }}>المجموع</th>
              <th style={{ ...cell, color: "#fff", borderBottom: "none", textAlign: "center" }}>النسبة</th>
              <th style={{ ...cell, color: "#fff", borderBottom: "none", textAlign: "center" }}>التقدير</th>
            </tr>
          </thead>
          <tbody>
            {subRows.length === 0 ? (
              <tr><td colSpan={10} style={{ ...cell, textAlign: "center", color: "#94a3b8" }}>لا توجد درجات مسجلة</td></tr>
            ) : subRows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 ? "#ffffff" : "#f8fafc" }}>
                <td style={{ ...cell, textAlign: "right", fontWeight: 600 }}>{r.sub.name}</td>
                <td style={{ ...cell, textAlign: "center" }}>{r.g.participation ?? ""}</td>
                <td style={{ ...cell, textAlign: "center" }}>{r.g.homework ?? ""}</td>
                <td style={{ ...cell, textAlign: "center" }}>{r.g.class_activity ?? ""}</td>
                <td style={{ ...cell, textAlign: "center" }}>{r.g.research ?? ""}</td>
                <td style={{ ...cell, textAlign: "center" }}>{r.g.written_exam ?? ""}</td>
                <td style={{ ...cell, textAlign: "center" }}>{r.g.practical_exam ?? ""}</td>
                <td style={{ ...cell, textAlign: "center", fontWeight: 700 }}>{r.total} / {r.max}</td>
                <td style={{ ...cell, textAlign: "center", fontWeight: 700 }}>{r.pct}%</td>
                <td style={{ ...cell, textAlign: "center", color: r.band.color, fontWeight: 700 }}>{r.band.key}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Acquired skills */}
      <div style={{ fontSize: 13, marginBottom: 22 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>ثانياً: المهارات المكتسبة</div>
        {acquiredSkills.length === 0 ? (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, color: "#94a3b8", textAlign: "center", fontSize: 12 }}>لا توجد مهارات مكتسبة مسجلة</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {acquiredSkills.map((s, i) => (
              <div key={i} style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 10, padding: "10px 12px", fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: "#15803d" }}>✔ {s.title}</div>
                {s.description && <div style={{ color: "#475569", marginTop: 3, fontSize: 11 }}>{s.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* In-progress skills + activities */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22, fontSize: 13 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>مهارات قيد التطوير</div>
          {inProgressSkills.length === 0 ? (
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, color: "#94a3b8", textAlign: "center", fontSize: 12 }}>لا يوجد</div>
          ) : inProgressSkills.map((s, i) => (
            <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 12px", marginBottom: 6, fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>{s.title}</span>
              {s.description && <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{s.description}</div>}
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>الأنشطة والمشاركات</div>
          {activities.length === 0 ? (
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, color: "#94a3b8", textAlign: "center", fontSize: 12 }}>لا يوجد</div>
          ) : activities.map((a, i) => (
            <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 12px", marginBottom: 6, fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>{a.title}</span>
              {a.activity_result && <div style={{ color: "#0f766e", fontSize: 11, marginTop: 2 }}>النتيجة: {a.activity_result}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Behavioral notes */}
      <div style={{ fontSize: 13, marginBottom: 22 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>رابعاً: الملاحظات السلوكية</div>
        {behavioralNotes.length === 0 ? (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, color: "#94a3b8", textAlign: "center", fontSize: 12 }}>لا توجد ملاحظات سلوكية مسجلة</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {behavioralNotes.map((n, i) => {
              const positive = n.tone === "positive";
              return (
                <div key={i} style={{ display: "flex", gap: 10, border: `1px solid ${positive ? "#bbf7d0" : "#fecaca"}`, background: positive ? "#f0fdf4" : "#fef2f2", borderRadius: 10, padding: "10px 12px", fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: positive ? "#15803d" : "#b91c1c", minWidth: 44 }}>{positive ? "إيجابية" : "سلبية"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#0f172a" }}>{n.content}</div>
                    <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 3 }}>{n.date || "—"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Signatures */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 18, borderTop: "1px solid #e2e8f0" }}>
        {principalOnly ? (
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{sLabel}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{principalName || "—"}</div>
            <div style={{ width: 160, height: 1, background: "#cbd5e1", margin: "18px auto 0" }} />
          </div>
        ) : (
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{sLabel}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{sName || "—"}</div>
            <div style={{ width: 160, height: 1, background: "#cbd5e1", margin: "18px auto 0" }} />
          </div>
        )}
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>ولي الأمر</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>التوقيع</div>
          <div style={{ width: 160, height: 1, background: "#cbd5e1", margin: "18px auto 0" }} />
        </div>
        {!principalOnly && (
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{principalTitle} المدرسة</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{principalName || "—"}</div>
            <div style={{ width: 160, height: 1, background: "#cbd5e1", margin: "18px auto 0" }} />
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 10, color: "#94a3b8", textAlign: "center" }}>
        تم إنشاء هذا التقرير تلقائياً بواسطة نظام إدارة الصف — {dateLabel}
      </div>
    </div>
  );
}