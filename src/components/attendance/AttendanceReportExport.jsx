import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, FileSpreadsheet, CalendarDays, Lock } from "lucide-react";
import { toast } from "sonner";
import { canExport } from "@/lib/permissions";
import { exportAttendancePDF, exportAttendanceExcel } from "@/utils/attendanceExport";

export default function AttendanceReportExport({
  me, school, className, teacherName, teacherTitle, principalName,
  students, attendance, classId, date,
}) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("daily");
  const [reportDate, setReportDate] = useState(date || new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState((date || new Date().toISOString().slice(0, 10)).slice(0, 7));
  const [busy, setBusy] = useState(null);

  const allowed = canExport(me);

  const guard = (fn) => async () => {
    if (!allowed) {
      toast.error("ميزة التصدير متاحة للمشتركين فقط", { description: "اشترك الآن لتفعيل تصدير التقارير." });
      navigate("/subscription");
      return;
    }
    setBusy(fn.key);
    try {
      await fn.run();
      toast.success("تم التصدير بنجاح");
    } catch (e) {
      toast.error("تعذر إجراء التصدير");
      console.error(e);
    } finally {
      setBusy(null);
    }
  };

  const base = {
    school: school || {},
    className: className || "",
    teacherName: teacherName || "",
    teacherTitle: teacherTitle || "معلم",
    principalName: principalName || "",
    students,
    attendance,
    classId,
  };

  const run = (key, fn) => guard({ key, run: fn });

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          تصدير تقرير الحضور والانصراف{className ? ` — ${className}` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>نوع التقرير</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">يومي (تاريخ محدد)</SelectItem>
                <SelectItem value="monthly">شهري (شهر كامل)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{mode === "daily" ? "التاريخ" : "الشهر"}</Label>
            <Input
              type={mode === "daily" ? "date" : "month"}
              value={mode === "daily" ? reportDate : month}
              onChange={(e) => mode === "daily" ? setReportDate(e.target.value) : setMonth(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button
            variant="destructive"
            className="gap-2"
            disabled={!!busy}
            onClick={run("pdf", () => exportAttendancePDF({ ...base, mode, date: reportDate, month }))}
          >
            <FileText className="h-4 w-4" />
            {busy === "pdf" ? "جاري التصدير..." : "تصدير PDF"}
          </Button>
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={!!busy}
            onClick={run("xls", () => exportAttendanceExcel({ ...base, mode, date: reportDate, month }))}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {busy === "xls" ? "جاري التصدير..." : "تصدير Excel"}
          </Button>
          {!allowed && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground self-center">
              <Lock className="h-3.5 w-3.5" /> متاحة للمشتركين
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {mode === "daily"
            ? `سيتم تصدير سجل الحضور ليوم ${reportDate} للطلاب المرتبطين بالصف.`
            : `سيتم تصدير سجل الحضور لشهر ${month} كاملاً مع رموز الحضور لكل يوم.`}
        </p>
      </CardContent>
    </Card>
  );
}