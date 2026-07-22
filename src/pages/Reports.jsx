import { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ReportDocument from "@/components/reports/ReportDocument";
import StudentPerformanceReport from "@/components/reports/StudentPerformanceReport";
import { captureNodeToPdf } from "@/utils/pdfExport";
import { buildAnalysis } from "@/utils/reportAnalysis";
import { subscriberTitle, resolveSchool, reportSourceInfo, scopeBySchool } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import {
  FileText, FileSpreadsheet, User, Users, BarChart2, BookOpen, Download, ChevronLeft, Award
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import GradeSectionSelect from "@/components/shared/GradeSectionSelect";
import { resolveClassIds, scopeLabel } from "@/lib/classSections";

// ── helpers ──────────────────────────────────────────────────────────────────
const GRADE_BANDS = [
  { key: "ممتاز", min: 90, color: "#10b981" },
  { key: "جيد جداً", min: 75, color: "#3b82f6" },
  { key: "جيد", min: 60, color: "#f59e0b" },
  { key: "مقبول", min: 50, color: "#f97316" },
  { key: "بحاجة لتحسين", min: 0, color: "#ef4444" },
];
function getGradeBand(pct) { return GRADE_BANDS.find((b) => pct >= b.min) || GRADE_BANDS[GRADE_BANDS.length - 1]; }
function calcTotal(g) { return (g.participation||0)+(g.homework||0)+(g.class_activity||0)+(g.research||0)+(g.written_exam||0)+(g.practical_exam||0); }
function calcMax(sub) { return (sub.participation_max||10)+(sub.homework_max||10)+(sub.class_activity_max||10)+(sub.research_max||10)+(sub.written_exam_max||30)+(sub.practical_exam_max||30); }

const REPORTS = [
  { id: "student_single",   label: "تقرير درجات طالب منفرد",            icon: User,     color: "bg-blue-50 text-blue-600 border-blue-200",    needs: ["class","student"] },
  { id: "class_grades",     label: "تقرير درجات الصف",                  icon: Users,    color: "bg-emerald-50 text-emerald-600 border-emerald-200", needs: ["class"] },
  { id: "class_analysis",   label: "تقرير تحليل درجات على مستوى الصف", icon: BarChart2, color: "bg-purple-50 text-purple-600 border-purple-200", needs: ["class"] },
  { id: "subject_analysis",      label: "تقرير تحليل على مستوى المادة",       icon: BookOpen,  color: "bg-amber-50 text-amber-600 border-amber-200",  needs: ["class","subject"] },
  { id: "student_performance",   label: "تقرير تقييم أداء طالب (للطباعة وولي الأمر)", icon: Award, color: "bg-teal-50 text-teal-600 border-teal-200", needs: ["class","student"] },
];

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const reportRef = useRef(null);

  const { data: rawClasses  = [] } = useQuery({ queryKey: ["classes"],  queryFn: () => base44.entities.Class.list() });
  const { data: rawStudents = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: rawSubjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: rawGrades   = [] } = useQuery({ queryKey: ["grades"],   queryFn: () => base44.entities.Grade.list() });
  const { data: rawAchievements = [] } = useQuery({ queryKey: ["achievements"], queryFn: () => base44.entities.Achievement.list() });
  const { data: rawStudentNotes = [] } = useQuery({ queryKey: ["student-notes"], queryFn: () => base44.entities.StudentNote.list() });
  const { data: schoolInfo } = useQuery({ queryKey: ["schoolInfo"], queryFn: () => base44.entities.SchoolInfo.list().then((r) => r[0] || {}) });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });

  const classes = useMemo(() => scopeBySchool(rawClasses, me), [rawClasses, me]);
  const students = useMemo(() => scopeBySchool(rawStudents, me), [rawStudents, me]);
  const subjects = useMemo(() => scopeBySchool(rawSubjects, me), [rawSubjects, me]);
  const grades = useMemo(() => scopeBySchool(rawGrades, me), [rawGrades, me]);
  const achievements = useMemo(() => scopeBySchool(rawAchievements, me), [rawAchievements, me]);
  const studentNotes = useMemo(() => scopeBySchool(rawStudentNotes, me), [rawStudentNotes, me]);

  const selectedClassIds = resolveClassIds(classes, selectedGrade, selectedClassId);
  const scopeName = scopeLabel(classes, selectedGrade, selectedClassId);
  const classStudents = students.filter((s) => selectedClassIds.includes(s.class_id));
  const classSubjects = subjects.filter((s) => selectedClassIds.includes(s.class_id));

  const report = REPORTS.find((r) => r.id === selectedReport);
  const needsStudent  = report?.needs?.includes("student");
  const needsSubject  = report?.needs?.includes("subject");
  const needsClass    = report?.needs?.includes("class");

  const canExport = report &&
    (!needsClass   || selectedGrade)   &&
    (!needsStudent || selectedStudent) &&
    (!needsSubject || selectedSubject);

  // ── export helpers ──────────────────────────────────────────────────────
  const doExport = async (format) => {
    if (!canExport) return;
    setLoading(true);
    try {
      if (format === "excel") await exportExcel();
      else await exportPDF();
    } finally { setLoading(false); }
  };

  const buildStudentRows = (stuList, subList) => {
    const rows = [];
    stuList.forEach((stu) => {
      subList.forEach((sub) => {
        const g = grades.find((gr) => gr.student_id === stu.id && gr.subject_id === sub.id);
        if (!g) return;
        const total = calcTotal(g);
        const max   = calcMax(sub);
        const pct   = max > 0 ? Math.round((total / max) * 100) : 0;
        rows.push({
          "اسم الطالب": stu.name, "رقم الطالب": stu.student_number || "-",
          "المادة": sub.name, "مشاركة": g.participation||0, "واجبات": g.homework||0,
          "نشاط صفي": g.class_activity||0, "بحوث": g.research||0,
          "اختبار تحريري": g.written_exam||0, "اختبار عملي": g.practical_exam||0,
          "المجموع": total, "الدرجة القصوى": max, "النسبة %": pct, "التقدير": getGradeBand(pct).key,
        });
      });
    });
    return rows;
  };

  const exportExcel = async () => {
    const cls     = { name: scopeName };
    const stu     = students.find((s) => s.id === selectedStudent);
    const sub     = subjects.find((s) => s.id === selectedSubject);

    if (selectedReport === "student_performance") {
      const rows = buildStudentRows([stu], classSubjects);
      if (!rows.length) { toast.error("لا توجد درجات لهذا الطالب"); return; }
      const wb = XLSX.utils.book_new();
      wb.Workbook = { Views: [{ RTL: true }] };
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = Array(14).fill({ wch: 16 });
      XLSX.utils.book_append_sheet(wb, ws, "درجات الطالب");
      const stuAch = achievements.filter((a) => a.student_id === stu.id);
      const achRows = stuAch.map((a) => ({
        "النوع": a.type === "skill" ? "مهارة" : "نشاط",
        "العنوان": a.title,
        "الحالة/النتيجة": a.type === "skill" ? (a.status === "acquired" ? "مكتسبة" : a.status === "in_progress" ? "قيد التطوير" : "غير مكتسبة") : (a.activity_result || "-"),
        "التاريخ": a.date || "-",
        "ملاحظات": a.notes || "-",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(achRows.length ? achRows : [{ "النوع": "-", "العنوان": "لا توجد مهارات أو أنشطة", "الحالة/النتيجة": "-", "التاريخ": "-", "ملاحظات": "-" }]), "المهارات والأنشطة");
      XLSX.writeFile(wb, `تقييم_${stu?.name}_${cls?.name}.xlsx`);
      toast.success("تم تصدير Excel ✅");
      return;
    }

    const wb = XLSX.utils.book_new();

    if (selectedReport === "student_single") {
      const rows = buildStudentRows([stu], classSubjects);
      if (!rows.length) { toast.error("لا توجد درجات لهذا الطالب"); return; }
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = Array(14).fill({ wch: 16 });
      XLSX.utils.book_append_sheet(wb, ws, "درجات الطالب");
      appendAnalysisSheets(wb, [stu], classSubjects);
      XLSX.writeFile(wb, `تقرير_${stu?.name}_${cls?.name}.xlsx`);

    } else if (selectedReport === "class_grades") {
      const rows = buildStudentRows(classStudents, classSubjects);
      if (!rows.length) { toast.error("لا توجد درجات"); return; }
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = Array(14).fill({ wch: 16 });
      XLSX.utils.book_append_sheet(wb, ws, "درجات الصف");
      appendAnalysisSheets(wb, classStudents, classSubjects);
      XLSX.writeFile(wb, `تقرير_${cls?.name}.xlsx`);

    } else if (selectedReport === "class_analysis") {
      const summaryRows = classSubjects.map((s) => {
        const sg = grades.filter((g) => g.subject_id === s.id);
        const max = calcMax(s);
        const avg = sg.length ? Math.round(sg.reduce((acc, g) => acc + calcTotal(g), 0) / sg.length * 10) / 10 : 0;
        const pct = max > 0 ? Math.round((avg / max) * 100) : 0;
        return { "المادة": s.name, "عدد الطلاب": sg.length, "المتوسط": avg, "النسبة %": pct, "التقدير": getGradeBand(pct).key };
      });
      const ws = XLSX.utils.json_to_sheet(summaryRows);
      ws["!cols"] = Array(5).fill({ wch: 18 });
      XLSX.utils.book_append_sheet(wb, ws, "تحليل الصف");
      appendAnalysisSheets(wb, classStudents, classSubjects);
      XLSX.writeFile(wb, `تحليل_${cls?.name}.xlsx`);

    } else if (selectedReport === "subject_analysis") {
      const stuRows = classStudents.map((s) => {
        const g = grades.find((gr) => gr.student_id === s.id && gr.subject_id === selectedSubject);
        if (!g) return null;
        const total = calcTotal(g); const max = calcMax(sub); const pct = max > 0 ? Math.round((total/max)*100) : 0;
        return { "اسم الطالب": s.name, "مشاركة": g.participation||0, "واجبات": g.homework||0,
          "نشاط": g.class_activity||0, "بحوث": g.research||0, "تحريري": g.written_exam||0, "عملي": g.practical_exam||0,
          "المجموع": total, "النسبة %": pct, "التقدير": getGradeBand(pct).key };
      }).filter(Boolean);
      if (!stuRows.length) { toast.error("لا توجد درجات"); return; }
      const ws = XLSX.utils.json_to_sheet(stuRows);
      ws["!cols"] = Array(10).fill({ wch: 16 });
      XLSX.utils.book_append_sheet(wb, ws, sub?.name || "المادة");
      appendAnalysisSheets(wb, classStudents, [sub]);
      XLSX.writeFile(wb, `تحليل_${sub?.name}_${cls?.name}.xlsx`);
    }
    toast.success("تم تصدير Excel ✅");
  };

  const appendAnalysisSheets = (wb, stuList, subList) => {
    const { kpis, subjectAverages, bandDist } = buildAnalysis(stuList, subList, grades);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpis), "التحليل والإحصائيات");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(subjectAverages), "متوسط المواد");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bandDist), "توزيع التقديرات");
  };

  const exportPDF = async () => {
    const cls = { name: scopeName };
    const stu = students.find((s) => s.id === selectedStudent);
    const sub = subjects.find((s) => s.id === selectedSubject);

    if (selectedReport === "student_performance") {
      if (!stu) { toast.error("اختر الطالب"); return; }
      const dateLabel = new Date().toLocaleDateString("ar-SA");
      const school = resolveSchool(me, schoolInfo);
      const src = reportSourceInfo(me, school);
      setPdfData({
        reportType: "student_performance",
        student: stu, classObj: cls, subjects: classSubjects,
        school, teacherName: src.sourceName, teacherTitle: subscriberTitle(me),
        principalTitle: src.principalTitle, principalName: src.principalName,
        principalOnly: src.isPrincipalSource, sourceLabel: src.sourceLabel, sourceName: src.sourceName,
        dateLabel,
      });
      setLoading(true);
      try {
        await new Promise((r) => setTimeout(r, 120));
        if (!reportRef.current) { toast.error("تعذر تجهيز التقرير"); return; }
        await captureNodeToPdf(reportRef.current, `تقييم_${stu.name}_${cls?.name || ""}.pdf`);
        toast.success("تم تصدير PDF ✅");
      } catch {
        toast.error("تعذر تصدير PDF");
      } finally {
        setLoading(false);
      }
      return;
    }

    let stuList = selectedReport === "student_single" ? (stu ? [stu] : []) : classStudents;
    let subList = selectedReport === "subject_analysis" ? (sub ? [sub] : []) : classSubjects;

    const { rows } = buildAnalysis(stuList, subList, grades);
    if (!rows.length) { toast.error("لا توجد بيانات للتصدير"); return; }

    const subtitle = [cls?.name, stu?.name, sub?.name].filter(Boolean).join(" — ");
    const fileName = [report?.label, cls?.name, stu?.name, sub?.name].filter(Boolean).join("_");

    setPdfData({ title: report?.label || "تقرير", subtitle, dateLabel: new Date().toLocaleDateString("ar-SA"), students: stuList, subjects: subList });
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 120));
      if (!reportRef.current) { toast.error("تعذر تجهيز التقرير"); return; }
      await captureNodeToPdf(reportRef.current, `${fileName}.pdf`);
      toast.success("تم تصدير PDF ✅");
    } catch {
      toast.error("تعذر تصدير PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl">
      <PageHeader title="التقارير" description="إنشاء وتصدير تقارير الأداء الأكاديمي" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          const isActive = selectedReport === r.id;
          return (
            <button
              key={r.id}
              onClick={() => { setSelectedReport(r.id); setSelectedGrade(""); setSelectedClassId(""); setSelectedStudent(""); setSelectedSubject(""); }}
              className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-right transition-all duration-200 w-full
                ${isActive ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:border-primary/40 hover:shadow-sm"}`}
            >
              <div className={`h-12 w-12 rounded-xl border flex items-center justify-center shrink-0 ${r.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{r.label}</p>
              </div>
              {isActive && <ChevronLeft className="h-4 w-4 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>

      {report && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <report.icon className="h-4 w-4 text-primary" />
              {report.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {needsClass && (
                <GradeSectionSelect
                  classes={classes}
                  gradeName={selectedGrade}
                  classId={selectedClassId}
                  onChange={({ gradeName, classId }) => { setSelectedGrade(gradeName); setSelectedClassId(classId); setSelectedStudent(""); setSelectedSubject(""); }}
                />
              )}
              {needsStudent && selectedGrade && (
                <div className="space-y-1.5">
                  <Label>الطالب</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                    <SelectContent>
                      {classStudents.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {needsSubject && selectedGrade && (
                <div className="space-y-1.5">
                  <Label>المادة</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger><SelectValue placeholder="اختر المادة" /></SelectTrigger>
                    <SelectContent>
                      {classSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button onClick={() => doExport("excel")} disabled={!canExport || loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <FileSpreadsheet className="h-4 w-4" />
                تصدير Excel
              </Button>
              <Button onClick={() => doExport("pdf")} disabled={!canExport || loading} variant="destructive" className="gap-2">
                <FileText className="h-4 w-4" />
                تصدير PDF
              </Button>
            </div>

            {!canExport && (
              <p className="text-xs text-muted-foreground mt-3">
                {!selectedGrade ? "• اختر الصف الدراسي أولاً" : !selectedStudent && needsStudent ? "• اختر الطالب" : !selectedSubject && needsSubject ? "• اختر المادة" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {pdfData && (
        <div style={{ position: "absolute", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden="true">
          {pdfData.reportType === "student_performance" ? (
            <StudentPerformanceReport
              forwardedRef={reportRef}
              student={pdfData.student}
              classObj={pdfData.classObj}
              subjects={pdfData.subjects}
              grades={grades}
              achievements={achievements}
              behavioralNotes={studentNotes.filter((n) => n.student_id === pdfData.student.id && n.type === "behavioral")}
              school={pdfData.school}
              teacherName={pdfData.teacherName}
              teacherTitle={pdfData.teacherTitle}
              principalTitle={pdfData.principalTitle}
              principalName={pdfData.principalName}
              dateLabel={pdfData.dateLabel}
              {...(pdfData.sourceLabel ? { sourceLabel: pdfData.sourceLabel, sourceName: pdfData.sourceName, principalOnly: pdfData.principalOnly } : {})}
            />
          ) : (
            <ReportDocument
              forwardedRef={reportRef}
              title={pdfData.title}
              subtitle={pdfData.subtitle}
              dateLabel={pdfData.dateLabel}
              students={pdfData.students}
              subjects={pdfData.subjects}
              grades={grades}
              school={resolveSchool(me, schoolInfo)}
              teacherName={me?.display_name || me?.full_name || ""}
              teacherTitle={subscriberTitle(me)}
              principalTitle={subscriberTitle(me)}
              principalName={resolveSchool(me, schoolInfo).principal_name}
              {...(pdfData.sourceLabel ? { sourceLabel: pdfData.sourceLabel, sourceName: pdfData.sourceName, principalOnly: pdfData.principalOnly } : {})}
            />
          )}
        </div>
      )}
    </div>
  );
}