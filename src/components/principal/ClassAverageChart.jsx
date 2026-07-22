import { useMemo } from "react";
import { calcPct } from "@/lib/gradeCalc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart3 } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

// calcPct مستوردة من @/lib/gradeCalc (تحترم منطق الخانة الفارغة)

const COLORS = ["hsl(210,100%,20%)", "hsl(147,100%,34%)", "hsl(200,70%,45%)", "hsl(147,55%,50%)", "hsl(280,60%,55%)", "hsl(36,95%,55%)"];

export default function ClassAverageChart({ grades, subjects, students, classes }) {
  const data = useMemo(() => {
    const studentClass = new Map(students.map((s) => [s.id, s.class_id]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    return classes
      .map((cls) => {
        const clsGrades = grades.filter((g) => studentClass.get(g.student_id) === cls.id);
        const pcts = clsGrades.map((g) => {
          const sub = subjectMap.get(g.subject_id);
          return sub ? calcPct(g, sub) : null;
        }).filter((p) => p !== null);
        const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
        return { name: cls.name, المتوسط: avg, count: pcts.length };
      })
      .filter((d) => d.count > 0);
  }, [grades, subjects, students, classes]);

  if (data.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> متوسط درجات الصفوف
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={BarChart3} title="لا توجد درجات" description="ستظهر مقارنة متوسطات الصفوف عند إدخال الدرجات" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> متوسط درجات الصفوف
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,15%,90%)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
            <Tooltip formatter={(v) => [`${v}%`, "المتوسط"]} />
            <Bar dataKey="المتوسط" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}