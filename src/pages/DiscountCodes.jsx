import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import DiscountCodeDialog from "@/components/admin/DiscountCodeDialog";
import { Ticket, Plus, Pencil, Trash2, ChevronLeft, ShieldAlert, Search } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("ar-SA-u-ca-gregory") : "—");

export default function DiscountCodes() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [search, setSearch] = useState("");

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["discount-codes"],
    queryFn: () => base44.entities.DiscountCode.list("-created_date", 100),
  });

  if (me && me.role !== "admin") {
    return (
      <div className="max-w-md mx-auto py-20 text-center px-4">
        <ShieldAlert className="w-14 h-14 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold">لا تملك صلاحية الوصول</h2>
        <p className="text-muted-foreground mt-2">هذه الصفحة مخصصة لمدير النظام فقط.</p>
        <Button variant="ghost" className="mt-6 gap-1" onClick={() => navigate("/admin")}>
          <ChevronLeft className="w-4 h-4" /> رجوع
        </Button>
      </div>
    );
  }

  const filtered = codes.filter((c) =>
    (c.code || "").toLowerCase().includes(search.trim().toLowerCase()) ||
    (c.description || "").includes(search.trim())
  );

  const stats = [
    { label: "إجمالي الأكواد", value: codes.length, color: "text-blue-600 bg-blue-50" },
    { label: "مفعّلة", value: codes.filter((c) => c.active).length, color: "text-emerald-600 bg-emerald-50" },
    { label: "مستخدمة", value: codes.reduce((s, c) => s + (c.used_count || 0), 0), color: "text-amber-600 bg-amber-50" },
  ];

  const handleSave = async (payload) => {
    try {
      if (editing) {
        await base44.entities.DiscountCode.update(editing.id, payload);
        toast.success("تم تحديث الكود");
      } else {
        await base44.entities.DiscountCode.create({ ...payload, used_count: 0 });
        toast.success("تم إنشاء الكود");
      }
      qc.invalidateQueries(["discount-codes"]);
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || "تعذر حفظ الكود");
    }
  };

  const toggleActive = async (c) => {
    try {
      await base44.entities.DiscountCode.update(c.id, { active: !c.active });
      qc.invalidateQueries(["discount-codes"]);
    } catch {
      toast.error("تعذر تغيير الحالة");
    }
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    try {
      await base44.entities.DiscountCode.delete(delTarget.id);
      qc.invalidateQueries(["discount-codes"]);
      toast.success("تم حذف الكود");
    } catch {
      toast.error("تعذر حذف الكود");
    } finally {
      setDelTarget(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-28 px-4" dir="rtl">
      <PageHeader
        title="أكواد الخصم"
        description="إنشاء وإدارة أكواد الخصم للاشتراكات والمدفوعات"
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-1">
              <Plus className="w-4 h-4" /> كود جديد
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> رجوع
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className={`inline-flex w-9 h-9 rounded-lg items-center justify-center mb-2 ${s.color}`}>
                <Ticket className="w-5 h-5" />
              </div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث بالكود أو الوصف..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 h-10" />
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-10">جارٍ التحميل...</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Ticket} title="لا توجد أكواد خصم" description="أنشئ أول كود خصم للاشتراكات" />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => <CodeRow key={c.id} c={c} onEdit={() => { setEditing(c); setOpen(true); }} onDelete={() => setDelTarget(c)} onToggle={() => toggleActive(c)} />)}
        </div>
      )}

      <DiscountCodeDialog open={open} onOpenChange={setOpen} onSave={handleSave} editing={editing} />

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الكود "{delTarget?.code}"؟</AlertDialogTitle>
            <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CodeRow({ c, onEdit, onDelete, onToggle }) {
  const today = new Date().toISOString().slice(0, 10);
  const expired = c.end_date && today > c.end_date;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-primary text-lg" dir="ltr">{c.code}</span>
              <Badge variant={c.active ? "success" : "secondary"}>{c.active ? "مفعّل" : "معطّل"}</Badge>
              {expired && <Badge variant="destructive">منتهٍ</Badge>}
              <Badge variant="outline">
                {c.discount_type === "percentage" ? `${c.discount_value}%` : `${c.discount_value} ريال`}
              </Badge>
            </div>
            {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
              <span>التفعيل: {fmtDate(c.start_date)}</span>
              <span>الانتهاء: {fmtDate(c.end_date)}</span>
              <span>الاستخدام: {c.used_count || 0}{c.max_usage ? ` / ${c.max_usage}` : " / غير محدود"}</span>
              <span>المدة: {c.validity_days ? `${c.validity_days} يوم` : "—"}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={onEdit} title="تعديل"><Pencil className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={onDelete} title="حذف" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
            <Switch checked={c.active} onCheckedChange={onToggle} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}