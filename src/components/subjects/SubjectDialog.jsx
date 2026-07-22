import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { GraduationCap, BookOpen, UserCircle, Award, CalendarDays } from "lucide-react";

const GRADE_FIELDS = [
  { key: "participation_max",  label: "مشاركة",          color: "border-emerald-200 focus-visible:ring-emerald-400",  bar: "bg-emerald-400" },
  { key: "homework_max",       label: "واجبات",           color: "border-blue-200 focus-visible:ring-blue-400",        bar: "bg-blue-400" },
  { key: "class_activity_max", label: "مشاركة صفية",     color: "border-purple-200 focus-visible:ring-purple-400",    bar: "bg-purple-400" },
  { key: "research_max",       label: "بحوث/مشاريع",     color: "border-pink-200 focus-visible:ring-pink-400",        bar: "bg-pink-400" },
  { key: "written_exam_max",   label: "اختبار تحريري",   color: "border-orange-200 focus-visible:ring-orange-400",    bar: "bg-orange-400" },
  { key: "practical_exam_max", label: "اختبار عملي",     color: "border-red-200 focus-visible:ring-red-400",          bar: "bg-red-400" },
];

export default function SubjectDialog({ open, onOpenChange, editing, form, setForm, classes, teachers, isTeacherMode, lockedTeacherName, onSubmit }) {
  const maxTotal = GRADE_FIELDS.reduce((sum, f) => sum + (Number(form[f.key]) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5 text-primary" />
            {editing ? "تعديل المادة الدراسية" : "إضافة مادة دراسية جديدة"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Basic Info */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">المعلومات الأساسية</p>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">اسم المادة *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: الرياضيات، العلوم، اللغة العربية..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  الصف / الشعبة *
                </Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="اختر الصف/الشعبة" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex flex-col">
                          <span>{c.name}</span>
                          {c.grade_level && <span className="text-xs text-muted-foreground">{c.grade_level}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  الفصل الدراسي (السنة) *
                </Label>
                <Select value={form.semester || "first"} onValueChange={(v) => setForm({ ...form, semester: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="اختر الفصل الدراسي" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">الفصل الدراسي الأول</SelectItem>
                    <SelectItem value="second">الفصل الدراسي الثاني</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm flex items-center gap-1">
                  <UserCircle className="h-3.5 w-3.5" />
                  المعلم المختص
                </Label>
                {isTeacherMode ? (
                  <div className="mt-1 flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/40 text-sm font-medium">
                    <UserCircle className="h-4 w-4 text-primary" />
                    {lockedTeacherName || "أنت (صاحب الحساب)"}
                  </div>
                ) : (
                  <Select
                    value={form.teacher_id || "none"}
                    onValueChange={(v) => setForm({ ...form, teacher_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="اختر المعلم (اختياري)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">— بدون معلم —</span>
                      </SelectItem>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex flex-col">
                            <span>{t.name}</span>
                            {t.email && <span className="text-xs text-muted-foreground">{t.email}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Grades Configuration */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">توزيع الدرجات</p>
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-3 py-1">
                <Award className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">المجموع: {maxTotal}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {GRADE_FIELDS.map((field) => (
                <div key={field.key}>
                  <Label className="text-sm">{field.label}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form[field.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value === "" ? "" : Number(e.target.value) })}
                    placeholder="0"
                    className={`mt-1 ${field.color}`}
                  />
                </div>
              ))}
            </div>

            {/* Visual bar */}
            <div className="mt-4 rounded-xl overflow-hidden h-3 flex gap-0.5">
              {GRADE_FIELDS.map((f) => (
                <div
                  key={f.key}
                  className={`${f.bar} transition-all duration-300 rounded-sm`}
                  style={{ flex: Number(form[f.key]) || 0 }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground flex-wrap gap-y-1">
              {GRADE_FIELDS.map((f) => (
                <span key={f.key}>{f.label}</span>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={onSubmit} disabled={!form.name.trim() || !form.class_id}>
            {editing ? "حفظ التعديلات" : "إضافة المادة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}