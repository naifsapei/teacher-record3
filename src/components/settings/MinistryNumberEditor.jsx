import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { School, Pencil, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MinistryNumberEditor({ me }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const current = me?.ministry_number || "";
  const isPrincipal = me?.app_role === "principal" && me?.role !== "admin";

  const startEdit = () => { setValue(current); setEditing(true); };
  const cancel = () => { setEditing(false); setValue(""); };

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed) { toast.error("رقم المدرسة الوزاري مطلوب"); return; }
    if (isPrincipal && trimmed === current) { setEditing(false); return; }
    setSaving(true);
    try {
      if (isPrincipal) {
        // مدير المدرسة: ربط الحساب بالمدرسة عبر school_id المُتحقَّق منه من الرقم الوزاري
        const res = await base44.functions.invoke("linkPrincipalToSchool", {
          ministry_number: trimmed,
          school_name: me?.school_name || "",
          education_admin: me?.education_admin || "",
        });
        toast.success(res?.data?.message || "تم ربط حسابك بالمدرسة ✅");
        qc.invalidateQueries(["me"]);
        qc.invalidateQueries(["users"]);
        qc.invalidateQueries(["teachers"]);
        qc.invalidateQueries(["classes"]);
        qc.invalidateQueries(["subjects"]);
        qc.invalidateQueries(["students"]);
      } else {
        // أدمن النظام: تعديل مباشر لرقمه فقط
        await base44.auth.updateMe({ ministry_number: trimmed });
        qc.invalidateQueries(["me"]);
        qc.invalidateQueries(["users"]);
        toast.success("تم حفظ الرقم الوزاري ✅");
      }
      setEditing(false);
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "تعذر حفظ الرقم الوزاري");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="py-3 space-y-2">
        {isPrincipal && (
          <p className="text-xs text-amber-700 px-1">
            سيتم تحديث الرقم الوزاري في جميع بيانات المدرسة (المعلمون، الصفوف، المواد، الطلاب، الحضور...) وفي حسابات المستخدمين المرتبطين، ليصلكم طلبات الانضمام بالرقم الجديد.
          </p>
        )}
        <div className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 text-sm flex-1"
            autoFocus
            inputMode="numeric"
            placeholder="مثال: 123456"
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          />
          <Button size="icon" className="h-8 w-8" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancel} disabled={saving}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      className="flex items-center gap-2 w-full py-3 text-right hover:bg-muted/40 rounded-xl px-1 transition-colors"
    >
      <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <School className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">رقم المدرسة الوزاري</p>
        <p className="text-sm font-medium truncate">{current || "غير مُدخل"}</p>
      </div>
      <Pencil className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}