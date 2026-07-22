import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Brain, RotateCcw, Users, FileDown, Pencil, Trash2, Loader2 } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { canManageAcademicData, ministryNumber, resolveSchool, reportSourceInfo } from "@/lib/permissions";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { exportPlanPDF } from "@/utils/planReport";

const TYPES = [
  { id: "remedial", label: "علاجية", color: "bg-rose-50 text-rose-600 border-rose-200" },
  { id: "enrichment", label: "إثرائية", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
];
const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.id, t.label]));
const STATUSES = [
  { id: "draft", label: "مسودة" },
  { id: "active", label: "قيد التنفيذ" },
  { id: "completed", label: "مكتملة" },
];
const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]));
const STATUS_TONE = {
  draft: "bg-muted text-muted-foreground border-border",
  active: "bg-blue-50 text-blue-600 border-blue-200",
  completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
};
const SEMESTERS = [
  { id: "all", label: "كل الفصول" },
  { id: "first", label: "الفصل الأول" },
  { id: "second", label: "الفصل الثاني" },
];

function RemedialPlansContent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const mn = ministryNumber(user) || "";

  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("all");
  const [classId, setClassId] = useState("");
  const [selected, setSelected] = useState([]);
  const [viewedId, setViewedId] = useState(null);

  const [planDialog, setPlanDialog] = useState(false);
  const [aiDialog, setAiDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ student_id: "", type: "remedial", title: "", content: "", status: "draft", date: "" });
  const [aiForm, setAiForm] = useState({ student_id: "", type: "remedial", focus: "", title: "", content: "" });
  const [generating, setGenerating] = useState(false);
  const [exportingId, setExportingId] = useState(null);

  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: plans = [] } = useQuery({ queryKey: ["plans"], queryFn: () => base44.entities.Plan.list() });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const { data: schoolArr = [] } = useQuery({ queryKey: ["schoolInfo"], queryFn: () => base44.entities.SchoolInfo.list().catch(() => []) });

  const years = useMemo(() => [...new Set(classes.map((c) => c.academic_year).filter(Boolean))].sort().reverse(), [classes]);
  const yearClasses = useMemo(() => (year ? classes.filter((c) => c.academic_year === year) : classes), [classes, year]);

  const scopedClassIds = useMemo(() => yearClasses.map((c) => c.id), [yearClasses]);
  const filteredStudents = useMemo(
    () => students
      .filter((s) => (classId ? s.class_id === classId : scopedClassIds.includes(s.class_id)))
      .filter((s) => semester === "all" || (s.semester || "first") === semester)
      .sort((a, b) => a.name.localeCompare(b.name, "ar")),
    [students, classId, scopedClassIds, semester]
  );

  const classOf = (id) => classes.find((c) => c.id === id);
  const studentOptions = filteredStudents.length ? filteredStudents : students;
  const viewedStudent = viewedId ? students.find((s) => s.id === viewedId) : null;
  const studentPlans = useMemo(() => plans.filter((p) => p.student_id === viewedId), [plans, viewedId]);

  const allSelected = filteredStudents.length > 0 && filteredStudents.every((s) => selected.includes(s.id));

  const toggleAll = () => setSelected(allSelected ? [] : filteredStudents.map((s) => s.id));
  const toggleOne = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const resetFilters = () => { setYear(""); setSemester("all"); setClassId(""); setSelected([]); setViewedId(null); };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Plan.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); toast.success("تم حفظ الخطة"); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Plan.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); toast.success("تم تحديث الخطة"); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Plan.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); toast.success("تم حذف الخطة"); },
  });

  const openNewPlan = () => {
    setEditing(null);
    setForm({ student_id: viewedId || selected[0] || "", type: "remedial", title: "", content: "", status: "draft", date: new Date().toISOString().slice(0, 10) });
    setPlanDialog(true);
  };
  const openEdit = (plan) => {
    setEditing(plan);
    setForm({ student_id: plan.student_id, type: plan.type, title: plan.title, content: plan.content || "", status: plan.status || "draft", date: plan.date || "" });
    setPlanDialog(true);
  };
  const openAi = () => {
    setAiForm({ student_id: viewedId || selected[0] || "", type: "remedial", focus: "", title: "", content: "" });
    setAiDialog(true);
  };

  const buildPlanData = (f) => {
    const student = students.find((s) => s.id === f.student_id);
    return {
      student_id: f.student_id,
      class_id: student?.class_id || "",
      type: f.type,
      title: f.title.trim(),
      content: f.content,
      status: f.status || "draft",
      date: f.date || new Date().toISOString().slice(0, 10),
      semester: student?.semester || "first",
      ministry_number: mn,
    };
  };

  const handleSavePlan = () => {
    if (!form.student_id || !form.title.trim()) return;
    if (editing) updateMutation.mutate({ id: editing.id, data: buildPlanData(form) });
    else createMutation.mutate(buildPlanData(form));
    setPlanDialog(false);
  };

  const handleGenerate = async () => {
    if (!aiForm.student_id || !aiForm.focus.trim()) return;
    setGenerating(true);
    try {
      const student = students.find((s) => s.id === aiForm.student_id);
      const cls = classOf(student?.class_id);
      const prompt = `أنت خبير في المناهج السعودية. اكتب خطة ${TYPE_LABEL[aiForm.type]} مفصّلة لطالب اسمه ${student?.name || ""} في صف ${cls?.name || ""}.\nالهدف/المجال: ${aiForm.focus}.\nاجعل الخطة عملية وقابلة للتنفيذ، تتضمن: الأهداف، الإجراءات والخطوات، الإطار الزمني، مؤشرات النجاح والتقييم.\nأعد النتيجة JSON: ضع عنوان الخطة في الحقل "title"، والتفاصيل الكاملة المنسّقة في الحقل "content".`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: { type: "object", properties: { title: { type: "string" }, content: { type: "string" } } },
      });
      setAiForm((f) => ({ ...f, title: res.title || "", content: res.content || "" }));
      toast.success("تم توليد الخطة");
    } catch {
      toast.error("تعذّر توليد الخطة");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAi = () => {
    if (!aiForm.student_id || !aiForm.title.trim()) return;
    createMutation.mutate(buildPlanData(aiForm));
    setAiDialog(false);
  };

  const handleExport = async (plan) => {
    const student = students.find((s) => s.id === plan.student_id);
    const school = resolveSchool(me, schoolArr[0] || {});
    const source = reportSourceInfo(me, school);
    setExportingId(plan.id);
    try {
      await exportPlanPDF({ plan, student, cls: classOf(plan.class_id), school, source }, `خطة-${student?.name || "طالب"}.pdf`);
      toast.success("تم تصدير الخطة");
    } catch {
      toast.error("تعذّر تصدير الخطة");
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div>
      {/* الترويسة */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">الخطط العلاجية والإثرائية</h1>
          <p className="text-sm text-muted-foreground">اختر فصلاً وطلاباً لإدارة خططهم</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openAi} className="gap-2">
            <Brain className="h-4 w-4" /> توليد بالذكاء الاصطناعي
          </Button>
          <Button onClick={openNewPlan} className="gap-2">
            <Plus className="h-4 w-4" /> خطة جديدة
          </Button>
        </div>
      </div>

      {/* تصفية البيانات */}
      <Card className="p-4 mb-4">
        <h3 className="font-bold mb-3">تصفية البيانات</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>السنة الدراسية</Label>
            <Select value={year || "__all__"} onValueChange={(v) => { setYear(v === "__all__" ? "" : v); setClassId(""); }}>
              <SelectTrigger><SelectValue placeholder="اختر السنة الدراسية" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">كل السنوات</SelectItem>
                {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>الفصل الدراسي</Label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEMESTERS.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>الصف الدراسي</Label>
            <div className="flex gap-2">
              <Select value={classId || "__all__"} onValueChange={(v) => setClassId(v === "__all__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="اختر الصف/الشعبة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">كل الصفوف</SelectItem>
                  {yearClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={resetFilters}
                className="shrink-0 rounded-full border-orange-300 text-orange-500 hover:bg-orange-50 hover:text-orange-600"
                title="إعادة تعيين"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* اختيار الطلاب */}
      <Card className="p-4 mb-4 border-teal-600/40">
        <div className="flex items-center gap-2 text-teal-700 font-bold mb-3">
          <Users className="h-5 w-5" /> الطلاب ({filteredStudents.length})
        </div>
        <label className="flex items-center gap-2 mb-3 text-teal-700 font-medium cursor-pointer">
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
          تحديد الكل
        </label>
        <div className="divide-y divide-border">
          {filteredStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">لا يوجد طلاب مطابقون للتصفية</p>
          ) : filteredStudents.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggleOne(s.id)} />
                <span className="font-medium text-foreground">{s.name}</span>
              </label>
              <button
                onClick={() => setViewedId(s.id)}
                className={cn("text-sm font-medium hover:underline", viewedId === s.id ? "text-teal-800" : "text-teal-600")}
              >
                عرض
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* خطط الطالب */}
      {viewedStudent ? (
        <>
          <p className="text-teal-700 font-bold mb-3">خطط الطالب: {viewedStudent.name}</p>
          {studentPlans.length === 0 ? (
            <EmptyState icon={Plus} title="لا توجد خطط" description="ابدأ بإضافة خطة علاجية أو إثرائية لهذا الطالب" />
          ) : (
            <div className="space-y-3">
              {studentPlans.map((p) => {
                const t = TYPES.find((x) => x.id === p.type) || TYPES[0];
                return (
                  <Card key={p.id} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", t.color)}>{t.label}</span>
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", STATUS_TONE[p.status] || STATUS_TONE.draft)}>
                            {STATUS_LABEL[p.status] || "مسودة"}
                          </span>
                          {p.date && <span className="text-xs text-muted-foreground">{p.date}</span>}
                        </div>
                        <h4 className="font-bold text-foreground">{p.title}</h4>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleExport(p)} disabled={exportingId === p.id} title="تصدير PDF">
                          {exportingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="تعديل"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)} title="حذف"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                    {p.content && <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2 leading-7">{p.content}</p>}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <EmptyState icon={Users} title="اختر طالباً" description="اضغط «عرض» بجانب أي طالب لعرض خططه وإدارتها" />
      )}

      {/* حوار الخطة */}
      <Dialog open={planDialog} onOpenChange={setPlanDialog}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الخطة" : "خطة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>الطالب *</Label>
              <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                <SelectContent>
                  {studentOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>نوع الخطة *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>عنوان الخطة *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: خطة علاجية في مهارات الكتابة" />
            </div>
            <div className="space-y-1.5">
              <Label>تاريخ الخطة</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>تفاصيل الخطة</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="الأهداف، الإجراءات، الإطار الزمني، مؤشرات النجاح..." className="min-h-[140px] leading-7" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialog(false)}>إلغاء</Button>
            <Button onClick={handleSavePlan} disabled={!form.student_id || !form.title.trim()}>حفظ الخطة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار التوليد بالذكاء الاصطناعي */}
      <Dialog open={aiDialog} onOpenChange={setAiDialog}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> توليد خطة بالذكاء الاصطناعي</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>الطالب *</Label>
                <Select value={aiForm.student_id} onValueChange={(v) => setAiForm({ ...aiForm, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                  <SelectContent>
                    {studentOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>نوع الخطة *</Label>
                <Select value={aiForm.type} onValueChange={(v) => setAiForm({ ...aiForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>الهدف / المجال *</Label>
              <Textarea value={aiForm.focus} onChange={(e) => setAiForm({ ...aiForm, focus: e.target.value })} placeholder="مثال: ضعف في مهارات حل المسائل الرياضية، أو إثراء في مهارات القراءة الإبداعية" className="min-h-[80px]" />
            </div>
            <Button onClick={handleGenerate} disabled={generating || !aiForm.student_id || !aiForm.focus.trim()} className="w-full gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              {generating ? "جاري التوليد..." : "توليد الخطة"}
            </Button>
            {(aiForm.title || aiForm.content) && (
              <>
                <div className="space-y-1.5">
                  <Label>عنوان الخطة</Label>
                  <Input value={aiForm.title} onChange={(e) => setAiForm({ ...aiForm, title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>تفاصيل الخطة (قابلة للتعديل)</Label>
                  <Textarea value={aiForm.content} onChange={(e) => setAiForm({ ...aiForm, content: e.target.value })} className="min-h-[160px] leading-7" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialog(false)}>إلغاء</Button>
            <Button onClick={handleSaveAi} disabled={!aiForm.student_id || !aiForm.title.trim()}>حفظ الخطة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RemedialPlans() {
  const { user } = useAuth();
  if (user && !canManageAcademicData(user)) {
    return <Navigate to="/" replace />;
  }
  return <RemedialPlansContent />;
}