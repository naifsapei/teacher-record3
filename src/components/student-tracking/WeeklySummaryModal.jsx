import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, Share2, Copy, Star, TrendingUp, TrendingDown, FileDown, Loader2 } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";
import StudentAvatar from "@/components/students/StudentAvatar";
import { renderHTMLToPDF, buildReportHeaderHTML, buildFooterHTML, escapeHTML } from "@/utils/reportLayout";

export default function WeeklySummaryModal({ student, open, onClose }) {
  const [sending, setSending] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const { data: schoolData } = useQuery({ queryKey: ["schoolInfo", "weekly"], queryFn: () => base44.entities.SchoolInfo.list().then((r) => r || []), enabled: open });
  const school = Array.isArray(schoolData) ? (schoolData[0] || {}) : (schoolData || {});

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd");
  const weekEnd   = format(endOfWeek(new Date(),   { weekStartsOn: 0 }), "yyyy-MM-dd");

  const { data: grades = [] } = useQuery({
    queryKey: ["grades", student?.id],
    queryFn: () => base44.entities.Grade.filter({ student_id: student?.id }),
    enabled: !!student?.id,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => base44.entities.Subject.list(),
  });

  const { data: records = [] } = useQuery({
    queryKey: ["tracking-records", student?.id],
    queryFn: () => base44.entities.TrackingRecord.filter({ student_id: student?.id }),
    enabled: !!student?.id,
  });

  // Filter records for this week
  const weeklyRecords = useMemo(() => {
    return records.filter((r) => r.date >= weekStart && r.date <= weekEnd);
  }, [records, weekStart, weekEnd]);

  // Group by action
  const groupedActions = useMemo(() => {
    const map = {};
    weeklyRecords.forEach((r) => {
      const key = r.action_label;
      if (!map[key]) map[key] = { label: key, emoji: r.action_emoji, total: 0, count: 0 };
      map[key].total += r.points;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [weeklyRecords]);

  const totalPoints = useMemo(() => weeklyRecords.reduce((s, r) => s + r.points, 0), [weeklyRecords]);

  // Grade summary
  const gradeSummary = useMemo(() => {
    return grades.map((g) => {
      const subject = subjects.find((s) => s.id === g.subject_id);
      const total = (g.participation || 0) + (g.homework || 0) + (g.class_activity || 0) + (g.research || 0) + (g.written_exam || 0) + (g.practical_exam || 0);
      return { subjectName: subject?.name || "مادة", total };
    });
  }, [grades, subjects]);

  const buildMessage = () => {
    const lines = [];
    lines.push(`📊 *ملخص أداء الطالب/ة الأسبوعي*`);
    lines.push(`👤 الاسم: ${student?.name}`);
    lines.push(`📅 الأسبوع: ${weekStart} — ${weekEnd}`);
    lines.push(`─────────────────`);

    if (groupedActions.length > 0) {
      lines.push(`⭐ *نقاط المتابعة الأسبوعية:*`);
      groupedActions.forEach((a) => {
        const sign = a.total > 0 ? "+" : "";
        lines.push(`  ${a.emoji || "•"} ${a.label}: ${sign}${a.total} نقطة (${a.count} مرة)`);
      });
      const sign = totalPoints > 0 ? "+" : "";
      lines.push(`  📌 *الإجمالي: ${sign}${totalPoints} نقطة*`);
    } else {
      lines.push(`⭐ لا توجد تقييمات مسجّلة هذا الأسبوع`);
    }

    if (gradeSummary.length > 0) {
      lines.push(`─────────────────`);
      lines.push(`📚 *درجات المواد:*`);
      gradeSummary.forEach((g) => {
        lines.push(`  • ${g.subjectName}: ${g.total} درجة`);
      });
    }

    lines.push(`─────────────────`);
    lines.push(`_تم إنشاء هذا التقرير تلقائيًا من نظام إدارة الصف_`);
    return lines.join("\n");
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(buildMessage());
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildMessage());
    toast.success("تم نسخ الملخص ✅");
  };

  const buildSummaryHTML = () => {
    const rowsActions = groupedActions.map((a) => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:right;">${escapeHTML(a.emoji || "•")} ${escapeHTML(a.label)}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;">${a.count}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;font-weight:700;color:${a.total >= 0 ? "#047857" : "#dc2626"};">${a.total > 0 ? "+" : ""}${a.total}</td>
      </tr>`).join("");

    const rowsGrades = gradeSummary.map((g) => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:right;">${escapeHTML(g.subjectName)}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;font-weight:700;color:#003366;">${g.total}</td>
      </tr>`).join("");

    return `
    <div style="font-family:'Noto Kufi Arabic',sans-serif;direction:rtl;padding:24px;color:#0f172a;background:#fff;">
      ${buildReportHeaderHTML({ title: "ملخص الأداء الأسبوعي", school })}
      <div style="display:flex;gap:16px;margin-bottom:14px;font-size:13px;">
        <div><span style="font-weight:700;">الطالب:</span> ${escapeHTML(student?.name || "—")}</div>
        <div><span style="font-weight:700;">الأسبوع:</span> ${weekStart} — ${weekEnd}</div>
      </div>
      <h3 style="font-size:14px;color:#003366;margin:10px 0 6px;">نقاط المتابعة الأسبوعية</h3>
      ${groupedActions.length > 0 ? `
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="background:#f1f5f9;">
          <th style="padding:6px 10px;border:1px solid #cbd5e1;text-align:right;">النوع</th>
          <th style="padding:6px 10px;border:1px solid #cbd5e1;">التكرار</th>
          <th style="padding:6px 10px;border:1px solid #cbd5e1;">النقاط</th>
        </tr></thead>
        <tbody>${rowsActions}</tbody>
        <tfoot><tr style="background:#e0f2fe;font-weight:700;">
          <td style="padding:6px 10px;border:1px solid #cbd5e1;">الإجمالي</td>
          <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;">—</td>
          <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;color:${totalPoints >= 0 ? "#047857" : "#dc2626"};">${totalPoints > 0 ? "+" : ""}${totalPoints}</td>
        </tr></tfoot>
      </table>` : `<p style="color:#64748b;">لا توجد تقييمات مسجّلة هذا الأسبوع.</p>`}
      ${gradeSummary.length > 0 ? `
      <h3 style="font-size:14px;color:#003366;margin:16px 0 6px;">درجات المواد</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="background:#f1f5f9;">
          <th style="padding:6px 10px;border:1px solid #cbd5e1;text-align:right;">المادة</th>
          <th style="padding:6px 10px;border:1px solid #cbd5e1;">المجموع</th>
        </tr></thead>
        <tbody>${rowsGrades}</tbody>
      </table>` : ""}
      ${buildFooterHTML({})}
    </div>`;
  };

  const handlePDF = async () => {
    setPdfBusy(true);
    try {
      await renderHTMLToPDF(buildSummaryHTML(), `ملخص-أسبوعي-${student?.name || "طالب"}.pdf`);
      toast.success("تم إنشاء ملف PDF");
    } catch {
      toast.error("تعذّر إنشاء الملف");
    }
    setPdfBusy(false);
  };

  const handleEmail = async () => {
    setSending(true);
    const body = buildMessage().replace(/\*/g, "").replace(/_/g, "");
    await base44.integrations.Core.SendEmail({
      to: student?.email || "",
      subject: `ملخص أداء الطالب ${student?.name} الأسبوعي`,
      body,
    });
    setSending(false);
    toast.success("تم إرسال البريد الإلكتروني ✅");
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Share2 className="h-5 w-5 text-primary" />
            ملخص الأداء الأسبوعي
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student info */}
          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
            <StudentAvatar me={me} student={student} size="h-10 w-10" />
            <div>
              <p className="font-semibold text-sm">{student.name}</p>
              <p className="text-xs text-muted-foreground">{weekStart} — {weekEnd}</p>
            </div>
          </div>

          {/* Points summary */}
          <div className={`rounded-xl border p-3 flex items-center justify-between ${totalPoints >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <span className="text-sm font-medium">إجمالي نقاط الأسبوع</span>
            <div className="flex items-center gap-1">
              {totalPoints >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
              <span className={`text-lg font-bold ${totalPoints >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {totalPoints > 0 ? "+" : ""}{totalPoints}
              </span>
            </div>
          </div>

          {/* Actions breakdown */}
          {groupedActions.length > 0 && (
            <div className="rounded-xl border bg-white p-3 space-y-1.5 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground mb-2">تفاصيل التقييمات</p>
              {groupedActions.map((a) => (
                <div key={a.label} className="flex items-center justify-between text-sm">
                  <span>{a.emoji} {a.label} <span className="text-muted-foreground text-xs">({a.count}×)</span></span>
                  <span className={`font-bold text-xs ${a.total > 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {a.total > 0 ? "+" : ""}{a.total}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Grades */}
          {gradeSummary.length > 0 && (
            <div className="rounded-xl border bg-white p-3 space-y-1.5 max-h-36 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground mb-2">درجات المواد</p>
              {gradeSummary.map((g, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" />{g.subjectName}</span>
                  <span className="font-bold text-xs text-primary">{g.total}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <Button onClick={handleWhatsApp} className="gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs" size="sm">
              <MessageCircle className="h-4 w-4" />
              واتساب
            </Button>
            <Button onClick={handlePDF} disabled={pdfBusy} className="gap-1.5 text-xs" size="sm">
              {pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              PDF
            </Button>
            <Button onClick={handleEmail} disabled={sending || !student.email} variant="outline" className="gap-1.5 text-xs" size="sm">
              <Mail className="h-4 w-4" />
              {sending ? "جاري..." : "بريد"}
            </Button>
            <Button onClick={handleCopy} variant="outline" className="gap-1.5 text-xs" size="sm">
              <Copy className="h-4 w-4" />
              نسخ
            </Button>
          </div>
          {!student.email && (
            <p className="text-[11px] text-muted-foreground text-center">لا يوجد بريد إلكتروني مسجل للطالب</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}