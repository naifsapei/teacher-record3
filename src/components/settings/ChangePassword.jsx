import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";

export default function ChangePassword() {
  const qc = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setOpen(false);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!current || !next) { toast.error("يرجى إدخال كلمة المرور الحالية والجديدة"); return; }
    if (next.length < 6) { toast.error("يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل"); return; }
    if (next !== confirm) { toast.error("كلمتا المرور الجديدتان غير متطابقتين"); return; }
    setLoading(true);
    try {
      const me = await base44.auth.me();
      await base44.auth.changePassword({
        userId: me.id,
        currentPassword: current,
        newPassword: next,
      });
      toast.success("تم تحديث كلمة المرور بنجاح");
      reset();
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      const status = err?.status || err?.response?.status;
      if (status === 401) toast.error("كلمة المرور الحالية غير صحيحة");
      else if (status === 422) toast.error("كلمة المرور الجديدة لا تستوفي الشروط");
      else if (status === 403) toast.error("غير مصرح بتغيير كلمة المرور");
      else toast.error(err?.message || "تعذر تحديث كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-between w-full py-4 px-1 rounded-xl hover:bg-muted/50 transition-colors text-right"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-muted">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">تغيير كلمة المرور</p>
            <p className="text-xs text-muted-foreground mt-0.5">حدّث كلمة مرور حسابك</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="py-4 px-1 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" /> تغيير كلمة المرور
        </p>
        <button type="button" onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">إغلاق</button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">كلمة المرور الحالية</Label>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type={showCurrent ? "text" : "password"}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="pr-10 pl-10 h-10 text-right"
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">كلمة المرور الجديدة</Label>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type={showNew ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="pr-10 pl-10 h-10 text-right"
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <button type="button" onClick={() => setShowNew(!showNew)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">تأكيد كلمة المرور الجديدة</Label>
        <Input
          type={showNew ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="h-10 text-right"
          placeholder="••••••••"
          autoComplete="new-password"
        />
        {confirm && next !== confirm && <p className="text-xs text-destructive">كلمتا المرور غير متطابقتين</p>}
      </div>

      <Button type="submit" className="w-full gap-2" disabled={loading}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحديث...</> : "حفظ كلمة المرور"}
      </Button>
    </form>
  );
}