import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAGES } from "@/lib/terminology";
import { groupClassesByGrade, classSection } from "@/lib/classSections";
import { ministryNumber, canManageAcademicData } from "@/lib/permissions";
import { useAuth } from "@/lib/AuthContext";
import { Navigate } from "react-router-dom";
import GradeCard from "@/components/classes/GradeCard";
import SectionsInput from "@/components/classes/SectionsInput";
import { BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";

const ACADEMIC_YEARS = ["1445-1446", "1446-1447", "1447-1448", "1448-1449", "1449-1450"];

const emptyForm = { grade_name: "", grade_level: "", academic_year: "", semester: "", sections: [] };

function ClassesContent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userMinistryNumber = ministryNumber(user) || "";
  const [createOpen, setCreateOpen] = useState(false);
  const [editGrade, setEditGrade] = useState(null);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: () => base44.entities.Class.list(),
  });

  const grades = groupClassesByGrade(classes);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["classes"] });

  const createMutation = useMutation({
    mutationFn: (records) => base44.entities.Class.bulkCreate(records),
    onSuccess: () => { invalidate(); setCreateOpen(false); setCreateForm(emptyForm); toast.success("تم إضافة الصف وشعبه"); },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, data }) => base44.entities.Class.bulkUpdate(ids.map((id) => ({ id, ...data }))),
    onSuccess: () => invalidate(),
  });

  const deleteOneMutation = useMutation({
    mutationFn: (id) => base44.entities.Class.delete(id),
    onSuccess: () => invalidate(),
  });

  const deleteManyMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map((id) => base44.entities.Class.delete(id))),
    onSuccess: () => invalidate(),
  });

  // إنشاء صف دراسي مع شعبه (سجل Class لكل شعبة)
  const handleCreate = () => {
    const grade_name = createForm.grade_name.trim();
    if (!grade_name) return;
    const sections = createForm.sections.length ? createForm.sections : [""];
    const records = sections.map((section) => ({
      name: section ? `${grade_name} ${section}`.trim() : grade_name,
      grade_name,
      section,
      grade_level: createForm.grade_level,
      academic_year: createForm.academic_year,
      semester: createForm.semester,
      ministry_number: userMinistryNumber,
    }));
    createMutation.mutate(records);
  };

  // تعديل: تحديث الحقول المشتركة + تسوية الشعب (إضافة/حذف)
  const handleEditSave = () => {
    if (!editGrade) return;
    const grade_name = editForm.grade_name.trim();
    if (!grade_name) return;
    const existing = editGrade.classes;
    const existingSections = new Map(existing.map((c) => [classSection(c), c]));
    const newSet = new Set(editForm.sections);
    const shared = {
      grade_name,
      grade_level: editForm.grade_level,
      academic_year: editForm.academic_year,
      semester: editForm.semester,
      ministry_number: userMinistryNumber,
    };

    // تحديث الموجودة (وتغيير name حسب section)
    const updates = existing.map((c) => {
      const s = classSection(c);
      return { id: c.id, ...shared, name: s ? `${grade_name} ${s}`.trim() : grade_name };
    });

    const toCreate = editForm.sections.filter((s) => !existingSections.has(s))
      .map((s) => ({ name: `${grade_name} ${s}`.trim(), grade_name, section: s, ...shared }));

    const toDelete = existing.filter((c) => classSection(c) && !newSet.has(classSection(c))).map((c) => c.id);
    // السجلات القديمة بلا section تُحتفظ (لا تُحذف ضمن تسوية الشعب)

    Promise.all([
      updates.length ? base44.entities.Class.bulkUpdate(updates) : null,
      ...toCreate.map((r) => base44.entities.Class.create(r)),
      ...toDelete.map((id) => base44.entities.Class.delete(id)),
    ]).then(() => {
      invalidate();
      setEditGrade(null);
      toast.success("تم تحديث الصف");
    });
  };

  const openEdit = (grade) => {
    setEditGrade(grade);
    const first = grade.classes[0] || {};
    setEditForm({
      grade_name: grade.gradeName,
      grade_level: first.grade_level || "",
      academic_year: first.academic_year || "",
      semester: first.semester || "",
      sections: grade.classes.map((c) => classSection(c)).filter(Boolean),
    });
  };

  const removeSection = (cls) => deleteOneMutation.mutate(cls.id);

  const deleteGrade = (grade) => {
    if (grade.classes.length <= 1) { deleteManyMutation.mutate(grade.classes.map((c) => c.id)); return; }
    if (confirm(`حذف الصف «${grade.gradeName}» وجميع شعبه (${grade.classes.length})؟`)) {
      deleteManyMutation.mutate(grade.classes.map((c) => c.id));
    }
  };

  return (
    <div>
      <PageHeader
        title="الصفوف والشعب"
        description="أنشئ الصف الدراسي وأضف شعبه (أ، ب، ج...) ثم اربطها بالمرحلة الدراسية"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> إضافة صف دراسي
          </Button>
        }
      />

      {grades.length === 0 && !isLoading ? (
        <EmptyState
          icon={BookOpen}
          title="لا توجد صفوف"
          description="ابدأ بإضافة صف دراسي وشعبه"
          action={<Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> إضافة صف دراسي</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {grades.map((g) => (
            <GradeCard
              key={g.gradeName}
              grade={g}
              onEdit={openEdit}
              onRemoveSection={removeSection}
              onDeleteGrade={deleteGrade}
            />
          ))}
        </div>
      )}

      {/* إنشاء */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إضافة صف دراسي وشعبه</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>اسم الصف الدراسي *</Label>
              <Input value={createForm.grade_name} onChange={(e) => setCreateForm({ ...createForm, grade_name: e.target.value })}
                placeholder="مثال: أول ثانوي" />
            </div>
            <SectionsInput sections={createForm.sections} onChange={(sections) => setCreateForm({ ...createForm, sections })} />
            <div>
              <Label>المرحلة الدراسية</Label>
              <Select value={createForm.grade_level} onValueChange={(v) => setCreateForm({ ...createForm, grade_level: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المرحلة الدراسية" /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>العام الدراسي</Label>
                <Select value={createForm.academic_year} onValueChange={(v) => setCreateForm({ ...createForm, academic_year: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر العام" /></SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الفصل الدراسي</Label>
                <Select value={createForm.semester} onValueChange={(v) => setCreateForm({ ...createForm, semester: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الفصل الدراسي" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">الفصل الدراسي الأول</SelectItem>
                    <SelectItem value="second">الفصل الدراسي الثاني</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={!createForm.grade_name.trim() || createMutation.isPending}>
              {createMutation.isPending ? "جارٍ الإضافة..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تعديل */}
      <Dialog open={!!editGrade} onOpenChange={(o) => !o && setEditGrade(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعديل الصف الدراسي وشعبه</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>اسم الصف الدراسي *</Label>
              <Input value={editForm.grade_name} onChange={(e) => setEditForm({ ...editForm, grade_name: e.target.value })} />
            </div>
            <SectionsInput sections={editForm.sections} onChange={(sections) => setEditForm({ ...editForm, sections })} />
            <div>
              <Label>المرحلة الدراسية</Label>
              <Select value={editForm.grade_level} onValueChange={(v) => setEditForm({ ...editForm, grade_level: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المرحلة الدراسية" /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>العام الدراسي</Label>
                <Select value={editForm.academic_year} onValueChange={(v) => setEditForm({ ...editForm, academic_year: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر العام" /></SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الفصل الدراسي</Label>
                <Select value={editForm.semester} onValueChange={(v) => setEditForm({ ...editForm, semester: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الفصل الدراسي" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">الفصل الدراسي الأول</SelectItem>
                    <SelectItem value="second">الفصل الدراسي الثاني</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGrade(null)}>إلغاء</Button>
            <Button onClick={handleEditSave} disabled={!editForm.grade_name.trim()}>حفظ التعديلات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// مكونات مشتركة (محلّية لتجنّب استيراد دوري)
function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="font-bold text-accent text-xl md:text-xl">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-16">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

export default function Classes() {
  const { user } = useAuth();
  if (user && !canManageAcademicData(user)) {
    return <Navigate to="/" replace />;
  }
  return <ClassesContent />;
}