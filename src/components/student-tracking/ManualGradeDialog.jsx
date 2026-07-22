import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, GraduationCap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ministryNumber } from "@/lib/permissions";

const FIELDS = [
  { key: "participation", label: "المشاركة", maxKey: "participation_max", defaultMax: 10 },
  { key: "homework", label: "الواجبات", maxKey: "homework_max", defaultMax: 10 },
  { key: "class_activity", label: "المشاركة الصفية", maxKey: "class_activity_max", defaultMax: 10 },
  { key: "research", label: "البحوث/المشاريع", maxKey: "research_max", defaultMax: 10 },
  { key: "written_exam", label: "الاختبار التحريري", maxKey: "written_exam_max", defaultMax: 30 },
  { key: "practical_exam", label: "الاختبار العملي", maxKey: "practical_exam_max", defaultMax: 30 },
];

export default function ManualGradeDialog({ student, subject, open, onClose, onSaved }) {
  const { user } = useAuth();
  const [values, setValues] = useState({});
  const [existingId, setExistingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!open || !student || !subject) return;
    setLoading(true);
    setValues({});
    setExistingId(null);
    base44.entities.Grade.filter({ student_id: student.id, subject_id: subject.id })
      .then((res) => {
        if (!active) return;
        if (res.length > 0) {
          const g = res[0];
          setExistingId(g.id);
          const init = {};
          FIELDS.forEach((f) => (init[f.key] = g[f.key] ?? ""));
          setValues(init);
        } else {
          const init = {};
          FIELDS.forEach((f) => (init[f.key] = ""));
          setValues(init);
        }
      })
      .catch(() => toast.error("تعذر تحميل درجات الطالب"))
      .finally(() => setLoading(false));
    return () => {
      active = false;
    };
  }, [open, student, subject]);

  const maxOf = (f) => subject?.[f.maxKey] ?? f.defaultMax;
  const entered = FIELDS.filter((f) => values[f.key] !== "" && values[f.key] !== null && values[f.key] !== undefined);
  const total = entered.reduce((s, f) => s + (Number(values[f.key]) || 0), 0);
  const totalMax = entered.reduce((s, f) => s + maxOf(f), 0);
  const pct = totalMax > 0 ? Math.round((total / totalMax) * 100) : 0;

  const handleChange = (key, raw) => {
    const f = FIELDS.find((x) => x.key === key);
    const max = maxOf(f);
    if (raw === "") { setValues((prev) => ({ ...prev, [key]: "" })); return; }
    let num = parseFloat(raw);
    if (isNaN(num)) { setValues((prev) => ({ ...prev, [key]: "" })); return; }
    num = Math.max(0, Math.min(max, num));
    setValues((prev) => ({ ...prev, [key]: num }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { student_id: student.id, subject_id: subject.id, ministry_number: ministryNumber(user) };
      FIELDS.forEach((f) => (payload[f.key] = values[f.key] === "" || values[f.key] === null ? null : Number(values[f.key])));
      if (existingId) {
        await base44.entities.Grade.update(existingId, payload);
      } else {
        await base44.entities.Grade.create(payload);
      }
      toast.success("تم حفظ الدرجات وربطها بسجل الطالب");
      onSaved?.();
      onClose();
    } catch {
      toast.error("تعذر حفظ الدرجات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-right">إدخال درجات الطالب</DialogTitle>
              <DialogDescription className="text-right">
                {student?.name}
                {subject?.name ? ` — ${subject.name}` : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">جارٍ تحميل الدرجات...</div>
        ) : (
          <div className="space-y-3 py-2">
            {FIELDS.map((f) => {
              const max = maxOf(f);
              return (
                <div key={f.key} className="flex items-center gap-3">
                  <Label className="flex-1 text-sm font-semibold text-right">{f.label}</Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={max}
                      step="0.5"
                      value={values[f.key] ?? ""}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      className="w-24 text-center"
                    />
                    <span className="text-xs text-muted-foreground w-10">/ {max}</span>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-2.5 mt-2">
              <span className="text-sm font-semibold">المجموع الكلي</span>
              <span className="text-sm font-bold text-primary">
                {total} / {totalMax} ({pct}%)
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            <Save className="h-4 w-4" />
            {saving ? "جارٍ الحفظ..." : "حفظ الدرجات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}