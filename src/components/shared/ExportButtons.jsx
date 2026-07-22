import { useNavigate } from "react-router-dom";
import { FileText, FileSpreadsheet, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { canExport } from "@/lib/permissions";

export default function ExportButtons({ onExportPDF, onExportExcel, me, busy, disabled }) {
  const navigate = useNavigate();
  const allowed = canExport(me);

  const guard = (fn) => () => {
    if (!allowed) {
      toast.error("ميزة التصدير متاحة للمشتركين فقط", {
        description: "اشترك الآن لتفعيل تصدير التقارير والسجلات.",
      });
      navigate("/subscription");
      return;
    }
    fn && fn();
  };

  return (
    <div className={`flex items-center gap-2 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <Button variant="outline" size="sm" onClick={guard(onExportPDF)} disabled={busy} className="gap-1.5">
        {allowed ? <FileText className="w-4 h-4" /> : <Lock className="w-3.5 w-3.5" />}
        تصدير PDF
      </Button>
      <Button variant="outline" size="sm" onClick={guard(onExportExcel)} disabled={busy} className="gap-1.5">
        {allowed ? <FileSpreadsheet className="w-4 h-4" /> : <Lock className="w-3.5 w-3.5" />}
        تصدير Excel
      </Button>
    </div>
  );
}