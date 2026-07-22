import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import { Sparkles, Save, FileDown, Printer, Medal, BookOpen } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "certificates_v1";

const CERTIFICATE_TYPES = [
  { id: "excellence", title: "شهادة تفوق", icon: "🏆", defaultText: "تشهد إدارة المدرسة بأن الطالب/ـة قد أظهر/ت تفوقًا متميزًا في التحصيل الدراسي، واستحق/ت هذه الشهادة تقديرًا لجهوده/ـا واجتهاده/ـا." },
  { id: "distinction", title: "شهادة تميز", icon: "⭐", defaultText: "تتقدم إدارة المدرسة بخالص التقدير للطالب/ـة على الجهود المتميزة والمشاركة الفعالة، سائلين الله له/ـا دوام التوفيق." },
  { id: "appreciation", title: "شهادة تقدير", icon: "🏅", defaultText: "تمنح هذه الشهادة تقديرًا للطالب/ـة لما أبداه/ـت من تفاني وحرص في العمل المدرسي." },
  { id: "participation", title: "شهادة مشاركة", icon: "🤝", defaultText: "تقديرًا لمشاركته/ـا الفعالة في الأنشطة المدرسية، تمنح هذه الشهادة تقديرًا لجهودهم/ـا." },
];

const TEMPLATES = [
  { id: "classic", name: "الكلاسيكي الذهبي", colors: ["#b8860b", "#f5d76e"], border: "ذهبي" },
  { id: "royal", name: "الأزرق الملكي", colors: ["#1d4ed8", "#93c5fd"], border: "أزرق" },
  { id: "modern", name: "العصر الحديث", colors: ["#7c3aed", "#c4b5fd"], border: "بنفسجي" },
];

export default function Certificates() {
  const [recipientType, setRecipientType] = useState("طالب/طالبة");
  const [grade, setGrade] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [semester, setSemester] = useState("الفصل الأول");
  const [academicYear, setAcademicYear] = useState("1447 - 1448 هـ");
  const [certificateType, setCertificateType] = useState(CERTIFICATE_TYPES[0].id);
  const [title, setTitle] = useState(CERTIFICATE_TYPES[0].title);
  const [text, setText] = useState(CERTIFICATE_TYPES[0].defaultText);
  const [templateStyle, setTemplateStyle] = useState(TEMPLATES[0].id);
  const [storedCertificates, setStoredCertificates] = useState([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setStoredCertificates(JSON.parse(raw));
  }, []);

  const selectedType = useMemo(() => CERTIFICATE_TYPES.find((item) => item.id === certificateType) || CERTIFICATE_TYPES[0], [certificateType]);
  const selectedTemplate = useMemo(() => TEMPLATES.find((item) => item.id === templateStyle) || TEMPLATES[0], [templateStyle]);

  const generateText = () => {
    const generated = `تشهد إدارة المدرسة أن ${recipientName || "المستلم"} ${recipientType === "معلم/معلمة" ? "الذي يعد من رواد التطوير والمشاركة" : "قد أظهر/ت تفوقًا متميزًا"} في ${grade || "المرحلة الدراسية"} خلال ${semester} من العام ${academicYear}، وقد منحت هذه الشهادة تقديرًا لجهوده/ـا ومساهمته/ـا المميزة.`;
    setText(generated);
    toast.success("تم توليد نص الشهادة بنجاح");
  };

  const saveCertificate = () => {
    const payload = {
      id: crypto.randomUUID(),
      recipientName: recipientName || "غير محدد",
      recipientType,
      grade,
      semester,
      academicYear,
      certificateType: selectedType.title,
      certificateTitle: title || selectedType.title,
      certificateText: text,
      templateStyle: selectedTemplate.name,
      createdAt: new Date().toISOString(),
    };
    const next = [payload, ...storedCertificates];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setStoredCertificates(next);
    toast.success("تم حفظ الشهادة");
  };

  const printPdf = () => {
    window.print();
  };

  return (
    <div dir="rtl">
      <PageHeader title="شهادات التقدير" description="أنشئ شهادات إلكترونية احترافية للطلاب والمعلمين" actions={[
        <Button key="saved" variant="outline" onClick={() => document.getElementById("saved-section")?.scrollIntoView({ behavior: "smooth" })}>الشهادات المحفوظة</Button>
      ]} />

      <div className="rounded-[28px] bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">مركز شهادات التقدير</h2>
            <p className="mt-2 text-sm text-white/85">أنشئ شهادات رائعة لتقدير الإنجاز والتميز</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-white/15 px-3 py-2">٦ قوالب مميزة</span>
            <span className="rounded-full bg-white/15 px-3 py-2">توليد آلي</span>
            <span className="rounded-full bg-white/15 px-3 py-2">طباعة فورية</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="rounded-[24px] border-0 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> بيانات المستلم</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>نوع المستلم</Label>
                  <Select value={recipientType} onValueChange={setRecipientType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="طالب/طالبة">طالب/طالبة</SelectItem>
                      <SelectItem value="معلم/معلمة">معلم/معلمة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المرحلة أو الصف</Label>
                  <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="مثال: الثالث الابتدائي" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>اسم الطالب/المعلم</Label>
                  <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="أدخل الاسم الكامل" />
                </div>
                <div className="space-y-2">
                  <Label>الفصل الدراسي</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="الفصل الأول">الفصل الأول</SelectItem>
                      <SelectItem value="الفصل الثاني">الفصل الثاني</SelectItem>
                      <SelectItem value="الفصل الثالث">الفصل الثالث</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>السنة الدراسية</Label>
                <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="1447 - 1448 هـ" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-0 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2"><Medal className="h-5 w-5 text-primary" /> نوع الشهادة</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {CERTIFICATE_TYPES.map((item) => (
                  <button key={item.id} type="button" onClick={() => { setCertificateType(item.id); setTitle(item.title); setText(item.defaultText); }} className={`rounded-2xl border p-4 text-right ${certificateType === item.id ? "border-amber-400 bg-amber-50" : "border-border bg-card"}`}>
                    <div className="text-2xl">{item.icon}</div>
                    <div className="mt-2 font-bold">{item.title}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-0 shadow-sm">
            <CardHeader><CardTitle>نص الشهادة</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>عنوان الشهادة</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>نص الشهادة</Label>
                <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={generateText} className="gap-2"><Sparkles className="h-4 w-4" /> توليد نص بالذكاء الاصطناعي</Button>
                <p className="text-sm text-muted-foreground">يمكنك تعديل النص يدويًا قبل حفظ الشهادة.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[24px] border-0 shadow-sm">
            <CardHeader><CardTitle>اختر القالب</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              {TEMPLATES.map((template) => (
                <button key={template.id} type="button" onClick={() => setTemplateStyle(template.id)} className={`rounded-2xl border p-3 text-right ${templateStyle === template.id ? "border-amber-400 bg-amber-50" : "border-border"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">{template.name}</div>
                      <div className="text-sm text-muted-foreground">{template.border}</div>
                    </div>
                    <div className="flex gap-2">
                      {template.colors.map((color) => <span key={color} className="h-6 w-6 rounded-full" style={{ backgroundColor: color }} />)}
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-0 shadow-sm">
            <CardHeader><CardTitle>معاينة الشهادة</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-[24px] border border-amber-200 bg-white p-4 shadow-md" style={{ borderColor: selectedTemplate.id === "classic" ? "#f2c94c" : selectedTemplate.id === "royal" ? "#60a5fa" : "#a78bfa" }}>
                <div className="rounded-[20px] border border-dashed p-4" style={{ borderColor: selectedTemplate.colors[0] }}>
                  <div className="text-center text-sm text-muted-foreground">المملكة العربية السعودية</div>
                  <div className="text-center text-sm text-muted-foreground">وزارة التعليم</div>
                  <div className="mt-4 text-center text-2xl font-bold" style={{ color: selectedTemplate.colors[0] }}>{title || selectedType.title}</div>
                  <div className="mt-4 text-center text-sm">تمنح هذه الشهادة إلى</div>
                  <div className="mt-2 text-center text-xl font-black">{recipientName || "الاسم الكامل"}</div>
                  <div className="mt-4 rounded-2xl border border-dashed p-3 text-center text-sm leading-8" style={{ borderColor: selectedTemplate.colors[1] }}>{text}</div>
                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <div>{academicYear}</div>
                    <div>{semester}</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={saveCertificate} className="gap-2"><Save className="h-4 w-4" /> حفظ الشهادة</Button>
                <Button variant="outline" onClick={printPdf} className="gap-2"><FileDown className="h-4 w-4" /> تصدير / طباعة PDF</Button>
                <Button variant="outline" className="gap-2"><Printer className="h-4 w-4" /> طباعة</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card id="saved-section" className="mt-6 rounded-[24px] border-0 shadow-sm">
        <CardHeader><CardTitle>الشهادات المحفوظة</CardTitle></CardHeader>
        <CardContent>
          {!storedCertificates.length ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد شهادات محفوظة بعد</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {storedCertificates.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="font-bold">{item.recipientName}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.certificateTitle} • {item.semester}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline">عرض</Button>
                    <Button size="sm" variant="outline">تعديل</Button>
                    <Button size="sm" variant="outline">تحميل PDF</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
