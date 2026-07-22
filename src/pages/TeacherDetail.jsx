import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, BookOpen, GraduationCap, TrendingUp, ArrowRight, Phone, Mail, Hash, BadgeCheck, AlertCircle, CalendarCheck, MessageSquare } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import TeacherPerformanceReport from "@/components/principal/TeacherPerformanceReport";
import TeacherScheduleCalendar from "@/components/teachers/TeacherScheduleCalendar";
import { calcTeacherStats, bandColor } from "@/utils/teachersReport";
import { specializationsText, scopeBySchool } from "@/lib/permissions";

const FIELDS = ["participation", "homework", "class_activity", "research", "written_exam", "practical_exam"];
const MAX_FIELDS = ["participation_max", "homework_max", "class_activity_max", "research_max", "written_exam_max", "practical_exam_max"];
const calcTotal = (g) => FIELDS.reduce((s, k) => s + (g?.[k] || 0), 0);
const calcMax = (sub) => MAX_FIELDS.reduce((s, k) => s + (sub?.[k] || 0), 0) || 100;

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

export default function TeacherDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const teacherId = urlParams.get("id");

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers"], queryFn: () => base44.entities.Teacher.list() });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: grades = [] } = useQuery({ queryKey: ["grades"], queryFn: () => base44.entities.Grade.list() });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: attendance = [] } = useQuery({ queryKey: ["attendance"], queryFn: () => base44.entities.Attendance.list() });
  const { data: notes = [] } = useQuery({ queryKey: ["notes"], queryFn: () => base44.entities.Note.list().catch(() => []) });

  // توحيد التصفية مع لوحة مدير المدرسة: بيانات المدرسة النشطة فقط
  const scopedSubjects = useMemo(() => scopeBySchool(subjects, me), [subjects, me]);
  const scopedGrades = useMemo(() => scopeBySchool(grades, me), [grades, me]);
  const scopedStudents = useMemo(() => scopeBySchool(students, me), [students, me]);
  const scopedClasses = useMemo(() => scopeBySchool(classes, me), [classes, me]);
  const scopedAttendance = useMemo(() => scopeBySchool(attendance, me), [attendance, me]);

  const teacher = useMemo(() => teachers.find((t) => t.id === teacherId) || null, [teachers, teacherId]);
  const stats = useMemo(() => teacher ? calcTeacherStats(teacher, scopedSubjects, scopedGrades, scopedAttendance) : null, [teacher, scopedSubjects, scopedGrades, scopedAttendance]);

  const mySubjects = useMemo(() => scopedSubjects.filter((s) => s.teacher_id === teacherId), [scopedSubjects, teacherId]);
  const myClassIds = useMemo(() => new Set(mySubjects.map((s) => s.class_id).filter(Boolean)), [mySubjects]);
  const myClasses = useMemo(() => scopedClasses.filter((c) => myClassIds.has(c.id)), [scopedClasses, myClassIds]);
  const teacherNotes = useMemo(() => {
    if (!teacher) return [];
    return notes.filter((n) => n.recipient_id === teacher.user_id || n.sender_id === teacher.user_id || n.created_by_id === me?.id);
  }, [notes, teacher, me]);

  if (!teacherId || (!teacher && !teachers.length)) {
    return (
      <div>
        <PageHeader title="تفاصيل المعلم" actions={<Button variant="ghost" className="gap-1" onClick={() => navigate(-1)}><ArrowRight className="h-4 w-4" /> رجوع</Button>} />
        <EmptyState icon={Users} title="المعلم غير موجود" description="ربما تم حذفه أو أنك لا تملك صلاحية الوصول" />
      </div>
    );
  }

  if (!teacher) return <div className="p-8 text-sm text-muted-foreground">جارٍ التحميل...</div>;

  const att = stats.attendance || {};
  const attRate = stats.attendanceTotal > 0 ? Math.round(((att.present || 0) / stats.attendanceTotal) * 100) : 0;

  return (
    <div>
      <PageHeader
        title={teacher.name}
        description={`${specializationsText(teacher) || "معلم"} ${teacher.grade_level ? "· " + teacher.grade_level : ""}`}
        actions={<Button variant="ghost" className="gap-1" onClick={() => navigate(-1)}><ArrowRight className="h-4 w-4" /> رجوع</Button>}
      />

      {/* Teacher info */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="h-14 w-14 rounded-2xl bg-chart-4/10 flex items-center justify-center shrink-0">
              <Users className="h-7 w-7 text-chart-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h2 className="text-lg font-bold">{teacher.name}</h2>
                {teacher.user_id ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1"><BadgeCheck className="h-3 w-3" /> مرتبط</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> غير مرتبط</span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                {teacher.employee_number && <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> {teacher.employee_number}</span>}
                {specializationsText(teacher) && <span>التخصص: {specializationsText(teacher)}</span>}
                {teacher.grade_level && <span>المرحلة: {teacher.grade_level}</span>}
                {teacher.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {teacher.phone}</span>}
                {teacher.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {teacher.email}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={BookOpen} label="عدد المواد" value={stats.subjectCount} tone="blue" />
        <KpiCard icon={GraduationCap} label="عدد الصفوف" value={stats.classCount} tone="purple" />
        <KpiCard icon={Users} label="عدد الطلاب" value={stats.studentCount} tone="primary" />
        <KpiCard icon={TrendingUp} label="المتوسط العام" value={`${stats.avg}%`} tone="green" />
      </div>

      {/* Subjects table */}
      <Card className="mb-6">
        <CardHeader className="pb-2"><CardTitle className="text-base">المواد والصفوف</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">المادة</TableHead>
                  <TableHead className="text-right">الصف</TableHead>
                  <TableHead className="text-right">المرحلة</TableHead>
                  <TableHead className="text-center">عدد الطلاب</TableHead>
                  <TableHead className="text-center">المتوسط</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mySubjects.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">لا توجد مواد مرتبطة</TableCell></TableRow>
                ) : mySubjects.map((sub) => {
                  const cls = scopedClasses.find((c) => c.id === sub.class_id);
                  const subGrades = scopedGrades.filter((g) => g.subject_id === sub.id);
                  const pcts = subGrades.map((g) => { const max = calcMax(sub); return max > 0 ? (calcTotal(g) / max) * 100 : 0; });
                  const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.name}</TableCell>
                      <TableCell>{cls?.name || "—"}</TableCell>
                      <TableCell>{cls?.grade_level || "—"}</TableCell>
                      <TableCell className="text-center">{subGrades.length}</TableCell>
                      <TableCell className="text-center font-bold" style={{ color: bandColor(avg) }}>{avg}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Attendance summary */}
      <Card className="mb-6">
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" /> ملخص الحضور والغياب</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-lg bg-emerald-50 p-3 text-center"><p className="text-2xl font-bold text-emerald-600">{att.present || 0}</p><p className="text-xs text-muted-foreground">حاضر</p></div>
            <div className="rounded-lg bg-red-50 p-3 text-center"><p className="text-2xl font-bold text-red-600">{att.absent || 0}</p><p className="text-xs text-muted-foreground">غائب</p></div>
            <div className="rounded-lg bg-amber-50 p-3 text-center"><p className="text-2xl font-bold text-amber-600">{att.late || 0}</p><p className="text-xs text-muted-foreground">متأخر</p></div>
            <div className="rounded-lg bg-blue-50 p-3 text-center"><p className="text-2xl font-bold text-blue-600">{att.excused || 0}</p><p className="text-xs text-muted-foreground">معذور</p></div>
            <div className="rounded-lg bg-muted/40 p-3 text-center"><p className="text-2xl font-bold">{attRate}%</p><p className="text-xs text-muted-foreground">نسبة الحضور</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {teacherNotes.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> الملاحظات ({teacherNotes.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {teacherNotes.map((n) => (
              <div key={n.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{n.title}</span>
                  <span className="text-xs text-muted-foreground">{n.sender_name || "—"}</span>
                </div>
                {n.description && <p className="text-sm text-muted-foreground">{n.description}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Weekly schedule calendar */}
      <TeacherScheduleCalendar teacher={teacher} classes={scopedClasses} subjects={scopedSubjects} />

      {/* Performance report */}
      <div>
        <h2 className="text-lg font-bold mb-3">تقرير الأداء التفصيلي</h2>
        <TeacherPerformanceReport teacher={teacher} subjects={scopedSubjects} grades={scopedGrades} students={scopedStudents} classes={scopedClasses} />
      </div>
    </div>
  );
}