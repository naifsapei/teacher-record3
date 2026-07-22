import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, UserX, Clock, Users } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS = {
  teacher: "معلم",
  student_affairs: "وكيل شؤون الطلاب",
  teacher_affairs: "وكيل شؤون المعلمين",
  student_counselor: "موجه طلابي",
};

export default function JoinRequestsSection() {
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["join-requests"],
    queryFn: () => base44.entities.JoinRequest.list("-created_date", 100),
  });
  const [busyId, setBusyId] = useState(null);

  const pending = requests.filter((r) => r.status === "pending");

  const handle = async (request, action) => {
    setBusyId(request.id);
    try {
      const res = await base44.functions.invoke("manageJoinRequest", { request_id: request.id, action });
      toast.success(res?.data?.message || (action === "approve" ? "تمت الموافقة على الطلب" : "تم رفض الطلب"));
      qc.invalidateQueries(["join-requests"]);
      qc.invalidateQueries(["teachers"]);
      qc.invalidateQueries(["me"]);
      qc.invalidateQueries(["users"]);
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "فشلت العملية");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="print:hidden mb-6 border-amber-200/70">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold">طلبات الانضمام للمدرسة</h2>
            <p className="text-xs text-muted-foreground">طلبات المعلمين والوكلاء المرتبطة برقم مدرستك الوزاري</p>
          </div>
          {pending.length > 0 && (
            <Badge className="mr-auto bg-amber-100 text-amber-700 border-amber-200">{pending.length} بانتظار المراجعة</Badge>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">جارٍ التحميل...</p>
        ) : pending.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            لا توجد طلبات انضمام معلّقة حالياً
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-border bg-card p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{r.display_name || r.requestor_name}</p>
                    <Badge variant="secondary" className="text-xs">{ROLE_LABELS[r.role] || r.role}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate" dir="ltr">{r.requestor_email}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    {r.specialization && <span>التخصص: {r.specialization}</span>}
                    {r.phone && <span dir="ltr">الجوال: {r.phone}</span>}
                    {r.school_name && <span>المدرسة: {r.school_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" className="gap-1.5" disabled={busyId === r.id} onClick={() => handle(r, "approve")}>
                    <UserCheck className="h-4 w-4" />
                    قبول
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" disabled={busyId === r.id} onClick={() => handle(r, "reject")}>
                    <UserX className="h-4 w-4" />
                    رفض
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}