import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Inbox } from "lucide-react";
import { toast } from "sonner";
import { PLAN_LABELS, PLAN_DURATION_MONTHS } from "@/lib/permissions";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("ar-SA-u-ca-gregory") : "—");

export default function SubscriptionRequests({ requests = [], users = [] }) {
  const qc = useQueryClient();
  const [acting, setActing] = useState(null);
  const userById = new Map(users.map((u) => [u.id, u]));

  const approve = async (req) => {
    setActing(req.id);
    try {
      const months = PLAN_DURATION_MONTHS[req.plan] || 4;
      const start = new Date().toISOString().slice(0, 10);
      const end = new Date();
      end.setMonth(end.getMonth() + months);
      await base44.functions.invoke("manageUserSubscription", {
        user_id: req.created_by_id,
        subscription_plan: req.plan,
        subscription_start: start,
        subscription_end: end.toISOString().slice(0, 10),
        account_type: "subscriber",
        subscription_status: "active",
        request_id: req.id,
        request_status: "active",
      });
      toast.success("تمت الموافقة على الطلب وتفعيل الاشتراك ✅");
      qc.invalidateQueries(["users"]);
      qc.invalidateQueries(["subscriptions"]);
    } catch {
      toast.error("تعذر تنفيذ الموافقة");
    } finally {
      setActing(null);
    }
  };

  const reject = async (req) => {
    setActing(req.id);
    try {
      await base44.functions.invoke("manageUserSubscription", {
        user_id: req.created_by_id,
        subscription_plan: "free",
        subscription_start: null,
        subscription_end: null,
        account_type: "free",
        subscription_status: "rejected",
        request_id: req.id,
        request_status: "rejected",
      });
      toast.success("تم رفض الطلب");
      qc.invalidateQueries(["users"]);
      qc.invalidateQueries(["subscriptions"]);
    } catch {
      toast.error("تعذر رفض الطلب");
    } finally {
      setActing(null);
    }
  };

  if (requests.length === 0) return null;

  return (
    <Card className="border-primary/30">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Inbox className="w-4 h-4 text-primary" /> طلبات الاشتراك
          <Badge variant="secondary" className="text-[10px]">{requests.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {requests.map((req) => {
            const u = userById.get(req.created_by_id);
            return (
              <div key={req.id} className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {(u?.display_name || u?.full_name || u?.email || "؟").slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{u?.display_name || u?.full_name || "بدون اسم"}</p>
                  <p className="text-xs text-muted-foreground truncate">{u?.email}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">{PLAN_LABELS[req.plan]}</Badge>
                    <span className="text-[10px] text-muted-foreground">تاريخ الطلب: {fmtDate(req.created_date)}</span>
                    <Badge className="text-[9px] h-4 px-1.5 bg-amber-50 text-amber-700 border-amber-200">قيد المراجعة</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="success" className="h-8 gap-1 px-3" onClick={() => approve(req)} disabled={acting === req.id}>
                    <Check className="w-3.5 h-3.5" /> موافقة
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8 gap-1 px-3" onClick={() => reject(req)} disabled={acting === req.id}>
                    <X className="w-3.5 h-3.5" /> رفض
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}