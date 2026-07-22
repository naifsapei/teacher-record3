import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from "recharts";

const BAND_COLOR = (pct) =>
  pct >= 90 ? "#10b981" : pct >= 75 ? "#3b82f6" : pct >= 60 ? "#f59e0b" : "#ef4444";

export default function SubjectAverageChart({ data }) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 12, left: -12, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "inherit" }} interval={0} angle={-15} textAnchor="end" height={60} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          formatter={(v) => [`${v}%`, "المتوسط"]}
          contentStyle={{ fontFamily: "inherit", fontSize: 12, borderRadius: 12 }}
        />
        <Bar dataKey="avg" radius={[8, 8, 0, 0]} maxBarSize={56}>
          {data.map((d, i) => <Cell key={i} fill={BAND_COLOR(d.avg)} />)}
          <LabelList dataKey="avg" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 11, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}