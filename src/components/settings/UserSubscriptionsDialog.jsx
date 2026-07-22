import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PLAN_LABELS = { semester: "فصل دراسي", year: "سنة كاملة" };

export default function UserSubscriptionsDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
  });

  const update = async (id, patch, msg) => {
    setBusyId(id);
    try {
      await base44.entities.User.update(id, patch);
      qc.invalidateQueries(["users"]);
      toast.success(msg);
    } catch {
      toast.error("تعذر تحديث البيانات");
    } finally {
      setBusyId(null);
    }
  };

  const toggleActivation = (u) => {
    const next = u.account_type === "subscriber" ? "free" : "subscriber";
    update(u.id, { account_type: next }, next === "subscriber" ? "تم تفعيل الاشتراك ✅" : "تم إلغاء تفعيل الاشتراك");
  };

  const changePlan = (u, plan) => {
    update(u.id, { subscription_plan: plan }, "تم تحديد نوع الاشتراك");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            تفعيل اشتراكات المستخدمين
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1 mb-2">
          فعّل اشتراك الحساب أو ألغِه، وحدّد نوع الاشتراك لكل مستخدم.
        </p>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-border rounded-lg border border-border">
          {isLoading ? (
            <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل...
            </div>
          ) : users.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">لا يوجد مستخدمون</p>
          ) : (
            users.map((u) => {
              const active = u.account_type === "subscriber";
              const isAdmin = u.role === "admin";
              return (
                <div key={u.id} className="flex items-center gap-3 p-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {(u.full_name || u.email || "؟").slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{u.full_name || "بدون اسم"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Select
                    value={u.subscription_plan || "semester"}
                    onValueChange={(p) => changePlan(u, p)}
                    disabled={isAdmin || busyId === u.id}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semester">{PLAN_LABELS.semester}</SelectItem>
                      <SelectItem value="year">{PLAN_LABELS.year}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Switch
                    checked={active}
                    onCheckedChange={() => toggleActivation(u)}
                    disabled={isAdmin || busyId === u.id}
                  />
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">تم</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}