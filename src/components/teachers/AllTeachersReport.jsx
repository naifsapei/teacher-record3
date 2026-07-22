import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportAllTeachersPDF, exportAllTeachersExcel, bandColor } from "@/utils/teachersReport";
import { specializationsText } from "@/lib/permissions";

export default function AllTeachersReport({ open, onOpenChange, teachers, stats, school }) {
  const [busy, setBusy] = useState(null);

  const handlePDF = async () => {
    setBusy("pdf");
    try {
      await exportAllTeachersPDF(teachers, stats, school);
      toast.success("تم تصدير PDF");
    } catch { toast.error("تعذّر تصدير PDF"); }
    setBusy(null);
  };

  const handleExcel = () => {
    setBusy("excel");
    try {
      exportAllTeachersExcel(teachers, stats);
      toast.success("تم تصدير Excel");
    } catch { toast.error("تعذّر تصدير Excel"); }
    setBusy(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تقرير أداء جميع المعلمين</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 flex-wrap mb-3 no-print">
          <Button variant="secondary" onClick={handlePDF} disabled={!!busy} className="gap-2">
            {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            تصدير PDF
          </Button>
          <Button variant="secondary" onClick={handleExcel} disabled={!!busy} className="gap-2">
            {busy === "excel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            تصدير Excel
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" /> طباعة
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm print-table">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-right p-2 border border-border">#</th>
                <th className="text-right p-2 border border-border">المعلم</th>
                <th className="text-right p-2 border border-border">رقم الموظف</th>
                <th className="text-right p-2 border border-border">التخصص</th>
                <th className="text-right p-2 border border-border">المرحلة</th>
                <th className="text-center p-2 border border-border">مواد</th>
                <th className="text-center p-2 border border-border">فصول</th>
                <th className="text-center p-2 border border-border">طلاب</th>
                <th className="text-center p-2 border border-border">المتوسط</th>
                <th className="text-center p-2 border border-border">حضور</th>
                <th className="text-center p-2 border border-border">غياب</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t, i) => {
                const s = stats.find((st) => st.teacher.id === t.id) || {};
                const att = s.attendance || {};
                return (
                  <tr key={t.id} className="border-t border-border/60">
                    <td className="p-2 border border-border text-center">{i + 1}</td>
                    <td className="p-2 border border-border font-medium">{t.name}</td>
                    <td className="p-2 border border-border">{t.employee_number || "—"}</td>
                    <td className="p-2 border border-border">{specializationsText(t) || "—"}</td>
                    <td className="p-2 border border-border">{t.grade_level || "—"}</td>
                    <td className="p-2 border border-border text-center">{s.subjectCount || 0}</td>
                    <td className="p-2 border border-border text-center">{s.classCount || 0}</td>
                    <td className="p-2 border border-border text-center">{s.studentCount || 0}</td>
                    <td className="p-2 border border-border text-center font-bold" style={{ color: bandColor(s.avg || 0) }}>{s.avg || 0}%</td>
                    <td className="p-2 border border-border text-center">{att.present || 0}</td>
                    <td className="p-2 border border-border text-center">{att.absent || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}