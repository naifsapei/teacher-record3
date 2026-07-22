import { TrendingUp, TrendingDown } from "lucide-react";

function TierCard({ title, icon: Icon, tone, students }) {
  const tones = {
    up: "border-emerald-200 bg-emerald-50/50",
    down: "border-red-200 bg-red-50/50",
  };
  const text = tone === "up" ? "text-emerald-600" : "text-red-600";
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-5 w-5 ${text}`} />
        <h3 className="font-bold text-sm">{title}</h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white ${text}`}>
          {students.length}
        </span>
      </div>
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {students.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">لا يوجد طلاب</p>
        ) : (
          students.map((s, i) => (
            <div key={s.id} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
              <span className="text-sm font-medium truncate">
                <span className="text-muted-foreground ml-1">{i + 1}.</span>
                {s.name}
              </span>
              <span className={`text-xs font-bold ${text}`}>{s.pct}%</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function StudentTierList({ outstanding, struggling }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <TierCard title="الطلاب المتميزون" icon={TrendingUp} tone="up" students={outstanding} />
      <TierCard title="الطلاب المتعثرون" icon={TrendingDown} tone="down" students={struggling} />
    </div>
  );
}