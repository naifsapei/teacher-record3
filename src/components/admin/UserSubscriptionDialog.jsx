import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  PLAN_LABELS, PLAN_DURATION_MONTHS, getSubscriptionStatus, STATUS_LABELS, STATUS_TONES
} from "@/lib/permissions";

const addMonthsISO = (dateStr, months) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function UserSubscriptionDialog({ open, onOpenChange, user, principals = [] }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (user) {
      setEdit(false);
      setForm({
        full_name: user.full_name || "",
        email: user.email || "",
        ministry_number: user.ministry_number || "",
        phone: user.phone || "",
        otp_channel: user.otp_channel || "",
        otp_destination: user.otp_destination || "",
        subscription_plan: user.subscription_plan || (user.role === "admin" ? "admin" : "free"),
        subscription_start: user.subscription_start || "",
        subscription_end: user.subscription_end || "",
        active: user.account_type !== "free" && user.role !== "admin",
      });
    }
  }, [user]);

  if (!user || !form) return null;

  const linkedPrincipal = user.ministry_number
    ? principals.find((p) => p.ministry_number === user.ministry_number)
    : null;
  const status = getSubscriptionStatus(user);
  const isAdmin = user.role === "admin";

  const setPlan = (plan) => {
    const next = { ...form, subscription_plan: plan };
    if (plan === "free") {
      next.active = false;
      next.subscription_start = "";
      next.subscription_end = "";
    } else if (plan === "admin") {
      next.active = true;
      next.subscription_start = "";
      next.subscription_end = "";
    } else {
      const months = PLAN_DURATION_MONTHS[plan];
      const start = form.subscription_start || todayISO();
      next.subscription_start = start;
      next.subscription_end = addMonthsISO(start, months);
      next.active = true;
    }
    setForm(next);
  };

  const onStartChange = (val) => {
    const next = { ...form, subscription_start: val };
    const months = PLAN_DURATION_MONTHS[form.subscription_plan];
    if (months) next.subscription_end = addMonthsISO(val, months);
    setForm(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      const plan = form.subscription_plan;
      const account_type =
        isAdmin ? "admin"
        : plan === "free" ? "free"
        : form.active ? "subscriber" : "free";
      const subscription_status =
        isAdmin ? "admin"
        : plan === "free" ? "free"
        : form.active ? "active" : "expired";
      await base44.functions.invoke("manageUserSubscription", {
        user_id: user.id,
        full_name: form.full_name,
        ministry_number: form.ministry_number,
        phone: form.phone,
        otp_channel: form.otp_channel || null,
        otp_destination: form.otp_destination || null,
        subscription_plan: plan,
        subscription_start: form.subscription_start || null,
        subscription_end: form.subscription_end || null,
        account_type,
        subscription_status,
      });
      qc.invalidateQueries(["users"]);
      toast.success("تم حفظ بيانات المستخدم ✅");
      setEdit(false);
      onOpenChange(false);
    } catch {
      toast.error("تعذر حفظ البيانات");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await base44.entities.User.delete(user.id);
      qc.invalidateQueries(["users"]);
      toast.success("تم حذف المستخدم من النظام");
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch {
      toast.error("تعذر حذف المستخدم");
    } finally {
      setDeleting(false);
    }
  };

  const handlePasswordReset = async () => {
    setResetting(true);
    try {
      await base44.auth.resetPasswordRequest(user.email);
      toast.success("تم إرسال رابط استعادة كلمة المرور إلى بريد المستخدم");
    } catch {
      toast.error("تعذر إرسال رابط الاستعادة");
    } finally {
      setResetting(false);
    }
  };

  const Field = ({ label, children }) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>بيانات المستخدم</span>
            {!isAdmin && (
              <Button size="sm" variant="ghost" className="gap-1 h-8" onClick={() => setEdit((e) => !e)}>
                <Pencil className="w-3.5 h-3.5" /> {edit ? "إلغاء" : "تعديل"}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-1">
          <Field label="الاسم">
            {edit ? <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /> : <p className="text-sm font-medium">{user.full_name || "—"}</p>}
          </Field>
          <Field label="البريد الإلكتروني">
            <p className="text-sm font-medium truncate">{user.email || "—"}</p>
          </Field>
          <Field label="الرقم الوزاري">
            {edit ? <Input value={form.ministry_number} onChange={(e) => setForm({ ...form, ministry_number: e.target.value })} placeholder="مثال: 12345" /> : <p className="text-sm font-medium">{user.ministry_number || "—"}</p>}
          </Field>
          <Field label="رقم الجوال">
            {edit ? <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="مثال: 05xxxxxxxx" /> : <p className="text-sm font-medium">{user.phone || "—"}</p>}
          </Field>
          <Field label="طريقة استلام الرمز">
            {edit ? (
              <Select value={form.otp_channel || "email"} onValueChange={(value) => setForm({ ...form, otp_channel: value, otp_destination: value === "phone" ? form.phone : user.email || form.otp_destination })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">البريد الإلكتروني</SelectItem>
                  <SelectItem value="phone">الجوال</SelectItem>
                </SelectContent>
              </Select>
            ) : <p className="text-sm font-medium">{form.otp_channel === "phone" ? "الجوال" : "البريد الإلكتروني"}</p>}
          </Field>
          <Field label="جهة الرمز">
            <p className="text-sm font-medium">{form.otp_destination || user.otp_destination || user.email || "—"}</p>
          </Field>
          <Field label="مدير المدرسة المرتبط">
            <p className="text-sm font-medium">{linkedPrincipal?.full_name || "غير مرتبط"}</p>
          </Field>

          <Field label="نوع الاشتراك">
            {edit && !isAdmin ? (
              <Select value={form.subscription_plan} onValueChange={setPlan}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">{PLAN_LABELS.free}</SelectItem>
                  <SelectItem value="semester">{PLAN_LABELS.semester}</SelectItem>
                  <SelectItem value="year">{PLAN_LABELS.year}</SelectItem>
                </SelectContent>
              </Select>
            ) : <p className="text-sm font-medium">{PLAN_LABELS[form.subscription_plan] || "—"}</p>}
          </Field>

          <Field label="الحالة">
            <Badge className={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
          </Field>

          <Field label="تاريخ بداية الاشتراك">
            {edit && !isAdmin && (form.subscription_plan === "semester" || form.subscription_plan === "year") ? (
              <Input type="date" value={form.subscription_start} onChange={(e) => onStartChange(e.target.value)} />
            ) : <p className="text-sm font-medium">{form.subscription_start || "—"}</p>}
          </Field>

          <Field label="تاريخ نهاية الاشتراك">
            {edit && !isAdmin && (form.subscription_plan === "semester" || form.subscription_plan === "year") ? (
              <Input type="date" value={form.subscription_end} onChange={(e) => setForm({ ...form, subscription_end: e.target.value })} />
            ) : <p className="text-sm font-medium">{form.subscription_end || (isAdmin ? "بدون انتهاء" : "—")}</p>}
          </Field>

          {edit && !isAdmin && (form.subscription_plan === "semester" || form.subscription_plan === "year") && (
            <div className="col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm font-medium">فعالية الحساب</span>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {!isAdmin && (
              <Button variant="outline" size="sm" onClick={handlePasswordReset} disabled={resetting} className="gap-1">
                {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                استعادة كلمة المرور
              </Button>
            )}
            {!isAdmin && (
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={deleting} className="gap-1">
                <Trash2 className="w-3.5 h-3.5" />
                حذف
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <DialogClose asChild><Button variant="outline">إغلاق</Button></DialogClose>
            {edit && (
              <Button onClick={save} disabled={saving} className="gap-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                حفظ
              </Button>
            )}
          </div>
        </DialogFooter>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد حذف المستخدم</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف «{user.display_name || user.full_name || user.email}» من النظام؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                حذف نهائي
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}