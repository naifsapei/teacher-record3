import { useState, useMemo } from "react";
import { calcPct } from "@/lib/gradeCalc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { GitCompareArrows } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// calcPct مستوردة من @/lib/gradeCalc (تحترم منطق الخانة الفارغة)
const bandColor = (pct) => (pct >= 90 ? "#10b981" : pct >= 75 ? "#3b82f6" : pct >= 60 ? "#f59e0b" : "#ef4444");
const GAP_THRESHOLD = 20;

export default function SubjectComparisonChart({ subjects, grades, students, classes }) {
  const [classId, setClassId] = useState("");
  const [subA, setSubA] = useState("");
  const [subB, setSubB] = useState("");

  const classSubjects = useMemo(() => subjects.filter((s) => s.class_id === classId), [subjects, classId]);
  const classStudents = useMemo(() => students.filter((s) => s.class_id === classId), [students, classId]);

  const subAObj = classSubjects.find((s) => s.id === subA) || null;
  const subBObj = classSubjects.find((s) => s.id === subB) || null;

  const pctFor = (studentId, subjectId) => {
    const sub = subjects.find((s) => s.id === subjectId);
    const g = grades.find((gr) => gr.student_id === studentId && gr.subject_id === subjectId);
    if (!sub || !g) return null;
    return calcPct(g, sub);
  };

  const rows = useMemo(() => {
    if (!subA || !subB) return [];
    return classStudents.map((st) => {
      const a = pctFor(st.id, subA);
      const b = pctFor(st.id, subB);
      const gap = a != null && b != null ? b - a : null;
      return { student: st, a, b, gap };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classStudents, subA, subB, subjects, grades]);

  const chartData = rows.map((r) => ({
    name: r.student.name,
    [subAObj?.name || "المادة الأولى"]: r.a ?? 0,
    [subBObj?.name || "المادة الثانية"]: r.b ?? 0,
  }));

  const gaps = rows.filter((r) => r.gap != null && Math.abs(r.gap) >= GAP_THRESHOLD);

  const onClassChange = (id) => {
    setClassId(id);
    setSubA("");
    setSubB("");
  };

  const ready = classId && subA && subB && subAObj && subBObj;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <GitCompareArrows className="h-4 w-4" />
          مقارنة أداء الطلاب بين مادتين (لكشف الفجوات التعليمية)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">الصف</label>
            <Select value={classId} onValueChange={onClassChange}>
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue placeholder="اختر الصف..." />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}{c.grade_level ? ` — ${c.grade_level}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">المادة الأولى</label>
            <Select value={subA} onValueChange={setSubA} disabled={!classId}>
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue placeholder="اختر المادة..." />
              </SelectTrigger>
              <SelectContent>
                {classSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">المادة الثانية</label>
            <Select value={subB} onValueChange={setSubB} disabled={!classId}>
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue placeholder="اختر المادة..." />
              </SelectTrigger>
              <SelectContent>
                {classSubjects.filter((s) => s.id !== subA).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!classId ? (
          <EmptyState icon={GitCompareArrows} title="اختر فصلًا لبدء المقارنة" description="حدد فصلًا ومادتين لمقارنة أداء الطلاب وكشف الفجوات التعليمية" />
        ) : classSubjects.length < 2 ? (
          <EmptyState icon={GitCompareArrows} title="لا توجد مادتان كافيتان في هذا الصف" description="يجب وجود مادتين على الأقل في الصف لإجراء المقارنة" />
        ) : !ready ? (
          <EmptyState icon={GitCompareArrows} title="اختر مادتين للمقارنة" description="حدد المادتين لعرض الرسم البياني وتحليل الفجوات" />
        ) : (
          <>
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "inherit" }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey={subAObj.name} fill="#149684" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={subBObj.name} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="text-sm font-bold mb-2">تحليل الفجوات التعليمية (فرق ≥ {GAP_THRESHOLD}%)</h3>
              {gaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد فجوات كبيرة بين المادتين — أداء الطلاب متقارب.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {gaps.map((r) => {
                    const weakerName = r.gap > 0 ? subAObj.name : subBObj.name;
                    const weakerPct = r.gap > 0 ? r.a : r.b;
                    const strongerName = r.gap > 0 ? subBObj.name : subAObj.name;
                    const strongerPct = r.gap > 0 ? r.b : r.a;
                    return (
                      <div key={r.student.id} className="flex flex-col gap-1 rounded-lg border bg-card p-3 text-xs">
                        <span className="font-semibold truncate">{r.student.name}</span>
                        <span className="text-muted-foreground">
                          ضعف في <span style={{ color: bandColor(weakerPct), fontWeight: 700 }}>{weakerName} ({weakerPct}%)</span>
                          {" — "}
                          قوة في <span style={{ color: bandColor(strongerPct), fontWeight: 700 }}>{strongerName} ({strongerPct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}