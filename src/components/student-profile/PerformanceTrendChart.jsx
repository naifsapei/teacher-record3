import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

const MONTH_LABELS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default function PerformanceTrendChart({ trackingRecords = [] }) {
  const data = useMemo(() => {
    const byMonth = {};
    trackingRecords.forEach((r) => {
      if (!r.date) return;
      const ym = r.date.slice(0, 7); // YYYY-MM
      if (!byMonth[ym]) byMonth[ym] = { sum: 0, count: 0 };
      byMonth[ym].sum += r.points || 0;
      byMonth[ym].count += 1;
    });
    return Object.keys(byMonth)
      .sort()
      .map((ym) => {
        const [y, m] = ym.split("-").map(Number);
        const avg = byMonth[ym].count > 0 ? Math.round((byMonth[ym].sum / byMonth[ym].count) * 10) / 10 : 0;
        return { month: `${MONTH_LABELS[m - 1] || ""} ${y}`, المتوسط: avg };
      });
  }, [trackingRecords]);

  if (data.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> تطور المستوى عبر الفترات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={TrendingUp} title="لا توجد بيانات تتبع" description="ستظهر نقاط المتابعة الشهرية هنا عند تسجيلها" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> تطور المستوى عبر الفترات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,15%,90%)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="المتوسط" stroke="hsl(210,100%,20%)" strokeWidth={3} dot={{ r: 4, fill: "hsl(147,100%,34%)" }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}