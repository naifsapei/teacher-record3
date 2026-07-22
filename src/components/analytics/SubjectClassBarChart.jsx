import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { bandColor } from "@/utils/teachersReport";

export default function SubjectClassBarChart({ data, subjectName }) {
  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> متوسطات الفصول</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={BarChart3} title="لا توجد بيانات" description="اختر مادة لعرض مقارنة متوسطات الفصول" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> متوسطات الفصول — {subjectName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="className" tick={{ fontSize: 11, fontFamily: "inherit" }} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip formatter={(v) => [`${v}%`, "المتوسط"]} contentStyle={{ fontFamily: "inherit", fontSize: 12, borderRadius: 12 }} />
            <Bar dataKey="avg" radius={[8, 8, 0, 0]} maxBarSize={56}>
              {data.map((d, i) => <Cell key={i} fill={bandColor(d.avg)} />)}
              <LabelList dataKey="avg" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 11, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}