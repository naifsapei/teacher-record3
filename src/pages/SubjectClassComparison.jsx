import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { scopeBySchool, ministryNumber } from "@/lib/permissions";
import { calcPct } from "@/lib/gradeCalc";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import SubjectClassBarChart from "@/components/analytics/SubjectClassBarChart";
import SubjectClassMatrix from "@/components/analytics/SubjectClassMatrix";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitCompareArrows, Award, AlertTriangle, TrendingDown } from "lucide-react";

const GRADE_LEVELS = ["روضة", "ابتدائي", "متوسط", "ثانوي"];

function KpiCard({ icon: Icon, label, value, tone }) {
  const tones = { green: "text-emerald-600 bg-emerald-50", amber: "text-amber-600 bg-amber-50", purple: "text-purple-600 bg-purple-50", blue: "text-blue-600 bg-blue-50" };
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center gap-3 p-4">
        <span className={`h-11 w-11 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">{label}</p><p className="text-xl font-bold">{value}</p></div>
      </CardContent>
    </Card>
  );
}

export default function SubjectClassComparison() {
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: grades = [] } = useQuery({ queryKey: ["grades"], queryFn: () => base44.entities.Grade.list() });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });

  const [gradeLevel, setGradeLevel] = useState("all");
  const [subjectQuery, setSubjectQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const scopedSubjects = useMemo(() => scopeBySchool(subjects, me), [subjects, me]);
  const scopedGrades = useMemo(() => scopeBySchool(grades, me), [grades, me]);
  const scopedStudents = useMemo(() => scopeBySchool(students, me), [students, me]);
  const scopedClasses = useMemo(() => scopeBySchool(classes, me), [classes, me]);

  const filteredClasses = useMemo(() => scopedClasses.filter((c) => gradeLevel === "all" || c.grade_level === gradeLevel), [scopedClasses, gradeLevel]);
  const classIds = useMemo(() => new Set(filteredClasses.map((c) => c.id)), [filteredClasses]);

  const matrix = useMemo(() => {
    const studentClass = new Map(scopedStudents.map((s) => [s.id, s.class_id]));
    const subjectMap = new Map(scopedSubjects.map((s) => [s.id, s]));
    const bySubject = new Map();
    scopedGrades.forEach((g) => {
      const clsId = studentClass.get(g.student_id);
      const sub = subjectMap.get(g.subject_id);
      if (!clsId || !sub || !classIds.has(clsId)) return;
      const pct = calcPct(g, sub);
      if (pct === null) return;
      if (!bySubject.has(g.subject_id)) bySubject.set(g.subject_id, new Map());
      const cm = bySubject.get(g.subject_id);
      if (!cm.has(clsId)) cm.set(clsId, []);
      cm.get(clsId).push(pct);
    });
    const q = subjectQuery.trim();
    return scopedSubjects
      .filter((sub) => !q || (sub.name || "").includes(q))
      .map((sub) => {
        const cm = bySubject.get(sub.id) || new Map();
        const classAvgs = filteredClasses.map((cls) => {
          const pcts = cm.get(cls.id) || [];
          const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
          return { classId: cls.id, className: cls.name, avg, count: pcts.length };
        });
        const valid = classAvgs.filter((c) => c.avg !== null);
        const overall = valid.length ? Math.round(valid.reduce((a, c) => a + c.avg, 0) / valid.length) : null;
        return { subject: sub, classAvgs, overall };
      })
      .filter((row) => row.overall !== null);
  }, [scopedSubjects, scopedGrades, scopedStudents, filteredClasses, classIds, subjectQuery]);

  const chartSubjectId = selectedSubject || (matrix[0]?.subject.id || "");
  const chartRow = useMemo(() => matrix.find((r) => r.subject.id === chartSubjectId) || null, [matrix, chartSubjectId]);
  const chartData = useMemo(() => (chartRow ? chartRow.classAvgs.filter((c) => c.avg !== null) : []), [chartRow]);

  const summary = useMemo(() => {
    if (!matrix.length) return null;
    let best = null, worst = null, biggestGap = 0;
    matrix.forEach((row) => {
      row.classAvgs.forEach((c) => {
        if (c.avg === null) return;
        if (!best || c.avg > best.avg) best = { ...c, subjectName: row.subject.name };
        if (!worst || c.avg < worst.avg) worst = { ...c, subjectName: row.subject.name };
      });
      const valid = row.classAvgs.filter((c) => c.avg !== null);
      if (valid.length > 1) {
        const gap = Math.max(...valid.map((c) => c.avg)) - Math.min(...valid.map((c) => c.avg));
        if (gap > biggestGap) biggestGap = gap;
      }
    });
    return { best, worst, biggestGap, subjectCount: matrix.length };
  }, [matrix]);

  return (
    <div>
      <PageHeader
        title="مقارنة مستوى الطلاب بين الفصول لكل مادة"
        description={me?.school_name ? `${me.school_name} — رقم وزاري: ${ministryNumber(me)}` : "لوحة إحصائية لمقارنة أداء الفصول في كل مادة لدعم القرارات الإدارية"}
      />

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
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
            <div className="flex-1">
              <Label className="text-xs font-semibold mb-1.5 block">بحث عن مادة</Label>
              <Input value={subjectQuery} onChange={(e) => setSubjectQuery(e.target.value)} placeholder="اسم المادة..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {matrix.length === 0 ? (
        <EmptyState icon={GitCompareArrows} title="لا توجد بيانات للمقارنة" description="أدخل درجات الطلاب في المواد والفصول لعرض مقارنة مستوى الفصول" />
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <KpiCard icon={Award} label="أعلى أداء" value={summary.best ? `${summary.best.avg}%` : "—"} tone="green" />
              <KpiCard icon={TrendingDown} label="أضعف أداء" value={summary.worst ? `${summary.worst.avg}%` : "—"} tone="amber" />
              <KpiCard icon={AlertTriangle} label="أكبر فجوة" value={summary.biggestGap ? `${summary.biggestGap}%` : "—"} tone="purple" />
              <KpiCard icon={GitCompareArrows} label="عدد المواد" value={summary.subjectCount} tone="blue" />
            </div>
          )}

          <div className="mb-6 space-y-3">
            <div className="max-w-sm">
              <Label className="text-xs font-semibold mb-1.5 block">مادة للمقارنة الرسومية</Label>
              <Select value={chartSubjectId} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full"><SelectValue placeholder="اختر مادة..." /></SelectTrigger>
                <SelectContent>
                  {matrix.map((r) => <SelectItem key={r.subject.id} value={r.subject.id}>{r.subject.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <SubjectClassBarChart data={chartData} subjectName={chartRow?.subject.name || ""} />
          </div>

          <SubjectClassMatrix matrix={matrix} classes={filteredClasses} />
        </>
      )}
    </div>
  );
}