import { useState, useMemo } from "react";
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
import UserSubscriptionDialog from "@/components/admin/UserSubscriptionDialog";
import SubscriptionRequests from "@/components/admin/SubscriptionRequests";
import {
  Users, Crown, ShieldCheck, ShieldAlert, ChevronLeft, School, UserCircle, CalendarClock, Pencil, BellRing, Search
} from "lucide-react";
import { toast } from "sonner";
import {
  PLAN_LABELS, STATUS_LABELS, STATUS_TONES, getSubscriptionStatus, getSubscriptionPlan, appRoleLabel
} from "@/lib/permissions";
import RoleEditDialog from "@/components/admin/RoleEditDialog";
import AuditLogPanel from "@/components/admin/AuditLogPanel";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("ar-SA-u-ca-gregory") : "—");

export default function Admin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [roleEditUser, setRoleEditUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: users = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });
  const { data: pendingSubs = [] } = useQuery({ queryKey: ["subscriptions", "pending"], queryFn: () => base44.entities.Subscription.filter({ status: "pending" }) });

  const pendingByUser = useMemo(() => new Map(pendingSubs.map((s) => [s.created_by_id, s])), [pendingSubs]);
  const pendingCount = pendingByUser.size;
  const baseUsers = showPendingOnly && pendingCount > 0 ? users.filter((u) => pendingByUser.has(u.id)) : users;
  const displayUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return baseUsers;
    return baseUsers.filter((u) =>
      (u.display_name || u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  }, [baseUsers, searchQuery]);

  const admins = displayUsers.filter((u) => u.role === "admin");
  const principals = displayUsers.filter((u) => u.app_role === "principal" && u.role !== "admin");
  const others = displayUsers.filter((u) => u.role !== "admin" && u.app_role !== "principal");
  const teachers = users.filter((u) => u.app_role === "teacher" && u.role !== "admin");
  const schoolsCount = new Set(principals.map((p) => p.ministry_number).filter(Boolean)).size || principals.length;

  const principalByMinNum = useMemo(() => new Map(principals.map((p) => [p.ministry_number, p])), [principals]);

  if (me && me.role !== "admin") {
    return (
      <div className="max-w-md mx-auto py-20 text-center px-4">
        <ShieldAlert className="w-14 h-14 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold">لا تملك صلاحية الوصول</h2>
        <p className="text-muted-foreground mt-2">هذه الصفحة مخصصة لمدير النظام فقط.</p>
        <Button variant="ghost" className="mt-6 gap-1" onClick={() => navigate("/settings")}>
          <ChevronLeft className="w-4 h-4" /> رجوع للإعدادات
        </Button>
      </div>
    );
  }
  const grouped = {};
  const ungrouped = [];
  others.forEach((u) => {
    const p = u.ministry_number ? principalByMinNum.get(u.ministry_number) : null;
    if (p) (grouped[p.id] ||= []).push(u);
    else ungrouped.push(u);
  });

  const counts = {
    total: users.length,
    active: users.filter((u) => getSubscriptionStatus(u) === "active").length,
    inactive: users.filter((u) => ["expired", "rejected"].includes(getSubscriptionStatus(u))).length,
    free: users.filter((u) => getSubscriptionStatus(u) === "free").length,
  };

  const stats = [
    { label: "إجمالي المستخدمين", value: counts.total, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "مشترك", value: counts.active, icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50" },
    { label: "غير مفعّل", value: counts.inactive, icon: CalendarClock, color: "text-amber-600 bg-amber-50" },
    { label: "مجاني", value: counts.free, icon: Crown, color: "text-muted-foreground bg-muted" },
  ];

  const quickToggle = async (u) => {
    setToggling(u.id);
    const plan = getSubscriptionPlan(u);
    const willActivate = plan === "free" || getSubscriptionStatus(u) === "expired";
    try {
      if (willActivate) {
        // إعادة تفعيل بناءً على الخطة المخزّنة أو "فصل دراسي" افتراضياً
        const newPlan = plan === "free" ? "semester" : plan;
        const months = newPlan === "year" ? 12 : 4;
        const start = new Date().toISOString().slice(0, 10);
        const end = new Date(); end.setMonth(end.getMonth() + months);
        const pending = pendingByUser.get(u.id);
        await base44.functions.invoke("manageUserSubscription", {
          user_id: u.id,
          subscription_plan: newPlan,
          subscription_start: start,
          subscription_end: end.toISOString().slice(0, 10),
          account_type: "subscriber",
          subscription_status: "active",
          request_id: pending?.id,
          request_status: pending ? "active" : undefined,
        });
        toast.success("تم تفعيل الاشتراك ✅");
      } else {
        await base44.functions.invoke("manageUserSubscription", {
          user_id: u.id,
          account_type: "free",
          subscription_status: "free",
        });
        toast.success("تم إيقاف الاشتراك");
      }
      qc.invalidateQueries(["users"]);
      qc.invalidateQueries(["subscriptions"]);
    } catch {
      toast.error("تعذر تحديث الاشتراك");
    } finally {
      setToggling(null);
    }
  };

  const UserRow = ({ u, showSchool }) => {
    const status = getSubscriptionStatus(u);
    const plan = getSubscriptionPlan(u);
    const linkedPrincipal = u.ministry_number ? principalByMinNum.get(u.ministry_number) : null;
    return (
      <button
        onClick={() => setSelected(u)}
        className="flex items-center gap-3 p-3 w-full text-right hover:bg-muted/40 transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-white font-bold text-xs shrink-0">
          {(u.display_name || u.full_name || u.email || "؟").slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm truncate">{u.display_name || u.full_name || "بدون اسم"}</p>
            <Badge className={`text-[9px] h-4 px-1.5 shrink-0 ${STATUS_TONES[status]}`}>{STATUS_LABELS[status]}</Badge>
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 shrink-0">{PLAN_LABELS[plan]}</Badge>
            {u.role !== "admin" && (
              <Badge
                variant="secondary"
                className="text-[9px] h-4 px-1.5 shrink-0 cursor-pointer hover:bg-primary/10"
                onClick={(e) => { e.stopPropagation(); setRoleEditUser(u); }}
                title="تغيير الدور"
              >
                {appRoleLabel(u)}
              </Badge>
            )}
            <Pencil className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground mt-0.5">
            {u.phone && <span className="rounded-full bg-muted px-2 py-0.5">جوال: {u.phone}</span>}
            {u.specialization && <span className="rounded-full bg-muted px-2 py-0.5">تخصص: {u.specialization}</span>}
            {(showSchool || u.ministry_number) && (
              <span className="rounded-full bg-muted px-2 py-0.5">
                {u.ministry_number ? `وزاري: ${u.ministry_number}` : ""}
                {linkedPrincipal ? ` · ${linkedPrincipal.full_name || linkedPrincipal.display_name || "مدير"}` : ""}
              </span>
            )}
          </div>
        </div>
        {pendingByUser.get(u.id) && (
          <span
            className="relative shrink-0"
            title={`طلب اشتراك: ${PLAN_LABELS[pendingByUser.get(u.id).plan] || ""}`}
          >
            <BellRing className="w-4 h-4 text-amber-600" />
            <span className="absolute -top-1.5 -left-1.5 bg-amber-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">!</span>
          </span>
        )}
        {u.role !== "admin" && (
          <div onClick={(e) => { e.stopPropagation(); }}>
            <Switch
              checked={status === "active"}
              onCheckedChange={() => quickToggle(u)}
              disabled={toggling === u.id}
            />
          </div>
        )}
      </button>
    );
  };

  const SectionCard = ({ icon: Icon, title, count, children }) => (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="w-4 h-4 text-primary" /> {title}
        </CardTitle>
        <Badge variant="secondary" className="text-[10px]">{count}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        {children}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-28 px-4" dir="rtl">
      <PageHeader
        title="إدارة المستخدمين والاشتراكات"
        description="إدارة حسابات المستخدمين وتفعيل الاشتراكات وتحديد أنواعها ومواعيدها"
        actions={
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Button
                variant={showPendingOnly ? "default" : "outline"}
                size="icon"
                onClick={() => setShowPendingOnly((v) => !v)}
                className="relative"
                title="طلبات اشتراك معلّقة"
              >
                <BellRing className="w-4 h-4" />
                <span className="absolute -top-1.5 -left-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                  {pendingCount}
                </span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/school-links")} className="gap-1.5">
              <School className="w-4 h-4" /> إدارة ربط المدارس
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/settings")} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> رجوع
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-indigo-600 bg-indigo-50">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold">{schoolsCount}</div>
              <div className="text-xs text-muted-foreground">المدارس المسجلة</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-purple-600 bg-purple-50">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold">{principals.length}</div>
              <div className="text-xs text-muted-foreground">مديرو المدارس</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-teal-600 bg-teal-50">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold">{teachers.length}</div>
              <div className="text-xs text-muted-foreground">المعلمون</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو البريد الإلكتروني..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10 h-10"
        />
      </div>

      <SubscriptionRequests requests={pendingSubs} users={users} />

      {isLoading ? (
        <p className="text-center text-muted-foreground py-10">جارٍ التحميل...</p>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد مستخدمون" />
      ) : (
        <div className="space-y-4">
          {/* مديرو النظام */}
          {admins.length > 0 && (
            <SectionCard icon={Crown} title="مديرو النظام" count={admins.length}>
              <div className="divide-y divide-border">
                {admins.map((u) => <UserRow key={u.id} u={u} />)}
              </div>
            </SectionCard>
          )}

          {/* مديرو المدارس والمستخدمون التابعون لهم */}
          {principals.map((p) => (
            <SectionCard
              key={p.id}
              icon={School}
              title={`مدير المدرسة: ${p.display_name || p.full_name || "—"}`}
              count={(grouped[p.id] || []).length + 1}
            >
              <div className="divide-y divide-border">
                <UserRow u={p} />
                {(grouped[p.id] || []).map((u) => <UserRow key={u.id} u={u} showSchool />)}
              </div>
            </SectionCard>
          ))}

          {/* مستخدمون غير مرتبطين بمدير مدرسة */}
          {ungrouped.length > 0 && (
            <SectionCard icon={UserCircle} title="مستخدمون غير مرتبطين" count={ungrouped.length}>
              <div className="divide-y divide-border">
                {ungrouped.map((u) => <UserRow key={u.id} u={u} />)}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center">
        <CalendarClock className="w-3.5 h-3.5" />
        يحوّل النظام تلقائياً الاشتراكات المنتهية إلى (غير مفعّل) بصلاحيات مجانية (عدا مدير النظام).
      </p>

      <AuditLogPanel />

      <UserSubscriptionDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        user={selected}
        principals={principals}
      />
      <RoleEditDialog open={!!roleEditUser} onOpenChange={(o) => !o && setRoleEditUser(null)} user={roleEditUser} me={me} />
    </div>
  );
}