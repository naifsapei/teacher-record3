import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  buildReportHeaderHTML, buildSignaturesHTML, buildFooterHTML, renderHTMLToPDF, escapeHTML,
} from "@/utils/reportLayout";
import { isPrincipalOnly, subscriberTitle, titledSubscriberName, resolveSchool } from "@/lib/permissions";
import { calcTotal, calcEffMax } from "@/lib/gradeCalc";

const band = (pct) =>
  pct >= 90 ? "ممتاز" : pct >= 75 ? "جيد جداً" : pct >= 60 ? "جيد" : "مقبول";

export default function BriefStudentReport({ student, open, onOpenChange, classes, subjects }) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: grades = [] } = useQuery({
    queryKey: ["grades", student?.id],
    queryFn: () => base44.entities.Grade.filter({ student_id: student?.id }),
    enabled: !!student?.id,
  });
  const { data: achievements = [] } = useQuery({
    queryKey: ["achievements", student?.id],
    queryFn: () => base44.entities.Achievement.filter({ student_id: student?.id }),
    enabled: !!student?.id,
  });
  const { data: schoolArr = [] } = useQuery({
    queryKey: ["school-info"],
    queryFn: () => base44.entities.SchoolInfo.list(),
  });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });

  const school = resolveSchool(me, schoolArr[0]);
  const cls = classes.find((c) => c.id === student?.class_id);

  const report = useMemo(() => {
    if (!student) return null;
    const classSubjects = subjects.filter((s) => s.class_id === student.class_id);
    const rows = classSubjects.map((sub) => {
      const g = grades.find((gr) => gr.subject_id === sub.id);
      if (!g) return null;
      const total = calcTotal(g);
      const max = calcEffMax(g, sub);
      if (max === 0) return null;
      const pct = Math.round((total / max) * 100);
      return { name: sub.name, total, max, pct };
    }).filter(Boolean);
    const grandTotal = rows.reduce((s, r) => s + r.total, 0);
    const grandMax = rows.reduce((s, r) => s + r.max, 0);
    const overallPct = grandMax > 0 ? Math.round((grandTotal / grandMax) * 100) : 0;

    const skills = achievements.filter((a) => a.type === "skill" && a.status === "acquired");
    const activities = achievements.filter((a) => a.type === "activity");
    return { rows, grandTotal, grandMax, overallPct, skills, activities };
  }, [student, subjects, grades, achievements]);

  const buildHTML = () => {
    if (!report || !student) return "";
    const rowsHTML = report.rows.map((r) => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;">${escapeHTML(r.name)}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;">${r.total} / ${r.max}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;">${r.pct}%</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;">${band(r.pct)}</td>
      </tr>`).join("");

    const skillsHTML = report.skills.length
      ? `<ul style="margin:6px 0;padding-right:18px;">${report.skills.map((s) => `<li style="margin:3px 0;">${escapeHTML(s.title)}${s.description ? ` — <span style="color:#64748b;">${escapeHTML(s.description)}</span>` : ""}</li>`).join("")}</ul>`
      : `<p style="color:#64748b;">لا توجد مهارات مكتسبة مسجلة بعد.</p>`;

    const activitiesHTML = report.activities.length
      ? `<ul style="margin:6px 0;padding-right:18px;">${report.activities.map((a) => `<li style="margin:3px 0;">${escapeHTML(a.title)}${a.activity_result ? ` — <span style="color:#64748b;">${escapeHTML(a.activity_result)}</span>` : ""}</li>`).join("")}</ul>`
      : "";

    return `
    <div style="font-family:'Noto Kufi Arabic',sans-serif;direction:rtl;padding:24px;color:#0f172a;background:#fff;">
      ${buildReportHeaderHTML({ title: "تقرير مختصر لأداء الطالب", school })}
      <div style="display:flex;gap:16px;margin-bottom:14px;font-size:13px;">
        <div><span style="font-weight:700;">الطالب:</span> ${escapeHTML(student.name)}</div>
        <div><span style="font-weight:700;">رقم الطالب:</span> ${escapeHTML(student.student_number || "—")}</div>
        <div><span style="font-weight:700;">الصف:</span> ${escapeHTML(cls?.name || "—")}</div>
      </div>
      <h3 style="font-size:14px;color:#003366;margin:10px 0 6px;">إجمالي الدرجات حسب المادة</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:6px 10px;border:1px solid #cbd5e1;text-align:right;">المادة</th>
            <th style="padding:6px 10px;border:1px solid #cbd5e1;">الدرجة</th>
            <th style="padding:6px 10px;border:1px solid #cbd5e1;">النسبة</th>
            <th style="padding:6px 10px;border:1px solid #cbd5e1;">التقدير</th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
        <tfoot>
          <tr style="background:#e0f2fe;font-weight:700;">
            <td style="padding:6px 10px;border:1px solid #cbd5e1;">المجموع الكلي</td>
            <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;">${report.grandTotal} / ${report.grandMax}</td>
            <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;">${report.overallPct}%</td>
            <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;">${band(report.overallPct)}</td>
          </tr>
        </tfoot>
      </table>
      <h3 style="font-size:14px;color:#003366;margin:16px 0 6px;">المهارات المكتسبة</h3>
      ${skillsHTML}
      ${activitiesHTML ? `<h3 style="font-size:14px;color:#003366;margin:14px 0 6px;">الأنشطة</h3>${activitiesHTML}` : ""}
      ${buildSignaturesHTML({ teacherName: me?.display_name || me?.full_name, principalName: school.principal_name, school, principalOnly: isPrincipalOnly(me), teacherTitle: subscriberTitle(me), principalTitle: subscriberTitle(me) })}
      ${buildFooterHTML({})}
    </div>`;
  };

  const html = useMemo(buildHTML, [report, student, cls, school, me]);

  const handleDownload = async () => {
    setBusy(true);
    try {
      await renderHTMLToPDF(html, `تقرير-${student?.name || "طالب"}.pdf`);
      toast.success("تم إنشاء ملف PDF");
    } catch {
      toast.error("تعذّر إنشاء الملف");
    }
    setBusy(false);
  };

  const handleEmail = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const body = `
مرحباً ولي الأمر،

مرفق ملخص أداء الطالب/ة ${student?.name} ${student?.student_number ? `(رقم: ${student.student_number})` : ""} — ${cls?.name || ""}.

إجمالي الدرجات: ${report.grandTotal} / ${report.grandMax} (${report.overallPct}% — ${band(report.overallPct)}).

تفاصيل المواد:
${report.rows.map((r) => `• ${r.name}: ${r.total}/${r.max} (${r.pct}% — ${band(r.pct)})`).join("\n")}

المهارات المكتسبة:
${report.skills.length ? report.skills.map((s) => `• ${s.title}`).join("\n") : "لا توجد مهارات مسجلة بعد."}

${report.activities.length ? `الأنشطة:\n${report.activities.map((a) => `• ${a.title}`).join("\n")}` : ""}

مع خالص التقدير،
${titledSubscriberName(me)}
${school.school_name || ""}
`;
      await base44.integrations.Core.SendEmail({
        to: email.trim(),
        subject: `تقرير أداء الطالب/ة ${student?.name}`,
        body,
        from_name: school.school_name || "سجل المعلم",
      });
      toast.success("تم إرسال التقرير إلى البريد الإلكتروني");
      setEmailOpen(false);
      setEmail("");
    } catch {
      toast.error("تعذّر إرسال البريد");
    }
    setBusy(false);
  };

  if (!student) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تقرير مختصر — {student.name}</DialogTitle>
          </DialogHeader>

          {!report ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <iframe
                title="تقرير الطالب"
                sandbox=""
                srcDoc={`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;700;800&display=swap"><style>body{margin:0;font-family:'Noto Kufi Arabic',sans-serif;}</style></head><body>${html}</body></html>`}
                className="w-full rounded-lg border bg-white"
                style={{ height: "60vh" }}
              />
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setEmailOpen(true)} className="gap-2">
                  <Mail className="h-4 w-4" /> إرسال لولي الأمر
                </Button>
                <Button onClick={handleDownload} disabled={busy} className="gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  تحميل PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إرسال التقرير بالبريد الإلكتروني</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>بريد ولي الأمر *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" />
            </div>
            <p className="text-xs text-muted-foreground">
              سيتم إرسال ملخص درجات الطالب ومهاراته المكتسبة إلى هذا البريد.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEmailOpen(false)}>إلغاء</Button>
            <Button onClick={handleEmail} disabled={busy || !email.trim()} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              إرسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}