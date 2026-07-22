import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_ROLE_OPTIONS, appRoleLabel } from "@/lib/permissions";
import { toast } from "sonner";

export default function RoleEditDialog({ open, onOpenChange, user, me }) {
  const qc = useQueryClient();
  const [newRole, setNewRole] = useState("teacher");

  useEffect(() => {
    setNewRole(user?.app_role || "teacher");
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: async () => {
      try {
        await base44.entities.AuditLog.create({
          target_user_id: user.id,
          target_user_name: user.display_name || user.full_name || user.email,
          old_role: user.app_role || "teacher",
          new_role: newRole,
          action: "role_change",
          executor_id: me?.id,
          executor_name: me?.display_name || me?.full_name || "",
          details: `تغيير الدور من ${appRoleLabel({ app_role: user.app_role })} إلى ${appRoleLabel({ app_role: newRole })}`,
        });
      } catch { /* audit log is best-effort */ }
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success("تم تحديث دور المستخدم");
      onOpenChange(false);
    },
    onError: () => toast.error("تعذر تحديث الدور"),
  });

  const handleSubmit = () => {
    if (!user) return;
    updateMutation.mutate({ userId: user.id, data: { app_role: newRole } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>تغيير دور المستخدم</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">
            المستخدم: <span className="font-medium text-foreground">{user?.display_name || user?.full_name || user?.email}</span>
          </div>
          <div>
            <Label>الدور الجديد</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {APP_ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}