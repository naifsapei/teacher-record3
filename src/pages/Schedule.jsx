import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Clock, X } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";
import GradeSectionSelect from "@/components/shared/GradeSectionSelect";
import { classGradeName } from "@/lib/classSections";
import { useAuth } from "@/lib/AuthContext";
import { ministryNumber } from "@/lib/permissions";

const DAYS = [
  { key: "sunday", label: "الأحد" },
  { key: "monday", label: "الاثنين" },
  { key: "tuesday", label: "الثلاثاء" },
  { key: "wednesday", label: "الأربعاء" },
  { key: "thursday", label: "الخميس" },
];

const EMPTY = {
  day_of_week: "sunday",
  period: 1,
  grade_name: "",
  class_id: "",
  subject_id: "",
  teacher_id: "",
  start_time: "",
  notes: "",
};

export default function Schedule() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: schedule = [], isLoading } = useQuery({
    queryKey: ["lesson-schedule"],
    queryFn: () => base44.entities.LessonSchedule.list(),
  });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers"], queryFn: () => base44.entities.Teacher.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LessonSchedule.create(data),
    onSuccess: () => { qc.invalidateQueries(["lesson-schedule"]); toast.success("تمت إضافة الحصة"); setOpen(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LessonSchedule.update(id, data),
    onSuccess: () => { qc.invalidateQueries(["lesson-schedule"]); toast.success("تم تحديث الحصة"); setOpen(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LessonSchedule.delete(id),
    onSuccess: () => { qc.invalidateQueries(["lesson-schedule"]); toast.success("تم حذف الحصة"); },
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (lesson) => {
    setEditing(lesson);
    setForm({
      day_of_week: lesson.day_of_week || "sunday",
      period: lesson.period || 1,
      grade_name: classGradeName(classes.find((c) => c.id === lesson.class_id)),
      class_id: lesson.class_id || "",
      subject_id: lesson.subject_id || "",
      teacher_id: lesson.teacher_id || "",
      start_time: lesson.start_time || "",
      notes: lesson.notes || "",
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.class_id || !form.subject_id || !form.teacher_id) {
      toast.error("الرجاء اختيار الصف والمادة والمعلم");
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate({ ...form, ministry_number: ministryNumber(user) });
    }
  };

  const className = (id) => classes.find((c) => c.id === id)?.name || "—";
  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || "—";
  const teacherName = (id) => teachers.find((t) => t.id === id)?.name || "—";

  return (
    <div>
      <PageHeader
        title="جدول الحصص"
        description="إدارة الحصص الأسبوعية للفصول والمواد والمعلمين"
        actions={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> إضافة حصة
          </Button>
        }
      />

      {DAYS.map((day) => {
        const dayLessons = schedule
          .filter((l) => l.day_of_week === day.key)
          .sort((a, b) => (a.period || 0) - (b.period || 0));
        return (
          <Card key={day.key} className="mb-4">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" /> {day.label}
              </h3>
              {dayLessons.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">لا توجد حصص</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">الحصة</TableHead>
                      <TableHead>الوقت</TableHead>
                      <TableHead>الصف</TableHead>
                      <TableHead>المادة</TableHead>
                      <TableHead>المعلم</TableHead>
                      <TableHead className="text-left">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayLessons.map((lesson) => (
                      <TableRow key={lesson.id}>
                        <TableCell className="font-medium">{lesson.period}</TableCell>
                        <TableCell>{lesson.start_time || "—"}</TableCell>
                        <TableCell>{className(lesson.class_id)}</TableCell>
                        <TableCell>{subjectName(lesson.subject_id)}</TableCell>
                        <TableCell>{teacherName(lesson.teacher_id)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(lesson)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteMutation.mutate(lesson.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
      })}

      {!isLoading && schedule.length === 0 && (
        <EmptyState
          icon={Clock}
          title="لا توجد حصص"
          description="ابدأ بإضافة الحصص الأسبوعية للفصول"
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg max-h-[92vh] gap-0 overflow-hidden p-0 sm:rounded-xl">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-gradient-to-l from-primary/5 to-transparent p-4">
            <DialogTitle className="text-base font-bold text-primary">
              {editing ? "تعديل حصة" : "إضافة حصة"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(92vh-8.5rem)] space-y-4 overflow-y-auto p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>اليوم</Label>
                <Select value={form.day_of_week} onValueChange={(v) => setForm({ ...form, day_of_week: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>الحصة</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>وقت البداية</Label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>الصف</Label>
                <GradeSectionSelect
                  classes={classes}
                  gradeName={form.grade_name}
                  classId={form.class_id}
                  showAll={false}
                  onChange={({ gradeName: g, classId: c }) => setForm({ ...form, grade_name: g, class_id: c })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>المادة</Label>
              <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المادة" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>المعلم</Label>
              <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المعلم" /></SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 border-t bg-background/95 p-4 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="gap-2">
                <X className="h-4 w-4" /> إغلاق
              </Button>
            </DialogClose>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}