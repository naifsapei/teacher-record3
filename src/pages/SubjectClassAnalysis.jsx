import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { scopeBySchool, ministryNumber } from "@/lib/permissions";
import { calcPct } from "@/lib/gradeCalc";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import SubjectClassBarChart from "@/components/analytics/SubjectClassBarChart";
import SubjectClassAnalysisTable from "@/components/analytics/SubjectClassAnalysisTable";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Target, TrendingDown, AlertTriangle, GitCompareArrows } from "lucide-react";

const GRADE_LEVELS = ["روضة", "ابتدائي", "متوسط", "ثانوي"];

function KpiCard({ icon: Icon, label, value, tone }) {
  const tones = { green: "text-emerald-600 bg-emerald-50", blue: "text-blue-600 bg-blue-50", amber: "text-amber-600 bg-amber-50", purple: "text-purple-600 bg-purple-50" };
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center gap-3 p-4">
        <span className={`h-11 w-11 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">{label}</p><p className="text-xl font-bold">{value}</p></div>
      </CardContent>
    </Card>
  );
}

export default function SubjectClassAnalysis() {
  const [gradeLevel, setGradeLevel] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("");
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: grades = [] } = useQuery({ queryKey: ["grades"], queryFn: () => base44.entities.Grade.list() });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });

  const scopedSubjects = useMemo(() => scopeBySchool(subjects, me), [subjects, me]);
  const scopedGrades = useMemo(() => scopeBySchool(grades, me), [grades, me]);
  const scopedStudents = useMemo(() => scopeBySchool(students, me), [students, me]);
  const scopedClasses = useMemo(() => scopeBySchool(classes, me), [classes, me]);

  const filteredClasses = useMemo(() => scopedClasses.filter((c) => gradeLevel === "all" || c.grade_level === gradeLevel), [scopedClasses, gradeLevel]);
  const studentClass = useMemo(() => new Map(scopedStudents.map((s) => [s.id, s.class_id])), [scopedStudents]);

  const subjectOptions = useMemo(() => {
    const ids = new Set(filteredClasses.map((c) => c.id));
    const used = new Set(scopedGrades.filter((g) => ids.has(studentClass.get(g.student_id))).map((g) => g.subject_id));
    return scopedSubjects.filter((s) => used.has(s.id));
  }, [scopedSubjects, scopedGrades, filteredClasses, studentClass]);

  const subjectId = selectedSubject || (subjectOptions[0]?.id || "");
  const subject = scopedSubjects.find((s) => s.id === subjectId) || null;

  const classData = useMemo(() => {
    if (!subject) return [];
    const ids = new Set(filteredClasses.map((c) => c.id));
    const byClass = new Map();
    scopedGrades.forEach((g) => {
      if (g.subject_id !== subject.id) return;
      const clsId = studentClass.get(g.student_id);
      if (!clsId || !ids.has(clsId)) return;
      const pct = calcPct(g, subject);
      if (pct === null) return;
      if (!byClass.has(clsId)) byClass.set(clsId, []);
      byClass.get(clsId).push(pct);
    });
    return filteredClasses.map((cls) => {
      const pcts = byClass.get(cls.id) || [];
      const count = pcts.length;
      const avg = count ? Math.round(pcts.reduce((a, b) => a + b, 0) / count) : null;
      const passRate = count ? Math.round((pcts.filter((p) => p >= 60).length / count) * 100) : null;
      return {
        classId: cls.id, className: cls.name, gradeLevel: cls.grade_level,
        count, avg, passRate,
        outstanding: pcts.filter((p) => p >= 90).length,
        struggling: pcts.filter((p) => p < 60).length,
      };
    }).filter((c) => c.count > 0);
  }, [subject, scopedGrades, filteredClasses, studentClass]);

  const validRows = classData.filter((c) => c.avg !== null);
  const schoolAvg = validRows.length ? Math.round(validRows.reduce((a, c) => a + c.avg, 0) / validRows.length) : 0;
  const sortedAsc = [...validRows].sort((a, b) => a.avg - b.avg);
  const gap = sortedAsc.length >= 2 ? sortedAsc[sortedAsc.length - 1].avg - sortedAsc[0].avg : 0;
  const interventionCount = validRows.filter((c) => c.avg < 60).length;
  const chartData = validRows.map((c) => ({ className: c.className, avg: c.avg, count: c.count }));

  return (
    <div>
      <PageHeader
        title="تحليل أداء الفصول للمادة الواحدة"
        description={me?.school_name ? `${me.school_name} — رقم وزاري: ${ministryNumber(me)}` : "مقارنة متوسط درجات الطلاب بين الفصول للمادة الواحدة لدعم قرارات التحسين التعليمي"}
      />

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label className="text-xs font-semibold mb-1.5 block">المادة</Label>
              <Select value={subjectId} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full"><SelectValue placeholder="اختر المادة..." /></SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs font-semibold mb-1.5 block">المرحلة</Label>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger className="w-full"><SelectValue placeholder="كل المراحل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المراحل</SelectItem>
                  {GRADE_LEVELS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!subject || classData.length === 0 ? (
        <EmptyState icon={GitCompareArrows} title="لا توجد بيانات للتحليل" description="اختر مادة لها درجات مُدخلة في الفصول لعرض المقارنة وتوصيات التحسين" />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard icon={Target} label="متوسط المادة" value={`${schoolAvg}%`} tone="green" />
            <KpiCard icon={GitCompareArrows} label="عدد الفصول" value={validRows.length} tone="blue" />
            <KpiCard icon={AlertTriangle} label="فصول تحتاج تدخل" value={interventionCount} tone="amber" />
            <KpiCard icon={TrendingDown} label="الفجوة بين الفصول" value={`${gap}%`} tone="purple" />
          </div>

          <div className="mb-6">
            <SubjectClassBarChart data={chartData} subjectName={subject.name} />
          </div>

          <SubjectClassAnalysisTable rows={classData} schoolAvg={schoolAvg} gap={gap} />
        </>
      )}
    </div>
  );
}