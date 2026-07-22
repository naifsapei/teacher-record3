import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarCheck, Star, ClipboardList, Award, CheckCircle2, XCircle, Clock } from "lucide-react";
import { getEvalIcon, getCategory } from "./evalIcons";
import StudentAvatar from "@/components/students/StudentAvatar";

const ATT_LABEL = {
  present: "حاضر", absent: "غائب", late: "متأخر", excused: "بعذر",
};
const ATT_COLOR = {
  present: "bg-emerald-50 text-emerald-600",
  absent: "bg-rose-50 text-rose-600",
  late: "bg-amber-50 text-amber-600",
  excused: "bg-blue-50 text-blue-600",
};

function subjectName(subjects, id) {
  return subjects.find((s) => s.id === id)?.name || "—";
}

export default function StudentAchievementProfile({ student, open, onClose, subjects }) {
  const [subjectFilter, setSubjectFilter] = useState("all");

  const { data: attendance = [] } = useQuery({
    enabled: !!student?.id && open,
    queryKey: ["student-profile", student?.id, "attendance"],
    queryFn: () => base44.entities.Attendance.filter({ student_id: student.id }),
  });
  const { data: tracking = [] } = useQuery({
    enabled: !!student?.id && open,
    queryKey: ["student-profile", student?.id, "tracking"],
    queryFn: () => base44.entities.TrackingRecord.filter({ student_id: student.id }),
  });
  const { data: grades = [] } = useQuery({
    enabled: !!student?.id && open,
    queryKey: ["student-profile", student?.id, "grades"],
    queryFn: () => base44.entities.Grade.filter({ student_id: student.id }),
  });
  const { data: achievements = [] } = useQuery({
    enabled: !!student?.id && open,
    queryKey: ["student-profile", student?.id, "achievements"],
    queryFn: () => base44.entities.Achievement.filter({ student_id: student.id }),
  });

  const filt = (arr, key = "subject_id") =>
    subjectFilter === "all" ? arr : arr.filter((r) => r[key] === subjectFilter);

  const filteredTracking = useMemo(() => filt(tracking).sort((a, b) => (a.date < b.date ? 1 : -1)), [tracking, subjectFilter]);
  const filteredGrades = useMemo(() => filt(grades), [grades, subjectFilter]);
  const filteredAchievements = useMemo(
    () => achievements.slice().sort((a, b) => (a.date < b.date ? 1 : -1)),
    [achievements]
  );
  const sortedAttendance = useMemo(
    () => attendance.slice().sort((a, b) => (a.date < b.date ? 1 : -1)),
    [attendance]
  );

  const totalPoints = tracking.reduce((s, r) => s + (r.points || 0), 0);

  const { data: me } = useQuery({
    enabled: open,
    queryKey: ["me"],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <StudentAvatar me={me} student={student} size="h-12 w-12" />
            <div>
              <DialogTitle className="text-lg">ملف إنجاز الطالب</DialogTitle>
              <p className="text-sm text-muted-foreground">{student?.name}</p>
            </div>
            <div className="mr-auto text-left">
              <span className="text-[10px] text-muted-foreground">إجمالي النقاط</span>
              <p className="text-lg font-bold text-primary">{totalPoints}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center gap-2 my-3">
          <span className="text-xs text-muted-foreground">المادة:</span>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المواد</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="tracking">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="tracking" className="text-xs gap-1"><Star className="h-3.5 w-3.5" />التقييمات</TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs gap-1"><CalendarCheck className="h-3.5 w-3.5" />الحضور</TabsTrigger>
            <TabsTrigger value="grades" className="text-xs gap-1"><ClipboardList className="h-3.5 w-3.5" />أعمال السنة</TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs gap-1"><Award className="h-3.5 w-3.5" />الإنجازات</TabsTrigger>
          </TabsList>

          {/* التقييمات */}
          <TabsContent value="tracking" className="mt-3 space-y-1.5 max-h-72 overflow-y-auto">
            {filteredTracking.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">لا توجد تقييمات</p>
            ) : (
              filteredTracking.map((r) => {
                const cat = getCategory(r.category);
                const Icon = getEvalIcon(r.icon_key);
                return (
                  <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                    <span className={`h-7 w-7 rounded-full flex items-center justify-center text-white ${cat.bg}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 text-xs font-medium">{r.action_label}</span>
                    <span className="text-[10px] text-muted-foreground">{subjectName(subjects, r.subject_id)}</span>
                    <span className="text-[10px] text-muted-foreground">{r.date}</span>
                    <span className={`text-xs font-bold ${cat.text}`}>{r.points > 0 ? "+" : ""}{r.points}</span>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* الحضور */}
          <TabsContent value="attendance" className="mt-3 space-y-1.5 max-h-72 overflow-y-auto">
            {sortedAttendance.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">لا توجد سجلات حضور</p>
            ) : (
              sortedAttendance.map((a) => (
                <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 text-xs font-medium">{a.date}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${ATT_COLOR[a.status] || ""}`}>
                    {ATT_LABEL[a.status] || a.status}
                  </span>
                </div>
              ))
            )}
          </TabsContent>

          {/* أعمال السنة */}
          <TabsContent value="grades" className="mt-3 space-y-3 max-h-72 overflow-y-auto">
            {filteredGrades.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">لا توجد درجات مسجلة</p>
            ) : (
              filteredGrades.map((g) => {
                const subj = subjects.find((s) => s.id === g.subject_id);
                const rows = [
                  ["المشاركة", g.participation, subj?.participation_max || 10],
                  ["الواجبات", g.homework, subj?.homework_max || 10],
                  ["النشاط الصفي", g.class_activity, subj?.class_activity_max || 10],
                  ["البحوث", g.research, subj?.research_max || 10],
                  ["الاختبار التحريري", g.written_exam, subj?.written_exam_max || 30],
                  ["الاختبار العملي", g.practical_exam, subj?.practical_exam_max || 30],
                ];
                return (
                  <div key={g.id} className="p-2 rounded-lg bg-muted/40">
                    <p className="text-xs font-bold mb-1.5">{subjectName(subjects, g.subject_id)}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {rows.map(([label, val, max]) => (
                        <div key={label} className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-semibold">{val || 0}/{max}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* الإنجازات */}
          <TabsContent value="achievements" className="mt-3 space-y-1.5 max-h-72 overflow-y-auto">
            {filteredAchievements.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">لا توجد إنجازات مسجلة</p>
            ) : (
              filteredAchievements.map((a) => (
                <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                  {a.type === "skill" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Award className="h-4 w-4 text-amber-500" />
                  )}
                  <div className="flex-1">
                    <p className="text-xs font-medium">{a.title}</p>
                    {a.notes && <p className="text-[10px] text-muted-foreground">{a.notes}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{a.date}</span>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}