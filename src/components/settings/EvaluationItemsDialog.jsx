import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { EVAL_CATEGORIES, EVAL_ICON_OPTIONS, EVAL_ICON_LABELS, getEvalIcon, getCategory } from "@/components/student-tracking/evalIcons";
import { GRADE_FIELD_OPTIONS } from "@/lib/gradeFields";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { ministryNumber } from "@/lib/permissions";

export default function EvaluationItemsDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("positive");
  const [iconKey, setIconKey] = useState("check");
  const [points, setPoints] = useState(1);
  const [gradeField, setGradeField] = useState("none");
  const [saving, setSaving] = useState(false);

  const { data: items = [] } = useQuery({
    enabled: open,
    queryKey: ["evaluationItems"],
    queryFn: () => base44.entities.EvaluationItem.list(),
  });

  const reload = () => qc.invalidateQueries(["evaluationItems"]);

  const handleAdd = async () => {
    if (!name.trim()) { toast.error("اسم العنصر مطلوب"); return; }
    setSaving(true);
    try {
      await base44.entities.EvaluationItem.create({ name: name.trim(), category, icon_key: iconKey, points: Number(points) || 0, grade_field: gradeField, enabled: true, ministry_number: ministryNumber(user) });
      setName(""); setPoints(1); setGradeField("none");
      reload();
      toast.success("تمت إضافة العنصر");
    } catch { toast.error("تعذر إضافة العنصر"); }
    finally { setSaving(false); }
  };

  const toggle = async (it) => {
    try { await base44.entities.EvaluationItem.update(it.id, { enabled: !it.enabled }); reload(); }
    catch { toast.error("تعذر التحديث"); }
  };

  const remove = async (it) => {
    try { await base44.entities.EvaluationItem.delete(it.id); reload(); }
    catch { toast.error("تعذر الحذف"); }
  };

  const updateGradeField = async (it, field) => {
    try { await base44.entities.EvaluationItem.update(it.id, { grade_field: field }); reload(); }
    catch { toast.error("تعذر تحديث الربط"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>عناصر التقييم</DialogTitle>
        </DialogHeader>

        {/* Add form */}
        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-muted/40">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">اسم العنصر</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: مشاركة ممتازة" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">النوع</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(EVAL_CATEGORIES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">الأيقونة</Label>
            <Select value={iconKey} onValueChange={setIconKey}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVAL_ICON_OPTIONS.map((k) => {
                  const Icon = getEvalIcon(k);
                  return (
                    <SelectItem key={k} value={k}>
                      <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{EVAL_ICON_LABELS[k] || k}</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">ربط بتوزيع الدرجات</Label>
            <Select value={gradeField} onValueChange={setGradeField}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GRADE_FIELD_OPTIONS.map((f) => (
                  <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">النقاط</Label>
            <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} className="h-9" />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAdd} disabled={saving} className="h-9 w-full" size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              إضافة
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-1.5 mt-2">
          {items.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">لا توجد عناصر بعد — أضف أول عنصر</p>
          ) : (
            items.map((it) => {
              const cat = getCategory(it.category);
              const Icon = getEvalIcon(it.icon_key);
              return (
                <div key={it.id} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center text-white ${cat.bg}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{it.name}</p>
                    <p className="text-[10px] text-muted-foreground">{cat.label} • {it.points > 0 ? "+" : ""}{it.points} نقطة</p>
                  </div>
                  <Select value={it.grade_field || "none"} onValueChange={(v) => updateGradeField(it, v)}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GRADE_FIELD_OPTIONS.map((f) => (
                        <SelectItem key={f.key} value={f.key} className="text-xs">{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Switch checked={it.enabled} onCheckedChange={() => toggle(it)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(it)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}