import { ATTENDANCE_STATUS } from "@/lib/attendanceStatus";

export default function AttendanceStatusBadge({ status, size = "sm" }) {
  if (!status || !ATTENDANCE_STATUS[status]) {
    return <span className={`inline-flex items-center gap-1 rounded-full border border-dashed border-border text-muted-foreground ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}`} title="لم يُسجّل">—</span>;
  }
  const s = ATTENDANCE_STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${s.color} ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}