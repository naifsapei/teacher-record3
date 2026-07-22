import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Plus, Search, LayoutGrid, List, UserCircle } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import SubjectCard from "@/components/subjects/SubjectCard";
import SubjectDialog from "@/components/subjects/SubjectDialog";
import TeacherSubjectsPanel from "@/components/subjects/TeacherSubjectsPanel";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { isTeacher, canAddSubject, canManageAcademicData } from "@/lib/permissions";
import { useCurrentTeacher } from "@/hooks/useCurrentTeacher";
import { ministryNumber } from "@/lib/permissions";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

const DEFAULT_FORM = {
  name: "",
  class_id: "",
  teacher_id: "",
  semester: "first",
  participation_max: "",
  homework_max: "",
  class_activity_max: "",
  research_max: "",
  written_exam_max: "",
  practical_exam_max: "",
};

function SubjectsContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [view, setView] = useState("grid");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTeacher } = useCurrentTeacher();
  const isTeacherMode = isTeacher(user) && !!currentTeacher;

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => base44.entities.Subject.list(),
  });
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: () => base44.entities.Class.list(),
  });
  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => base44.entities.Teacher.list(),
  });
  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Subject.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      closeDialog();
      toast.success("تم إضافة المادة بنجاح");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Subject.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      closeDialog();
      toast.success("تم تحديث المادة بنجاح");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Subject.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("تم حذف المادة");
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm({ ...DEFAULT_FORM });
  };

  const openEdit = (sub) => {
    setEditing(sub);
    setForm({
      name: sub.name,
      class_id: sub.class_id || "",
      teacher_id: sub.teacher_id || "",
      semester: sub.semester || "first",
      participation_max: sub.participation_max ?? "",
      homework_max: sub.homework_max ?? "",
      class_activity_max: sub.class_activity_max ?? "",
      research_max: sub.research_max ?? "",
      written_exam_max: sub.written_exam_max ?? "",
      practical_exam_max: sub.practical_exam_max ?? "",
    });
    setDialogOpen(true);
  };

  const openAdd = () => {
    if (!canAddSubject(user, subjects.length)) {
      toast.error("الخطة المجانية تسمح بإضافة مادة واحدة فقط", {
        description: "اشترك الآن لإضافة مواد دراسية غير محدودة.",
      });
      navigate("/subscription");
      return;
    }
    setEditing(null);
    setForm({ ...DEFAULT_FORM, teacher_id: isTeacherMode ? currentTeacher.id : "" });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.class_id) return;
    const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
    const payload = {
      ...form,
      ministry_number: ministryNumber(user) || "",
      participation_max: numOrNull(form.participation_max),
      homework_max: numOrNull(form.homework_max),
      class_activity_max: numOrNull(form.class_activity_max),
      research_max: numOrNull(form.research_max),
      written_exam_max: numOrNull(form.written_exam_max),
      practical_exam_max: numOrNull(form.practical_exam_max),
    };
    if (isTeacherMode) payload.teacher_id = currentTeacher.id;
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const schoolTeachers = useMemo(() => {
    const mn = ministryNumber(user);
    if (!mn) return teachers;
    return teachers.filter((t) => (t.ministry_number || "") === mn);
  }, [teachers, user]);

  const getClassName = (id) => classes.find((c) => c.id === id)?.name || "";
  const getTeacherName = (id) => teachers.find((t) => t.id === id)?.name || "";
  const getStudentsCount = (classId) => students.filter((s) => s.class_id === classId).length;

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      if (isTeacherMode && s.teacher_id !== currentTeacher.id) return false;
      const matchSearch = !search || s.name.includes(search);
      const matchClass = filterClass === "all" || s.class_id === filterClass;
      const matchTeacher =
        filterTeacher === "all" ||
        (filterTeacher === "none" ? !s.teacher_id : s.teacher_id === filterTeacher);
      return matchSearch && matchClass && matchTeacher;
    });
  }, [subjects, search, filterClass, filterTeacher, isTeacherMode, currentTeacher]);

  // Stats
  const assignedCount = subjects.filter((s) => s.teacher_id).length;
  const unassignedCount = subjects.filter((s) => !s.teacher_id).length;

  return (
    <div>
      <PageHeader
        title="المواد الدراسية"
        description="إدارة المواد وتخصيصها للمعلمين والصفوف"
        actions={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة مادة
          </Button>
        }
      />

      {/* Stats bar */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 text-sm">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">إجمالي المواد:</span>
            <span className="font-bold">{subjects.length}</span>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 text-sm">
            <UserCircle className="h-4 w-4 text-chart-4" />
            <span className="text-muted-foreground">مُعيَّنة لمعلم:</span>
            <span className="font-bold text-chart-4">{assignedCount}</span>
          </div>
          {unassignedCount > 0 && (
            <div className="flex items-center gap-2 bg-card border border-dashed border-border rounded-xl px-4 py-2 text-sm">
              <UserCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">بدون معلم:</span>
              <Badge variant="destructive" className="text-xs px-1.5">{unassignedCount}</Badge>
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="subjects">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <TabsList className="shrink-0">
            <TabsTrigger value="subjects" className="gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              المواد
            </TabsTrigger>
            <TabsTrigger value="by-teacher" className="gap-1.5">
              <UserCircle className="h-3.5 w-3.5" />
              حسب المعلم
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-1 flex-wrap gap-2">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم..."
                className="pr-10"
              />
            </div>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الصف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الصفوف</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isTeacherMode && (
              <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="المعلم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المعلمين</SelectItem>
                  <SelectItem value="none">بدون معلم</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setView("grid")}
                className={`p-2 transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-2 transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <TabsContent value="subjects">
          {filteredSubjects.length === 0 && !isLoading ? (
            <EmptyState
              icon={GraduationCap}
              title={subjects.length === 0 ? "لا توجد مواد" : "لا توجد نتائج"}
              description={
                subjects.length === 0
                  ? "أضف مادة دراسية وحدد الصف والمعلم المختص"
                  : "جرّب تغيير معايير البحث أو الفلتر"
              }
              action={
                subjects.length === 0 && (
                  <Button onClick={openAdd} className="gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة مادة
                  </Button>
                )
              }
            />
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSubjects.map((sub) => (
                <SubjectCard
                  key={sub.id}
                  subject={sub}
                  className={getClassName(sub.class_id)}
                  teacherName={getTeacherName(sub.teacher_id)}
                  studentsCount={getStudentsCount(sub.class_id)}
                  onEdit={openEdit}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          ) : (
            /* List view */
            <div className="space-y-2">
              {filteredSubjects.map((sub) => {
                const maxTotal =
                  (sub.participation_max ?? 10) + (sub.homework_max ?? 10) + (sub.class_activity_max ?? 10) + (sub.research_max ?? 10) + (sub.written_exam_max ?? 30) + (sub.practical_exam_max ?? 30);
                return (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-3 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <GraduationCap className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{sub.name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          {sub.class_id && (
                            <span className="text-xs text-muted-foreground">{getClassName(sub.class_id)}</span>
                          )}
                          {sub.teacher_id && (
                            <span className="text-xs text-chart-4 font-medium">{getTeacherName(sub.teacher_id)}</span>
                          )}
                          {!sub.teacher_id && (
                            <span className="text-xs text-destructive/70 italic">بدون معلم</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-muted-foreground hidden sm:block">
                        {maxTotal} درجة
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(sub)}>
                          <GraduationCap className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-teacher">
          {subjects.length === 0 ? (
            <EmptyState
              icon={UserCircle}
              title="لا توجد مواد"
              description="أضف مواد دراسية لتظهر هنا مرتبة حسب المعلم"
            />
          ) : (
            <TeacherSubjectsPanel
              teachers={teachers}
              subjects={filteredSubjects}
              classes={classes}
            />
          )}
        </TabsContent>
      </Tabs>

      <SubjectDialog
        open={dialogOpen}
        onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}
        editing={editing}
        form={form}
        setForm={setForm}
        classes={classes}
        teachers={schoolTeachers}
        isTeacherMode={isTeacherMode}
        lockedTeacherName={currentTeacher?.name}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default function Subjects() {
  const { user } = useAuth();
  if (user && !canManageAcademicData(user)) {
    return <Navigate to="/" replace />;
  }
  return <SubjectsContent />;
}