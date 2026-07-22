import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart3 } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

const COLORS = ["hsl(0,72%,51%)", "hsl(210,100%,20%)", "hsl(200,70%,45%)", "hsl(147,55%,50%)", "hsl(280,60%,55%)", "hsl(36,95%,55%)"];

export default function ClassAbsenceChart({ data }) {
  if (data.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> نسب الغياب حسب الصف
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={BarChart3} title="لا توجد بيانات" description="ستظهر نسب الغياب عند تسجيل الحضور في الفترة المحددة" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> نسب الغياب حسب الصف
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,15%,90%)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
            <Tooltip formatter={(v) => [`${v}%`, "نسبة الغياب"]} />
            <Bar dataKey="الغياب" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}