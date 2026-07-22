import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X, Loader2, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { subscriberTitle } from "@/lib/permissions";

export default function DisplayNameEditor({ me }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const current = me?.display_name || me?.full_name || "بدون اسم";

  const startEdit = () => { setValue(current); setEditing(true); };
  const cancel = () => { setEditing(false); setValue(""); };

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed) { toast.error("الاسم مطلوب"); return; }
    setSaving(true);
    try {
      await base44.auth.updateMe({ display_name: trimmed });
      // مزامنة اسم المعلم في سجل المعلمين إن وُجد
      try {
        const teachers = await base44.entities.Teacher.filter({ user_id: me.id });
        if (teachers.length > 0) {
          await base44.entities.Teacher.update(teachers[0].id, { name: trimmed });
          qc.invalidateQueries(["teachers"]);
        }
      } catch { /* غير حرج */ }
      qc.invalidateQueries(["me"]);
      qc.invalidateQueries(["users"]);
      toast.success("تم حفظ الاسم ✅");
      setEditing(false);
    } catch {
      toast.error("تعذر حفظ الاسم");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 text-sm flex-1"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
        />
        <Button size="icon" className="h-8 w-8" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancel} disabled={saving}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      className="flex items-center gap-2 w-full py-3 text-right hover:bg-muted/40 rounded-xl px-1 transition-colors"
    >
      <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <UserCircle className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">اسم المشترك</p>
        <p className="text-sm font-medium truncate">{current}</p>
        <p className="text-xs text-muted-foreground truncate">{subscriberTitle(me)}</p>
      </div>
      <Pencil className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}