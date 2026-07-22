import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, FileText, Calendar } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { subWeeks, subMonths, startOfWeek, startOfMonth, isAfter, parseISO } from "date-fns";
import ReportDocument from "@/components/reports/ReportDocument";
import { captureNodeToPdf } from "@/utils/pdfExport";
import { buildAnalysis } from "@/utils/reportAnalysis";
import { isPrincipalOnly, canExport, resolveSchool } from "@/lib/permissions";
import { useNavigate } from "react-router-dom";

const GRADE_BANDS = [
  { key: "ممتاز",         min: 90 },
  { key: "جيد جداً",      min: 75 },
  { key: "جيد",           min: 60 },
  { key: "مقبول",         min: 50 },
  { key: "بحاجة لتحسين", min: 0  },
];

function getGradeBand(pct) {
  return GRADE_BANDS.find((b) => pct >= b.min)?.key || "بحاجة لتحسين";
}

function calcTotal(g) {
  return (g.participation||0)+(g.homework||0)+(g.class_activity||0)+(g.research||0)+(g.written_exam||0)+(g.practical_exam||0);
}

function calcMax(sub) {
  return (sub.participation_max||10)+(sub.homework_max||10)+(sub.class_activity_max||10)+(sub.research_max||10)+(sub.written_exam_max||30)+(sub.practical_exam_max||30);
}

// احسب تاريخ بداية الفترة الزمنية
function getPeriodStart(period, weeksCount, monthsCount) {
  const now = new Date();
  if (period === "weekly")  return startOfWeek(subWeeks(now, weeksCount - 1), { weekStartsOn: 0 });
  if (period === "monthly") return startOfMonth(subMonths(now, monthsCount - 1));
  return null; // "all" = كل الوقت
}

function getPeriodLabel(period, weeksCount, monthsCount) {
  if (period === "weekly")  return weeksCount === 1 ? "هذا الأسبوع" : `آخر ${weeksCount} أسابيع`;
  if (period === "monthly") return monthsCount === 1 ? "هذا الشهر" : `آخر ${monthsCount} أشهر`;
  return "جميع الفترات";
}

export default function AnalyticsExport({ classes, subjects, students, grades, selectedClass, classObj, classStudents, classSubjects, selectedSubject = "all", subjectObj = null }) {
  const [loading, setLoading]       = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [exportType, setExportType] = useState(null); // "excel" | "pdf"
  const [period, setPeriod]         = useState("all");
  const [weeksCount, setWeeksCount] = useState("1");
  const [monthsCount, setMonthsCount] = useState("1");
  const [pdfData, setPdfData] = useState(null);
  const reportRef = useRef(null);
  const { data: schoolInfo } = useQuery({ queryKey: ["schoolInfo"], queryFn: () => base44.entities.SchoolInfo.list().then((r) => r[0] || {}) });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const school = resolveSchool(me, schoolInfo);

  const className        = classObj?.name || (selectedClass === "all" ? "جميع الصفوف" : classes?.find((c) => c.id === selectedClass)?.name || "");
  const filteredStudents = classStudents || (selectedClass === "all" ? (students||[]) : (students||[]).filter((s) => s.class_id === selectedClass));
  const allClassSubjects  = classSubjects || (selectedClass === "all" ? (subjects||[]) : (subjects||[]).filter((s) => s.class_id === selectedClass));
  const hasSubject        = selectedSubject && selectedSubject !== "all" && subjectObj;
  const filteredSubjects  = hasSubject ? allClassSubjects.filter((s) => s.id === selectedSubject) : allClassSubjects;
  const subjectName       = hasSubject ? subjectObj.name : "جميع المواد";

  // تصفية الدرجات حسب الفترة الزمنية (بناءً على updated_date)
  const getFilteredGrades = () => {
    const periodStart = getPeriodStart(period, parseInt(weeksCount), parseInt(monthsCount));
    if (!periodStart) return grades;
    return grades.filter((g) => {
      const d = g.updated_date || g.created_date;
      if (!d) return true;
      return isAfter(parseISO(d), periodStart);
    });
  };

  const buildRows = (filteredGrades) => {
    const rows = [];
    filteredStudents.forEach((stu) => {
      filteredSubjects.forEach((sub) => {
        const g = filteredGrades.find((gr) => gr.student_id === stu.id && gr.subject_id === sub.id);
        if (!g) return;
        const total = calcTotal(g);
        const max   = calcMax(sub);
        const pct   = max > 0 ? Math.round((total / max) * 100) : 0;
        rows.push({
          "اسم الطالب":        stu.name,
          "رقم الطالب":        stu.student_number || "-",
          "المادة":            sub.name,
          "مشاركة":            g.participation   || 0,
          "واجبات":            g.homework        || 0,
          "نشاط صفي":          g.class_activity  || 0,
          "بحوث ومشاريع":      g.research        || 0,
          "اختبار تحريري":     g.written_exam    || 0,
          "اختبار عملي":       g.practical_exam  || 0,
          "المجموع":           total,
          "الدرجة القصوى":     max,
          "النسبة %":          pct,
          "التقدير":           getGradeBand(pct),
        });
      });
    });
    return rows;
  };

  const handleExport = async () => {
    setShowDialog(false);
    const filteredGrades = getFilteredGrades();
    const periodLabel    = getPeriodLabel(period, parseInt(weeksCount), parseInt(monthsCount));
    if (exportType === "excel") await doExportExcel(filteredGrades, periodLabel);
    if (exportType === "pdf")   await doExportPDF(filteredGrades, periodLabel);
  };

  const doExportExcel = async (filteredGrades, periodLabel) => {
    setLoading(true);
    const rows = buildRows(filteredGrades);
    if (rows.length === 0) { toast.error("لا توجد بيانات للتصدير في هذه الفترة"); setLoading(false); return; }

    const dateStr = new Date().toLocaleDateString("ar-EG");
    const teacherName = me?.full_name || me?.email || "—";
    const principal = school.principal_name || "—";
    const schoolName = school.school_name || "—";
    const eduAdmin = school.education_admin || "—";

    const headerRows = [
      ["المملكة العربية السعودية", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["وزارة التعليم", "", "", "", "", "", "", "", "", "", "", "", ""],
      [eduAdmin, "", "", "", "", "", "", "", "", "", "", "", ""],
      [schoolName, "", "", "", "", "", "", "", "", "", "", "", ""],
      [`تحليل مادة ${subjectName} — ${className}`, "", "", "", "", "", "", "", "", "", "", "", ""],
      [`المادة: ${subjectName}   |   الصف: ${className}   |   الفترة: ${periodLabel}   |   التاريخ: ${dateStr}`, "", "", "", "", "", "", "", "", "", "", "", ""],
      [],
    ];
    const tableHeader = ["اسم الطالب","رقم الطالب","المادة","مشاركة","واجبات","نشاط صفي","بحوث ومشاريع","اختبار تحريري","اختبار عملي","المجموع","الدرجة القصوى","النسبة %","التقدير"];
    const dataRows = rows.map((r) => [
      r["اسم الطالب"], r["رقم الطالب"], r["المادة"], r["مشاركة"], r["واجبات"], r["نشاط صفي"],
      r["بحوث ومشاريع"], r["اختبار تحريري"], r["اختبار عملي"], r["المجموع"], r["الدرجة القصوى"], r["النسبة %"], r["التقدير"],
    ]);
    const footerRow = Array(13).fill("");
    footerRow[0] = `معلم المادة: ${teacherName}`;
    footerRow[12] = `مدير المدرسة: ${principal}`;
    const aoa = [...headerRows, tableHeader, ...dataRows, [], footerRow];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [
      { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
      { wch: 14 }, { wch: 10 }, { wch: 14 },
    ];
    ws["!merges"] = [0,1,2,3,4,5].map((r) => ({ s: { r, c: 0 }, e: { r, c: 12 } }));

    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(wb, ws, "تحليل الدرجات");

    const summaryRows = filteredSubjects.map((sub) => {
      const subGrades = filteredGrades.filter((g) => g.subject_id === sub.id);
      const max = calcMax(sub);
      const avg = subGrades.length > 0
        ? Math.round(subGrades.reduce((s, g) => s + calcTotal(g), 0) / subGrades.length * 10) / 10
        : 0;
      const pct = max > 0 ? Math.round((avg / max) * 100) : 0;
      return { "المادة": sub.name, "عدد الطلاب": subGrades.length, "المتوسط": avg, "الدرجة القصوى": max, "النسبة %": pct, "التقدير": getGradeBand(pct) };
    });
    const ws2 = XLSX.utils.json_to_sheet(summaryRows);
    ws2["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws2, "ملخص المواد");

    const { kpis, subjectAverages, bandDist } = buildAnalysis(filteredStudents, filteredSubjects, filteredGrades);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpis), "التحليل والإحصائيات");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(subjectAverages), "متوسط المواد");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bandDist), "توزيع التقديرات");
    XLSX.writeFile(wb, `تحليل_${subjectName}_${className}_${periodLabel}_${dateStr}.xlsx`);
    toast.success("تم تصدير ملف Excel بنجاح ✅");
    setLoading(false);
  };

  const doExportPDF = async (filteredGrades, periodLabel) => {
    setLoading(true);
    const { rows } = buildAnalysis(filteredStudents, filteredSubjects, filteredGrades);
    if (rows.length === 0) { toast.error("لا توجد بيانات للتصدير في هذه الفترة"); setLoading(false); return; }

    setPdfData({
      title: `تحليل مادة ${subjectName} — ${className}`,
      subtitle: `الفترة الزمنية: ${periodLabel}`,
      dateLabel: new Date().toLocaleDateString("ar-EG"),
      subjectName,
      className,
      students: filteredStudents,
      subjects: filteredSubjects,
      grades: filteredGrades,
      school,
      teacherName: me?.full_name || me?.email || "",
      principalName: school.principal_name,
      principalOnly: isPrincipalOnly(me),
    });
    await new Promise((r) => setTimeout(r, 120));
    if (!reportRef.current) { toast.error("تعذر تجهيز التقرير"); setLoading(false); return; }
    try {
      await captureNodeToPdf(reportRef.current, `تحليل_${subjectName}_${className}_${periodLabel}_${new Date().toLocaleDateString("ar")}.pdf`);
      toast.success("تم تصدير ملف PDF بنجاح ✅");
    } catch {
      toast.error("تعذر تصدير PDF");
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();
  const openDialog = (type) => {
    if (!canExport(me)) {
      toast.error("ميزة تصدير التحليلات متاحة للمشتركين فقط", {
        description: "اشترك الآن لتفعيل تصدير التقارير والتحليلات.",
      });
      navigate("/subscription");
      return;
    }
    setExportType(type);
    setPeriod("all");
    setWeeksCount("1");
    setMonthsCount("1");
    setShowDialog(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2" disabled={loading}>
            <Download className="h-4 w-4" />
            {loading ? "جاري التصدير..." : "تصدير التحليل"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" dir="rtl">
          <DropdownMenuLabel className="text-xs text-muted-foreground">اختر نوع التصدير</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => openDialog("excel")} className="gap-2 cursor-pointer">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            تصدير Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openDialog("pdf")} className="gap-2 cursor-pointer">
            <FileText className="h-4 w-4 text-red-500" />
            تصدير PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Period Selection Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              اختيار النطاق الزمني
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>الفترة الزمنية</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفترات (كل الوقت)</SelectItem>
                  <SelectItem value="weekly">أسبوعي</SelectItem>
                  <SelectItem value="monthly">شهري</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {period === "weekly" && (
              <div className="space-y-1.5">
                <Label>عدد الأسابيع</Label>
                <Select value={weeksCount} onValueChange={setWeeksCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">هذا الأسبوع فقط</SelectItem>
                    <SelectItem value="2">آخر أسبوعين</SelectItem>
                    <SelectItem value="4">آخر 4 أسابيع</SelectItem>
                    <SelectItem value="8">آخر 8 أسابيع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {period === "monthly" && (
              <div className="space-y-1.5">
                <Label>عدد الأشهر</Label>
                <Select value={monthsCount} onValueChange={setMonthsCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">هذا الشهر فقط</SelectItem>
                    <SelectItem value="2">آخر شهرين</SelectItem>
                    <SelectItem value="3">آخر 3 أشهر</SelectItem>
                    <SelectItem value="6">آخر 6 أشهر</SelectItem>
                    <SelectItem value="12">آخر سنة كاملة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              سيتم تصدير: <span className="font-semibold text-foreground">{getPeriodLabel(period, parseInt(weeksCount), parseInt(monthsCount))}</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleExport} className="gap-2">
              {exportType === "excel"
                ? <><FileSpreadsheet className="h-4 w-4" />تصدير Excel</>
                : <><FileText className="h-4 w-4" />تصدير PDF</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pdfData && (
        <div style={{ position: "absolute", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden="true">
          <ReportDocument forwardedRef={reportRef} {...pdfData} />
        </div>
      )}
    </>
  );
}