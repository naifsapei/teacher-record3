import { useState, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isPrincipal, ministryNumber, scopeTeachersBySchool, scopeBySchool } from "@/lib/permissions";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import TeacherPerformanceReport from "@/components/principal/TeacherPerformanceReport";
import ClassPerformanceReport from "@/components/principal/ClassPerformanceReport";
import ClassAverageChart from "@/components/principal/ClassAverageChart";
import SubjectComparisonChart from "@/components/principal/SubjectComparisonChart";
import AllTeachersReport from "@/components/teachers/AllTeachersReport";
import JoinRequestsSection from "@/components/principal/JoinRequestsSection";
import { calcAllTeachersStats } from "@/utils/teachersReport";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, BookOpen, GraduationCap, TrendingUp, School, Printer, CalendarRange, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import ContactIcons from "@/components/shared/ContactIcons";
import GradeSectionSelect from "@/components/shared/GradeSectionSelect";
import SubscriptionBadge from "@/components/dashboard/SubscriptionBadge";

const FIELDS = ["participation", "homework", "class_activity", "research", "written_exam", "practical_exam"];
const MAX_FIELDS = ["participation_max", "homework_max", "class_activity_max", "research_max", "written_exam_max", "practical_exam_max"];
const calcTotal = (g) => FIELDS.reduce((s, k) => s + (g?.[k] || 0), 0);
const calcMax = (sub) => MAX_FIELDS.reduce((s, k) => s + (sub?.[k] || 0), 0) || 100;
const bandColor = (pct) => (pct >= 90 ? "#10b981" : pct >= 75 ? "#3b82f6" : pct >= 60 ? "#f59e0b" : "#ef4444");

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

const PRESETS = [
  { key: "all", label: "كل الفترات" },
  { key: "month", label: "آخر شهر" },
  { key: "quarter", label: "آخر فصل" },
  { key: "year", label: "هذا العام" },
];

export default function PrincipalDashboard() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [classReportId, setClassReportId] = useState("");
  const [classReportGrade, setClassReportGrade] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers"], queryFn: () => base44.entities.Teacher.list() });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: grades = [] } = useQuery({ queryKey: ["grades"], queryFn: () => base44.entities.Grade.list() });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: attendance = [] } = useQuery({ queryKey: ["attendance"], queryFn: () => base44.entities.Attendance.list() });
  const { data: schoolArr = [] } = useQuery({ queryKey: ["school-info"], queryFn: () => base44.entities.SchoolInfo.list().catch(() => []) });

  // الربط المباشر بالرقم الوزاري — يتحدث تلقائياً عند تغيير المدير/المعلم لرقمه الوزاري
  const scopedTeachers = useMemo(() => scopeTeachersBySchool(teachers, me), [teachers, me]);
  const scopedClasses = useMemo(() => scopeBySchool(classes, me), [classes, me]);
  const scopedSubjects = useMemo(() => scopeBySchool(subjects, me), [subjects, me]);
  const scopedStudents = useMemo(() => scopeBySchool(students, me), [students, me]);
  const scopedGrades = useMemo(() => scopeBySchool(grades, me), [grades, me]);
  const scopedAttendance = useMemo(() => scopeBySchool(attendance, me), [attendance, me]);

  const periodGrades = useMemo(() => {
    if (!periodFrom && !periodTo) return scopedGrades;
    const from = periodFrom ? new Date(periodFrom + "T00:00:00") : null;
    const to = periodTo ? new Date(periodTo + "T23:59:59") : null;
    return scopedGrades.filter((g) => {
      const d = new Date(g.created_date);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [scopedGrades, periodFrom, periodTo]);

  const overallAvg = useMemo(() => {
    const pcts = periodGrades.map((g) => {
      const sub = scopedSubjects.find((s) => s.id === g.subject_id);
      const max = sub ? calcMax(sub) : 100;
      return max > 0 ? (calcTotal(g) / max) * 100 : 0;
    });
    return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
  }, [periodGrades, scopedSubjects]);

  const teacherStats = useMemo(() => scopedTeachers.map((t) => {
    const subs = scopedSubjects.filter((s) => s.teacher_id === t.id);
    const subIds = new Set(subs.map((s) => s.id));
    const tGrades = periodGrades.filter((g) => subIds.has(g.subject_id));
    const pcts = tGrades.map((g) => {
      const sub = subs.find((s) => s.id === g.subject_id);
      const max = sub ? calcMax(sub) : 100;
      return max > 0 ? (calcTotal(g) / max) * 100 : 0;
    });
    const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
    const stuIds = new Set(tGrades.map((g) => g.student_id));
    return { teacher: t, subjects: subs.length, students: stuIds.size, avg };
  }), [scopedTeachers, scopedSubjects, periodGrades]);

  const allTeachersStats = useMemo(() => calcAllTeachersStats(scopedTeachers, scopedSubjects, scopedGrades, scopedAttendance), [scopedTeachers, scopedSubjects, scopedGrades, scopedAttendance]);

  const setPreset = (key) => {
    if (key === "all") { setPeriodFrom(""); setPeriodTo(""); return; }
    const now = new Date();
    const d = new Date();
    if (key === "month") d.setDate(d.getDate() - 30);
    if (key === "quarter") d.setDate(d.getDate() - 90);
    if (key === "year") d.setFullYear(now.getFullYear(), 0, 1);
    setPeriodFrom(d.toISOString().slice(0, 10));
    setPeriodTo("");
  };

  const periodLabel = periodFrom || periodTo
    ? `الفترة: ${periodFrom || "البداية"} ← ${periodTo || "الآن"}`
    : "كل الفترات";

  const triggerPrint = (target) => {
    setPrintTarget(target);
    setTimeout(() => {
      window.print();
      setPrintTarget(null);
    }, 300);
  };

  if (!me) return <div className="p-8 text-sm text-muted-foreground">جارٍ التحميل...</div>;
  if (!isPrincipal(me)) return <Navigate to="/" replace />;

  const selectedTeacher = scopedTeachers.find((t) => t.id === selectedId) || null;
  const selectedClass = scopedClasses.find((c) => c.id === classReportId) || null;
  const today = format(new Date(), "yyyy/MM/dd");
  const printing = !!printTarget;

  return (
    <div dir="rtl">
      {printing && (
        <div className="hidden print:block mb-6 text-center border-b pb-3">
          <h1 className="text-xl font-bold text-primary">{me.school_name || "المدرسة"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {printTarget === "school" ? "التقرير الشامل لأداء المعلمين"
              : printTarget === "teacher" ? `تقرير أداء المعلم: ${selectedTeacher?.name}`
              : printTarget === "class" && selectedClass ? `تقرير أداء الصف: ${selectedClass.name}`
              : ""}
          </p>
          <p className="text-xs text-muted-foreground">{periodLabel}</p>
          <p className="text-xs text-muted-foreground">تاريخ التقرير: {today}</p>
        </div>
      )}

      <div className="print:hidden">
        <SubscriptionBadge />
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 mb-6">
          <span className="text-sm font-medium text-muted-foreground">تواصل معنا</span>
          <ContactIcons compact />
        </div>
        <PageHeader
          title="لوحة مدير المدرسة"
          description={me.school_name ? `${me.school_name} — رقم وزاري: ${ministryNumber(me)}` : "إدارة المعلمين والأداء"}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="secondary" className="gap-2" onClick={() => setReportOpen(true)} disabled={!scopedTeachers.length}>
                <FileText className="h-4 w-4" />
                تقرير شامل للمعلمين
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => navigate("/teachers")}>
                <ExternalLink className="h-4 w-4" />
                صفحة المعلمين
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => triggerPrint("school")}>
                <Printer className="h-4 w-4" />
                طباعة شاملة
              </Button>
              {selectedTeacher && (
                <Button className="gap-2" onClick={() => triggerPrint("teacher")}>
                  <Printer className="h-4 w-4" />
                  تقرير المعلم
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Period + class report controls */}
      <Card className={cn("print:hidden mb-6")}>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <CalendarRange className="h-4 w-4" />
              تحديد الفترة الزمنية
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p.key}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreset(p.key)}
                  className={cn(
                    (!periodFrom && !periodTo && p.key === "all") && "border-primary bg-primary/5 text-primary"
                  )}
                >
                  {p.label}
                </Button>
              ))}
              <div className="flex items-center gap-1.5">
                <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs" />
                <span className="text-muted-foreground text-xs">←</span>
                <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs" />
              </div>
              {(periodFrom || periodTo) && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setPeriodFrom(""); setPeriodTo(""); }}>مسح</Button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-3 border-t pt-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">طباعة تقرير فصل كامل</label>
              <GradeSectionSelect
                classes={scopedClasses}
                gradeName={classReportGrade}
                classId={classReportId}
                showAll={false}
                onChange={({ gradeName: g, classId: c }) => { setClassReportGrade(g); setClassReportId(c); }}
              />
            </div>
            <Button
              className="gap-2"
              disabled={!selectedClass}
              onClick={() => triggerPrint("class")}
            >
              <Printer className="h-4 w-4" />
              طباعة تقرير الصف
            </Button>
          </div>
        </CardContent>
      </Card>

      <JoinRequestsSection />

      <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6", printing && "print:hidden")}>
        <KpiCard icon={Users} label="عدد المعلمين" value={scopedTeachers.length} tone="primary" />
        <KpiCard icon={BookOpen} label="عدد المواد" value={scopedSubjects.length} tone="blue" />
        <KpiCard icon={GraduationCap} label="عدد الطلاب" value={scopedStudents.length} tone="purple" />
        <KpiCard icon={TrendingUp} label="المتوسط العام" value={`${overallAvg}%`} tone="green" />
      </div>

      <div className={cn("mb-6", printing && "print:hidden")}>
        <ClassAverageChart grades={periodGrades} subjects={scopedSubjects} students={scopedStudents} classes={scopedClasses} />
      </div>

      <div className={cn("mb-6", printing && "print:hidden")}>
        <SubjectComparisonChart subjects={scopedSubjects} grades={periodGrades} students={scopedStudents} classes={scopedClasses} />
      </div>

      <div className={cn("print:hidden")}>
        {scopedTeachers.length === 0 ? (
          <EmptyState icon={School} title="لا يوجد معلمون في مدرستك" description="سيظهر هنا المعلمون المرتبطون بنفس رقم المدرسة الوزاري عند تسجيلهم" />
        ) : (
          <>
            <h2 className="text-lg font-bold mb-3">المعلمون</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {scopedTeachers.map((t) => {
                const subs = scopedSubjects.filter((s) => s.teacher_id === t.id);
                const active = selectedId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`text-right p-4 rounded-2xl border-2 transition-all ${active ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:border-primary/40"}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-10 rounded-xl bg-chart-4/10 flex items-center justify-center"><Users className="h-5 w-5 text-chart-4" /></span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{subs.length} مواد · {t.specialization || "معلم"}</p>
                      </div>
                      <ExternalLink
                        className="h-4 w-4 text-muted-foreground shrink-0"
                        onClick={(e) => { e.stopPropagation(); navigate(`/teacher-detail?id=${t.id}`); }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedTeacher && (
        <div className={cn(printTarget === "school" && "print:hidden", printing && printTarget !== "teacher" && "print:hidden")}>
          <h2 className="text-lg font-bold mb-3">تقرير أداء: {selectedTeacher.name}</h2>
          <TeacherPerformanceReport
            teacher={selectedTeacher}
            subjects={scopedSubjects}
            grades={periodGrades}
            students={scopedStudents}
            classes={scopedClasses}
          />
        </div>
      )}

      {printTarget === "school" && (
        <div className="hidden print:block">
          <h2 className="text-base font-bold mb-2">ملخص أداء المعلمين</h2>
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted">
              <tr>
                <th className="text-right p-2 border border-border">المعلم</th>
                <th className="text-center p-2 border border-border">عدد المواد</th>
                <th className="text-center p-2 border border-border">عدد الطلاب</th>
                <th className="text-center p-2 border border-border">المتوسط</th>
              </tr>
            </thead>
            <tbody>
              {teacherStats.map((ts) => (
                <tr key={ts.teacher.id}>
                  <td className="p-2 border border-border font-medium text-right">{ts.teacher.name}</td>
                  <td className="p-2 border border-border text-center">{ts.subjects}</td>
                  <td className="p-2 border border-border text-center">{ts.students}</td>
                  <td className="p-2 border border-border text-center font-bold" style={{ color: bandColor(ts.avg) }}>{ts.avg}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {printTarget === "class" && selectedClass && (
        <div className="hidden print:block">
          <ClassPerformanceReport
            cls={selectedClass}
            students={scopedStudents}
            subjects={scopedSubjects}
            grades={periodGrades}
          />
        </div>
      )}

      {/* On-screen preview of the selected class report */}
      {selectedClass && !printing && (
        <div className="print:hidden mt-6">
          <ClassPerformanceReport
            cls={selectedClass}
            students={scopedStudents}
            subjects={scopedSubjects}
            grades={periodGrades}
          />
        </div>
      )}

      <AllTeachersReport open={reportOpen} onOpenChange={setReportOpen} teachers={scopedTeachers} stats={allTeachersStats} school={schoolArr[0] || {}} />
    </div>
  );
}