import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Copy, BarChart3, Eye, Play, Pause, Trash2, Sparkles, Link2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { AGE_GROUPS, getVarkQuestions, VARK_STYLE_TYPES } from "@/utils/varkData";

const STORAGE_KEY = "vark_forms_v1";
const RESPONSE_STORAGE_KEY = "vark_responses_v1";

const emptyForm = {
  title: "",
  academicYear: "1447-1448 هـ",
  semester: "الفصل الدراسي الأول",
  className: "",
  ageGroup: AGE_GROUPS.adults.key,
  status: "active",
  shareToken: "",
  createdAt: "",
};

export default function VarkDashboard() {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [responses, setResponses] = useState([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyForm);
  const [filters, setFilters] = useState({ academicYear: "all", semester: "all", className: "all", style: "all" });

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const storedResponses = localStorage.getItem(RESPONSE_STORAGE_KEY);
    if (raw) setForms(JSON.parse(raw));
    if (storedResponses) setResponses(JSON.parse(storedResponses));
  }, []);

  const filteredForms = useMemo(() => forms.filter((form) => {
    const academicYearMatch = filters.academicYear === "all" || form.academicYear === filters.academicYear;
    const semesterMatch = filters.semester === "all" || form.semester === filters.semester;
    const classMatch = filters.className === "all" || form.className === filters.className;
    return academicYearMatch && semesterMatch && classMatch;
  }), [filters, forms]);

  const filteredResponses = useMemo(() => responses.filter((item) => {
    const academicYearMatch = filters.academicYear === "all" || forms.find((form) => form.id === item.formId)?.academicYear === filters.academicYear;
    const semesterMatch = filters.semester === "all" || forms.find((form) => form.id === item.formId)?.semester === filters.semester;
    const classMatch = filters.className === "all" || forms.find((form) => form.id === item.formId)?.className === filters.className;
    const styleMatch = filters.style === "all" || item.dominantStyle === filters.style;
    return academicYearMatch && semesterMatch && classMatch && styleMatch;
  }), [filters, forms, responses]);

  const saveForms = (next) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setForms(next);
  };

  const createForm = () => {
    if (!draft.title.trim() || !draft.className.trim()) {
      toast.error("يرجى إدخال اسم النموذج والصف الدراسي");
      return;
    }
    const generatedQuestions = getVarkQuestions(draft.ageGroup);
    const newForm = {
      ...draft,
      id: crypto.randomUUID(),
      title: draft.title.trim(),
      className: draft.className.trim(),
      shareToken: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      questions: generatedQuestions,
    };
    const next = [newForm, ...forms];
    saveForms(next);
    setDraft(emptyForm);
    setOpen(false);
    toast.success("تم إنشاء نموذج VARK بنجاح");
  };

  const copyLink = (form) => {
    const url = `${window.location.origin}/vark/${form.shareToken}`;
    navigator.clipboard.writeText(url);
    toast.success("تم نسخ رابط النموذج");
  };

  const toggleStatus = (formId) => {
    const next = forms.map((form) => form.id === formId ? { ...form, status: form.status === "active" ? "paused" : "active" } : form);
    saveForms(next);
  };

  const deleteForm = (formId) => {
    const next = forms.filter((form) => form.id !== formId);
    saveForms(next);
  };

  const styleOptions = [
    { value: "all", label: "الكل" },
    { value: VARK_STYLE_TYPES.visual, label: "بصري" },
    { value: VARK_STYLE_TYPES.auditory, label: "سمعي" },
    { value: VARK_STYLE_TYPES.readingWriting, label: "قرائي/كتابي" },
    { value: VARK_STYLE_TYPES.kinesthetic, label: "حركي" },
    { value: "multiple", label: "متعدد الأنماط" },
  ];

  return (
    <div dir="rtl">
      <PageHeader title="أنماط التعلم VARK" description="أنشئ نماذج جاهزة لقياس أنماط التعلم لدى الطلاب" actions={[
        <Button key="new" onClick={() => setOpen(true)} className="gap-2"><Sparkles className="h-4 w-4" /> إنشاء نموذج جديد +</Button>
      ]} />

      <div className="rounded-[28px] bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">أنماط التعلم</h2>
            <p className="mt-2 text-sm text-white/85">اكتشف كيف يتعلم طلابك بأسلوب علمي</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {[
              { label: "بصري", emoji: "👁️" },
              { label: "سمعي", emoji: "👂" },
              { label: "قرائي/كتابي", emoji: "📖" },
              { label: "حركي", emoji: "✋" },
            ].map((item) => (
              <div key={item.label} className="rounded-full bg-white/15 px-3 py-2">{item.emoji} {item.label}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="space-y-2">
          <Label>السنة الدراسية</Label>
          <Select value={filters.academicYear} onValueChange={(value) => setFilters({ ...filters, academicYear: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="1447-1448 هـ">1447-1448 هـ</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>الفصل الدراسي</Label>
          <Select value={filters.semester} onValueChange={(value) => setFilters({ ...filters, semester: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="الفصل الدراسي الأول">الفصل الدراسي الأول</SelectItem>
              <SelectItem value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>الصف الدراسي</Label>
          <Select value={filters.className} onValueChange={(value) => setFilters({ ...filters, className: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {Array.from(new Set(forms.map((item) => item.className))).filter(Boolean).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>النمط</Label>
          <Select value={filters.style} onValueChange={(value) => setFilters({ ...filters, style: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{styleOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="links" className="mt-6">
        <TabsList>
          <TabsTrigger value="links">روابط النماذج ({forms.length})</TabsTrigger>
          <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
        </TabsList>
        <TabsContent value="links" className="mt-4">
          {!filteredForms.length ? (
            <Card className="rounded-[24px] border-dashed border-border/70">
              <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                <div className="rounded-full bg-violet-100 p-4 text-violet-600"><Link2 className="h-8 w-8" /></div>
                <h3 className="text-lg font-bold">لا توجد روابط بعد</h3>
                <p className="text-sm text-muted-foreground">قم بإنشاء نموذج جديد لإنشاء رابط</p>
                <Button onClick={() => setOpen(true)} className="gap-2"><Sparkles className="h-4 w-4" /> إنشاء نموذج +</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredForms.map((form) => (
                <Card key={form.id} className="rounded-[24px] border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{form.title}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">{form.ageGroup === "adults" ? "نموذج الكبار" : "نموذج الصغار"}</p>
                      </div>
                      <Badge variant={form.status === "active" ? "default" : "secondary"}>{form.status === "active" ? "نشط" : "متوقف"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 text-sm text-muted-foreground">
                      <div>الصف: {form.className}</div>
                      <div>الفصل: {form.semester}</div>
                      <div>السنة: {form.academicYear}</div>
                      <div>عدد الاستجابات: {responses.filter((item) => item.formId === form.id).length}</div>
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 p-3">
                      <Input readOnly value={`${window.location.origin}/vark/${form.shareToken}`} />
                      <Button size="icon" onClick={() => copyLink(form)}><Copy className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" className="gap-2" onClick={() => navigate(`/vark/${form.shareToken}`)}><Eye className="h-4 w-4" /> معاينة</Button>
                      <Button variant="outline" className="gap-2" onClick={() => navigate(`/vark-stats/${form.id}`)}><BarChart3 className="h-4 w-4" /> الإحصائيات</Button>
                      <Button variant="outline" className="gap-2" onClick={() => toggleStatus(form.id)}>{form.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {form.status === "active" ? "إيقاف" : "تفعيل"}</Button>
                      <Button variant="destructive" className="gap-2" onClick={() => deleteForm(form.id)}><Trash2 className="h-4 w-4" /> حذف</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="stats" className="mt-4">
          <Card className="rounded-[24px] border-0 shadow-sm">
            <CardHeader>
              <CardTitle>الإحصائيات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-border bg-card p-4"><div className="text-sm text-muted-foreground">إجمالي المشاركين</div><div className="mt-2 text-2xl font-bold">{responses.length}</div></div>
                <div className="rounded-2xl border border-border bg-card p-4"><div className="text-sm text-muted-foreground">بصري</div><div className="mt-2 text-2xl font-bold">{responses.filter((item) => item.dominantStyle === VARK_STYLE_TYPES.visual).length}</div></div>
                <div className="rounded-2xl border border-border bg-card p-4"><div className="text-sm text-muted-foreground">سمعي</div><div className="mt-2 text-2xl font-bold">{responses.filter((item) => item.dominantStyle === VARK_STYLE_TYPES.auditory).length}</div></div>
                <div className="rounded-2xl border border-border bg-card p-4"><div className="text-sm text-muted-foreground">متعدد الأنماط</div><div className="mt-2 text-2xl font-bold">{responses.filter((item) => item.dominantStyle === "multiple").length}</div></div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full rounded-2xl border border-border">
                  <thead>
                    <tr className="bg-muted/50 text-right">
                      <th className="p-3">الطالب</th>
                      <th className="p-3">النموذج</th>
                      <th className="p-3">الصف</th>
                      <th className="p-3">النمط</th>
                      <th className="p-3">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResponses.map((item) => (
                      <tr key={item.studentName + item.createdAt} className="border-t border-border">
                        <td className="p-3">{item.studentName}</td>
                        <td className="p-3">{forms.find((form) => form.id === item.formId)?.title || "—"}</td>
                        <td className="p-3">{item.className}</td>
                        <td className="p-3">{item.dominantStyle === "multiple" ? "متعدد الأنماط" : item.dominantStyle}</td>
                        <td className="p-3">{new Date(item.createdAt).toLocaleDateString("ar-SA")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إنشاء نموذج جديد</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>السنة الدراسية</Label>
              <Input value={draft.academicYear} onChange={(e) => setDraft({ ...draft, academicYear: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>الفصل الدراسي</Label>
              <Select value={draft.semester} onValueChange={(value) => setDraft({ ...draft, semester: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="الفصل الدراسي الأول">الفصل الدراسي الأول</SelectItem>
                  <SelectItem value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اسم النموذج</Label>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="مثال: الأول ثانوي" />
            </div>
            <div className="space-y-2">
              <Label>الصف الدراسي</Label>
              <Input value={draft.className} onChange={(e) => setDraft({ ...draft, className: e.target.value })} placeholder="مثال: الثالث ثانوي" />
            </div>
            <div className="space-y-2">
              <Label>الفئة العمرية</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {Object.values(AGE_GROUPS).map((group) => (
                  <button key={group.key} type="button" onClick={() => setDraft({ ...draft, ageGroup: group.key })} className={`rounded-2xl border p-3 text-right ${draft.ageGroup === group.key ? "border-primary bg-primary/10" : "border-border"}`}>
                    <div className="font-bold">{group.label}</div>
                    <div className="text-sm text-muted-foreground">{group.subtitle}</div>
                    <div className="mt-1 text-xs text-muted-foreground">16 سؤالًا</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={createForm}>إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
