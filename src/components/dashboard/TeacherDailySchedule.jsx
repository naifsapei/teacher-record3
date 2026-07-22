import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, BookOpen, GraduationCap, CalendarX } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday"];
const DAY_LABELS = {
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
};

export default function TeacherDailySchedule() {
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers"], queryFn: () => base44.entities.Teacher.list() });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: schedule = [] } = useQuery({ queryKey: ["lesson-schedule"], queryFn: () => base44.entities.LessonSchedule.list() });

  const todayKey = useMemo(() => {
    const jsDay = new Date().getDay();
    return DAY_KEYS[jsDay] || null; // 0-4 mapped; 5,6 weekend
  }, []);

  const myTeacher = useMemo(
    () => teachers.find((t) => t.user_id === me?.id || t.email === me?.email) || null,
    [teachers, me]
  );

  const todayLessons = useMemo(() => {
    if (!myTeacher || !todayKey) return [];
    return schedule
      .filter((l) => l.teacher_id === myTeacher.id && l.day_of_week === todayKey)
      .sort((a, b) => (a.period || 0) - (b.period || 0));
  }, [schedule, myTeacher, todayKey]);

  const className = (id) => classes.find((c) => c.id === id)?.name || "—";
  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || "—";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          جدول الحصص اليومي
          {todayKey && <span className="text-sm font-normal text-muted-foreground">— {DAY_LABELS[todayKey]}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!todayKey ? (
          <EmptyState
            icon={CalendarX}
            title="عطلة نهاية الأسبوع"
            description="لا توجد حصص اليوم"
          />
        ) : todayLessons.length === 0 ? (
          <EmptyState
            icon={CalendarX}
            title="لا توجد حصص اليوم"
            description={myTeacher ? "لم يتم إضافة جدول حصص لك بعد" : "لم يتم ربط حسابك بملف معلم"}
          />
        ) : (
          <div className="space-y-2">
            {todayLessons.map((lesson, idx) => (
              <div
                key={lesson.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold shrink-0">
                  {lesson.period || idx + 1}
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{className(lesson.class_id)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <GraduationCap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{subjectName(lesson.subject_id)}</span>
                  </div>
                  {lesson.start_time && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground truncate">{lesson.start_time}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}