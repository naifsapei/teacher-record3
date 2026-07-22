import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getLinkStatus, LINK_STATUS_LABELS, LINK_STATUS_TONES, isTeacher, ministryNumber } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, UserPlus, ShieldCheck, Loader2, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";

export default function JoinSchoolSection({ me }) {
  const qc = useQueryClient();
  const status = getLinkStatus(me);
  const [ministryNumberVal, setMinistryNumberVal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  // هل يوجد طلب نقل/انضمام معلّق حالياً؟ (قبل أي إرجاع مبكر لاحترام قواعد الـ hooks)
  const { data: myRequests = [] } = useQuery({
    queryKey: ["my-join-requests", me?.id],
    queryFn: () => base44.entities.JoinRequest.filter({ requestor_id: me.id }).catch(() => []),
    enabled: !!me?.id,
  });

  // لا يُعرض لمدير النظام أو مدير المدرسة
  if (!me || me.role === "admin" || me.app_role === "principal") return null;

  const canRequest = status === "unlinked" || status === "independent" || status === "rejected";
  const canTransfer = status === "approved";
  const pendingRequest = myRequests.find((r) => r.status === "pending" && r.ministry_number && r.ministry_number !== ministryNumber(me));

  const submit = async (isTransfer = false) => {
    const mn = ministryNumberVal.trim();
    if (!mn) { toast.error("أدخل الرقم الوزاري للمدرسة"); return; }
    if (isTransfer && mn === ministryNumber(me)) {
      toast.error("الرقم الوزاري مطابق لمدرستك الحالية");
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("createJoinRequest", {
        ministry_number: mn,
        role: me.app_role,
        display_name: me.display_name,
        phone: me.phone,
        specialization: me.specialization,
        gender: me.gender,
        school_name: me.school_name,
        education_admin: me.education_admin,
        principal_name: me.principal_name,
      });
      toast.success(res?.data?.message || "تم إرسال الطلب إلى مدير المدرسة");
      setMinistryNumberVal("");
      setShowTransfer(false);
      qc.invalidateQueries(["me"]);
      qc.invalidateQueries(["my-join-requests", me?.id]);
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "تعذر إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2 mt-6">الارتباط بالمدرسة</p>
      <div className="py-3 space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">حالة الارتباط</span>
          </div>
          <Badge className={LINK_STATUS_TONES[status]}>{LINK_STATUS_LABELS[status]}</Badge>
        </div>

        {status === "approved" && (
          <>
            <p className="text-xs text-emerald-700 px-1">
              مرتبط بالمدرسة {me.school_name ? `«${me.school_name}»` : ""} — الرقم الوزاري: {ministryNumber(me) || "—"}
            </p>
            {!pendingRequest && !showTransfer && (
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setShowTransfer(true)}>
                <ArrowLeftRight className="h-4 w-4" /> طلب الانتقال إلى مدرسة أخرى
              </Button>
            )}
          </>
        )}

        {status === "pending" && (
          <p className="text-xs text-amber-700 px-1">
            طلبك قيد المراجعة من مدير المدرسة. ستظهر صلاحيات المدرسة وبياناتها بعد الموافقة.
          </p>
        )}

        {status === "rejected" && (
          <p className="text-xs text-red-700 px-1">تم رفض طلبك السابق. يمكنك إرسال طلب جديد أدناه.</p>
        )}

        {(status === "independent" || status === "unlinked") && (
          <p className="text-xs text-muted-foreground px-1">
            {isTeacher(me)
              ? "أنت تستخدم النظام كمعلم مستقل. للوصول إلى بيانات مدرسة، أرسل طلب انضمام بالرقم الوزاري للمدرسة."
              : "أنت غير مرتبط بمدرسة. للوصول إلى بيانات المدرسة، أرسل طلب انضمام بالرقم الوزاري."}
          </p>
        )}

        {pendingRequest && (status === "approved" || status === "pending") && (
          <p className="text-xs text-amber-700 px-1">
            لديك طلب معلّق للانضمام إلى مدرسة بالرقم الوزاري «{pendingRequest.ministry_number}»، بانتظار موافقة المدير.
          </p>
        )}

        {canRequest && !showTransfer && (
          <div className="rounded-xl border border-border p-3 space-y-3">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              طلب الانضمام إلى مدرسة
            </Label>
            <Input
              value={ministryNumberVal}
              onChange={(e) => setMinistryNumberVal(e.target.value)}
              placeholder="الرقم الوزاري للمدرسة"
              className="text-right"
            />
            <Button className="w-full gap-2" disabled={submitting} onClick={() => submit(false)}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />جارٍ الإرسال...</> : <><UserPlus className="h-4 w-4" />إرسال طلب الانضمام</>}
            </Button>
          </div>
        )}

        {canTransfer && showTransfer && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-3">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <ArrowLeftRight className="h-4 w-4 text-amber-600" />
              طلب الانتقال إلى مدرسة أخرى
            </Label>
            <p className="text-xs text-muted-foreground">
              أدخل الرقم الوزاري للمدرسة الجديدة. سيُرسل طلب لمديرها، وستبقى مرتبطاً بمدرستك الحالية حتى تتم الموافقة.
            </p>
            <Input
              value={ministryNumberVal}
              onChange={(e) => setMinistryNumberVal(e.target.value)}
              placeholder="الرقم الوزاري للمدرسة الجديدة"
              className="text-right"
            />
            <div className="flex gap-2">
              <Button className="flex-1 gap-2" disabled={submitting} onClick={() => submit(true)}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />جارٍ الإرسال...</> : <><ArrowLeftRight className="h-4 w-4" />إرسال طلب النقل</>}
              </Button>
              <Button variant="ghost" onClick={() => { setShowTransfer(false); setMinistryNumberVal(""); }}>إلغاء</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}