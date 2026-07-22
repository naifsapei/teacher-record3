import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import SubjectAverageChart from "@/components/performance/SubjectAverageChart";
import StudentTierList from "@/components/performance/StudentTierList";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { LineChart, TrendingUp, Users, AlertTriangle, Award } from "lucide-react";
import { scopeBySchool } from "@/lib/permissions";

const FIELDS = ["participation", "homework", "class_activity", "research", "written_exam", "practical_exam"];
const MAX_FIELDS = ["participation_max", "homework_max", "class_activity_max", "research_max", "written_exam_max", "practical_exam_max"];

const calcTotal = (g) => FIELDS.reduce((s, k) => s + (g?.[k] || 0), 0);
const calcMax = (sub) => MAX_FIELDS.reduce((s, k) => s + (sub?.[k] || 0), 0) || 100;

const BANDS = [
  { key: "ممتاز", min: 90, color: "#10b981" },
  { key: "جيد جداً", min: 75, color: "#3b82f6" },
  { key: "جيد", min: 60, color: "#f59e0b" },
  { key: "بحاجة لتحسين", min: 0, color: "#ef4444" },
];
const bandOf = (pct) => BANDS.find((b) => pct >= b.min) || BANDS[BANDS.length - 1];

function KpiCard({ icon: Icon, label, value, tone }) {
  const tones = {
    primary: "text-primary bg-primary/10",
    green: "text-emerald-600 bg-emerald-50",
    red: "text-red-600 bg-red-50",
    blue: "text-blue-600 bg-blue-50",
  };
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center gap-3 p-4">
        <span className={`h-11 w-11 rounded-xl flex items-center justify-center ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MonthlyPerformance() {
  const [selectedClass, setSelectedClass] = useState("");

  const { data: rawClasses = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: rawSubjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: rawStudents = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: rawGrades = [] } = useQuery({ queryKey: ["grades"], queryFn: () => base44.entities.Grade.list() });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const classes = useMemo(() => scopeBySchool(rawClasses, me), [rawClasses, me]);
  const subjects = useMemo(() => scopeBySchool(rawSubjects, me), [rawSubjects, me]);
  const students = useMemo(() => scopeBySchool(rawStudents, me), [rawStudents, me]);
  const grades = useMemo(() => scopeBySchool(rawGrades, me), [rawGrades, me]);

  const classSubjects = useMemo(
    () => (selectedClass ? subjects.filter((s) => s.class_id === selectedClass) : []),
    [subjects, selectedClass]
  );
  const classStudents = useMemo(
    () => (selectedClass ? students.filter((s) => s.class_id === selectedClass) : []),
    [students, selectedClass]
  );

  // per-subject stats
  const subjectStats = useMemo(() => {
    return classSubjects.map((sub) => {
      const sg = grades
        .filter((g) => g.subject_id === sub.id)
        .map((g) => {
          const stu = students.find((s) => s.id === g.student_id);
          if (!stu || stu.class_id !== selectedClass) return null;
          const max = calcMax(sub);
          const total = calcTotal(g);
          const pct = max > 0 ? Math.round((total / max) * 100) : 0;
          return { student: stu, g, total, max, pct };
        })
        .filter(Boolean);
      const avg = sg.length ? Math.round(sg.reduce((a, x) => a + x.pct, 0) / sg.length) : 0;
      const outstanding = sg.filter((x) => x.pct >= 90).length;
      const struggling = sg.filter((x) => x.pct < 60).length;
      return { sub, sg, avg, outstanding, struggling, count: sg.length };
    });
  }, [classSubjects, grades, students, selectedClass]);

  // per-student overall avg across subjects
  const studentStats = useMemo(() => {
    return classStudents.map((stu) => {
      const pcts = classSubjects.map((sub) => {
        const g = grades.find((gr) => gr.student_id === stu.id && gr.subject_id === sub.id);
        if (!g) return null;
        const max = calcMax(sub);
        const total = calcTotal(g);
        return max > 0 ? Math.round((total / max) * 100) : 0;
      }).filter((x) => x !== null);
      const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
      return { id: stu.id, name: stu.name, avg, count: pcts.length };
    }).filter((s) => s.count > 0);
  }, [classStudents, classSubjects, grades]);

  const overallAvg = studentStats.length
    ? Math.round(studentStats.reduce((a, s) => a + s.avg, 0) / studentStats.length)
    : 0;

  const outstandingStudents = useMemo(
    () => studentStats.filter((s) => s.avg >= 90).sort((a, b) => b.avg - a.avg).slice(0, 15),
    [studentStats]
  );
  const strugglingStudents = useMemo(
    () => studentStats.filter((s) => s.avg < 60).sort((a, b) => a.avg - b.avg).slice(0, 15),
    [studentStats]
  );

  const bandDist = useMemo(() => {
    const counts = BANDS.map((b) => ({ name: b.key, value: 0, color: b.color }));
    studentStats.forEach((s) => {
      const b = bandOf(s.avg);
      const row = counts.find((c) => c.name === b.key);
      if (row) row.value++;
    });
    return counts.filter((c) => c.value > 0);
  }, [studentStats]);

  const chartData = subjectStats.map((s) => ({ name: s.sub.name, avg: s.avg }));

  if (!selectedClass) {
    return (
      <div dir="rtl">
        <PageHeader title="الأداء الشهري" description="تقارير أداء الطلاب في كل مادة مع المتوسطات والمتميزين والمتعثرين" />
        <Card className="border-primary/20 mb-6">
          <CardContent className="p-4">
            <div className="space-y-1.5 max-w-sm">
              <Label>الصف الدراسي</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="اختر الصف" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <EmptyState icon={LineChart} title="اختر الصف لعرض التقرير" description="سيتم حساب المتوسطات وتوضيح الطلاب المتميزين والمتعثرين رسومياً" />
      </div>
    );
  }

  return (
    <div dir="rtl">
      <PageHeader
        title="الأداء الشهري"
        description="تقارير أداء الطلاب في كل مادة مع المتوسطات والمتميزين والمتعثرين"
        actions={
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-48"><SelectValue placeholder="اختر الصف" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={TrendingUp} label="المتوسط العام" value={`${overallAvg}%`} tone="primary" />
        <KpiCard icon={Users} label="عدد الطلاب" value={studentStats.length} tone="blue" />
        <KpiCard icon={Award} label="المتميزون" value={outstandingStudents.length} tone="green" />
        <KpiCard icon={AlertTriangle} label="المتعثرون" value={strugglingStudents.length} tone="red" />
      </div>

      {subjectStats.length === 0 ? (
        <EmptyState icon={LineChart} title="لا توجد بيانات درجات" description="أدخل درجات الطلاب في المواد لعرض التقرير" />
      ) : (
        <>
          {/* Subject averages bar chart */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <LineChart className="h-4 w-4 text-primary" />
                متوسطات الأداء حسب المادة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SubjectAverageChart data={chartData} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Band distribution pie */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">توزيع مستويات الطلاب</CardTitle>
              </CardHeader>
              <CardContent>
                {bandDist.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={bandDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                        {bandDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontFamily: "inherit", fontSize: 12, borderRadius: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">لا توجد بيانات</p>
                )}
              </CardContent>
            </Card>

            {/* Per-subject outstanding/struggling table */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">تفصيل كل مادة</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="text-right p-3 font-medium">المادة</th>
                        <th className="text-center p-3 font-medium">عدد الطلاب</th>
                        <th className="text-center p-3 font-medium">المتوسط</th>
                        <th className="text-center p-3 font-medium text-emerald-600">متميز</th>
                        <th className="text-center p-3 font-medium text-red-600">متعثر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectStats.map((s) => {
                        const band = bandOf(s.avg);
                        return (
                          <tr key={s.sub.id} className="border-t border-border/60 hover:bg-muted/20">
                            <td className="p-3 font-medium text-right">{s.sub.name}</td>
                            <td className="p-3 text-center">{s.count}</td>
                            <td className="p-3 text-center">
                              <span className="font-bold" style={{ color: band.color }}>{s.avg}%</span>
                            </td>
                            <td className="p-3 text-center text-emerald-600 font-semibold">{s.outstanding}</td>
                            <td className="p-3 text-center text-red-600 font-semibold">{s.struggling}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Outstanding & struggling students */}
          <div className="mb-2">
            <h2 className="text-lg font-bold mb-3">الطلاب حسب المستوى العام</h2>
          </div>
          <StudentTierList outstanding={outstandingStudents} struggling={strugglingStudents} />
        </>
      )}
    </div>
  );
}