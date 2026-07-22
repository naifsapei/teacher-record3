import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import {
  Building2, Users, ShieldAlert, ChevronLeft, Search, Loader2,
  CheckCircle2, XCircle, RefreshCw, School, UserMinus, AlertCircle, Pause, Wand2
} from "lucide-react";
import { toast } from "sonner";
import {
  APP_ROLE_LABELS, getLinkStatus, LINK_STATUS_LABELS, LINK_STATUS_TONES, ministryNumber
} from "@/lib/permissions";

export default function SchoolLinkManagement() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [acting, setActing] = useState(null);
  const [backfilling, setBackfilling] = useState(false);
  const [changeSchoolUser, setChangeSchoolUser] = useState(null);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });
  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: () => base44.entities.SchoolInfo.list(),
  });

  const schoolMap = useMemo(() => new Map(schools.map((s) => [s.id, s])), [schools]);
  const schoolByMinNum = useMemo(() => new Map(schools.map((s) => [s.ministry_number, s])), [schools]);

  const nonAdminUsers = useMemo(() => users.filter((u) => u.role !== "admin"), [users]);

  const displayUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return nonAdminUsers.filter((u) => {
      const status = getLinkStatus(u);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;
      return (
        (u.display_name || u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.ministry_number || "").includes(q)
      );
    });
  }, [nonAdminUsers, searchQuery, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = {};
    nonAdminUsers.forEach((u) => {
      const s = getLinkStatus(u);
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [nonAdminUsers]);

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

  const callManage = async (userId, action, extra = {}) => {
    setActing(userId + action);
    try {
      const res = await base44.functions.invoke("manageSchoolLink", { user_id: userId, action, ...extra });
      toast.success(res?.data?.message || "تمت العملية");
      qc.invalidateQueries(["users"]);
      qc.invalidateQueries(["me"]);
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "فشلت العملية");
    } finally {
      setActing(null);
    }
  };

  const runBackfill = async (dryRun) => {
    setBackfilling(true);
    try {
      const res = await base44.functions.invoke("backfillSchoolLinks", { dry_run: dryRun });
      toast.success(res?.data?.message || "تم التحديث");
      if (!dryRun) {
        qc.invalidateQueries(["users"]);
        qc.invalidateQueries(["schools"]);
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "فشل التحديث");
    } finally {
      setBackfilling(false);
    }
  };

  const matchedSchool = (u) => {
    if (u.school_id && schoolMap.has(u.school_id)) return schoolMap.get(u.school_id);
    const mn = ministryNumber(u);
    return mn ? schoolByMinNum.get(mn) : null;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-28 px-4" dir="rtl">
      <PageHeader
        title="إدارة ربط المدارس والمستخدمين"
        description="ربط المستخدمين بالمدارس عبر school_id المُتحقَّق منه من الرقم الوزاري، وإصلاح الروابط ومتابعة حالاتها"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={backfilling} onClick={() => runBackfill(true)} className="gap-1.5">
              {backfilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              معاينة التحديث
            </Button>
            <Button size="sm" disabled={backfilling} onClick={() => runBackfill(false)} className="gap-1.5">
              <RefreshCw className="h-4 w-4" /> تحديث الروابط
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> رجوع
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(LINK_STATUS_LABELS).map(([key, label]) => (
          <Card key={key}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${LINK_STATUS_TONES[key]}`}>
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold">{statusCounts[key] || 0}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو البريد أو الرقم الوزاري..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-10">
            <SelectValue placeholder="كل الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {Object.entries(LINK_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-10">جارٍ التحميل...</p>
      ) : displayUsers.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد مستخدمون مطابقون" />
      ) : (
        <div className="space-y-2">
          {displayUsers.map((u) => {
            const status = getLinkStatus(u);
            const school = matchedSchool(u);
            const mn = ministryNumber(u);
            return (
              <Card key={u.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(u.display_name || u.full_name || u.email || "؟").slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{u.display_name || u.full_name || "بدون اسم"}</p>
                        <Badge variant="outline" className="text-[10px]">{APP_ROLE_LABELS[u.app_role] || "—"}</Badge>
                        <Badge className={`text-[10px] ${LINK_STATUS_TONES[status]}`}>{LINK_STATUS_LABELS[status]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                      <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                        <p>الرقم الوزاري: <span className="font-medium">{mn || "—"}</span></p>
                        <p>المدرسة المطابقة: <span className="font-medium">{school?.school_name || "لا توجد"}</span>
                          {school?.principal_name ? ` (${school.principal_name})` : ""}</p>
                        <p>school_id: <span className="font-mono">{u.school_id || "—"}</span></p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" disabled={acting === u.id + "fix_link"}
                      onClick={() => callManage(u.id, "fix_link")}>
                      {acting === u.id + "fix_link" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                      إصلاح الربط
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" disabled={acting === u.id + "approve_manually"}
                      onClick={() => callManage(u.id, "approve_manually")}>
                      {acting === u.id + "approve_manually" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      اعتماد يدوي
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" disabled={acting === u.id + "change_school"}
                      onClick={() => setChangeSchoolUser(u)}>
                      <School className="h-3.5 w-3.5" /> تغيير المدرسة
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" disabled={acting === u.id + "make_independent"}
                      onClick={() => callManage(u.id, "make_independent")}>
                      {acting === u.id + "make_independent" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
                      تحويل لمستقل
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" disabled={acting === u.id + "resend_request"}
                      onClick={() => callManage(u.id, "resend_request")}>
                      <RefreshCw className="h-3.5 w-3.5" /> إعادة إرسال طلب
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" disabled={acting === u.id + "needs_review"}
                      onClick={() => callManage(u.id, "needs_review")}>
                      {acting === u.id + "needs_review" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertCircle className="h-3.5 w-3.5" />}
                      يحتاج مراجعة
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-destructive" disabled={acting === u.id + "suspend"}
                      onClick={() => callManage(u.id, "suspend")}>
                      {acting === u.id + "suspend" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                      إيقاف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {changeSchoolUser && (
        <ChangeSchoolDialog
          user={changeSchoolUser}
          schools={schools}
          onClose={() => setChangeSchoolUser(null)}
          onConfirm={(schoolId) => {
            callManage(changeSchoolUser.id, "change_school", { school_id: schoolId });
            setChangeSchoolUser(null);
          }}
        />
      )}
    </div>
  );
}

function ChangeSchoolDialog({ user, schools, onClose, onConfirm }) {
  const [selected, setSelected] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle className="text-base">تغيير مدرسة: {user.display_name || user.full_name || ""}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="h-10"><SelectValue placeholder="اختر المدرسة الجديدة" /></SelectTrigger>
            <SelectContent>
              {schools.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.school_name} — {s.ministry_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button disabled={!selected} onClick={() => onConfirm(selected)} className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> تأكيد التغيير
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}