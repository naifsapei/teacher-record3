import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Lock } from "lucide-react";
import jsPDF from "jspdf";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isPrincipalOnly, canExport, subscriberTitle, resolveSchool, reportSourceInfo } from "@/lib/permissions";
import { GRADE_FIELDS, gradeValue, calcTotal, calcEffMax, calcFullMax, calcPct } from "@/lib/gradeCalc";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const getGradeLabel = (pct) => {
  if (pct === null || pct === undefined) return { label: "—", color: [148, 163, 184] };
  if (pct >= 90) return { label: "ممتاز", color: [34, 197, 94] };
  if (pct >= 80) return { label: "جيد جداً", color: [59, 130, 246] };
  if (pct >= 70) return { label: "جيد", color: [234, 179, 8] };
  if (pct >= 60) return { label: "مقبول", color: [249, 115, 22] };
  return { label: "ضعيف", color: [239, 68, 68] };
};

export default function StudentReportExport({ students, subjects, grades, classes, selectedClass }) {
  const [open, setOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const navigate = useNavigate();

  const { data: schoolInfo } = useQuery({ queryKey: ["school-info"], queryFn: () => base44.entities.SchoolInfo.list().then((r) => r[0] || {}) });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const school = resolveSchool(me, schoolInfo);

  const handleOpen = () => {
    if (!canExport(me)) {
      toast.error("ميزة تصدير التقارير متاحة للمشتركين فقط", {
        description: "اشترك الآن لتفعيل تصدير تقارير الطلاب.",
      });
      navigate("/subscription");
      return;
    }
    setOpen(true);
  };

  const classStudents = students.filter((s) => s.class_id === selectedClass);
  const classSubjects = subjects.filter((s) => s.class_id === selectedClass);
  const className = classes.find((c) => c.id === selectedClass)?.name || "";

  const getStudentGrades = (studentId) =>
    classSubjects.map((sub) => {
      const g = grades.find((gr) => gr.student_id === studentId && gr.subject_id === sub.id);
      return {
        sub,
        g,
        total: calcTotal(g),
        effMax: calcEffMax(g, sub),
        fullMax: calcFullMax(sub),
        pct: calcPct(g, sub),
      };
    });

  const exportStudentPDF = async (studentId) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    const principalOnly = isPrincipalOnly(me);
    const src = reportSourceInfo(me, school);

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 12;

    // تحميل خط عربي لدعم النصوص العربية
    try {
      const resp = await fetch("https://cdn.jsdelivr.net/npm/@fontsource/amiri@5.0.8/files/amiri-arabic-400-normal.woff");
      const buf  = await resp.arrayBuffer();
      const bin  = Array.from(new Uint8Array(buf)).map((b) => String.fromCharCode(b)).join("");
      const b64  = btoa(bin);
      doc.addFileToVFS("Amiri-Regular.ttf", b64);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
      doc.setFont("Amiri");
    } catch (_) { /* fallback */ }

    // Header background
    doc.setFillColor(20, 150, 130);
    doc.rect(0, 0, W, 32, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("تقرير الأداء الأكاديمي", W / 2, 12, { align: "center" });
    doc.setFontSize(11);
    doc.text(student.name, W / 2, 20, { align: "center" });
    doc.setFontSize(9);
    doc.text(`الصف: ${className}  |  رقم الطالب: ${student.student_number || "-"}`, W / 2, 28, { align: "center" });

    // Date
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString("ar-EG")}`, margin, 39);

    const gradeData = getStudentGrades(studentId);
    const enteredItems = gradeData.filter((g) => g.effMax > 0);
    const totalScore = enteredItems.reduce((s, g) => s + g.total, 0);
    const totalMax = enteredItems.reduce((s, g) => s + g.effMax, 0);
    const overallPct = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
    const { label: overallLabel, color: overallColor } = getGradeLabel(overallPct);

    // Overall performance card
    doc.setFillColor(245, 250, 248);
    doc.roundedRect(margin, 43, W - margin * 2, 18, 3, 3, "F");
    doc.setFillColor(...overallColor);
    doc.roundedRect(margin, 43, 4, 18, 2, 2, "F");

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.text("التقييم العام", margin + 8, 50);
    doc.setFontSize(9);
    doc.setTextColor(...overallColor);
    doc.text(`${overallLabel}  (${overallPct.toFixed(1)}%)`, margin + 8, 57);
    doc.setTextColor(80, 80, 80);
    doc.text(`المجموع الكلي: ${totalScore} / ${totalMax}`, W - margin - 40, 54, { align: "right" });

    // Table — 6 grade columns + name + total + pct
    let y = 70;
    const nameW = 50;
    const fieldW = 22;
    const totalColW = 24;
    const pctColW = 24;
    const usedW = nameW + GRADE_FIELDS.length * fieldW + totalColW + pctColW;
    const startX = (W - usedW) / 2;

    const colX = {
      name: startX,
      ...Object.fromEntries(GRADE_FIELDS.map((f, i) => [f.key, startX + nameW + i * fieldW])),
      total: startX + nameW + GRADE_FIELDS.length * fieldW,
      pct: startX + nameW + GRADE_FIELDS.length * fieldW + totalColW,
    };

    // Table header
    doc.setFillColor(20, 150, 130);
    doc.rect(startX, y - 5, usedW, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text("المادة", colX.name + 2, y);
    GRADE_FIELDS.forEach((f) => {
      doc.text(f.label, colX[f.key] + fieldW / 2, y, { align: "center" });
    });
    doc.text("المجموع", colX.total + totalColW / 2, y, { align: "center" });
    doc.text("النسبة", colX.pct + pctColW / 2, y, { align: "center" });
    y += 9;

    gradeData.forEach((item, idx) => {
      if (y > H - 30) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(startX, y - 5, usedW, 8, "F");
      }
      const { label, color } = getGradeLabel(item.pct);
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(7);
      doc.text(item.sub.name.slice(0, 24), colX.name + 2, y);
      GRADE_FIELDS.forEach((f) => {
        const v = gradeValue(item.g, f.key);
        const max = Number(item.sub?.[f.maxKey]) || f.def;
        doc.text(v === null ? "—" : `${v}/${max}`, colX[f.key] + fieldW / 2, y, { align: "center" });
      });
      doc.setTextColor(20, 150, 130);
      doc.text(item.effMax > 0 ? `${item.total}/${item.effMax}` : "—", colX.total + totalColW / 2, y, { align: "center" });
      doc.setTextColor(...color);
      doc.text(item.pct === null ? "—" : `${item.pct}% ${label}`, colX.pct + pctColW / 2, y, { align: "center" });
      y += 8;
    });

    // Sign-off — role-aware
    if (y > H - 25) { doc.addPage(); y = 20; }
    y += 12;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, W - margin, y);
    y += 7;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    if (principalOnly) {
      doc.text(`المدرسة: ${school.school_name || "—"}`, W - margin, y, { align: "right" });
      y += 6;
      doc.text(`${src.sourceLabel}: ${src.principalName || "—"}`, W - margin, y, { align: "right" });
      y += 18;
      doc.setDrawColor(150, 150, 150);
      doc.line(W - margin - 70, y, W - margin, y);
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text("التوقيع والختم", W - margin - 35, y + 4, { align: "center" });
    } else {
      doc.text(`${src.sourceLabel}: ${src.sourceName || "—"}`, W - margin, y, { align: "right" });
      doc.text(`مدير المدرسة: ${src.principalName || "—"}`, margin, y, { align: "left" });
      y += 18;
      doc.setDrawColor(150, 150, 150);
      doc.line(W - margin - 70, y, W - margin, y);
      doc.line(margin, y, margin + 70, y);
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text("التوقيع", W - margin - 35, y + 4, { align: "center" });
      doc.text("التوقيع", margin + 35, y + 4, { align: "center" });
    }
    doc.setTextColor(150, 150, 150);
    doc.text("تم إنشاء هذا التقرير تلقائياً بواسطة نظام سجل الدرجات", W / 2, y + 12, { align: "center" });

    doc.save(`تقرير_${student.name}_${className}.pdf`);
    toast.success(`تم تصدير تقرير ${student.name} بنجاح`);
    setOpen(false);
    setSelectedStudent("");
  };

  if (!selectedClass || classStudents.length === 0) return null;

  return (
    <>
      <Button variant="outline" onClick={handleOpen} className="gap-2">
        {canExport(me) ? <FileText className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
        تقرير طالب
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تقرير أداء طالب</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">اختر الطالب لتصدير تقريره الأكاديمي الشامل بصيغة PDF</p>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger>
              <SelectValue placeholder="اختر الطالب" />
            </SelectTrigger>
            <SelectContent>
              {classStudents.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="w-full gap-2 mt-2"
            disabled={!selectedStudent}
            onClick={() => exportStudentPDF(selectedStudent)}
          >
            <Download className="h-4 w-4" />
            تصدير التقرير PDF
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}