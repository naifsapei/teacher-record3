import { useMemo } from "react";
import { calcPct } from "@/lib/gradeCalc";

// calcPct مستوردة من @/lib/gradeCalc (تحترم منطق الخانة الفارغة)
const bandColor = (pct) => (pct >= 90 ? "#10b981" : pct >= 75 ? "#3b82f6" : pct >= 60 ? "#f59e0b" : "#ef4444");
const statusOf = (pct) =>
  pct >= 90 ? { label: "متميز", color: "#10b981" }
  : pct >= 75 ? { label: "جيد", color: "#3b82f6" }
  : pct >= 60 ? { label: "مقبول", color: "#f59e0b" }
  : { label: "متعثر", color: "#ef4444" };

export default function ClassPerformanceReport({ cls, students, subjects, grades }) {
  const classSubjects = useMemo(() => subjects.filter((s) => s.class_id === cls.id), [subjects, cls]);
  const classStudents = useMemo(() => students.filter((s) => s.class_id === cls.id), [students, cls]);

  const rows = useMemo(() => classStudents.map((stu) => {
    const cells = classSubjects.map((sub) => {
      const g = grades.find((x) => x.subject_id === sub.id && x.student_id === stu.id);
      const pct = g ? calcPct(g, sub) : null;
      return { sub, pct };
    });
    const valid = cells.filter((c) => c.pct != null);
    const avg = valid.length ? Math.round(valid.reduce((a, c) => a + c.pct, 0) / valid.length) : null;
    return { stu, cells, avg };
  }), [classStudents, classSubjects, grades]);

  const subjectAvgs = useMemo(() => classSubjects.map((sub) => {
    const vals = rows.map((r) => r.cells.find((c) => c.sub.id === sub.id)?.pct).filter((v) => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }), [classSubjects, rows]);

  const classAvg = useMemo(() => {
    const vals = rows.map((r) => r.avg).filter((v) => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }, [rows]);

  if (!classStudents.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">لا يوجد طلاب في هذا الصف</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-bold">تقرير أداء الصف: {cls.name}</h2>
        {classAvg != null && (
          <span className="text-sm font-bold" style={{ color: bandColor(classAvg) }}>
            متوسط الصف: {classAvg}%
          </span>
        )}
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full text-sm border-collapse print-table" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "28%" }} />
            {classSubjects.map((sub) => (
              <col key={sub.id} style={{ width: `${Math.max(7, Math.floor(51 / Math.max(classSubjects.length, 1)))}%` }} />
            ))}
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
          </colgroup>
          <thead className="bg-muted">
            <tr>
              <th className="text-right p-2 border border-border">#</th>
              <th className="text-right p-2 border border-border">الطالب</th>
              {classSubjects.map((sub) => (
                <th key={sub.id} className="text-center p-2 border border-border whitespace-nowrap" style={{ fontSize: "11px" }}>{sub.name}</th>
              ))}
              <th className="text-center p-2 border border-border">المتوسط</th>
              <th className="text-center p-2 border border-border">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const st = r.avg != null ? statusOf(r.avg) : null;
              return (
                <tr key={r.stu.id} className="border-t border-border/60">
                  <td className="p-2 border border-border text-muted-foreground text-center">{i + 1}</td>
                  <td className="p-2 border border-border font-medium text-right whitespace-nowrap overflow-hidden text-ellipsis">{r.stu.name}</td>
                  {r.cells.map((c) => (
                    <td key={c.sub.id} className="p-2 border border-border text-center" style={{ color: c.pct != null ? bandColor(c.pct) : undefined, fontWeight: c.pct != null ? 600 : 400 }}>
                      {c.pct != null ? `${c.pct}%` : "-"}
                    </td>
                  ))}
                  <td className="p-2 border border-border text-center font-bold" style={{ color: r.avg != null ? bandColor(r.avg) : undefined }}>
                    {r.avg != null ? `${r.avg}%` : "-"}
                  </td>
                  <td className="p-2 border border-border text-center">
                    {st ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: st.color, backgroundColor: st.color + "1a" }}>{st.label}</span>
                    ) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {subjectAvgs.length > 0 && (
            <tfoot>
              <tr className="bg-muted/50 font-bold">
                <td className="p-2 border border-border" colSpan={2}>متوسط المادة</td>
                {subjectAvgs.map((v, i) => (
                  <td key={i} className="p-2 border border-border text-center" style={{ color: v != null ? bandColor(v) : undefined }}>
                    {v != null ? `${v}%` : "-"}
                  </td>
                ))}
                <td className="p-2 border border-border text-center" style={{ color: classAvg != null ? bandColor(classAvg) : undefined }}>
                  {classAvg != null ? `${classAvg}%` : "-"}
                </td>
                <td className="p-2 border border-border text-center">—</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}