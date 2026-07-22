import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const PLAN_OPTIONS = [
  { value: "all", label: "كل الباقات" },
  { value: "semester", label: "فصل دراسي" },
  { value: "year", label: "سنة كاملة" },
];

export default function DiscountCodeDialog({ open, onOpenChange, onSave, editing }) {
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(editing ? toForm(editing) : emptyForm());
  }, [open, editing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const togglePlan = (val) => {
    let arr = [...form.applicable_plans];
    if (val === "all") {
      arr = arr.includes("all") ? [] : ["all"];
    } else {
      arr = arr.filter((p) => p !== "all");
      if (arr.includes(val)) arr = arr.filter((p) => p !== val);
      else arr.push(val);
    }
    set("applicable_plans", arr);
  };

  const submit = async () => {
    if (!form.code.trim() || !form.discount_value) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        code: form.code.trim().toUpperCase(),
        applicable_plans: form.applicable_plans.length ? JSON.stringify(form.applicable_plans) : JSON.stringify(["all"]),
        allowed_user_ids: JSON.stringify(["all"]),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "تعديل كود الخصم" : "إنشاء كود خصم"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>كود الخصم *</Label>
            <Input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="مثال: SUMMER25" dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label>الوصف</Label>
            <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="وصف مختصر للكود" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>نوع الخصم *</Label>
              <Select value={form.discount_type} onValueChange={(v) => set("discount_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">نسبة مئوية %</SelectItem>
                  <SelectItem value="fixed">مبلغ ثابت (ريال)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>قيمة الخصم *</Label>
              <Input type="number" min="0" value={form.discount_value} onChange={(e) => set("discount_value", Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>تاريخ التفعيل</Label>
              <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>تاريخ الانتهاء</Label>
              <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>مدة الصلاحية (أيام)</Label>
              <Input type="number" min="0" value={form.validity_days} onChange={(e) => set("validity_days", e.target.value ? Number(e.target.value) : "")} placeholder="اختياري" />
            </div>
            <div className="space-y-1.5">
              <Label>عدد مرات الاستخدام (0 = غير محدود)</Label>
              <Input type="number" min="0" value={form.max_usage} onChange={(e) => set("max_usage", Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>الباقات المسموح لها</Label>
            <div className="flex flex-wrap gap-2">
              {PLAN_OPTIONS.map((p) => {
                const checked = form.applicable_plans.includes(p.value) ||
                  (p.value === "all" && form.applicable_plans.length === 0);
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => togglePlan(p.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition ${checked ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40"}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>تفعيل الكود</Label>
            <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={submit} disabled={saving || !form.code.trim() || !form.discount_value}>
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function emptyForm() {
  return {
    code: "", description: "", discount_type: "percentage", discount_value: "",
    start_date: "", end_date: "", validity_days: "", max_usage: 0,
    active: true, applicable_plans: ["all"], allowed_user_ids: JSON.stringify(["all"]),
  };
}

function toForm(d) {
  let plans = ["all"];
  try { plans = JSON.parse(d.applicable_plans || JSON.stringify(["all"])); } catch (_) { plans = ["all"]; }
  if (!Array.isArray(plans) || plans.length === 0) plans = ["all"];
  return {
    code: d.code || "",
    description: d.description || "",
    discount_type: d.discount_type || "percentage",
    discount_value: d.discount_value ?? "",
    start_date: d.start_date || "",
    end_date: d.end_date || "",
    validity_days: d.validity_days ?? "",
    max_usage: d.max_usage ?? 0,
    active: d.active !== false,
    applicable_plans: plans,
    allowed_user_ids: d.allowed_user_ids || JSON.stringify(["all"]),
  };
}