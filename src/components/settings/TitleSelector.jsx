import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BadgeCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { titleOptionsFor, subscriberTitle } from "@/lib/permissions";

export default function TitleSelector({ me }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const current = subscriberTitle(me);
  const options = titleOptionsFor(me);

  const onChange = async (val) => {
    if (val === current) return;
    setSaving(true);
    try {
      await base44.auth.updateMe({
        title: val,
        gender: val.endsWith("ة") ? "female" : "male",
      });
      qc.invalidateQueries(["me"]);
      qc.invalidateQueries(["users"]);
      toast.success("تم حفظ المسمى ✅");
    } catch {
      toast.error("تعذر حفظ المسمى");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 w-full py-3 text-right">
      <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
        {saving
          ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          : <BadgeCheck className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">المسمى</p>
        <p className="text-sm font-medium truncate">{current}</p>
      </div>
      <Select value={current} onValueChange={onChange} disabled={saving}>
        <SelectTrigger className="w-28 h-8 text-xs shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}