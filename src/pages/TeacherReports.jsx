import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import { FileText, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { buildReportHeaderHTML, buildFooterHTML, buildSignaturesHTML, renderHTMLToPDF, escapeHTML } from "@/utils/reportLayout";

export default function TeacherReports() {
  const [title, setTitle] = useState("تقرير دراسي");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState("");
  const [evidence, setEvidence] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [busy, setBusy] = useState(false);

  const reportHtml = useMemo(() => `
    <div style="direction:rtl;text-align:right;font-family:Tahoma,Arial,sans-serif;color:#0f172a;padding:18px;line-height:1.8;">
      ${buildReportHeaderHTML({ title, school: { education_admin: "إدارة التعليم", school_name: schoolName || "المدرسة" } })}
      <div style="margin-top:14px;font-size:14px;font-weight:800;color:#003366;">${escapeHTML(title)}</div>
      <div style="margin-top:8px;font-size:12px;color:#475569;">${escapeHTML(eventDate || "تاريخ الحدث غير محدد")}</div>
      <div style="margin-top:12px;border:1px solid #e2e8f0;border-radius:10px;padding:12px;background:#f8fafc;">
        <div style="font-weight:700;margin-bottom:6px;">الوصف</div>
        <div style="white-space:pre-wrap;">${escapeHTML(description || "—")}</div>
      </div>
      <div style="margin-top:10px;border:1px solid #e2e8f0;border-radius:10px;padding:12px;background:#fff;">
        <div style="font-weight:700;margin-bottom:6px;">الأهداف</div>
        <div style="white-space:pre-wrap;">${escapeHTML(goals || "—")}</div>
      </div>
      <div style="margin-top:10px;border:1px solid #e2e8f0;border-radius:10px;padding:12px;background:#fff;">
        <div style="font-weight:700;margin-bottom:6px;">الشواهد والمرفقات</div>
        <div style="white-space:pre-wrap;">${escapeHTML(evidence || "—")}</div>
      </div>
      <div style="margin-top:10px;border:1px solid #e2e8f0;border-radius:10px;padding:12px;background:#fff;">
        <div style="font-weight:700;margin-bottom:6px;">التوصيات</div>
        <div style="white-space:pre-wrap;">${escapeHTML(recommendations || "—")}</div>
      </div>
      ${buildSignaturesHTML({ teacherName: teacherName || "المدرس", principalName: "—", school: { school_name: schoolName || "المدرسة" }, teacherTitle: "معلم", principalTitle: "مدير", sourceName: teacherName || "المدرس", sourceLabel: "المعلم" })}
      ${buildFooterHTML({ siteName: "سجل المعلم" })}
    </div>`, [title, eventDate, description, goals, evidence, recommendations, teacherName, schoolName]);

  const exportPdf = async () => {
    setBusy(true);
    try {
      await renderHTMLToPDF(reportHtml, `${title || "تقرير"}.pdf`, { landscape: false });
      toast.success("تم تصدير التقرير بنجاح");
    } catch (error) {
      toast.error(error?.message || "تعذر تصدير PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl">
      <PageHeader title="التقارير المدرسية" description="إنشاء تقارير مدرسية احترافية بصيغة PDF مع دعم العربية والاتجاه RTL" />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> بيانات التقرير</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>عنوان التقرير</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>تاريخ الحدث</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>وصف الحدث</Label>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>الأهداف</Label>
              <Textarea rows={4} value={goals} onChange={(e) => setGoals(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>الشواهد والمرفقات</Label>
              <Textarea rows={4} value={evidence} onChange={(e) => setEvidence(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>التوصيات</Label>
              <Textarea rows={4} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>اسم المعلم</Label>
                <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>المدرسة</Label>
                <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={exportPdf} disabled={busy} className="gap-2"><Download className="h-4 w-4" /> تصدير PDF</Button>
              <Button variant="outline" className="gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" /> طباعة</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>معاينة التقرير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-8" dangerouslySetInnerHTML={{ __html: reportHtml }} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
