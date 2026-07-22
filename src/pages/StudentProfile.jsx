import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { calcTotal, calcEffMax, calcPct } from "@/lib/gradeCalc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, ClipboardList, CalendarCheck, Award, User, Printer } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import StudentAvatar from "@/components/students/StudentAvatar";
import PerformanceTrendChart from "@/components/student-profile/PerformanceTrendChart";
import SubjectComparisonChart from "@/components/student-profile/SubjectComparisonChart";
import StudentNotesSection from "@/components/student-profile/StudentNotesSection";
import BehavioralNotesSection from "@/components/student-profile/BehavioralNotesSection";
import GradeSectionSelect from "@/components/shared/GradeSectionSelect";

// calcTotal و calcEffMax و calcPct مستوردة من @/lib/gradeCalc (تحترم منطق الخانة الفارغة)

const gradeLabel = (pct) => (pct >= 90 ? "ممتاز" : pct >= 80 ? "جيد جداً" : pct >= 70 ? "جيد" : pct >= 60 ? "مقبول" : "ضعيف");

function KpiCard({ icon: Icon, label, value, tone }) {
  const tones = { primary: "text-primary bg-primary/10", green: "text-emerald-600 bg-emerald-50", blue: "text-blue-600 bg-blue-50", purple: "text-purple-600 bg-purple-50" };
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center gap-3 p-4">
        <span className={`h-11 w-11 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
      </CardContent>
    </Card>
  );
}

export default function StudentProfile() {
  const [gradeName, setGradeName] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");

  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: grades = [] } = useQuery({ queryKey: ["grades"], queryFn: () => base44.entities.Grade.list() });
  const { data: tracking = [] } = useQuery({ queryKey: ["tracking-records"], queryFn: () => base44.entities.TrackingRecord.list() });
  const { data: attendance = [] } = useQuery({ queryKey: ["attendance"], queryFn: () => base44.entities.Attendance.list() });
  const { data: achievements = [] } = useQuery({ queryKey: ["achievements"], queryFn: () => base44.entities.Achievement.list() });

  const classStudents = useMemo(() => students.filter((s) => s.class_id === classId), [students, classId]);
  const student = useMemo(() => students.find((s) => s.id === studentId) || null, [students, studentId]);

  const studentGrades = useMemo(() => {
    if (!student) return [];
    const classSubjects = subjects.filter((s) => s.class_id === student.class_id);
    return classSubjects.map((sub) => {
      const g = grades.find((gr) => gr.student_id === student.id && gr.subject_id === sub.id);
      if (!g) return null;
      const max = calcEffMax(g, sub);
      if (max === 0) return null;
      const total = calcTotal(g);
      const pct = calcPct(g, sub);
      return { sub, total, max, pct, grade: gradeLabel(pct) };
    }).filter(Boolean);
  }, [student, subjects, grades]);

  const studentTracking = useMemo(() => tracking.filter((r) => r.student_id === studentId), [tracking, studentId]);
  const studentAttendance = useMemo(() => attendance.filter((a) => a.student_id === studentId), [attendance, studentId]);
  const studentAchievements = useMemo(
    () => achievements.filter((a) => a.student_id === studentId).sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [achievements, studentId]
  );

  const overallAvg = useMemo(() => {
    const pcts = studentGrades.map((g) => g.pct);
    return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
  }, [studentGrades]);

  const attendanceRate = useMemo(() => {
    if (studentAttendance.length === 0) return 0;
    const present = studentAttendance.filter((a) => a.status === "present" || a.status === "late").length;
    return Math.round((present / studentAttendance.length) * 100);
  }, [studentAttendance]);

  const trackingPoints = useMemo(() => studentTracking.reduce((s, r) => s + (r.points || 0), 0), [studentTracking]);

  return (
    <div dir="rtl">
      <PageHeader
        title="سجل أداء الطالب"
        description="عرض تاريخي لدرجات الطالب وتطور مستواه عبر الفترات الدراسية"
        actions={
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" /> طباعة
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <GradeSectionSelect
          classes={classes}
          gradeName={gradeName}
          classId={classId}
          showAll={false}
          onChange={({ gradeName: g, classId: c }) => { setGradeName(g); setClassId(c); setStudentId(""); }}
          className="w-full sm:w-52"
        />
        {classId && (
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
            <SelectContent>
              {classStudents.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {!student ? (
        <EmptyState icon={User} title="اختر صفًا وطالباً" description="حدد الصف ثم الطالب لعرض سجل أدائه التاريخي" />
      ) : (
        <>
          <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl border border-border bg-card">
            <StudentAvatar me={me} student={student} size="h-20 w-20" />
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate">{student.name}</h2>
              <p className="text-sm text-muted-foreground">
                {classes.find((c) => c.id === student.class_id)?.name || "—"}
                {student.student_number ? ` · رقم الطالب ${student.student_number}` : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard icon={GraduationCap} label="المتوسط العام" value={`${overallAvg}%`} tone="green" />
            <KpiCard icon={CalendarCheck} label="نسبة الحضور" value={`${attendanceRate}%`} tone="blue" />
            <KpiCard icon={Award} label="الإنجازات" value={studentAchievements.length} tone="purple" />
            <KpiCard icon={ClipboardList} label="نقاط المتابعة" value={trackingPoints} tone="primary" />
          </div>

          <PerformanceTrendChart trackingRecords={studentTracking} />

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" /> الدرجات حسب المادة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentGrades.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">لا توجد درجات مسجلة</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المادة</TableHead>
                      <TableHead className="text-center">المجموع</TableHead>
                      <TableHead className="text-center">النسبة</TableHead>
                      <TableHead className="text-center">التقدير</TableHead>
                      <TableHead className="w-32">التقدم</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentGrades.map((row) => (
                      <TableRow key={row.sub.id}>
                        <TableCell className="font-medium">{row.sub.name}</TableCell>
                        <TableCell className="text-center">{row.total}/{row.max}</TableCell>
                        <TableCell className="text-center font-semibold">{row.pct}%</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${row.pct >= 80 ? "bg-emerald-50 text-emerald-600" : row.pct >= 60 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
                            {row.grade}
                          </span>
                        </TableCell>
                        <TableCell><Progress value={row.pct} className="h-2" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <SubjectComparisonChart
            student={student}
            subjects={subjects}
            grades={grades}
            classStudents={classStudents}
          />

          <BehavioralNotesSection studentId={student.id} classId={student.class_id} />

          <StudentNotesSection studentId={student.id} classId={student.class_id} />

          {studentAchievements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" /> سجل الإنجازات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {studentAchievements.map((ach) => (
                    <div key={ach.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                      <span className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center"><Award className="h-4 w-4 text-accent" /></span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{ach.title}</p>
                        <p className="text-xs text-muted-foreground">{ach.type === "skill" ? "مهارة" : "نشاط"} · {ach.date || "—"}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ach.status === "acquired" ? "bg-emerald-50 text-emerald-600" : ach.status === "in_progress" ? "bg-amber-50 text-amber-600" : "bg-muted text-muted-foreground"}`}>
                        {ach.status === "acquired" ? "مكتسب" : ach.status === "in_progress" ? "قيد التقدم" : "غير مكتسب"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}