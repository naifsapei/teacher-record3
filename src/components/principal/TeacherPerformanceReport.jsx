import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { calcPct } from "@/lib/gradeCalc";

const bandColor = (pct) => (pct >= 90 ? "#10b981" : pct >= 75 ? "#3b82f6" : pct >= 60 ? "#f59e0b" : "#ef4444");

export default function TeacherPerformanceReport({ teacher, subjects, grades, students, classes }) {
  const data = useMemo(() => {
    const mySubjects = subjects.filter((s) => s.teacher_id === teacher.id);
    return mySubjects.map((sub) => {
      const cls = classes.find((c) => c.id === sub.class_id);
      const rows = grades
        .filter((g) => g.subject_id === sub.id)
        .map((g) => {
          const stu = students.find((s) => s.id === g.student_id);
          if (!stu) return null;
          const pct = calcPct(g, sub);
          if (pct === null) return null;
          return { stu, pct, class_id: stu.class_id, grade_level: cls?.grade_level || "" };
        })
        .filter(Boolean);
      const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length) : 0;
      const outstanding = rows.filter((r) => r.pct >= 90).map((r) => ({ id: r.stu.id, name: r.stu.name, pct: r.pct }));
      const struggling = rows.filter((r) => r.pct < 60).map((r) => ({ id: r.stu.id, name: r.stu.name, pct: r.pct }));
      return { sub, cls, avg, count: rows.length, outstanding, struggling, rows };
    });
  }, [teacher, subjects, grades, students, classes]);

  if (!data.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">لا توجد مواد أو درجات مرتبطة بهذا المعلم</p>;
  }

  const chartData = data.map((d) => ({ name: d.sub.name, avg: d.avg }));
  const allOutstanding = data.flatMap((d) => d.outstanding).sort((a, b) => b.pct - a.pct).slice(0, 12);
  const allStruggling = data.flatMap((d) => d.struggling).sort((a, b) => a.pct - b.pct).slice(0, 12);
  const allRows = data
    .flatMap((d) => d.rows.map((r) => ({ name: r.stu.name, subject: d.sub.name, className: d.cls?.name || "", pct: r.pct })))
    .sort((a, b) => a.name.localeCompare(b.name));
  const statusOf = (pct) =>
    pct >= 90 ? { label: "متميز", color: "#10b981" }
    : pct >= 75 ? { label: "جيد", color: "#3b82f6" }
    : pct >= 60 ? { label: "مقبول", color: "#f59e0b" }
    : { label: "متعثر", color: "#ef4444" };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">متوسطات أداء الطلاب حسب المادة</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 20, right: 12, left: -12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`, "المتوسط"]} contentStyle={{ fontFamily: "inherit", fontSize: 12, borderRadius: 12 }} />
              <Bar dataKey="avg" radius={[8, 8, 0, 0]} maxBarSize={56}>
                {chartData.map((d, i) => <Cell key={i} fill={bandColor(d.avg)} />)}
                <LabelList dataKey="avg" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">تفصيل المواد</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-right p-3 font-medium">المادة</th>
                  <th className="text-right p-3 font-medium">الصف / المرحلة</th>
                  <th className="text-center p-3 font-medium">عدد الطلاب</th>
                  <th className="text-center p-3 font-medium">المتوسط</th>
                  <th className="text-center p-3 font-medium text-emerald-600">متميز</th>
                  <th className="text-center p-3 font-medium text-red-600">متعثر</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.sub.id} className="border-t border-border/60 hover:bg-muted/20">
                    <td className="p-3 font-medium text-right">{d.sub.name}</td>
                    <td className="p-3 text-right text-muted-foreground">{d.cls?.name || "-"} {d.cls?.grade_level ? `— ${d.cls.grade_level}` : ""}</td>
                    <td className="p-3 text-center">{d.count}</td>
                    <td className="p-3 text-center font-bold" style={{ color: bandColor(d.avg) }}>{d.avg}%</td>
                    <td className="p-3 text-center text-emerald-600 font-semibold">{d.outstanding.length}</td>
                    <td className="p-3 text-center text-red-600 font-semibold">{d.struggling.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">قائمة الطلاب</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-sm print-table" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "5%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "18%" }} />
              </colgroup>
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-right p-3 font-medium">#</th>
                  <th className="text-right p-3 font-medium">الطالب</th>
                  <th className="text-right p-3 font-medium">المادة</th>
                  <th className="text-right p-3 font-medium">الصف</th>
                  <th className="text-center p-3 font-medium">النسبة</th>
                  <th className="text-center p-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {allRows.map((r, i) => {
                  const st = statusOf(r.pct);
                  return (
                    <tr key={i} className="border-t border-border/60">
                      <td className="p-3 text-muted-foreground text-center">{i + 1}</td>
                      <td className="p-3 font-medium text-right whitespace-nowrap overflow-hidden text-ellipsis">{r.name}</td>
                      <td className="p-3 text-right text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">{r.subject}</td>
                      <td className="p-3 text-right text-muted-foreground">{r.className || "-"}</td>
                      <td className="p-3 text-center font-bold" style={{ color: st.color }}>{r.pct}%</td>
                      <td className="p-3 text-center">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: st.color, backgroundColor: st.color + "1a" }}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "طلاب متميزون", icon: TrendingUp, tone: "up", list: allOutstanding },
          { title: "طلاب متعثرون", icon: TrendingDown, tone: "down", list: allStruggling },
        ].map((g) => {
          const tones = { up: "border-emerald-200 bg-emerald-50/50", down: "border-red-200 bg-red-50/50" };
          const txt = g.tone === "up" ? "text-emerald-600" : "text-red-600";
          const Icon = g.icon;
          return (
            <div key={g.title} className={`rounded-2xl border p-4 ${tones[g.tone]}`}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`h-5 w-5 ${txt}`} />
                <h3 className="font-bold text-sm">{g.title}</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white ${txt}`}>{g.list.length}</span>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {g.list.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">لا يوجد</p>
                ) : g.list.map((s, i) => (
                  <div key={s.id + i} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium truncate"><span className="text-muted-foreground ml-1">{i + 1}.</span>{s.name}</span>
                    <span className={`text-xs font-bold ${txt}`}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}