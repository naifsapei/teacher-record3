import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Download, Calendar, CalendarDays, Lock } from "lucide-react";
import { canExport } from "@/lib/permissions";
import { toast } from "sonner";
import { exportAttendancePDF, exportAttendanceExcel } from "@/utils/attendanceExport";

export default function AttendanceExportMenu({
  me, school, className, teacherName, teacherTitle, principalName, students, attendance, classId, date,
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);
  const allowed = canExport(me);

  const guard = (fn) => async () => {
    if (!allowed) {
      toast.error("ميزة التصدير متاحة للمشتركين فقط", { description: "اشترك الآن لتفعيل تصدير التقارير والسجلات." });
      navigate("/subscription");
      return;
    }
    fn && await fn();
  };

  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); toast.success("تم التصدير بنجاح"); }
    catch (e) { toast.error("تعذر إجراء التصدير"); console.error(e); }
    finally { setBusy(null); }
  };

  const base = { school, className, teacherName, teacherTitle, principalName, students, attendance, classId };
  const month = date ? date.slice(0, 7) : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {allowed ? <Download className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
          تصدير سجل الحضور
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" dir="rtl">
        <DropdownMenuLabel>تصدير PDF</DropdownMenuLabel>
        <DropdownMenuItem
          disabled={busy === "pdf-day"}
          onClick={guard(() => run("pdf-day", () => exportAttendancePDF({ ...base, mode: "daily", date })))}
        >
          <Calendar className="w-4 h-4 ml-2" /> يومي {busy === "pdf-day" ? "..." : ""}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={busy === "pdf-month"}
          onClick={guard(() => run("pdf-month", () => exportAttendancePDF({ ...base, mode: "monthly", month })))}
        >
          <CalendarDays className="w-4 h-4 ml-2" /> شهري {busy === "pdf-month" ? "..." : ""}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>تصدير Excel</DropdownMenuLabel>
        <DropdownMenuItem
          disabled={busy === "xls-day"}
          onClick={guard(() => run("xls-day", () => exportAttendanceExcel({ ...base, mode: "daily", date })))}
        >
          <Calendar className="w-4 h-4 ml-2" /> يومي {busy === "xls-day" ? "..." : ""}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={busy === "xls-month"}
          onClick={guard(() => run("xls-month", () => exportAttendanceExcel({ ...base, mode: "monthly", month })))}
        >
          <CalendarDays className="w-4 h-4 ml-2" /> شهري {busy === "xls-month" ? "..." : ""}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}