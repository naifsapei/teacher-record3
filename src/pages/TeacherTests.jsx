import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import { FileText, Sparkles, Printer, Download } from "lucide-react";
import { toast } from "sonner";
import { buildReportHeaderHTML, buildFooterHTML, buildSignaturesHTML, renderHTMLToPDF, escapeHTML } from "@/utils/reportLayout";

const WORK_TYPES = ["اختبار فترِي", "اختبار", "ورقة عمل", "اختبار نهائي"];
const QUESTION_TYPES = ["اختيار من متعدد", "صح وخطأ", "مقالي", "ترتيب", "إكمال فراغ", "مزيج"];

export default function TeacherTests() {
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [workType, setWorkType] = useState("اختبار فترِي");
  const [units, setUnits] = useState("");
  const [lessons, setLessons] = useState("");
  const [questionType, setQuestionType] = useState("اختيار من متعدد");
  const [questionTypes, setQuestionTypes] = useState(["اختيار من متعدد"]);
  const [questions, setQuestions] = useState("");
  const [answerKey, setAnswerKey] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => {
    const lines = [
      `المادة: ${subject || "—"}`,
      `الصف: ${className || "—"}`,
      `نوع الاختبار: ${workType}`,
      `الوحدات: ${units || "—"}`,
      `الدروس: ${lessons || "—"}`,
      `أنواع الأسئلة: ${questionTypes.join(" • ")}`,
      "",
      "الأسئلة:",
      questions || "سيتم توليد الأسئلة هنا عند إدخال البيانات.",
      "",
      "نموذج الإجابة:",
      answerKey || "سيتم توليد نموذج الإجابة هنا عند إدخال البيانات.",
    ];
    return lines.join("\n");
  }, [subject, className, workType, units, lessons, questionType, questions, answerKey]);

  const generateContent = () => {
    if (!subject || !className) {
      toast.error("يرجى إدخال المادة والصف أولاً");
      return;
    }
    const generatedQuestions = [
      `1. ${questionTypes.includes("اختيار من متعدد") ? "اختر الإجابة الصحيحة فيما يلي:" : ""}`,
      `2. ${questionTypes.includes("صح وخطأ") ? "حدد صحة العبارة الآتية:" : ""}`,
      `3. ${questionTypes.includes("مقالي") ? "اكتب إجابة مختصرة ومناسبة لموضوع ${subject}." : ""}`,
      `4. ${questionTypes.includes("ترتيب") ? "رتب العناصر التالية وفقًا للترتيب الصحيح." : ""}`,
      `5. ${questionTypes.includes("إكمال فراغ") ? "أكمل الفراغات بما يناسب المعنى." : ""}`,
      `6. ${questionTypes.includes("مزيج") ? "حل السؤال التالي مع توضيح خطواتك." : ""}`,
      `2. اكتب إجابة مختصرة ومناسبة لموضوع ${subject}.`,
      `3. راجع الدرس ${lessons || "المختار"} واستخرج سؤالاً تطبيقياً مناسباً.`
    ].join("\n");
    const generatedAnswer = [
      "نموذج الإجابة:",
      `- ${subject} / ${className}`,
      `- ${workType}`,
      `- ${questionTypes.join(" • ")}`,
      "- راجع الإجابات قبل الطباعة أو التصدير.",
    ].join("\n");
    setQuestions(generatedQuestions);
    setAnswerKey(generatedAnswer);
    toast.success("تم توليد المحتوى المبدئي بنجاح");
  };

  const exportPdf = async () => {
    if (!subject || !className) {
      toast.error("يرجى إدخال المادة والصف أولاً");
      return;
    }
    setBusy(true);
    try {
      const html = `
      <div style="direction:rtl;text-align:right;font-family:Tahoma,Arial,sans-serif;color:#0f172a;padding:18px;line-height:1.8;">
        ${buildReportHeaderHTML({ title: "اختبارات وأوراق عمل", school: { education_admin: "إدارة التعليم", school_name: schoolName || "المدرسة" } })}
        <div style="margin-top:14px;font-size:14px;font-weight:700;color:#003366;">${escapeHTML(subject)} — ${escapeHTML(className)}</div>
        <div style="margin-top:8px;font-size:12px;color:#475569;">نوع العمل: ${escapeHTML(workType)} • الوحدات: ${escapeHTML(units || "—")} • الدروس: ${escapeHTML(lessons || "—")}</div>
        <div style="margin-top:10px;border:1px solid #e2e8f0;padding:12px;border-radius:10px;background:#f8fafc;white-space:pre-wrap;">${escapeHTML(preview)}</div>
        ${buildSignaturesHTML({ teacherName: teacherName || "المدرس", principalName: "—", school: { school_name: schoolName || "المدرسة" }, teacherTitle: "معلم", principalTitle: "مدير", sourceName: teacherName || "المدرس", sourceLabel: "المعلم" })}
        ${buildFooterHTML({ siteName: "سجل المعلم" })}
      </div>`;
      await renderHTMLToPDF(html, `اختبار_${subject}_${className}.pdf`, { landscape: false });
      toast.success("تم تصدير ملف PDF بنجاح");
    } catch (error) {
      toast.error(error?.message || "تعذر تصدير PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl">
      <PageHeader title="الاختبارات وأوراق العمل" description="إنشاء محتوى تعليمي بالذكاء الاصطناعي مع مراجعة قبل الطباعة أو التصدير" />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> بيانات العمل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>المادة</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثال: اللغة العربية" />
              </div>
              <div className="space-y-2">
                <Label>الصف</Label>
                <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="مثال: الصف السادس" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>نوع الاختبار</Label>
                <Select value={workType} onValueChange={setWorkType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{WORK_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>أنواع الأسئلة</Label>
                <div className="flex flex-wrap gap-2">
                  {QUESTION_TYPES.map((item) => (
                    <button key={item} type="button" onClick={() => setQuestionTypes((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} className={`rounded-full px-3 py-2 text-sm ${questionTypes.includes(item) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>الوحدات</Label>
                <Input value={units} onChange={(e) => setUnits(e.target.value)} placeholder="مثال: الوحدة الأولى" />
              </div>
              <div className="space-y-2">
                <Label>الدرس/الدروس</Label>
                <Input value={lessons} onChange={(e) => setLessons(e.target.value)} placeholder="مثال: الدرس 1-3" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>اسم المعلم</Label>
                <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="مثال: أحمد محمد" />
              </div>
              <div className="space-y-2">
                <Label>اسم المدرسة</Label>
                <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="اختياري" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={generateContent} className="gap-2"><Sparkles className="h-4 w-4" /> توليد المحتوى</Button>
              <Button variant="outline" onClick={exportPdf} disabled={busy} className="gap-2"><Download className="h-4 w-4" /> تصدير PDF</Button>
              <Button variant="outline" className="gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" /> طباعة</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>المحتوى المُنتَج</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={preview} onChange={(e) => setQuestions(e.target.value)} rows={16} className="min-h-[360px] font-sans text-sm" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
