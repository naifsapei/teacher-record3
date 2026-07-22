import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

const ACTION_LABELS = {
  role_change: "تغيير دور",
  permission_change: "تغيير صلاحية",
  account_toggle: "تبديل حساب",
  account_edit: "تعديل بيانات",
};

export default function AuditLogPanel() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 50),
  });

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="w-4 h-4 text-primary" /> سجل التدقيق
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-6 text-sm">جارٍ التحميل...</p>
        ) : logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">لا توجد عمليات مسجّلة</p>
        ) : (
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{log.target_user_name || "—"}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {ACTION_LABELS[log.action] || log.action}
                  </Badge>
                </div>
                {log.old_role && log.new_role && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {log.old_role} ← {log.new_role}
                  </p>
                )}
                {log.details && <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  بواسطة: {log.executor_name || "—"} · {log.created_date ? new Date(log.created_date).toLocaleString("ar-SA") : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}