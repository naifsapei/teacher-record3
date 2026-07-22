import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { BookOpen, Check, Loader2, Pencil } from "lucide-react";
import { SUBJECT_SPECIALIZATIONS, isTeacher } from "@/lib/permissions";
import { toast } from "sonner";

export default function SpecializationEditor({ me }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);

  const current = me?.specialization || "";

  useEffect(() => {
    if (editing) setSelected(current);
  }, [editing]);

  const cancel = () => { setEditing(false); setSelected(""); };

  const save = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ specialization: selected });
      try {
        const teachers = await base44.entities.Teacher.filter({ user_id: me.id });
        if (teachers.length > 0) {
          await base44.entities.Teacher.update(teachers[0].id, { specialization: selected });
        }
      } catch { /* غير حرج */ }
      qc.invalidateQueries(["me"]);
      qc.invalidateQueries(["teachers"]);
      qc.invalidateQueries(["users"]);
      toast.success("تم حفظ التخصص ✅");
      setEditing(false);
    } catch {
      toast.error("تعذر حفظ التخصص");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="py-3 space-y-3">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="h-11 text-right">
            <SelectValue placeholder="اختر التخصص" />
          </SelectTrigger>
          <SelectContent>
            {SUBJECT_SPECIALIZATIONS.map((sp) => (
              <SelectItem key={sp} value={sp}>{sp}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>إلغاء</Button>
          <Button size="sm" onClick={save} disabled={saving || !selected} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            حفظ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-2 w-full py-3 text-right hover:bg-muted/40 rounded-xl px-1 transition-colors"
    >
      <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <BookOpen className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">التخصص</p>
        <p className="text-sm font-medium truncate">
          {current || "غير محدد"}
        </p>
      </div>
      <Pencil className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}