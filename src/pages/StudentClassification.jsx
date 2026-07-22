import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Ear, Eye, BookOpen, Footprints, Search, Printer } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import {
  groupClassesByGrade, gradeSections, sectionOptionLabel, resolveClassIds, ALL_SECTIONS,
} from "@/lib/classSections";
import { canManageAcademicData } from "@/lib/permissions";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

const STYLES = [
  { id: "auditory", label: "سمعي", icon: Ear, theme: "bg-purple-50 text-purple-600" },
  { id: "visual", label: "بصري", icon: Eye, theme: "bg-sky-50 text-sky-600" },
  { id: "read_write", label: "قرائي كتابي", icon: BookOpen, theme: "bg-orange-50 text-orange-600" },
  { id: "kinesthetic", label: "حركي", icon: Footprints, theme: "bg-emerald-50 text-emerald-600" },
];

const SEMESTERS = [
  { id: "first", label: "الفصل الأول" },
  { id: "second", label: "الفصل الثاني" },
];

function StudentClassificationContent() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const [year, setYear] = useState("");
  const [gradeName, setGradeName] = useState("");
  const [classId, setClassId] = useState("");
  const [semester, setSemester] = useState("first");
  const [applied, setApplied] = useState(null);

  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });

  const years = useMemo(
    () => [...new Set(classes.map((c) => c.academic_year).filter(Boolean))].sort().reverse(),
    [classes]
  );
  const yearClasses = useMemo(() => (year ? classes.filter((c) => c.academic_year === year) : classes), [classes, year]);
  const grades = useMemo(() => groupClassesByGrade(yearClasses), [yearClasses]);
  const sections = useMemo(() => (gradeName ? gradeSections(yearClasses, gradeName) : []), [yearClasses, gradeName]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Student.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
    onError: () => toast.error("تعذّر تحديث التصنيف"),
  });

  const setStyle = (student, styleId) => {
    const next = student.learning_style === styleId ? null : styleId;
    updateMutation.mutate({ id: student.id, data: { learning_style: next } });
  };

  const doSearch = () => setApplied({ year, gradeName, classId, semester });

  const { ids } = useMemo(() => {
    if (!applied) return { ids: [] };
    const scoped = applied.year ? classes.filter((c) => c.academic_year === applied.year) : classes;
    const resolved = applied.gradeName ? resolveClassIds(scoped, applied.gradeName, applied.classId) : scoped.map((c) => c.id);
    return { ids: resolved };
  }, [applied, classes]);

  const filtered = useMemo(
    () => (applied ? students.filter((s) => ids.includes(s.class_id) && (s.semester || "first") === applied.semester) : []),
    [students, ids, applied]
  );

  const counts = useMemo(() => {
    const c = { auditory: 0, visual: 0, read_write: 0, kinesthetic: 0 };
    filtered.forEach((s) => { if (s.learning_style && c[s.learning_style] !== undefined) c[s.learning_style] += 1; });
    return c;
  }, [filtered]);

  const classLabel = applied
    ? applied.classId && applied.classId !== ALL_SECTIONS
      ? classes.find((c) => c.id === applied.classId)?.name || "—"
      : applied.gradeName || "جميع الصفوف"
    : "";

  const styleLabel = (id) => (id ? STYLES.find((s) => s.id === id)?.label || "غير مصنّف" : "غير مصنّف");
  const semLabel = SEMESTERS.find((s) => s.id === (applied?.semester || semester))?.label || "";

  return (
    <div>
      {/* عنوان الصفحة */}
      <div className="flex items-center justify-between gap-3 mb-5 no-print">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Brain className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">تصنيف الطلاب</h1>
            <p className="text-sm text-muted-foreground">تحديد نمط التعلم لكل طالب (بصري / سمعي / حركي / قرائي كتابي)</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => window.print()}
          disabled={!applied || filtered.length === 0}
          className="gap-2 shrink-0"
        >
          <Printer className="h-4 w-4" /> طباعة
        </Button>
      </div>

      {/* بطاقة فلتر البحث */}
      <Card className="p-5 mb-6 no-print">
        <h3 className="font-bold mb-4">فلتر البحث</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>السنة الدراسية</Label>
            <Select
              value={year || "__all__"}
              onValueChange={(v) => { setYear(v === "__all__" ? "" : v); setGradeName(""); setClassId(""); }}
            >
              <SelectTrigger><SelectValue placeholder="اختر السنة الدراسية" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">جميع السنوات</SelectItem>
                {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>الصف الدراسي</Label>
            <Select
              value={gradeName || "__all__"}
              onValueChange={(v) => { setGradeName(v === "__all__" ? "" : v); setClassId(""); }}
            >
              <SelectTrigger><SelectValue placeholder="اختر الصف الدراسي" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">جميع الصفوف</SelectItem>
                {grades.map((g) => <SelectItem key={g.gradeName} value={g.gradeName}>{g.gradeName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>الشعبة</Label>
            <Select value={classId || ""} disabled={!gradeName} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="اختر الشعبة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SECTIONS}>الكل</SelectItem>
                {sections.map((c) => <SelectItem key={c.id} value={c.id}>{sectionOptionLabel(c)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>الفصل الدراسي</Label>
            <div className="flex gap-2">
              {SEMESTERS.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSemester(s.id)}
                  className={cn(
                    "flex-1 h-9 rounded-md border text-sm font-medium transition-colors",
                    semester === s.id
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "border-input text-muted-foreground hover:bg-muted"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button onClick={doSearch} className="w-full mt-4 gap-2">
          <Search className="h-4 w-4" /> بحث عن الطلاب
        </Button>
      </Card>

      {/* بطاقات الإحصاءات */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 no-print">
        {STYLES.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.id} className="p-4 flex flex-col items-center text-center">
              <span className={cn("h-12 w-12 rounded-2xl flex items-center justify-center mb-2", s.theme)}>
                <Icon className="h-6 w-6" />
              </span>
              <p className="text-2xl font-bold text-foreground">{counts[s.id] || 0}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </Card>
          );
        })}
      </div>

      {/* قائمة الطلاب وتصنيفهم */}
      {applied === null ? (
        <EmptyState
          icon={Search}
          title="ابدأ البحث"
          description="اختر السنة والصف والفصل الدراسي ثم اضغط «بحث عن الطلاب» لعرض الطلاب وتصنيفهم"
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Brain} title="لا يوجد طلاب" description="لا توجد طلاب مطابقون للفلتر المحدد" />
      ) : (
        <Card className="no-print">
          <div className="p-4 border-b">
            <h3 className="font-bold">{classLabel} — {filtered.length} طالب</h3>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((st, i) => (
              <div key={st.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground text-sm w-6 shrink-0">{i + 1}</span>
                  <span className="font-medium truncate">{st.name}</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {STYLES.map((s) => {
                    const Icon = s.icon;
                    const active = st.learning_style === s.id;
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setStyle(st, s.id)}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                          active ? cn(s.theme, "border-transparent") : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" /> {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* قسم الطباعة */}
      {applied && filtered.length > 0 && (
        <div className="hidden print:block">
          <h1 className="text-lg font-bold mb-1">تصنيف الطلاب — {classLabel}</h1>
          <p className="text-xs mb-2">
            السنة الدراسية: {applied.year || "الكل"} | الفصل الدراسي: {semLabel} | عدد الطلاب: {filtered.length}
          </p>
          <p className="text-xs mb-3">
            سمعي: {counts.auditory} | بصري: {counts.visual} | قرائي كتابي: {counts.read_write} | حركي: {counts.kinesthetic}
          </p>
          <table className="print-table w-full border border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-400">#</th>
                <th className="border border-gray-400">اسم الطالب</th>
                <th className="border border-gray-400">رقم الطالب</th>
                <th className="border border-gray-400">نمط التعلم</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((st, i) => (
                <tr key={st.id}>
                  <td className="border border-gray-400">{i + 1}</td>
                  <td className="border border-gray-400">{st.name}</td>
                  <td className="border border-gray-400">{st.student_number || "—"}</td>
                  <td className="border border-gray-400">{styleLabel(st.learning_style)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function StudentClassification() {
  const { user } = useAuth();
  if (user && !canManageAcademicData(user)) {
    return <Navigate to="/" replace />;
  }
  return <StudentClassificationContent />;
}