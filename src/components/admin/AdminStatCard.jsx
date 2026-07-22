import { Card, CardContent } from "@/components/ui/card";

export default function AdminStatCard({ icon: Icon, label, value, sub, color, subTone, onClick }) {
  return (
    <Card
      className={onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xl sm:text-2xl font-bold leading-tight">{value}</div>
          <div className="text-[11px] sm:text-xs text-muted-foreground leading-snug line-clamp-2">{label}</div>
          {sub && <div className={`text-[10px] sm:text-[11px] mt-0.5 truncate ${subTone || "text-muted-foreground"}`}>{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}