import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminAlerts from "@/components/admin/AdminAlerts";
import AdminCharts from "@/components/admin/AdminCharts";
import AdminFilters from "@/components/admin/AdminFilters";
import JoinRequestsSection from "@/components/principal/JoinRequestsSection";
import {
  getSubscriptionStatus, getSubscriptionPlan, STATUS_LABELS, STATUS_TONES, appRoleLabel,
} from "@/lib/permissions";
import { toast } from "sonner";
import {
  ShieldAlert, ChevronLeft, RefreshCw, School, GraduationCap, ShieldCheck, Compass,
  ClipboardList, Users, Backpack, UserCheck, UserX, BadgeCheck, CalendarClock,
  Building2, Building, CalendarX, Sparkles, UsersRound, FileText, ScrollText,
} from "lucide-react";

const DAY = 86400000;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const detailsRef = useRef(null);
  const [filters, setFilters] = useState({ school: "all", role: "all", status: "all", plan: "all", date: "all" });
  const [toggling, setToggling] = useState(null);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: users = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list(), refetchInterval: 30000 });
  const { data: students = [] } = useQuery({ queryKey: ["students-all"], queryFn: () => base44.entities.Student.list(), refetchInterval: 30000 });
  const { data: subs = [] } = useQuery({ queryKey: ["subscriptions-all"], queryFn: () => base44.entities.Subscription.filter({}), refetchInterval: 30000 });

  const pendingByUser = useMemo(() => new Map(subs.filter((s) => s.status === "pending").map((s) => [s.created_by_id, s])), [subs]);

  const principals = useMemo(() => users.filter((u) => u.app_role === "principal" && u.role !== "admin"), [users]);

  const schools = useMemo(() => {
    const map = new Map();
    principals.forEach((p) => {
      const key = p.ministry_number || `__${p.id}`;
      map.set(key, { ministry_number: p.ministry_number, school_name: p.school_name, principal: p, users: [p] });
    });
    users.forEach((u) => {
      if (u.role === "admin") return;
      const key = u.ministry_number ? u.ministry_number : `__${u.id}`;
      if (key.startsWith("__") && !map.has(key)) return;
      if (map.has(key) && !map.get(key).users.includes(u)) map.get(key).users.push(u);
    });
    return Array.from(map.values());
  }, [users, principals]);

  const statusOf = (u) => getSubscriptionStatus(u);

  const counts = useMemo(() => {
    const activeUsers = users.filter((u) => ["active", "admin"].includes(statusOf(u))).length;
    const inactiveUsers = users.length - activeUsers;
    const activeSubs = users.filter((u) => statusOf(u) === "active").length;
    const expiredSubs = users.filter((u) => statusOf(u) === "expired").length;
    const activeSchools = schools.filter((s) => statusOf(s.principal) === "active").length;
    const inactiveSchools = schools.length - activeSchools;
    return {
      schools: schools.length,
      teachers: users.filter((u) => u.app_role === "teacher" && u.role !== "admin").length,
      principals: principals.length,
      counselors: users.filter((u) => u.app_role === "student_counselor").length,
      studentAffairs: users.filter((u) => u.app_role === "student_affairs").length,
      teacherAffairs: users.filter((u) => u.app_role === "teacher_affairs").length,
      students: students.length,
      activeUsers, inactiveUsers, activeSubs, expiredSubs, activeSchools, inactiveSchools,
    };
  }, [users, students, schools, principals]);

  const scrollToDetails = () => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const applyFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setTimeout(scrollToDetails, 50); };

  const statCards = [
    { label: "المدارس المسجلة", value: counts.schools, icon: School, color: "text-blue-600 bg-blue-50", onClick: () => applyFilter({ role: "principal", status: "all" }) },
    { label: "المعلمون", value: counts.teachers, icon: GraduationCap, color: "text-teal-600 bg-teal-50", onClick: () => applyFilter({ role: "teacher" }) },
    { label: "مديرو المدارس", value: counts.principals, icon: ShieldCheck, color: "text-purple-600 bg-purple-50", onClick: () => applyFilter({ role: "principal" }) },
    { label: "الموجهون الطلابيون", value: counts.counselors, icon: Compass, color: "text-orange-600 bg-orange-50", onClick: () => applyFilter({ role: "student_counselor" }) },
    { label: "وكلاء شؤون الطلاب", value: counts.studentAffairs, icon: ClipboardList, color: "text-amber-600 bg-amber-50", onClick: () => applyFilter({ role: "student_affairs" }) },
    { label: "وكلاء شؤون المعلمين", value: counts.teacherAffairs, icon: UsersRound, color: "text-cyan-600 bg-cyan-50", onClick: () => applyFilter({ role: "teacher_affairs" }) },
    { label: "الطلاب", value: counts.students, icon: Backpack, color: "text-green-600 bg-green-50", onClick: () => navigate("/students") },
    { label: "المستخدمون النشطون", value: counts.activeUsers, icon: UserCheck, color: "text-emerald-600 bg-emerald-50", onClick: () => applyFilter({ status: "active" }) },
    { label: "المستخدمون غير النشطين", value: counts.inactiveUsers, icon: UserX, color: "text-red-600 bg-red-50", onClick: () => applyFilter({ status: "inactive" }) },
    { label: "اشتراكات نشطة", value: counts.activeSubs, icon: BadgeCheck, color: "text-emerald-600 bg-emerald-50", onClick: () => applyFilter({ status: "active" }) },
    { label: "اشتراكات منتهية", value: counts.expiredSubs, icon: CalendarClock, color: "text-amber-600 bg-amber-50", onClick: () => applyFilter({ status: "expired" }) },
    { label: "مدارس مفعّلة", value: counts.activeSchools, icon: Building2, color: "text-emerald-600 bg-emerald-50", sub: `غير مفعّلة: ${counts.inactiveSchools}`, subTone: "text-rose-600", onClick: () => applyFilter({ role: "principal", status: "active" }) },
  ];

  // Alerts
  const now = Date.now();
  const alerts = useMemo(() => {
    const newSchools = schools.filter((s) => s.principal.created_date && (now - new Date(s.principal.created_date).getTime()) < 7 * DAY);
    const nearExpiry = users.filter((u) => {
      if (statusOf(u) !== "active") return false;
      const end = u.subscription_end ? new Date(u.subscription_end).getTime() : null;
      return end && (end - now) > 0 && (end - now) < 7 * DAY;
    });
    const expired = users.filter((u) => statusOf(u) === "expired");
    const inactiveU = users.filter((u) => !["active", "admin"].includes(statusOf(u)));
    const inactiveS = schools.filter((s) => statusOf(s.principal) !== "active");
    const name = (u) => u.display_name || u.full_name || u.email || "—";
    return [
      { key: "new", icon: Sparkles, color: "text-blue-600 bg-blue-50", title: "مدارس جديدة", count: newSchools.length, preview: newSchools.map((s) => s.school_name || s.ministry_number || "—").slice(0, 4), onClick: () => applyFilter({ role: "principal", date: "7d" }) },
      { key: "near", icon: CalendarClock, color: "text-amber-600 bg-amber-50", title: "اشتراكات قريبة من الانتهاء", count: nearExpiry.length, preview: nearExpiry.map(name).slice(0, 4), onClick: () => applyFilter({ status: "active" }) },
      { key: "expired", icon: CalendarX, color: "text-red-600 bg-red-50", title: "اشتراكات منتهية", count: expired.length, preview: expired.map(name).slice(0, 4), onClick: () => applyFilter({ status: "expired" }) },
      { key: "inactiveU", icon: UserX, color: "text-rose-600 bg-rose-50", title: "مستخدمون غير مفعّلين", count: inactiveU.length, preview: inactiveU.map(name).slice(0, 4), onClick: () => applyFilter({ status: "inactive" }) },
      { key: "inactiveS", icon: Building, color: "text-orange-600 bg-orange-50", title: "مدارس غير نشطة", count: inactiveS.length, preview: inactiveS.map((s) => s.school_name || s.ministry_number || "—").slice(0, 4), onClick: () => applyFilter({ role: "principal", status: "inactive" }) },
    ].filter((a) => a.count > 0);
  }, [users, schools, now]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (filters.school !== "all") {
        const key = u.ministry_number ? u.ministry_number : `__${u.id}`;
        if (key !== filters.school) return false;
      }
      if (filters.role !== "all") {
        if (filters.role === "admin" && u.role !== "admin") return false;
        if (filters.role !== "admin" && u.app_role !== filters.role) return false;
      }
      if (filters.status !== "all") {
        const s = statusOf(u);
        if (filters.status === "active" && !["active", "admin"].includes(s)) return false;
        if (filters.status === "inactive" && ["active", "admin"].includes(s)) return false;
        if (!["active", "inactive"].includes(filters.status) && s !== filters.status) return false;
      }
      if (filters.plan !== "all" && getSubscriptionPlan(u) !== filters.plan) return false;
      if (filters.date !== "all") {
        const created = u.created_date ? new Date(u.created_date).getTime() : 0;
        const days = { "7d": 7, "30d": 30, "90d": 90, "year": 365 }[filters.date];
        if (!created || (now - created) > days * DAY) return false;
      }
      return true;
    });
  }, [users, filters, now]);

  const quickToggle = async (u) => {
    setToggling(u.id);
    const plan = getSubscriptionPlan(u);
    const willActivate = plan === "free" || statusOf(u) === "expired";
    try {
      if (willActivate) {
        const newPlan = plan === "free" ? "semester" : plan;
        const months = newPlan === "year" ? 12 : 4;
        const start = new Date().toISOString().slice(0, 10);
        const end = new Date(); end.setMonth(end.getMonth() + months);
        const pending = pendingByUser.get(u.id);
        await base44.functions.invoke("manageUserSubscription", {
          user_id: u.id, subscription_plan: newPlan, subscription_start: start,
          subscription_end: end.toISOString().slice(0, 10), account_type: "subscriber",
          subscription_status: "active", request_id: pending?.id, request_status: pending ? "active" : undefined,
        });
        toast.success("تم تفعيل الاشتراك ✅");
      } else {
        await base44.functions.invoke("manageUserSubscription", { user_id: u.id, account_type: "free", subscription_status: "free" });
        toast.success("تم إيقاف الاشتراك");
      }
      qc.invalidateQueries(["users"]);
      qc.invalidateQueries(["subscriptions-all"]);
    } catch {
      toast.error("تعذر تحديث الاشتراك");
    } finally {
      setToggling(null);
    }
  };

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

  const quickActions = [
    { label: "إدارة المستخدمين", icon: Users, onClick: () => navigate("/admin/users") },
    { label: "إدارة المدارس", icon: School, onClick: () => applyFilter({ role: "principal" }) },
    { label: "التقارير", icon: FileText, onClick: () => navigate("/reports") },
    { label: "السجلات", icon: ScrollText, onClick: () => navigate("/admin/users") },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-28 px-4" dir="rtl">
      <PageHeader
        title="لوحة معلومات مدير النظام"
        description="إحصائيات شاملة للنظام مع تحكم كامل ومتابعة فورية"
        actions={
          <Button variant="outline" size="sm" className="gap-1" onClick={() => { qc.invalidateQueries(["users"]); qc.invalidateQueries(["subscriptions-all"]); qc.invalidateQueries(["students-all"]); toast.success("تم تحديث البيانات"); }}>
            <RefreshCw className="w-4 h-4" /> تحديث
          </Button>
        }
      />

      <JoinRequestsSection />

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map((a) => {
          const Icon = a.icon;
          return (
            <Button key={a.label} variant="outline" className="h-auto py-3 justify-start gap-2 whitespace-normal text-right leading-tight" onClick={a.onClick}>
              <Icon className="w-5 h-5 text-primary shrink-0" /> <span className="text-xs sm:text-sm">{a.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {statCards.map((s) => <AdminStatCard key={s.label} {...s} />)}
      </div>

      {/* Alerts */}
      <div>
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> التنبيهات</h2>
        <AdminAlerts alerts={alerts} />
      </div>

      <div ref={detailsRef} className="scroll-mt-4 space-y-6">
        {/* Filters */}
        <AdminFilters filters={filters} setFilters={setFilters} schools={schools} />

        {/* Charts */}
        <AdminCharts users={filteredUsers} schools={schools} />

        {/* Management table */}
        <Card>
          <CardHeader className="py-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> إدارة المستخدمين والتفعيل</CardTitle>
            <Badge variant="secondary" className="text-[10px]">{filteredUsers.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-10">جارٍ التحميل...</p>
            ) : filteredUsers.length === 0 ? (
              <EmptyState icon={Users} title="لا يوجد مستخدمون مطابقون" description="عدّل عوامل التصفية" />
            ) : (
              <div className="divide-y divide-border max-h-[28rem] overflow-y-auto">
                {filteredUsers.slice(0, 100).map((u) => {
                  const s = statusOf(u);
                  return (
                    <div key={u.id} className="flex items-center gap-3 p-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {(u.display_name || u.full_name || u.email || "؟").slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium text-sm truncate">{u.display_name || u.full_name || "بدون اسم"}</p>
                          <Badge className={`text-[9px] h-4 px-1.5 ${STATUS_TONES[s]}`}>{STATUS_LABELS[s]}</Badge>
                          {u.role !== "admin" && <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{appRoleLabel(u)}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}{u.school_name ? ` · ${u.school_name}` : ""}</p>
                      </div>
                      {u.role !== "admin" && (
                        <Switch checked={s === "active"} onCheckedChange={() => quickToggle(u)} disabled={toggling === u.id} />
                      )}
                    </div>
                  );
                })}
                {filteredUsers.length > 100 && (
                  <p className="text-center text-xs text-muted-foreground py-3">عرض ١٠٠ من {filteredUsers.length} — استخدم الفلاتر لتضييق النطاق</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center">
        <CalendarClock className="w-3.5 h-3.5" />
        تُحدّث البيانات تلقائياً كل ٣٠ ثانية. يحوّل النظام الاشتراكات المنتهية تلقائياً إلى حساب مجاني (عدا مدير النظام).
      </p>
    </div>
  );
}