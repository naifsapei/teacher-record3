import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calcPct } from "@/lib/gradeCalc";
import { SEMESTER_LABELS } from "@/lib/terminology";
import { BarChart3, Users } from "lucide-react";

const PERIODS = [
  { key: "first", label: SEMESTER_LABELS.first || "الفصل الأول", fill: "#002060" },
  { key: "second", label: SEMESTER_LABELS.second || "الفصل الثاني", fill: "#00B050" },
];

export default function SubjectComparisonChart({ student, subjects, grades, classStudents }) {
  const [period, setPeriod] = useState("first");

  const classSubjects = useMemo(
    () => subjects.filter((s) => s.class_id === student?.class_id),
    [subjects, student]
  );

  const studentPct = (subjectId, semesterKey) => {
    const sub = classSubjects.find((x) => x.id === subjectId);
    const g = grades.find(
      (gr) => gr.student_id === student.id && gr.subject_id === subjectId && gr.semester === semesterKey
    );
    return calcPct(g, sub);
  };

  const classAvg = (subjectId, semesterKey) => {
    const sub = classSubjects.find((x) => x.id === subjectId);
    const pcts = [];
    classStudents.forEach((s) => {
      const g = grades.find(
        (gr) => gr.student_id === s.id && gr.subject_id === subjectId && gr.semester === semesterKey
      );
      const p = calcPct(g, sub);
      if (p != null) pcts.push(p);
    });
    return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  };

  // أداء الطالب في كل مادة عبر الفترات (الفصلين)
  const trendData = useMemo(() => {
    return classSubjects
      .map((sub) => {
        const row = { subject: sub.name };
        PERIODS.forEach((p) => { row[p.key] = studentPct(sub.id, p.key); });
        return row;
      })
      .filter((r) => PERIODS.some((p) => r[p.key] != null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classSubjects, grades, student, classStudents]);

  // مقارنة الطالب بمتوسط الشعبة في الفترة المختارة
  const compareData = useMemo(() => {
    return classSubjects
      .map((sub) => ({
        subject: sub.name,
        student: studentPct(sub.id, period),
        classAvg: classAvg(sub.id, period),
      }))
      .filter((r) => r.student != null || r.classAvg != null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classSubjects, grades, student, classStudents, period]);

  const hasData = trendData.length > 0 || compareData.length > 0;

  const tooltipFormatter = (v) => (v == null ? "—" : `${v}%`);

  return (
    <div className="space-y-6">
      {/* الرسم الأول: مستوى الطالب في كل مادة عبر الفترات */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> مستوى الطالب في كل مادة عبر الفترات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!trendData.length ? (
            <p className="text-sm text-muted-foreground py-4">لا توجد درجات مسجلة لعرض التطور عبر الفترات</p>
          ) : (
            <div className="overflow-x-auto">
              <div style={{ minWidth: trendData.length * 110 }}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="subject" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={36} />
                    <Tooltip formatter={tooltipFormatter} contentStyle={{ direction: "rtl", borderRadius: 12, fontSize: 12 }} />
                    <Legend />
                    {PERIODS.map((p) => (
                      <Bar key={p.key} dataKey={p.key} name={p.label} fill={p.fill} radius={[4, 4, 0, 0]} maxBarSize={48} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* الرسم الثاني: مقارنة الطالب بمتوسط الشعبة */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> مقارنة الطالب بمتوسط الشعبة
            </CardTitle>
            <div className="flex items-center gap-1.5">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${period === p.key ? "text-white" : "bg-muted text-muted-foreground"}`}
                  style={period === p.key ? { backgroundColor: p.fill } : undefined}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!compareData.length ? (
            <p className="text-sm text-muted-foreground py-4">لا توجد بيانات كافية للمقارنة في هذه الفترة</p>
          ) : (
            <div className="overflow-x-auto">
              <div style={{ minWidth: compareData.length * 120 }}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={compareData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="subject" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={36} />
                    <Tooltip formatter={tooltipFormatter} contentStyle={{ direction: "rtl", borderRadius: 12, fontSize: 12 }} />
                    <Legend />
                    <Bar dataKey="student" name="الطالب" fill="#002060" radius={[4, 4, 0, 0]} maxBarSize={44} />
                    <Bar dataKey="classAvg" name="متوسط الشعبة" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}