import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { ministryNumber } from "@/lib/permissions";

export default function AchievementDialog({ open, onClose, achievement, student, classId }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!achievement;
  const [form, setForm] = useState({
    type: "skill", title: "", description: "", status: "in_progress",
    activity_result: "", date: "", semester: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      type: achievement?.type || "skill",
      title: achievement?.title || "",
      description: achievement?.description || "",
      status: achievement?.status || "in_progress",
      activity_result: achievement?.activity_result || "",
      date: achievement?.date || new Date().toISOString().slice(0, 10),
      semester: achievement?.semester || "",
      notes: achievement?.notes || "",
    });
  }, [open, achievement]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("أدخل اسم المهارة أو النشاط"); return; }
    if (!form.date) { toast.error("حدد التاريخ"); return; }
    setSaving(true);
    try {
      const payload = {
        student_id: student.id,
        class_id: classId,
        ministry_number: ministryNumber(user),
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        date: form.date,
        semester: form.semester.trim(),
        notes: form.notes.trim(),
      };
      if (form.type === "skill") payload.status = form.status;
      else payload.activity_result = form.activity_result.trim();

      if (isEdit) await base44.entities.Achievement.update(achievement.id, payload);
      else await base44.entities.Achievement.create(payload);

      qc.invalidateQueries(["achievements"]);
      toast.success(isEdit ? "تم تحديث الإنجاز" : "تمت إضافة الإنجاز");
      onClose();
    } catch (e) {
      toast.error("حدث خطأ أثناء الحفظ");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل الإنجاز" : "إضافة إنجاز جديد"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          <div>
            <Label>النوع</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {[
                { v: "skill", label: "مهارة" },
                { v: "activity", label: "نشاط" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => set("type", opt.v)}
                  className={cn(
                    "h-10 rounded-lg border text-sm font-medium transition-colors",
                    form.type === opt.v
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="ach-title">{form.type === "skill" ? "اسم المهارة" : "اسم النشاط"}</Label>
            <Input
              id="ach-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={form.type === "skill" ? "مثال: القراءة الجهرية" : "مثال: مشاركة في الإذاعة المدرسية"}
            />
          </div>

          <div>
            <Label>الوصف</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="وصف مختصر للمهارة أو النشاط"
            />
          </div>

          {form.type === "skill" ? (
            <div>
              <Label>حالة المهارة</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="acquired">مكتسبة</SelectItem>
                  <SelectItem value="in_progress">قيد التطوير</SelectItem>
                  <SelectItem value="not_acquired">غير مكتسبة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>نتيجة النشاط</Label>
              <Input
                value={form.activity_result}
                onChange={(e) => set("activity_result", e.target.value)}
                placeholder="مثال: المركز الأول، شكر وتقدير..."
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>التاريخ</Label>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div>
              <Label>الفصل الدراسي</Label>
              <Input value={form.semester} onChange={(e) => set("semester", e.target.value)} placeholder="الفصل الأول" />
            </div>
          </div>

          <div>
            <Label>ملاحظات</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="ملاحظات إضافية للمعلم أو ولي الأمر" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}