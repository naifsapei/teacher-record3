import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingDown, Target } from "lucide-react";
import { bandColor } from "@/utils/teachersReport";

const passColor = (p) => (p >= 75 ? "#10b981" : p >= 50 ? "#3b82f6" : p >= 30 ? "#f59e0b" : "#ef4444");

export default function SubjectClassAnalysisTable({ rows, schoolAvg, gap }) {
  if (!rows.length) return null;
  const ranked = [...rows].filter((c) => c.avg !== null).sort((a, b) => b.avg - a.avg);
  const belowAvg = ranked.filter((c) => c.avg < schoolAvg);
  const intervention = ranked.filter((c) => c.avg < 60);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">تفصيل الفصول وترتيبها حسب الأداء</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm print-table">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-right p-2 border border-border">#</th>
                <th className="text-right p-2 border border-border">الفصل</th>
                <th className="text-center p-2 border border-border">عدد الطلاب</th>
                <th className="text-center p-2 border border-border">المتوسط</th>
                <th className="text-center p-2 border border-border">نسبة النجاح</th>
                <th className="text-center p-2 border border-border text-emerald-600">متميز</th>
                <th className="text-center p-2 border border-border text-red-600">متعثر</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((c, i) => (
                <tr key={c.classId} className="border-t border-border/60">
                  <td className="p-2 border border-border text-center text-muted-foreground">{i + 1}</td>
                  <td className="p-2 border border-border font-medium text-right">{c.className}{c.gradeLevel ? ` — ${c.gradeLevel}` : ""}</td>
                  <td className="p-2 border border-border text-center">{c.count}</td>
                  <td className="p-2 border border-border text-center font-bold" style={{ color: bandColor(c.avg) }}>{c.avg}%</td>
                  <td className="p-2 border border-border text-center font-semibold" style={{ color: passColor(c.passRate) }}>{c.passRate}%</td>
                  <td className="p-2 border border-border text-center text-emerald-600 font-semibold">{c.outstanding}</td>
                  <td className="p-2 border border-border text-center text-red-600 font-semibold">{c.struggling}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
            <div className="flex items-center gap-2 mb-2 text-red-600"><AlertTriangle className="h-4 w-4" /><h3 className="text-sm font-bold">فصول تحتاج تدخلًا فوريًا</h3></div>
            <p className="text-2xl font-bold text-red-600">{intervention.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{intervention.length ? intervention.map((c) => c.className).join("، ") : "لا يوجد"}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex items-center gap-2 mb-2 text-amber-600"><TrendingDown className="h-4 w-4" /><h3 className="text-sm font-bold">تحت متوسط المادة</h3></div>
            <p className="text-2xl font-bold text-amber-600">{belowAvg.length}</p>
            <p className="text-xs text-muted-foreground mt-1">فصول دون متوسط المدرسة ({schoolAvg}%)</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex items-center gap-2 mb-2 text-blue-600"><Target className="h-4 w-4" /><h3 className="text-sm font-bold">الفجوة بين الفصول</h3></div>
            <p className="text-2xl font-bold text-blue-600">{gap}%</p>
            <p className="text-xs text-muted-foreground mt-1">بين أعلى وأقل فصل</p>
          </div>
        </div>

        {ranked.length > 0 && (
          <div className="rounded-xl border bg-card p-4 text-sm">
            <h3 className="font-bold mb-2 flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> توصيات التحسين التعليمي</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              {ranked.length >= 1 && (
                <li>• الفصل الأعلى أداءً: <span className="font-semibold text-emerald-600">{ranked[0].className} ({ranked[0].avg}%)</span> — يمكن الاستفادة منه كنموذج تطبيق.</li>
              )}
              {ranked.length >= 2 && (
                <li>• الفصل الأقل أداءً: <span className="font-semibold text-red-600">{ranked[ranked.length - 1].className} ({ranked[ranked.length - 1].avg}%)</span> — يحتاج خطة دعم إضافية.</li>
              )}
              {intervention.length > 0 && (
                <li>• فصول تتطلب تدخلًا عاجلًا (متوسط أقل من 60%): <span className="font-semibold text-red-600">{intervention.map((c) => c.className).join("، ")}</span>.</li>
              )}
              {belowAvg.length > 0 && (
                <li>• فصول تحت متوسط المادة: <span className="font-semibold text-amber-600">{belowAvg.map((c) => c.className).join("، ")}</span> — يُنصح بمراجعة طرائق التدريس والتقييم.</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}