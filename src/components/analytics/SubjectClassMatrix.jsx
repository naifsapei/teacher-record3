import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { bandColor } from "@/utils/teachersReport";

export default function SubjectClassMatrix({ matrix, classes }) {
  if (!matrix.length) return null;

  const insights = matrix
    .map((row) => {
      const valid = row.classAvgs.filter((c) => c.avg !== null);
      if (valid.length < 2) return null;
      const sorted = [...valid].sort((a, b) => a.avg - b.avg);
      return { row, worst: sorted[0], best: sorted[sorted.length - 1], gap: sorted[sorted.length - 1].avg - sorted[0].avg };
    })
    .filter(Boolean)
    .sort((a, b) => b.gap - a.gap);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">مصفوفة المقارنة: المواد × الفصول</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm print-table">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-right p-2 border border-border sticky right-0 bg-muted/50">المادة</th>
                {classes.map((c) => (
                  <th key={c.id} className="text-center p-2 border border-border whitespace-nowrap">{c.name}</th>
                ))}
                <th className="text-center p-2 border border-border">عام</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.subject.id} className="border-t border-border/60">
                  <td className="p-2 border border-border font-medium text-right sticky right-0 bg-card">{row.subject.name}</td>
                  {row.classAvgs.map((c) => (
                    <td key={c.classId} className="p-2 border border-border text-center">
                      {c.avg === null
                        ? <span className="text-muted-foreground">—</span>
                        : <span className="font-bold" style={{ color: bandColor(c.avg) }}>{c.avg}%</span>}
                    </td>
                  ))}
                  <td className="p-2 border border-border text-center font-bold" style={{ color: bandColor(row.overall || 0) }}>{row.overall}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> رؤى إدارية (مرتبة حسب أكبر فجوة بين الفصول)
          </h3>
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد فجوات كبيرة بين الفصول — الأداء متقارب.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {insights.map(({ row, worst, best, gap }) => (
                <div key={row.subject.id} className="rounded-lg border bg-card p-3 text-xs">
                  <div className="font-semibold mb-1.5">{row.subject.name}</div>
                  <div className="flex items-center justify-between text-muted-foreground gap-2">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-600" />
                      {best.className}: <span style={{ color: bandColor(best.avg), fontWeight: 700 }}>{best.avg}%</span>
                    </span>
                    <span className="font-bold text-amber-600">فجوة {gap}%</span>
                    <span className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      {worst.className}: <span style={{ color: bandColor(worst.avg), fontWeight: 700 }}>{worst.avg}%</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}