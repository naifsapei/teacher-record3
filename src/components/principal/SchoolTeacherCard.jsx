import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

const bandColor = (pct) => (pct >= 90 ? "#10b981" : pct >= 75 ? "#3b82f6" : pct >= 60 ? "#f59e0b" : "#ef4444");

export default function SchoolTeacherCard({ teacher, subjectsCount, studentsCount, avg, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-right p-4 rounded-2xl border-2 transition-all w-full",
        active ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:border-primary/40"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="h-11 w-11 rounded-xl bg-chart-4/10 flex items-center justify-center shrink-0">
          <Users className="h-5 w-5 text-chart-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{teacher.name}</p>
          <p className="text-xs text-muted-foreground truncate">{teacher.specialization || "معلم"}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/40 py-1.5">
          <p className="text-sm font-bold">{subjectsCount}</p>
          <p className="text-[10px] text-muted-foreground">مواد</p>
        </div>
        <div className="rounded-lg bg-muted/40 py-1.5">
          <p className="text-sm font-bold">{studentsCount}</p>
          <p className="text-[10px] text-muted-foreground">طلاب</p>
        </div>
        <div className="rounded-lg bg-muted/40 py-1.5">
          <p className="text-sm font-bold" style={{ color: bandColor(avg) }}>{avg}%</p>
          <p className="text-[10px] text-muted-foreground">المتوسط</p>
        </div>
      </div>
    </button>
  );
}