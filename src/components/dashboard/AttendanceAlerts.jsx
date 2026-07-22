import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export default function AttendanceAlerts({ students, classes }) {
  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance"],
    queryFn: () => base44.entities.Attendance.list(),
  });

  const alerts = useMemo(() => {
    if (!attendance.length || !students.length) return [];
    const byStudent = {};
    attendance.forEach((a) => {
      if (a.status !== "absent") return;
      (byStudent[a.student_id] ||= []).push(a);
    });

    const result = [];
    Object.keys(byStudent).forEach((sid) => {
      const recs = byStudent[sid].sort((a, b) => (a.date < b.date ? -1 : 1));
      if (recs.length <= 3) return;
      // current consecutive absent streak ending at the latest record
      let streak = 0;
      let lastDate = null;
      for (let i = recs.length - 1; i >= 0; i--) {
        if (recs[i].status === "absent") { streak++; lastDate = recs[i].date; }
        else break;
      }
      if (streak > 3) {
        const stu = students.find((s) => s.id === sid);
        if (!stu) return;
        const cls = classes.find((c) => c.id === stu.class_id);
        result.push({ student: stu, class: cls, streak, lastDate });
      }
    });
    return result.sort((a, b) => b.streak - a.streak);
  }, [attendance, students, classes]);

  return (
    <Card className="border-red-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          تنبيهات الغياب المتكرر
          {alerts.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {alerts.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600 py-2">
            <CheckCircle2 className="h-4 w-4" />
            لا يوجد طلاب تجاوزوا ثلاثة أيام غياب متتالية
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/50 p-3">
                <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{a.student.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.class?.name || "—"} · آخر غياب: {a.lastDate}
                  </p>
                </div>
                <div className="text-center shrink-0">
                  <p className="text-lg font-bold text-red-600">{a.streak}</p>
                  <p className="text-[10px] text-muted-foreground">أيام متتالية</p>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">
              يُنصح بالتواصل مع أولياء الأمور واتخاذ الإجراء المناسب لهذه الحالات.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}