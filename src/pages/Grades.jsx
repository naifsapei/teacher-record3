import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Save, Download, FileText, FileSpreadsheet, User, Search, Filter, X, Landmark, Hand, BookOpen, FlaskConical, Wrench, Check, Loader2, Users } from "lucide-react";
import { buildReportHeaderHTML, buildFooterHTML, buildSignaturesHTML, renderHTMLToPDF, escapeHTML } from "@/utils/reportLayout";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { exportGradesMinistryExcel } from "@/utils/gradesMinistryExport";
import { resolveSchool, reportSourceInfo } from "@/lib/permissions";
import { GRADE_FIELDS as FIELDS, calcTotal as calcGradeTotal, calcEffMax as calcGradeEffMax } from "@/lib/gradeCalc";
import { SEMESTER_LABELS } from "@/lib/terminology";
import AttendanceStatusBadge from "@/components/attendance/AttendanceStatusBadge";
import { useQuickAttendance } from "@/hooks/useQuickAttendance";
import GradeSectionSelect from "@/components/shared/GradeSectionSelect";
import { classGradeName } from "@/lib/classSections";

const FIELD_META = {
  participation: { icon: Hand, group: "continuous" },
  homework: { icon: BookOpen, group: "continuous" },
  class_activity: { icon: Users, group: "continuous" },
  research: { icon: FlaskConical, group: "continuous" },
  written_exam: { icon: FileText, group: "exam" },
  practical_exam: { icon: Wrench, group: "exam" },
};

export default function Grades() {
  const [gradeName, setGradeName] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [gradeEdits, setGradeEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportStudent, setReportStudent] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [filterGradeLevel, setFilterGradeLevel] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("first");
  const [showFilters, setShowFilters] = useState(false);
  const [autoSavingId, setAutoSavingId] = useState(null);
  const [autoSavedFlash, setAutoSavedFlash] = useState(false);
  const queryClient = useQueryClient();

  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: grades = [] } = useQuery({ queryKey: ["grades"], queryFn: () => base44.entities.Grade.list() });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers"], queryFn: () => base44.entities.Teacher.list() });
  const { data: schoolInfo = {} } = useQuery({ queryKey: ["school-info"], queryFn: () => base44.entities.SchoolInfo.list().then((r) => r[0] || {}) });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const attendanceHook = useQuickAttendance(selectedClass);

  // grade levels derived from classes
  const gradeLevels = useMemo(() => {
    const levels = [...new Set(classes.map((c) => c.grade_level).filter(Boolean))];
    return levels;
  }, [classes]);

  // classes filtered by grade level
  const filteredClasses = useMemo(
    () => filterGradeLevel ? classes.filter((c) => c.grade_level === filterGradeLevel) : classes,
    [classes, filterGradeLevel]
  );

  const filteredSubjects = useMemo(() => {
    let subs = selectedClass ? subjects.filter((s) => s.class_id === selectedClass) : [];
    if (filterTeacher) subs = subs.filter((s) => s.teacher_id === filterTeacher);
    subs = subs.filter((s) => !s.semester || s.semester === selectedSemester);
    return subs;
  }, [selectedClass, subjects, filterTeacher, selectedSemester]);

  const filteredStudents = useMemo(() => {
    let stds = selectedClass ? students.filter((s) => s.class_id === selectedClass) : [];
    if (studentSearch.trim()) {
      const q = studentSearch.trim().toLowerCase();
      stds = stds.filter((s) => s.name.toLowerCase().includes(q) || (s.student_number || "").includes(q));
    }
    return stds;
  }, [selectedClass, students, studentSearch]);

  const currentSubject = subjects.find((s) => s.id === selectedSubject);

  const getMax = (field) => currentSubject?.[field.maxKey] ?? field.def;

  const getGrade = (studentId) =>
    grades.find((g) => g.student_id === studentId && g.subject_id === selectedSubject);

  // قيمة الخانة للعرض: التعديل إن وُجد، وإلا المحفوظة، وإلا فارغ (وليس 0)
  const getEditValue = (studentId, key) => {
    const ed = gradeEdits[studentId];
    if (ed && ed[key] !== undefined) return ed[key] === "" ? "" : ed[key];
    const saved = getGrade(studentId)?.[key];
    return saved === undefined || saved === null ? "" : saved;
  };

  const setEditValue = (studentId, key, value) => {
    setGradeEdits((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [key]: value === "" ? "" : Number(value) },
    }));
  };

  // قيمة رقمية أو null (الخانة الفارغة = null)
  const numValue = (studentId, key) => {
    const v = getEditValue(studentId, key);
    if (v === "" || v === null) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  // مجموع الدرجات المُدخَلة فقط (الخانات الفارغة لا تُحتسب)
  const getTotal = (studentId) =>
    FIELDS.reduce((sum, f) => {
      const v = numValue(studentId, f.key);
      return v === null ? sum : sum + v;
    }, 0);

  // الحد الأقصى الفعلي = حدود الحقول المُدخَلة فقط
  const getEffMax = (studentId) =>
    FIELDS.reduce((sum, f) => {
      if (numValue(studentId, f.key) === null) return sum;
      return sum + getMax(f);
    }, 0);

  const getMaxTotal = () => FIELDS.reduce((sum, f) => sum + getMax(f), 0);

  const getPct = (studentId) => {
    const m = getEffMax(studentId);
    if (m === 0) return null;
    return Math.round((getTotal(studentId) / m) * 100);
  };

  const getGradeLabel = (pct) => {
    if (pct === null || pct === undefined) return "—";
    if (pct >= 90) return "ممتاز";
    if (pct >= 80) return "جيد جداً";
    if (pct >= 70) return "جيد";
    if (pct >= 60) return "مقبول";
    return "ضعيف";
  };

  const getGradeColor = (pct) => {
    if (pct >= 90) return [34, 197, 94];
    if (pct >= 80) return [59, 130, 246];
    if (pct >= 70) return [99, 102, 241];
    if (pct >= 60) return [234, 179, 8];
    return [239, 68, 68];
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const editedIds = Object.keys(gradeEdits);
      const promises = editedIds.map(async (studentId) => {
        const edits = gradeEdits[studentId];
        if (!edits) return;
        const existing = getGrade(studentId);
        const data = { student_id: studentId, subject_id: selectedSubject, semester: selectedSemester, ministry_number: me?.ministry_number || "" };
        FIELDS.forEach((f) => {
          const max = getMax(f);
          let val;
          if (edits[f.key] !== undefined) {
            val = edits[f.key] === "" ? null : Number(edits[f.key]);
          } else {
            val = existing?.[f.key] ?? null;
          }
          if (val === null) {
            data[f.key] = null;
          } else {
            if (val < 0) val = 0;
            if (val > max) val = max;
            data[f.key] = val;
          }
        });
        if (existing) return base44.entities.Grade.update(existing.id, data);
        return base44.entities.Grade.create(data);
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      setGradeEdits({});
      toast.success("تم حفظ الدرجات بنجاح");
    },
    onError: (error) => {
      toast.error("تعذّر حفظ الدرجات: " + (error?.message || "حدث خطأ"));
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMutation.mutateAsync();
    } catch {
      //handled in onError
    } finally {
      setSaving(false);
    }
  };

  // حفظ تلقائي لدرجات طالب واحد عند مغادرة الخلية (الانتقال بين الخلايا)
  const autoSaveStudent = async (studentId) => {
    const edits = gradeEdits[studentId];
    if (!edits || !selectedSubject) return;
    setAutoSavingId(studentId);
    try {
      const existing = getGrade(studentId);
      const data = { student_id: studentId, subject_id: selectedSubject, semester: selectedSemester, ministry_number: me?.ministry_number || "" };
      FIELDS.forEach((f) => {
        const max = getMax(f);
        let val;
        if (edits[f.key] !== undefined) {
          val = edits[f.key] === "" ? null : Number(edits[f.key]);
        } else {
          val = existing?.[f.key] ?? null;
        }
        if (val === null) {
          data[f.key] = null;
        } else {
          let v = val;
          if (v < 0) v = 0;
          if (v > max) v = max;
          data[f.key] = v;
        }
      });
      if (existing) await base44.entities.Grade.update(existing.id, data);
      else await base44.entities.Grade.create(data);
      setGradeEdits((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      setAutoSavedFlash(true);
      setTimeout(() => setAutoSavedFlash(false), 1500);
    } catch {
      toast.error("تعذّر الحفظ التلقائي لدرجات الطالب");
    } finally {
      setAutoSavingId(null);
    }
  };

  const exportStudentReport = async (studentId) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    const classSubjects = subjects.filter((s) => s.class_id === student.class_id);
    const clsName = classes.find((c) => c.id === student.class_id)?.name || "";

    const subjectData = classSubjects.map((sub) => {
      const g = grades.find((gr) => gr.student_id === studentId && gr.subject_id === sub.id);
      if (!g) return null;
      const total = calcGradeTotal(g);
      const maxTotal = calcGradeEffMax(g, sub);
      if (maxTotal === 0) return null;
      const pct = (total / maxTotal) * 100;
      return { sub, total, maxTotal, pct };
    }).filter(Boolean);

    const grandTotal = subjectData.reduce((s, d) => s + d.total, 0);
    const grandMax = subjectData.reduce((s, d) => s + d.maxTotal, 0);
    const overallPct = grandMax > 0 ? (grandTotal / grandMax) * 100 : 0;
    const school = resolveSchool(me, schoolInfo);
    const src = reportSourceInfo(me, school);
    const teacher = teachers.find((t) => t.id === currentSubject?.teacher_id);

    const rows = subjectData.map((item) => `
      <tr>
        <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHTML(item.sub.name)}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${item.total}/${item.maxTotal}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${item.pct.toFixed(0)}%</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${escapeHTML(getGradeLabel(item.pct))}</td>
      </tr>`).join("");

    const html = `
      <div style="direction:rtl;text-align:right;font-family:Tajawal,Arial,sans-serif;color:#0f172a;padding:18px;line-height:1.8;">
        ${buildReportHeaderHTML({ title: "تقرير الأداء الأكاديمي", school: { education_admin: school?.education_admin || "إدارة التعليم", school_name: school?.school_name || school?.name || "المدرسة" } })}
        <div style="margin-top:12px;font-size:16px;font-weight:800;color:#003366;">${escapeHTML(student.name)} — ${escapeHTML(clsName || "الصف")}</div>
        <div style="margin-top:6px;font-size:12px;color:#475569;">رقم الطالب: ${escapeHTML(student.student_number || "-")} • تاريخ التصدير: ${escapeHTML(new Date().toLocaleDateString("ar-SA"))}</div>
        <div style="margin-top:12px;padding:12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;">
          <div style="font-weight:700;">التقييم العام</div>
          <div style="margin-top:4px;font-size:16px;font-weight:800;color:#0f766e;">${escapeHTML(getGradeLabel(overallPct))} — ${overallPct.toFixed(1)}%</div>
          <div style="margin-top:4px;font-size:12px;color:#475569;">المجموع الكلي: ${grandTotal}/${grandMax}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:11px;">
          <thead>
            <tr style="background:#0f172a;color:#fff;">
              <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">المادة</th>
              <th style="padding:8px;border:1px solid #e2e8f0;text-align:center;">المجموع</th>
              <th style="padding:8px;border:1px solid #e2e8f0;text-align:center;">النسبة</th>
              <th style="padding:8px;border:1px solid #e2e8f0;text-align:center;">التقدير</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${buildSignaturesHTML({ teacherName: teacher?.name || me?.name || src.sourceName, principalName: school?.principal_name || "—", school, teacherTitle: src.sourceLabel || "معلم", principalTitle: "مدير", sourceName: teacher?.name || me?.name || src.sourceName, sourceLabel: src.sourceLabel || "المعلم" })}
        ${buildFooterHTML({ siteName: "سجل الدرجات" })}
      </div>`;

    await renderHTMLToPDF(html, `تقرير_${student.name}.pdf`, { landscape: false });
    toast.success(`تم تصدير تقرير ${student.name}`);
    setReportDialogOpen(false);
    setReportStudent("");
  };

  const exportExcel = () => {
    const subName = currentSubject?.name || "المادة";
    const clsName = classes.find((c) => c.id === selectedClass)?.name || "الصف";
    const maxTotal = getMaxTotal();

    const gradesData = filteredStudents.map((s, i) => {
      const total = getTotal(s.id);
      const pct = getPct(s.id);
      const row = { "#": i + 1, "اسم الطالب": s.name, "رقم الطالب": s.student_number || "-" };
      FIELDS.forEach((f) => {
        row[`${f.label} (/${getMax(f)})`] = getEditValue(s.id, f.key);
      });
      row[`المجموع (/${maxTotal})`] = total;
      row["النسبة %"] = pct === null ? "—" : pct;
      row["التقدير"] = getGradeLabel(pct);
      return row;
    });

    const pcts = filteredStudents.map((s) => getPct(s.id)).filter((p) => p !== null);
    const avg = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
    const passing = pcts.filter((p) => p >= 60).length;
    const summaryData = [
      { "البيان": "الصف", "القيمة": clsName },
      { "البيان": "المادة", "القيمة": subName },
      { "البيان": "عدد الطلاب", "القيمة": filteredStudents.length },
      { "البيان": "المتوسط", "القيمة": avg },
      { "البيان": "أعلى نسبة", "القيمة": pcts.length ? Math.max(...pcts) : 0 },
      { "البيان": "أدنى نسبة", "القيمة": pcts.length ? Math.min(...pcts) : 0 },
      { "البيان": "الناجحون", "القيمة": passing },
      { "البيان": "الراسبون", "القيمة": pcts.filter((p) => p < 60).length },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gradesData), "الدرجات");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "ملخص الأداء");
    XLSX.writeFile(wb, `درجات_${subName}_${clsName}.xlsx`);
    toast.success("تم تصدير Excel بنجاح");
  };

  const exportPDFDetailed = async () => {
    const subName = currentSubject?.name || "المادة";
    const clsName = classes.find((c) => c.id === selectedClass)?.name || "الصف";
    const maxTotal = getMaxTotal();
    const totals = filteredStudents.map((s) => getTotal(s.id));
    const pcts = filteredStudents.map((s) => getPct(s.id)).filter((p) => p !== null);
    const avg = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
    const passing = pcts.filter((p) => p >= 60).length;
    const school = resolveSchool(me, schoolInfo);
    const src = reportSourceInfo(me, school);
    const teacher = teachers.find((t) => t.id === currentSubject?.teacher_id);

    const rows = filteredStudents.map((student, idx) => {
      const total = getTotal(student.id);
      const pct = getPct(student.id) ?? 0;
      const cells = [
        `<td style="padding:8px;border:1px solid #e2e8f0;">${idx + 1}</td>`,
        `<td style="padding:8px;border:1px solid #e2e8f0;">${escapeHTML(student.name)}</td>`,
        ...FIELDS.map((f) => `<td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${getEditValue(student.id, f.key) === "" ? "—" : escapeHTML(String(getEditValue(student.id, f.key)))}</td>`),
        `<td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${total}</td>`,
        `<td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${pct}%</td>`,
        `<td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${escapeHTML(getGradeLabel(pct))}</td>`,
      ].join("");
      return `<tr>${cells}</tr>`;
    }).join("");

    const html = `
      <div style="direction:rtl;text-align:right;font-family:Tajawal,Arial,sans-serif;color:#0f172a;padding:18px;line-height:1.8;">
        ${buildReportHeaderHTML({ title: "كشف درجات الصف", school: { education_admin: school?.education_admin || "إدارة التعليم", school_name: school?.school_name || school?.name || "المدرسة" } })}
        <div style="margin-top:12px;font-size:16px;font-weight:800;color:#003366;">${escapeHTML(subName)} — ${escapeHTML(clsName)}</div>
        <div style="margin-top:6px;font-size:12px;color:#475569;">عدد الطلاب: ${filteredStudents.length} • المتوسط: ${avg}/${maxTotal} • نسبة النجاح: ${filteredStudents.length > 0 ? Math.round((passing / filteredStudents.length) * 100) : 0}%</div>
        <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:10px;">
          <thead>
            <tr style="background:#0f172a;color:#fff;">
              <th style="padding:8px;border:1px solid #e2e8f0;text-align:center;">#</th>
              <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">الاسم</th>
              ${FIELDS.map((f) => `<th style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${escapeHTML(f.label)}</th>`).join("")}
              <th style="padding:8px;border:1px solid #e2e8f0;text-align:center;">المجموع</th>
              <th style="padding:8px;border:1px solid #e2e8f0;text-align:center;">النسبة</th>
              <th style="padding:8px;border:1px solid #e2e8f0;text-align:center;">التقدير</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${buildSignaturesHTML({ teacherName: teacher?.name || me?.name || src.sourceName, principalName: school?.principal_name || "—", school, teacherTitle: src.sourceLabel || "معلم", principalTitle: "مدير", sourceName: teacher?.name || me?.name || src.sourceName, sourceLabel: src.sourceLabel || "المعلم" })}
        ${buildFooterHTML({ siteName: "سجل الدرجات" })}
      </div>`;

    await renderHTMLToPDF(html, `درجات_${subName}_${clsName}.pdf`, { landscape: true });
    toast.success("تم تصدير PDF بنجاح");
  };

  const exportMinistryExcel = () => {
    const cls = classes.find((c) => c.id === selectedClass);
    const teacher = teachers.find((t) => t.id === currentSubject?.teacher_id);
    const fieldHeaders = FIELDS.map((f) => ({ label: f.label, max: getMax(f) }));
    const maxTotal = getMaxTotal();
    const dataRows = filteredStudents.map((s, i) => {
      const total = getTotal(s.id);
      const pct = getPct(s.id) ?? 0;
      return {
        index: i + 1,
        studentNumber: s.student_number || "-",
        name: s.name,
        values: FIELDS.map((f) => {
          const v = getEditValue(s.id, f.key);
          return v === "" ? null : v;
        }),
        total,
        pct,
        gradeLabel: getGradeLabel(pct),
      };
    });
    const school = resolveSchool(me, schoolInfo);
    const src = reportSourceInfo(me, school);
    exportGradesMinistryExcel({
      school,
      className: cls?.name || "",
      subjectName: currentSubject?.name || "",
      teacherName: teacher?.name || src.sourceName,
      academicYear: cls?.academic_year || "",
      semester: SEMESTER_LABELS[selectedSemester] || "",
      fieldHeaders,
      maxTotal: getMaxTotal(),
      rows: dataRows,
      sourceLabel: src.sourceLabel,
      sourceName: src.sourceName,
      principalOnly: src.isPrincipalSource,
    });
    toast.success("تم تصدير كشف الدرجات الوزاري بنجاح");
  };

  const exportCSV = () => {
    const subName = currentSubject?.name || "المادة";
    const maxTotal = getMaxTotal();
    const header = `الرقم,الاسم,${FIELDS.map((f) => f.label).join(",")},المجموع,النسبة%,التقدير`;
    const rows = filteredStudents.map((s, i) => {
      const total = getTotal(s.id);
      const pct = getPct(s.id) ?? 0;
      return `${i + 1},${s.name},${FIELDS.map((f) => getEditValue(s.id, f.key)).join(",")},${total},${pct}%,${getGradeLabel(pct)}`;
    });
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `درجات_${subName}.csv`;
    link.click();
    toast.success("تم تصدير CSV بنجاح");
  };

  return (
    <div>
      <PageHeader
        title="سجل الدرجات"
        description="إدخال وإدارة درجات الطلاب"
        actions={
          <div className="flex flex-wrap gap-2">
            {selectedClass && filteredStudents.length > 0 && (
              <Button variant="outline" onClick={() => { setReportStudent(""); setReportDialogOpen(true); }} className="gap-2">
                <User className="h-4 w-4" />
                تقرير طالب
              </Button>
            )}
            {selectedSubject && filteredStudents.length > 0 && (
              <>
                <Button variant="outline" onClick={exportCSV} className="gap-2">
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" onClick={exportExcel} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                <Button variant="outline" onClick={exportMinistryExcel} className="gap-2">
                  <Landmark className="h-4 w-4" />
                  تصدير وزاري
                </Button>
                <Button variant="outline" onClick={exportPDFDetailed} className="gap-2">
                  <FileText className="h-4 w-4" />
                  PDF الصف
                </Button>
                <Button onClick={handleSave} disabled={saving || Object.keys(gradeEdits).length === 0} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "جاري الحفظ..." : "حفظ الدرجات"}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Filter Panel */}
      <div className="mb-6 space-y-3" dir="rtl">
        {/* Quick class filter chips */}
        {filteredClasses.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              فصول:
            </span>
            {filteredClasses.map((c) => {
              const active = selectedClass === c.id;
              const count = students.filter((s) => s.class_id === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setGradeName(classGradeName(c)); setSelectedClass(c.id); setSelectedSubject(""); setGradeEdits({}); setStudentSearch(""); }}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all border ${active ? "bg-gradient-to-br from-[#002060] to-[#00B050] text-white border-transparent shadow-sm" : "bg-white text-foreground border-border hover:border-primary hover:text-primary"}`}
                >
                  {c.name}
                  <span className={`mr-1.5 text-xs ${active ? "text-white/80" : "text-muted-foreground"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Row 1: main selectors + search + toggle */}
        <div className="flex flex-wrap gap-3 items-center">
          <GradeSectionSelect
            classes={filteredClasses}
            gradeName={gradeName}
            classId={selectedClass}
            showAll={false}
            onChange={({ gradeName: g, classId: c }) => { setGradeName(g); setSelectedClass(c); setSelectedSubject(""); setGradeEdits({}); setStudentSearch(""); }}
            className="w-full sm:w-52"
          />

          {selectedClass && (
            <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setGradeEdits({}); }}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="اختر المادة" />
              </SelectTrigger>
              <SelectContent>
                {filteredSubjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
          )}

          {selectedClass && (
            <Select value={selectedSemester} onValueChange={(v) => { setSelectedSemester(v); setSelectedSubject(""); setGradeEdits({}); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="الفصل الدراسي" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first">الفصل الدراسي الأول</SelectItem>
                <SelectItem value="second">الفصل الدراسي الثاني</SelectItem>
              </SelectContent>
            </Select>
          )}

          {selectedClass && (
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="بحث عن طالب..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent pr-9 pl-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {studentSearch && (
                <button onClick={() => setStudentSearch("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={`gap-2 ${showFilters ? "bg-primary/10 border-primary text-primary" : ""}`}>
            <Filter className="h-4 w-4" />
            فلترة متقدمة
            {(filterGradeLevel || filterTeacher) && <span className="h-2 w-2 rounded-full bg-primary" />}
          </Button>

          {(filterGradeLevel || filterTeacher || studentSearch) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterGradeLevel(""); setFilterTeacher(""); setStudentSearch(""); }} className="gap-1 text-muted-foreground">
              <X className="h-3.5 w-3.5" />
              مسح الفلاتر
            </Button>
          )}
        </div>

        {/* Row 2: advanced filters (collapsible) */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-dashed border-border bg-muted/30">
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground">الصف الدراسي</label>
              <Select value={filterGradeLevel} onValueChange={(v) => { setFilterGradeLevel(v); setGradeName(""); setSelectedClass(""); setSelectedSubject(""); setGradeEdits({}); }}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue placeholder="كل الصفوف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>كل الصفوف</SelectItem>
                  {gradeLevels.map((gl) => (<SelectItem key={gl} value={gl}>{gl}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground">تصفية حسب المعلم</label>
              <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue placeholder="كل المعلمين" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>كل المعلمين</SelectItem>
                  {teachers.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {filterGradeLevel && (
              <div className="flex items-end pb-0.5">
                <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {filteredClasses.length} فصل في هذا الصف
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {!selectedClass || !selectedSubject ? (
        <EmptyState icon={ClipboardList} title="اختر الصف والمادة" description="حدد الصف والمادة لعرض وتعديل درجات الطلاب" />
      ) : filteredStudents.length === 0 ? (
        <EmptyState icon={ClipboardList} title="لا يوجد طلاب في هذا الصف" description="أضف طلاباً في الصف المحدد أولاً" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                الحفظ التلقائي مفعّل — عند الانتقال بين الخلايا تُحفظ درجات الطالب تلقائياً
              </span>
              {autoSavingId ? (
                <span className="text-xs text-primary flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري الحفظ...
                </span>
              ) : autoSavedFlash ? (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> تم الحفظ
                </span>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead rowSpan={2} className="text-right w-10 align-bottom">#</TableHead>
                    <TableHead rowSpan={2} className="text-right min-w-[130px] align-bottom">الطالب</TableHead>
                    <TableHead rowSpan={2} className="text-center align-bottom">حضور اليوم</TableHead>
                    <TableHead colSpan={4} className="text-center bg-blue-50 text-blue-700 font-semibold border-b border-blue-100">تقويم مستمر وأنشطة</TableHead>
                    <TableHead colSpan={2} className="text-center bg-amber-50 text-amber-700 font-semibold border-b border-amber-100">الاختبارات</TableHead>
                    <TableHead rowSpan={2} className="text-center align-bottom">المجموع<br /><span className="text-xs text-muted-foreground">/{getMaxTotal()}</span></TableHead>
                    <TableHead rowSpan={2} className="text-center align-bottom">التقدير</TableHead>
                  </TableRow>
                  <TableRow className="bg-muted/50">
                    {FIELDS.map((f) => {
                      const meta = FIELD_META[f.key];
                      const Icon = meta?.icon;
                      const isExam = meta?.group === "exam";
                      return (
                        <TableHead key={f.key} className={`text-center min-w-[110px] ${isExam ? "bg-amber-50/60" : "bg-blue-50/60"}`}>
                          <div className="flex flex-col items-center gap-0.5 py-1">
                            {Icon && <Icon className={`w-4 h-4 ${isExam ? "text-amber-600" : "text-blue-600"}`} />}
                            <span className="text-xs font-semibold whitespace-nowrap">{f.label}</span>
                            <span className={`text-[10px] px-1.5 rounded-full ${isExam ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>من {getMax(f)}</span>
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student, i) => (
                    <TableRow key={student.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{i + 1}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="text-center">
                        <AttendanceStatusBadge status={attendanceHook.getStatus(student.id)} />
                      </TableCell>
                      {FIELDS.map((f) => (
                        <TableCell key={f.key} className="text-center">
                          <Input
                            type="number"
                            min={0}
                            max={getMax(f)}
                            value={getEditValue(student.id, f.key)}
                            placeholder={getMax(f)}
                            onChange={(e) => setEditValue(student.id, f.key, e.target.value)}
                            onBlur={() => autoSaveStudent(student.id)}
                            className="w-16 mx-auto text-center h-9"
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <span className="font-bold text-primary text-lg">{getTotal(student.id)}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {(() => {
                          const pct = getPct(student.id);
                          const label = getGradeLabel(pct);
                          const color = pct === null ? "text-muted-foreground bg-muted" : pct >= 90 ? "text-emerald-600 bg-emerald-50" : pct >= 80 ? "text-blue-600 bg-blue-50" : pct >= 70 ? "text-indigo-600 bg-indigo-50" : pct >= 60 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
                          return <span className={`text-xs font-semibold px-2 py-1 rounded-full ${color}`}>{label}</span>;
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              تقرير أداء طالب
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">اختر طالباً لتصدير تقريره الأكاديمي الشامل لجميع المواد بصيغة PDF</p>
          <Select value={reportStudent} onValueChange={setReportStudent}>
            <SelectTrigger><SelectValue placeholder="اختر الطالب..." /></SelectTrigger>
            <SelectContent>
              {filteredStudents.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Button className="w-full gap-2" disabled={!reportStudent} onClick={() => exportStudentReport(reportStudent)}>
            <FileText className="h-4 w-4" />
            تصدير التقرير PDF
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}