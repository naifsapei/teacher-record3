import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/shared/EmptyState";
import { CheckCircle2 } from "lucide-react";

export default function AdminAlerts({ alerts }) {
  if (!alerts.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState icon={CheckCircle2} title="لا توجد تنبيهات" description="كل المؤشرات سليمة حالياً" />
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {alerts.map((a) => {
        const Icon = a.icon;
        return (
          <Card key={a.key} className={a.onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""} onClick={a.onClick}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${a.color}`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug line-clamp-2">{a.title}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">{a.count}</Badge>
              </div>
              <div className="space-y-1">
                {a.preview.map((p, i) => (
                  <p key={i} className="text-xs text-muted-foreground line-clamp-1">• {p}</p>
                ))}
                {a.count > a.preview.length && (
                  <p className="text-[11px] text-muted-foreground">+{a.count - a.preview.length} أخرى</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}