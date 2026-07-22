import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const bandColor = (pct) => (pct == null ? "#cbd5e1" : pct >= 90 ? "#10b981" : pct >= 75 ? "#3b82f6" : pct >= 60 ? "#f59e0b" : "#ef4444");

export default function AbsenceImpactChart({ data }) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 20, right: 24, left: -8, bottom: 28 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          type="number"
          dataKey="absence"
          name="أيام الغياب"
          label={{ value: "أيام الغياب", position: "insideBottom", offset: -8, fontSize: 12, fill: "#64748b" }}
          tick={{ fontSize: 11 }}
          allowDecimals={false}
        />
        <YAxis
          type="number"
          dataKey="pct"
          name="أعمال السنة"
          unit="%"
          domain={[0, 100]}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          contentStyle={{ fontFamily: "inherit", fontSize: 12, borderRadius: 12 }}
          formatter={(v, n) => (n === "pct" ? [`${v}%`, "أعمال السنة"] : [v, "أيام الغياب"])}
          labelFormatter={() => ""}
        />
        <Scatter data={data}>
          {data.map((d, i) => (
            <Cell key={i} fill={bandColor(d.pct)} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}