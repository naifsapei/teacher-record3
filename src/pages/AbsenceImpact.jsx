import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import AbsenceImpactChart from "@/components/absence/AbsenceImpactChart";
import { useCurrentTeacher } from "@/hooks/useCurrentTeacher";
import GradeSectionSelect from "@/components/shared/GradeSectionSelect";
import { scopeBySchool } from "@/lib/permissions";

const CW_FIELDS = ["participation", "homework", "class_activity", "research"];
const CW_MAX = ["participation_max", "homework_max", "class_activity_max", "research_max"];
const sumFields = (obj, keys) => keys.reduce((s, k) => s + (obj?.[k] || 0), 0);
const bandColor = (pct) => (pct == null ? "#94a3b8" : pct >= 90 ? "#10b981" : pct >= 75 ? "#3b82f6" : pct >= 60 ? "#f59e0b" : "#ef4444");
const statusOf = (pct) =>
  pct == null ? { label: "—", color: "#94a3b8" }
  : pct >= 90 ? { label: "متميز", color: "#10b981" }
  : pct >= 75 ? { label: "جيد", color: "#3b82f6" }
  : pct >= 60 ? { label: "مقبول", color: "#f59e0b" }
  : { label: "متعثر", color: "#ef4444" };

function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? null : num / den;
}

function correlationInsight(r) {
  if (r == null) return { text: "بيانات غير كافية لتحليل العلاقة بين الغياب والتحصيل", tone: "muted" };
  if (r <= -0.6) return { text: "ارتباط عكسي قوي: كلما زاد غياب الطالب انخفضت درجات أعمال السنة بشكل ملحوظ", tone: "danger" };
  if (r < -0.2) return { text: "ارتباط عكسي: الغياب يؤثر سلبًا على تحصيل الطالب في أعمال السنة", tone: "warn" };
  if (r <= 0.2) return { text: "لا يوجد ارتباط واضح بين الغياب وأداء أعمال السنة", tone: "muted" };
  return { text: "ارتباط طفيف إيجابي — غير معتاد، يستحق مراجعة البيانات", tone: "info" };
}

export default function AbsenceImpact() {
  const [gradeName, setGradeName] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const { currentTeacher } = useCurrentTeacher();

  const { data: rawClasses = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: rawSubjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: rawStudents = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: rawGrades = [] } = useQuery({ queryKey: ["grades"], queryFn: () => base44.entities.Grade.list() });
  const { data: rawAttendance = [] } = useQuery({ queryKey: ["attendance"], queryFn: () => base44.entities.Attendance.list() });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const classes = useMemo(() => scopeBySchool(rawClasses, me), [rawClasses, me]);
  const subjects = useMemo(() => scopeBySchool(rawSubjects, me), [rawSubjects, me]);
  const students = useMemo(() => scopeBySchool(rawStudents, me), [rawStudents, me]);
  const grades = useMemo(() => scopeBySchool(rawGrades, me), [rawGrades, me]);
  const attendance = useMemo(() => scopeBySchool(rawAttendance, me), [rawAttendance, me]);

  const classSubjects = useMemo(() => {
    let list = subjects.filter((s) => s.class_id === classId);
    if (currentTeacher) list = list.filter((s) => s.teacher_id === currentTeacher.id);
    return list;
  }, [subjects, classId, currentTeacher]);

  const selectedSubject = useMemo(() => subjects.find((s) => s.id === subjectId) || null, [subjects, subjectId]);

  const classStudents = useMemo(() => students.filter((s) => s.class_id === classId), [students, classId]);

  const rows = useMemo(() => {
    if (!selectedSubject) return [];
    return classStudents.map((stu) => {
      const absences = attendance
        .filter((a) => a.student_id === stu.id && a.status === "absent")
        .map((a) => a.date)
        .filter(Boolean)
        .sort();
      const grade = grades.find((g) => g.student_id === stu.id && g.subject_id === selectedSubject.id);
      const cw = grade ? sumFields(grade, CW_FIELDS) : 0;
      const cwMax = sumFields(selectedSubject, CW_MAX) || 40;
      const pct = grade ? Math.round((cw / cwMax) * 100) : null;
      return {
        stu,
        absenceCount: absences.length,
        absenceDates: absences,
        grade,
        cw,
        cwMax,
        pct,
        fields: CW_FIELDS.map((k) => ({ key: k, value: grade?.[k] ?? 0, max: selectedSubject[`${k}_max`] ?? 10 })),
      };
    });
  }, [classStudents, attendance, grades, selectedSubject]);

  const chartData = useMemo(
    () => rows.filter((r) => r.pct != null).map((r) => ({ name: r.stu.name, absence: r.absenceCount, pct: r.pct })),
    [rows]
  );

  const correlation = useMemo(() => {
    const valid = rows.filter((r) => r.pct != null);
    return pearson(valid.map((r) => r.absenceCount), valid.map((r) => r.pct));
  }, [rows]);

  const insight = correlationInsight(correlation);
  const insightTone = {
    danger: "border-destructive/30 bg-destructive/5 text-destructive",
    warn: "border-amber-300 bg-amber-50 text-amber-700",
    muted: "border-border bg-muted text-muted-foreground",
    info: "border-blue-300 bg-blue-50 text-blue-700",
  }[insight.tone];

  const sortedRows = useMemo(() => [...rows].sort((a, b) => b.absenceCount - a.absenceCount), [rows]);
  const totalAbsence = rows.reduce((s, r) => s + r.absenceCount, 0);
  const avgAbsence = rows.length ? (totalAbsence / rows.length).toFixed(1) : 0;
  const avgPct = chartData.length ? Math.round(chartData.reduce((a, r) => a + r.pct, 0) / chartData.length) : null;

  return (
    <div>
      <PageHeader
        title="أثر الغياب على التحصيل"
        description="ربط أيام غياب كل طالب بدرجات أعمال السنة لرؤية التأثير بوضوح"
      />

      <Card className="mb-6">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">الصف</label>
            <GradeSectionSelect
              classes={classes}
              gradeName={gradeName}
              classId={classId}
              showAll={false}
              onChange={({ gradeName: g, classId: c }) => { setGradeName(g); setClassId(c); setSubjectId(""); }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">المادة</label>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={!classId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="اختر المادة..." /></SelectTrigger>
              <SelectContent>
                {classSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedSubject ? (
        <EmptyState icon={Activity} title="اختر صفًا ومادة" description="ستظهر هنا قائمة طلاب الصف مع أيام غيابهم ودرجات أعمال السنة ورسم يوضح العلاقة بينهما" />
      ) : sortedRows.length === 0 ? (
        <EmptyState icon={Activity} title="لا يوجد طلاب" description="لا يوجد طلاب مسجلون في هذا الصف" />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs text-muted-foreground">إجمالي أيام الغياب</p><p className="text-xl font-bold">{totalAbsence}</p></CardContent></Card>
            <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs text-muted-foreground">متوسط الغياب للطالب</p><p className="text-xl font-bold">{avgAbsence}</p></CardContent></Card>
            <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs text-muted-foreground">متوسط أعمال السنة</p><p className="text-xl font-bold" style={{ color: bandColor(avgPct) }}>{avgPct != null ? `${avgPct}%` : "—"}</p></CardContent></Card>
            <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs text-muted-foreground">معامل الارتباط</p><p className="text-xl font-bold">{correlation != null ? correlation.toFixed(2) : "—"}</p></CardContent></Card>
          </div>

          <div className={`rounded-xl border p-3 mb-6 text-sm font-medium ${insightTone}`}>{insight.text}</div>

          <Card className="mb-6">
            <CardHeader className="pb-2"><CardTitle className="text-base">العلاقة بين الغياب وأعمال السنة</CardTitle></CardHeader>
            <CardContent>
              <AbsenceImpactChart data={chartData} />
              <p className="text-xs text-muted-foreground text-center mt-2">المحور الأفقي: عدد أيام الغياب · المحور العمودي: نسبة أعمال السنة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">تفصيل الطلاب: الغياب × أعمال السنة</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto print:overflow-visible">
                <Table className="print-table" style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "14%" }} />
                  </colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الطالب</TableHead>
                      <TableHead className="text-center">أيام الغياب</TableHead>
                      <TableHead className="text-right">تواريخ الغياب</TableHead>
                      <TableHead className="text-center">مشاركة</TableHead>
                      <TableHead className="text-center">واجبات</TableHead>
                      <TableHead className="text-center">مشاركة صفية</TableHead>
                      <TableHead className="text-center">بحوث</TableHead>
                      <TableHead className="text-center">أعمال السنة</TableHead>
                      <TableHead className="text-center">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRows.map((r) => {
                      const st = statusOf(r.pct);
                      return (
                        <TableRow key={r.stu.id}>
                          <TableCell className="font-medium text-right whitespace-nowrap overflow-hidden text-ellipsis">{r.stu.name}</TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${r.absenceCount >= 5 ? "bg-destructive/10 text-destructive" : r.absenceCount >= 2 ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-600"}`}>
                              {r.absenceCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground max-w-[200px]">
                            {r.absenceDates.length ? r.absenceDates.map((d) => format(new Date(d), "yyyy/MM/dd")).join("، ") : "—"}
                          </TableCell>
                          {r.fields.map((f) => (
                            <TableCell key={f.key} className="text-center text-xs">{f.value}<span className="text-muted-foreground">/{f.max}</span></TableCell>
                          ))}
                          <TableCell className="text-center font-bold" style={{ color: bandColor(r.pct) }}>{r.pct != null ? `${r.pct}%` : "—"}</TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: st.color, backgroundColor: st.color + "1a" }}>{st.label}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}