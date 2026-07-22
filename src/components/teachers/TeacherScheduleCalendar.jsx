import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

const DAYS = [
  { key: "sunday", label: "الأحد" },
  { key: "monday", label: "الاثنين" },
  { key: "tuesday", label: "الثلاثاء" },
  { key: "wednesday", label: "الأربعاء" },
  { key: "thursday", label: "الخميس" },
];

export default function TeacherScheduleCalendar({ teacher, classes, subjects }) {
  const { data: schedule = [] } = useQuery({
    queryKey: ["lesson-schedule"],
    queryFn: () => base44.entities.LessonSchedule.list(),
  });

  const myLessons = useMemo(
    () => schedule.filter((l) => l.teacher_id === teacher.id),
    [schedule, teacher.id]
  );

  const maxPeriod = useMemo(() => {
    const m = myLessons.reduce((mx, l) => Math.max(mx, l.period || 0), 0);
    return Math.max(m, 1);
  }, [myLessons]);

  const grid = useMemo(() => {
    const map = {};
    myLessons.forEach((l) => {
      map[`${l.day_of_week}-${l.period}`] = l;
    });
    return map;
  }, [myLessons]);

  const className = (id) => classes.find((c) => c.id === id)?.name || "—";
  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || "—";

  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> الجدول الأسبوعي للحصص
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {myLessons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">لا توجد حصص مجدولة لهذا المعلم</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th className="border border-border bg-muted/50 p-2 text-xs font-bold text-muted-foreground w-16">الحصة</th>
                  {DAYS.map((day) => (
                    <th key={day.key} className="border border-border bg-muted/50 p-2 text-xs font-bold text-primary">
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period}>
                    <td className="border border-border bg-muted/30 p-2 text-center text-xs font-bold text-muted-foreground">
                      {period}
                    </td>
                    {DAYS.map((day) => {
                      const lesson = grid[`${day.key}-${period}`];
                      if (!lesson) {
                        return <td key={day.key} className="border border-border p-1.5 bg-muted/10" />;
                      }
                      return (
                        <td key={day.key} className="border border-border p-1.5 align-top">
                          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2 space-y-1">
                            <p className="text-xs font-bold text-primary leading-tight">{subjectName(lesson.subject_id)}</p>
                            <p className="text-xs text-muted-foreground leading-tight">{className(lesson.class_id)}</p>
                            {lesson.start_time && (
                              <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" /> {lesson.start_time}
                              </p>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}