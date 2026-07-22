import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, CalendarCheck, AlertTriangle, Users, Printer } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { GRADE_FIELDS, calcTotal, calcPct } from "@/lib/gradeCalc";
import { SEMESTER_LABELS } from "@/lib/terminology";
import GradeSectionSelect from "@/components/shared/GradeSectionSelect";
import { scopeBySchool } from "@/lib/permissions";

const gradeLabel = (pct) => (pct == null ? "—" : pct >= 90 ? "ممتاز" : pct >= 80 ? "جيد جداً" : pct >= 70 ? "جيد" : pct >= 60 ? "مقبول" : "ضعيف");
const gradeColor = (pct) => (pct == null ? "bg-muted text-muted-foreground" : pct >= 80 ? "bg-emerald-50 text-emerald-600" : pct >= 60 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600");
const STATUS_LABELS = { present: "حاضر", absent: "غائب", late: "متأخر", excused: "بعذر" };

export default function StudentOverview() {
  const [gradeName, setGradeName] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [semester, setSemester] = useState("first");
  const [sortBy, setSortBy] = useState("pct");

  const { data: rawClasses = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: rawStudents = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: rawSubjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: rawGrades = [] } = useQuery({ queryKey: ["grades"], queryFn: () => base44.entities.Grade.list() });
  const { data: rawAttendance = [] } = useQuery({ queryKey: ["attendance"], queryFn: () => base44.entities.Attendance.list() });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const classes = useMemo(() => scopeBySchool(rawClasses, me), [rawClasses, me]);
  const students = useMemo(() => scopeBySchool(rawStudents, me), [rawStudents, me]);
  const subjects = useMemo(() => scopeBySchool(rawSubjects, me), [rawSubjects, me]);
  const grades = useMemo(() => scopeBySchool(rawGrades, me), [rawGrades, me]);
  const attendance = useMemo(() => scopeBySchool(rawAttendance, me), [rawAttendance, me]);

  const classStudents = useMemo(() => students.filter((s) => s.class_id === classId), [students, classId]);
  const student = useMemo(() => students.find((s) => s.id === studentId) || null, [students, studentId]);

  const studentAttendance = useMemo(() => (student ? attendance.filter((a) => a.student_id === student.id) : []), [attendance, student]);
  const attStats = useMemo(() => {
    const stats = { present: 0, absent: 0, late: 0, excused: 0 };
    studentAttendance.forEach((a) => { if (stats[a.status] !== undefined) stats[a.status]++; });
    const total = studentAttendance.length;
    const present = stats.present + stats.late;
    const rate = total ? Math.round((present / total) * 100) : null;
    return { ...stats, total, rate, absences: stats.absent };
  }, [studentAttendance]);

  const rows = useMemo(() => {
    if (!student) return [];
    const classSubjects = subjects.filter((s) => s.class_id === student.class_id && (!s.semester || s.semester === semester));
    const built = classSubjects.map((sub) => {
      const g = grades.find((gr) => gr.student_id === student.id && gr.subject_id === sub.id);
      const total = g ? calcTotal(g) : null;
      const pct = g ? calcPct(g, sub) : null;
      return { sub, g, total, pct, label: gradeLabel(pct) };
    });
    built.sort((a, b) => {
      if (sortBy === "name") return a.sub.name.localeCompare(b.sub.name);
      if (sortBy === "total") return (b.total ?? -1) - (a.total ?? -1);
      return (b.pct ?? -1) - (a.pct ?? -1);
    });
    return built;
  }, [student, subjects, grades, semester, sortBy]);

  const overallAvg = useMemo(() => {
    const pcts = rows.map((r) => r.pct).filter((p) => p != null);
    return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  }, [rows]);

  const showCorrelation = overallAvg != null && overallAvg < 60 && attStats.rate != null && attStats.rate < 75;
  const recentAttendance = useMemo(() => [...studentAttendance].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 6), [studentAttendance]);

  return (
    <div dir="rtl">
      <PageHeader
        title="نظرة شاملة للطالب"
        description="جدول مركزي يربط درجات الطالب بسجل حضوره وغيابه في مكان واحد"
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
        {student && (
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="first">الفصل الدراسي الأول</SelectItem>
              <SelectItem value="second">الفصل الدراسي الثاني</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {!student ? (
        <EmptyState icon={Users} title="اختر صفًا وطالباً" description="حدد الصف ثم الطالب لعرض نظرة شاملة تربط الدرجات بالحضور" />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Card className="border-border/60"><CardContent className="flex items-center gap-3 p-4">
              <span className="h-11 w-11 rounded-xl flex items-center justify-center text-emerald-600 bg-emerald-50"><GraduationCap className="h-5 w-5" /></span>
              <div><p className="text-xs text-muted-foreground">المتوسط العام</p><p className="text-xl font-bold">{overallAvg == null ? "—" : `${overallAvg}%`}</p></div>
            </CardContent></Card>
            <Card className="border-border/60"><CardContent className="flex items-center gap-3 p-4">
              <span className="h-11 w-11 rounded-xl flex items-center justify-center text-blue-600 bg-blue-50"><CalendarCheck className="h-5 w-5" /></span>
              <div><p className="text-xs text-muted-foreground">نسبة الحضور</p><p className="text-xl font-bold">{attStats.rate == null ? "—" : `${attStats.rate}%`}</p></div>
            </CardContent></Card>
            <Card className="border-border/60"><CardContent className="flex items-center gap-3 p-4">
              <span className="h-11 w-11 rounded-xl flex items-center justify-center text-red-600 bg-red-50"><AlertTriangle className="h-5 w-5" /></span>
              <div><p className="text-xs text-muted-foreground">أيام الغياب</p><p className="text-xl font-bold">{attStats.absences}</p></div>
            </CardContent></Card>
            <Card className="border-border/60"><CardContent className="flex items-center gap-3 p-4">
              <span className="h-11 w-11 rounded-xl flex items-center justify-center text-primary bg-primary/10"><Users className="h-5 w-5" /></span>
              <div><p className="text-xs text-muted-foreground">عدد المواد</p><p className="text-xl font-bold">{rows.length}</p></div>
            </CardContent></Card>
          </div>

          {showCorrelation && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>انخفاض التحصيل ({overallAvg}%) مع ارتفاع الغياب (نسبة حضور {attStats.rate}%) — قد يكون الغياب مرتبطاً بضعف التحصيل الدراسي.</span>
            </div>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 justify-between flex-wrap">
                <span className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> درجات {student.name} — {SEMESTER_LABELS[semester]}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSortBy("pct")} className={`text-xs px-2 py-1 rounded-full ${sortBy === "pct" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>ترتيب بالنسبة</button>
                  <button onClick={() => setSortBy("total")} className={`text-xs px-2 py-1 rounded-full ${sortBy === "total" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>ترتيب بالمجموع</button>
                  <button onClick={() => setSortBy("name")} className={`text-xs px-2 py-1 rounded-full ${sortBy === "name" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>ترتيب بالاسم</button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">لا توجد مواد في هذا الصف للفصل الدراسي المختار</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right w-10">#</TableHead>
                        <TableHead className="text-right min-w-[120px]">المادة</TableHead>
                        {GRADE_FIELDS.map((f) => (
                          <TableHead key={f.key} className="text-center">{f.label}</TableHead>
                        ))}
                        <TableHead className="text-center">المجموع</TableHead>
                        <TableHead className="text-center">النسبة</TableHead>
                        <TableHead className="text-center">التقدير</TableHead>
                        <TableHead className="text-center bg-blue-50/60">نسبة الحضور</TableHead>
                        <TableHead className="text-center bg-red-50/60">الغياب</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, i) => (
                        <TableRow key={row.sub.id}>
                          <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium">{row.sub.name}</TableCell>
                          {GRADE_FIELDS.map((f) => {
                            const v = row.g?.[f.key];
                            const max = row.sub[f.maxKey] ?? f.def;
                            return (
                              <TableCell key={f.key} className="text-center">
                                {v == null ? <span className="text-muted-foreground">—</span> : <span>{v}<span className="text-xs text-muted-foreground">/{max}</span></span>}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-semibold">{row.total == null ? "—" : row.total}</TableCell>
                          <TableCell className="text-center font-semibold">{row.pct == null ? "—" : `${row.pct}%`}</TableCell>
                          <TableCell className="text-center"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${gradeColor(row.pct)}`}>{row.label}</span></TableCell>
                          <TableCell className="text-center bg-blue-50/40 font-semibold">{attStats.rate == null ? "—" : `${attStats.rate}%`}</TableCell>
                          <TableCell className="text-center bg-red-50/40 font-semibold">{attStats.absences}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">عمودا «نسبة الحضور» و«الغياب» يعرضان ملخص سجل حضور الطالب الكلي بجانب درجاته في كل مادة لربط الأداء بالمواظبة.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-primary" /> سجل الحضور والغياب</CardTitle>
            </CardHeader>
            <CardContent>
              {studentAttendance.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">لا توجد سجلات حضور لهذا الطالب</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-3 mb-4">
                    {Object.entries(STATUS_LABELS).map(([k, label]) => (
                      <div key={k} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-bold">{attStats[k] ?? 0}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {recentAttendance.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
                        <span className="text-muted-foreground">{a.date || "—"}</span>
                        <Badge variant="outline">{STATUS_LABELS[a.status] || a.status}</Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}