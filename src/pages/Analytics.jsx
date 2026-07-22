import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend, Cell, PieChart, Pie,
} from "recharts";
import { TrendingUp, Award, AlertTriangle, Users, BarChart2, PieChart as PieIcon, User } from "lucide-react";
import AnalyticsExport from "@/components/analytics/AnalyticsExport";
import { calcTotal, calcEffMax, calcFullMax as calcMax, calcPct } from "@/lib/gradeCalc";
import GradeSectionSelect from "@/components/shared/GradeSectionSelect";
import { resolveClassIds, scopeLabel } from "@/lib/classSections";

const COLORS = [
  "hsl(210,100%,20%)", "hsl(147,100%,34%)", "hsl(200,70%,45%)",
  "hsl(147,55%,50%)", "hsl(0,72%,51%)", "hsl(210,55%,40%)",
];

const GRADE_BANDS = [
  { key: "ممتاز",          min: 90, color: "#00B050" },
  { key: "جيد جداً",       min: 75, color: "#003366" },
  { key: "جيد",            min: 60, color: "#3b82f6" },
  { key: "مقبول",          min: 50, color: "#f59e0b" },
  { key: "بحاجة لتحسين",  min: 0,  color: "#ef4444" },
];

function getGradeBand(pct) {
  return GRADE_BANDS.find((b) => pct >= b.min) || GRADE_BANDS[GRADE_BANDS.length - 1];
}

// دوال الحساب (calcTotal, calcEffMax, calcMax, calcPct) مستوردة من @/lib/gradeCalc
// وتحترم منطق "الخانة الفارغة لا تُحسب صفرًا".

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-sm" dir="rtl">
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-semibold">{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</span></p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("none");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [compareSubject, setCompareSubject] = useState("");

  const { data: classes  = [] } = useQuery({ queryKey: ["classes"],  queryFn: () => base44.entities.Class.list() });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: grades   = [] } = useQuery({ queryKey: ["grades"],   queryFn: () => base44.entities.Grade.list() });

  const activeClassIds = useMemo(
    () => !selectedGrade ? classes.map((c) => c.id) : resolveClassIds(classes, selectedGrade, selectedClassId),
    [classes, selectedGrade, selectedClassId]
  );
  const scopeName = !selectedGrade ? "جميع الصفوف" : scopeLabel(classes, selectedGrade, selectedClassId);

  const filteredSubjects = useMemo(
    () => subjects.filter((s) => activeClassIds.includes(s.class_id)),
    [subjects, activeClassIds]
  );

  const filteredStudents = useMemo(
    () => students.filter((s) => activeClassIds.includes(s.class_id)),
    [students, activeClassIds]
  );

  // Per-subject stats
  const subjectStats = useMemo(() => {
    return filteredSubjects.map((sub) => {
      const subGrades = grades.filter((g) => g.subject_id === sub.id);
      const entered = subGrades.filter((g) => calcEffMax(g, sub) > 0);
      const maxTotal = calcMax(sub);

      const avg = (field) => {
        const vals = subGrades.map((g) => g[field]).filter((v) => v !== null && v !== undefined && v !== "");
        return vals.length > 0
          ? Math.round((vals.reduce((s, v) => s + Number(v), 0) / vals.length) * 10) / 10
          : 0;
      };

      const totalAvg = avg("participation") + avg("homework") + avg("class_activity") + avg("research") + avg("written_exam") + avg("practical_exam");
      const studentPcts = entered.map((g) => calcPct(g, sub));
      const pct = studentPcts.length > 0 ? Math.round(studentPcts.reduce((s, p) => s + p, 0) / studentPcts.length) : 0;

      return {
        name: sub.name,
        مشاركة:       avg("participation"),
        واجبات:       avg("homework"),
        "نشاط صفي":   avg("class_activity"),
        بحوث:         avg("research"),
        "اختبار تحريري": avg("written_exam"),
        "اختبار عملي":   avg("practical_exam"),
        المتوسط:      Math.round(totalAvg * 10) / 10,
        النسبة:       pct,
        maxTotal,
        count:        entered.length,
      };
    }).filter((s) => s.count > 0);
  }, [filteredSubjects, grades]);

  // ── NEW: single-student subject comparison ──────────────────────────────
  const studentSubjectData = useMemo(() => {
    if (!selectedStudent || selectedStudent === "none") return [];
    return subjects.map((sub) => {
      const g = grades.find((gr) => gr.student_id === selectedStudent && gr.subject_id === sub.id);
      if (!g) return null;
      const pct = calcPct(g, sub);
      if (pct === null) return null;
      const total = calcTotal(g);
      const max = calcEffMax(g, sub);
      return { name: sub.name, الدرجة: total, النسبة: pct, maxTotal: max };
    }).filter(Boolean);
  }, [selectedStudent, subjects, grades]);

  // ── NEW: grade distribution per class ──────────────────────────────────
  const classGradeDistribution = useMemo(() => {
    return classes.map((cls) => {
      const clsStudents  = students.filter((s) => s.class_id === cls.id);
      const clsSubjects  = subjects.filter((s) => s.class_id === cls.id);

      const bandCounts = Object.fromEntries(GRADE_BANDS.map((b) => [b.key, 0]));

      clsStudents.forEach((stu) => {
        let totalPct = 0;
        let count = 0;
        clsSubjects.forEach((sub) => {
          const g = grades.find((gr) => gr.student_id === stu.id && gr.subject_id === sub.id);
          if (!g) return;
          const pct = calcPct(g, sub);
          if (pct === null) return;
          totalPct += pct;
          count++;
        });
        if (count === 0) return;
        const avg = totalPct / count;
        const band = getGradeBand(avg);
        bandCounts[band.key]++;
      });

      return { id: cls.id, name: cls.name, ...bandCounts, total: clsStudents.length };
    }).filter((c) => c.total > 0);
  }, [classes, students, subjects, grades]);

  // pie data for selected class distribution
  const classPieData = useMemo(() => {
    const rows = classGradeDistribution.filter((c) => activeClassIds.includes(c.id));
    const totals = Object.fromEntries(GRADE_BANDS.map((b) => [b.key, 0]));
    rows.forEach((c) => GRADE_BANDS.forEach((b) => { totals[b.key] += c[b.key] || 0; }));
    return GRADE_BANDS.map((b) => ({ name: b.key, value: totals[b.key], color: b.color })).filter((d) => d.value > 0);
  }, [classGradeDistribution, activeClassIds]);

  const overallAvgPct = subjectStats.length > 0
    ? Math.round(subjectStats.reduce((s, x) => s + x.النسبة, 0) / subjectStats.length) : 0;
  const best  = subjectStats.reduce((a, b) => (a?.النسبة > b.النسبة ? a : b), null);
  const worst = subjectStats.reduce((a, b) => (a?.النسبة < b.النسبة ? a : b), null);

  const radarData = [
    { field: "مشاركة",      value: subjectStats.length ? Math.round(subjectStats.reduce((s, x) => s + x.مشاركة, 0) / subjectStats.length * 10) / 10 : 0 },
    { field: "واجبات",      value: subjectStats.length ? Math.round(subjectStats.reduce((s, x) => s + x.واجبات, 0) / subjectStats.length * 10) / 10 : 0 },
    { field: "نشاط صفي",    value: subjectStats.length ? Math.round(subjectStats.reduce((s, x) => s + x["نشاط صفي"], 0) / subjectStats.length * 10) / 10 : 0 },
    { field: "بحوث",        value: subjectStats.length ? Math.round(subjectStats.reduce((s, x) => s + x.بحوث, 0) / subjectStats.length * 10) / 10 : 0 },
    { field: "تحريري",      value: subjectStats.length ? Math.round(subjectStats.reduce((s, x) => s + x["اختبار تحريري"], 0) / subjectStats.length * 10) / 10 : 0 },
    { field: "عملي",        value: subjectStats.length ? Math.round(subjectStats.reduce((s, x) => s + x["اختبار عملي"], 0) / subjectStats.length * 10) / 10 : 0 },
  ];

  // ── NEW: compare classes in the same subject ───────────────────────────
  const subjectNames = useMemo(
    () => [...new Set(subjects.map((s) => s.name))].sort(),
    [subjects]
  );

  const classComparisonData = useMemo(() => {
    if (!compareSubject) return [];
    return classes.map((cls) => {
      const sub = subjects.find((s) => s.name === compareSubject && s.class_id === cls.id);
      if (!sub) return null;
      const clsGrades = grades.filter((g) => g.subject_id === sub.id);
      const entered = clsGrades.filter((g) => calcEffMax(g, sub) > 0);
      const max = calcMax(sub);
      const avgTotal = entered.length > 0
        ? entered.reduce((sum, g) => sum + calcTotal(g), 0) / entered.length
        : 0;
      const studentPcts = entered.map((g) => calcPct(g, sub));
      const pct = studentPcts.length > 0 ? Math.round(studentPcts.reduce((s, p) => s + p, 0) / studentPcts.length) : 0;
      return {
        name: cls.name,
        المتوسط: Math.round(avgTotal * 10) / 10,
        النسبة: pct,
        count: entered.length,
        max,
      };
    }).filter(Boolean);
  }, [compareSubject, classes, subjects, grades]);

  const hasData = subjectStats.length > 0;

  return (
    <div dir="rtl">
      <PageHeader title="لوحة التحليلات" description="متابعة أداء الطلاب والمستوى الدراسي" />

      {/* شريط الفلاتر والتصدير */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <label className="text-xs font-semibold text-muted-foreground">الصف الدراسي</label>
              <GradeSectionSelect
                classes={classes}
                gradeName={selectedGrade}
                classId={selectedClassId}
                allGradeLabel="جميع الصفوف"
                onChange={({ gradeName: g, classId: c }) => { setSelectedGrade(g); setSelectedClassId(c); setSelectedStudent("none"); setSelectedSubject("all"); }}
              />
            </div>
            {selectedGrade && (
              <div className="space-y-1.5 flex-1 min-w-0">
                <label className="text-xs font-semibold text-muted-foreground">المادة الدراسية</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="جميع المواد" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المواد</SelectItem>
                    {filteredSubjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2 lg:pb-0.5">
              <AnalyticsExport
                classObj={{ name: scopeName }}
                classStudents={filteredStudents}
                classSubjects={filteredSubjects}
                grades={grades}
                selectedSubject={selectedSubject}
                subjectObj={filteredSubjects.find((s) => s.id === selectedSubject) || null}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <BarChart2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">لا توجد بيانات درجات بعد</h3>
          <p className="text-muted-foreground text-sm">أدخل درجات الطلاب في صفحة الدرجات لتظهر التحليلات هنا</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5 flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المتوسط العام</p>
                  <p className="text-2xl font-bold">{overallAvgPct}%</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">عدد الطلاب</p>
                  <p className="text-2xl font-bold">{filteredStudents.length}</p>
                </div>
              </CardContent>
            </Card>
            {best && (
              <Card className="border-emerald-200">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">أفضل مادة</p>
                    <p className="font-bold truncate">{best.name}</p>
                    <p className="text-xs text-emerald-600">{best.النسبة}%</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {worst && (
              <Card className="border-red-200">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">تحتاج اهتماماً</p>
                    <p className="font-bold truncate">{worst.name}</p>
                    <p className="text-xs text-red-500">{worst.النسبة}%</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── SECTION: Compare classes in the same subject ─────────── */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-primary" />
                  مقارنة الصفوف في نفس المادة
                </CardTitle>
                <Select value={compareSubject} onValueChange={setCompareSubject}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="اختر المادة للمقارنة" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectNames.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!compareSubject ? (
                <div className="flex items-center justify-center h-44 text-muted-foreground text-sm">
                  اختر مادة من القائمة لمقارنة متوسط أداء الصفوف فيها
                </div>
              ) : classComparisonData.length === 0 ? (
                <div className="flex items-center justify-center h-44 text-muted-foreground text-sm">
                  لا توجد بيانات درجات لهذه المادة في أي فصل
                </div>
              ) : (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={classComparisonData} barSize={48}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,15%,92%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: "inherit" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="النسبة" name="متوسط النسبة %" radius={[6, 6, 0, 0]}>
                        {classComparisonData.map((entry, i) => (
                          <Cell key={i} fill={getGradeBand(entry.النسبة).color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* per-class average cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[...classComparisonData].sort((a, b) => b.النسبة - a.النسبة).map((row, i) => {
                      const band = getGradeBand(row.النسبة);
                      return (
                        <div key={i} className="rounded-xl border p-4" style={{ borderColor: band.color + "40" }}>
                          <p className="text-xs text-muted-foreground truncate mb-1">{row.name}</p>
                          <p className="text-2xl font-bold" style={{ color: band.color }}>{row.النسبة}%</p>
                          <div className="flex items-center justify-between mt-2 text-xs">
                            <span className="text-muted-foreground">المتوسط: {row.المتوسط}/{row.max}</span>
                            <span className="font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: band.color + "20", color: band.color }}>
                              {band.key}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1.5">عدد الطلاب: {row.count}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── SECTION 1: Student Comparison ─────────────────────────── */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  مقارنة درجات الطالب في المواد المختلفة
                </CardTitle>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="اختر طالباً" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— اختر طالباً —</SelectItem>
                    {filteredStudents.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {selectedStudent === "none" ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  اختر طالباً من القائمة لعرض مقارنة درجاته
                </div>
              ) : studentSubjectData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  لا توجد درجات مسجلة لهذا الطالب
                </div>
              ) : (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={studentSubjectData} barSize={36}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,15%,92%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "inherit" }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="النسبة" name="النسبة %" radius={[6, 6, 0, 0]}>
                        {studentSubjectData.map((entry, i) => (
                          <Cell key={i} fill={getGradeBand(entry.النسبة).color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* per-subject mini cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {studentSubjectData.map((row, i) => {
                      const band = getGradeBand(row.النسبة);
                      return (
                        <div key={i} className="rounded-xl border p-3 text-center">
                          <p className="text-xs text-muted-foreground truncate mb-1">{row.name}</p>
                          <p className="text-xl font-bold" style={{ color: band.color }}>{row.النسبة}%</p>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block"
                            style={{ background: band.color + "20", color: band.color }}>
                            {band.key}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">{row.الدرجة} / {row.maxTotal}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── SECTION 2: Grade Distribution per class ────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Stacked bar — distribution per class */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-primary" />
                  توزيع التقديرات لكل فصل دراسي
                </CardTitle>
              </CardHeader>
              <CardContent>
                {classGradeDistribution.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">لا توجد بيانات</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={classGradeDistribution} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,15%,92%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "inherit" }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, fontFamily: "inherit" }} />
                      {GRADE_BANDS.map((b) => (
                        <Bar key={b.key} dataKey={b.key} stackId="a" fill={b.color}
                          radius={b.key === GRADE_BANDS[GRADE_BANDS.length - 1].key ? [0, 0, 0, 0] : undefined} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Pie — overall distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-primary" />
                  {!selectedGrade ? "توزيع التقديرات الإجمالي" : `توزيع التقديرات — ${scopeName}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {classPieData.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">لا توجد بيانات</div>
                ) : (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={classPieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                          labelLine={false}
                        >
                          {classPieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, n) => [`${v} طالب`, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* legend */}
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      {classPieData.map((d) => (
                        <span key={d.name} className="flex items-center gap-1 text-xs">
                          <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: d.color }} />
                          {d.name}: <strong>{d.value}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-primary" />
                  متوسط الدرجات الكلية لكل مادة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={subjectStats} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,15%,92%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "inherit" }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="المتوسط" radius={[6, 6, 0, 0]}>
                      {subjectStats.map((entry, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  توزيع الأداء حسب نوع التقييم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(210,15%,88%)" />
                    <PolarAngleAxis dataKey="field" tick={{ fontSize: 12, fontFamily: "inherit" }} />
                    <PolarRadiusAxis tick={{ fontSize: 10 }} />
                    <Radar name="متوسط الأداء" dataKey="value"
                      stroke="hsl(168,70%,38%)" fill="hsl(168,70%,38%)" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Stacked breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" />
                تفصيل الدرجات حسب نوع التقييم لكل مادة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectStats} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,15%,92%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "inherit" }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, fontFamily: "inherit" }} />
                  <Bar dataKey="مشاركة"           stackId="a" fill="hsl(168,70%,38%)" />
                  <Bar dataKey="واجبات"           stackId="a" fill="hsl(200,70%,50%)" />
                  <Bar dataKey="نشاط صفي"         stackId="a" fill="hsl(280,60%,55%)" />
                  <Bar dataKey="بحوث"             stackId="a" fill="hsl(36,95%,55%)" />
                  <Bar dataKey="اختبار تحريري"    stackId="a" fill="hsl(0,72%,51%)" />
                  <Bar dataKey="اختبار عملي"      stackId="a" fill="hsl(160,60%,45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Subject performance table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">تصنيف المواد حسب الأداء</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-right py-3 px-5 font-medium">المادة</th>
                      <th className="text-center py-3 px-4 font-medium">المتوسط الكلي</th>
                      <th className="text-center py-3 px-4 font-medium">النسبة %</th>
                      <th className="text-center py-3 px-4 font-medium">التقدير</th>
                      <th className="text-center py-3 px-4 font-medium">شريط الأداء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...subjectStats].sort((a, b) => b.النسبة - a.النسبة).map((row, i) => {
                      const band = getGradeBand(row.النسبة);
                      return (
                        <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-5 font-medium">{row.name}</td>
                          <td className="text-center py-3 px-4">{row.المتوسط} / {row.maxTotal}</td>
                          <td className="text-center py-3 px-4 font-bold">{row.النسبة}%</td>
                          <td className="text-center py-3 px-4">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: band.color + "20", color: band.color }}>
                              {band.key}
                            </span>
                          </td>
                          <td className="py-3 px-5">
                            <div className="w-full bg-muted rounded-full h-2">
                              <div className="h-2 rounded-full transition-all" style={{ width: `${row.النسبة}%`, background: band.color }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

        </div>
      )}

    </div>
  );
}