import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { scopeTeachersBySchool, scopeBySchool, canManageTeachers, canViewTeachers, ministryNumber, getSpecializations, SUBJECT_SPECIALIZATIONS } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Pencil, Trash2, ShieldAlert, ChevronLeft, FileText, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import TeacherCard from "@/components/teachers/TeacherCard";
import TeacherFilters from "@/components/teachers/TeacherFilters";
import AllTeachersReport from "@/components/teachers/AllTeachersReport";
import { calcAllTeachersStats } from "@/utils/teachersReport";
import { toast } from "sonner";

const GRADE_LEVELS = ["ابتدائي", "متوسط", "ثانوي"];

export default function Teachers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", employee_number: "", specialization: [], grade_level: "" });
  const [reportOpen, setReportOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // filters
  const [search, setSearch] = useState("");
  const [specialization, setSpecialization] = useState("all");
  const [gradeLevel, setGradeLevel] = useState("all");
  const [accountStatus, setAccountStatus] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const canManage = canManageTeachers(me);
  const canView = canViewTeachers(me);

  const { data: teachers = [], isLoading } = useQuery({ queryKey: ["teachers"], queryFn: () => base44.entities.Teacher.list() });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: grades = [] } = useQuery({ queryKey: ["grades"], queryFn: () => base44.entities.Grade.list() });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: attendance = [] } = useQuery({ queryKey: ["attendance"], queryFn: () => base44.entities.Attendance.list() });
  const { data: schoolArr = [] } = useQuery({ queryKey: ["school-info"], queryFn: () => base44.entities.SchoolInfo.list().catch(() => []) });

  // توحيد التصفية مع لوحة المدير: استخدام البيانات المُصفّاة حسب المدرسة (school_id / الرقم الوزاري)
  // حتى تتطابق أعداد المواد/الطلاب/المتوسط مع ما يظهر في لوحة مدير المدرسة.
  const scopedTeachers = useMemo(() => scopeTeachersBySchool(teachers, me), [teachers, me]);
  const scopedSubjects = useMemo(() => scopeBySchool(subjects, me), [subjects, me]);
  const scopedGrades = useMemo(() => scopeBySchool(grades, me), [grades, me]);
  const scopedAttendance = useMemo(() => scopeBySchool(attendance, me), [attendance, me]);
  const allStats = useMemo(() => calcAllTeachersStats(scopedTeachers, scopedSubjects, scopedGrades, scopedAttendance), [scopedTeachers, scopedSubjects, scopedGrades, scopedAttendance]);

  const specializations = useMemo(() => {
    const set = new Set();
    scopedTeachers.forEach((t) => { getSpecializations(t).forEach((sp) => set.add(sp)); });
    return [...set].sort();
  }, [scopedTeachers]);

  const gradeLevels = useMemo(() => {
    const set = new Set();
    scopedTeachers.forEach((t) => { if (t.grade_level) set.add(t.grade_level); });
    return [...set].sort();
  }, [scopedTeachers]);

  const filtered = useMemo(() => {
    let result = scopedTeachers.map((t) => ({ teacher: t, stats: allStats.find((s) => s.teacher.id === t.id) }));

    const q = search.trim();
    if (q) result = result.filter(({ teacher }) => (teacher.name || "").includes(q));

    if (specialization !== "all") result = result.filter(({ teacher }) => teacher.specialization === specialization);
    if (gradeLevel !== "all") result = result.filter(({ teacher }) => teacher.grade_level === gradeLevel);
    if (accountStatus !== "all") result = result.filter(({ teacher }) => (accountStatus === "linked" ? !!teacher.user_id : !teacher.user_id));
    if (subjectFilter !== "all") {
      const teacherIds = new Set(scopedSubjects.filter((s) => s.id === subjectFilter).map((s) => s.teacher_id));
      result = result.filter(({ teacher }) => teacherIds.has(teacher.id));
    }

    const dir = sortDir === "asc" ? 1 : -1;
    result.sort((a, b) => {
      let av, bv;
      if (sortBy === "name") { av = a.teacher.name || ""; bv = b.teacher.name || ""; return av.localeCompare(bv) * dir; }
      if (sortBy === "avg") { av = a.stats?.avg || 0; bv = b.stats?.avg || 0; }
      else if (sortBy === "students") { av = a.stats?.studentCount || 0; bv = b.stats?.studentCount || 0; }
      else if (sortBy === "subjects") { av = a.stats?.subjectCount || 0; bv = b.stats?.subjectCount || 0; }
      return (av - bv) * dir;
    });

    return result;
  }, [scopedTeachers, allStats, search, specialization, gradeLevel, accountStatus, subjectFilter, sortBy, sortDir, scopedSubjects]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Teacher.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); closeDialog(); toast.success("تم إضافة المعلم"); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Teacher.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); closeDialog(); toast.success("تم تحديث بيانات المعلم"); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Teacher.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); toast.success("تم حذف المعلم"); },
  });

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm({ name: "", phone: "", email: "", employee_number: "", specialization: [], grade_level: "" }); };
  const openEdit = (teacher) => {
    setEditing(teacher);
    setForm({ name: teacher.name, phone: teacher.phone || "", email: teacher.email || "", employee_number: teacher.employee_number || "", specialization: getSpecializations(teacher), grade_level: teacher.grade_level || "" });
    setDialogOpen(true);
  };
  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editing) { updateMutation.mutate({ id: editing.id, data: form }); }
    else {
      const payload = { ...form };
      if (me?.ministry_number) payload.ministry_number = me.ministry_number;
      createMutation.mutate(payload);
    }
  };

  if (me && !canView) {
    return (
      <div className="max-w-md mx-auto py-20 text-center px-4">
        <ShieldAlert className="w-14 h-14 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold">لا تملك صلاحية الوصول</h2>
        <p className="text-muted-foreground mt-2">هذه الصفحة مخصصة لمدير المدرسة والإدارة الإشرافية فقط.</p>
        <Button variant="ghost" className="mt-6 gap-1" onClick={() => navigate("/")}><ChevronLeft className="w-4 h-4" /> رجوع</Button>
      </div>
    );
  }

  const school = schoolArr[0] || {};

  return (
    <div>
      <PageHeader
        title="المعلمون"
        description={me?.school_name ? `${me.school_name} — رقم وزاري: ${ministryNumber(me)}` : "متابعة المعلمين المرتبطين بنفس الرقم الوزاري"}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" className="gap-2" onClick={() => setReportOpen(true)} disabled={!scopedTeachers.length}>
              <FileText className="h-4 w-4" /> تقرير شامل للمعلمين
            </Button>
            {canManage && (
              <Button className="gap-2" onClick={() => { setEditing(null); setForm({ name: "", phone: "", email: "", employee_number: "", specialization: [], grade_level: "" }); setDialogOpen(true); }}>
                <Plus className="h-4 w-4" /> إضافة معلم
              </Button>
            )}
          </div>
        }
      />

      {scopedTeachers.length > 0 && (
        <div className="mb-5">
          <TeacherFilters
            search={search} setSearch={setSearch}
            specialization={specialization} setSpecialization={setSpecialization}
            gradeLevel={gradeLevel} setGradeLevel={setGradeLevel}
            accountStatus={accountStatus} setAccountStatus={setAccountStatus}
            subjectFilter={subjectFilter} setSubjectFilter={setSubjectFilter}
            sortBy={sortBy} setSortBy={setSortBy}
            sortDir={sortDir} setSortDir={setSortDir}
            specializations={specializations}
            gradeLevels={gradeLevels}
            subjects={scopedSubjects}
          />
        </div>
      )}

      {filtered.length === 0 && !isLoading ? (
        <EmptyState
          icon={Users}
          title="لا يوجد معلمون"
          description={canManage ? "ابدأ بإضافة معلم جديد أو سيُربط المعلمون تلقائيًا عند تسجيلهم بنفس الرقم الوزاري" : "سيظهر المعلمون هنا تلقائيًا عند تسجيلهم بنفس الرقم الوزاري للمدرسة"}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(({ teacher, stats }) => (
            <div key={teacher.id} className="relative group">
              <TeacherCard teacher={teacher} stats={stats} onClick={() => navigate(`/teacher-detail?id=${teacher.id}`)} />
              {canManage && (
                <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Button variant="ghost" size="icon" className="h-8 w-8 bg-card shadow-sm" onClick={(e) => { e.stopPropagation(); openEdit(teacher); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 bg-card shadow-sm" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(teacher.id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AllTeachersReport open={reportOpen} onOpenChange={setReportOpen} teachers={scopedTeachers} stats={allStats} school={school} />

      {canManage && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "تعديل المعلم" : "إضافة معلم جديد"}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div><Label>اسم المعلم *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم المعلم الكامل" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>رقم الموظف</Label><Input value={form.employee_number} onChange={(e) => setForm({ ...form, employee_number: e.target.value })} placeholder="رقم الموظف" /></div>
                <div>
                  <Label>المرحلة الدراسية</Label>
                  <Select value={form.grade_level} onValueChange={(v) => setForm({ ...form, grade_level: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر المرحلة" /></SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVELS.map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>التخصصات (اختر مادة واحدة أو أكثر)</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {SUBJECT_SPECIALIZATIONS.map((sp) => (
                    <label
                      key={sp}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-sm ${form.specialization.includes(sp) ? "border-primary bg-primary/5 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/40"}`}
                    >
                      <input
                        type="checkbox"
                        checked={form.specialization.includes(sp)}
                        onChange={() => {
                          const next = form.specialization.includes(sp)
                            ? form.specialization.filter((s) => s !== sp)
                            : [...form.specialization, sp];
                          setForm({ ...form, specialization: next });
                        }}
                        className="h-4 w-4"
                      />
                      <span>{sp}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>رقم الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05xxxxxxxx" /></div>
                <div><Label>البريد الإلكتروني</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@email.com" /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
              <Button onClick={handleSubmit} disabled={!form.name.trim()}>حفظ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}