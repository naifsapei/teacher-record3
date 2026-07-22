import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isPrincipal, ministryNumber, scopeTeachersBySchool, scopeBySchool } from "@/lib/permissions";
import { calcPct } from "@/lib/gradeCalc";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import SchoolTeacherCard from "@/components/principal/SchoolTeacherCard";
import TeacherPerformanceReport from "@/components/principal/TeacherPerformanceReport";
import { Users } from "lucide-react";

export default function SchoolTeachers() {
  const [selectedId, setSelectedId] = useState(null);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers"], queryFn: () => base44.entities.Teacher.list() });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: grades = [] } = useQuery({ queryKey: ["grades"], queryFn: () => base44.entities.Grade.list() });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });

  const scopedTeachers = useMemo(() => scopeTeachersBySchool(teachers, me), [teachers, me]);
  const scopedSubjects = useMemo(() => scopeBySchool(subjects, me), [subjects, me]);
  const scopedGrades = useMemo(() => scopeBySchool(grades, me), [grades, me]);
  const scopedStudents = useMemo(() => scopeBySchool(students, me), [students, me]);
  const scopedClasses = useMemo(() => scopeBySchool(classes, me), [classes, me]);

  const teacherStats = useMemo(() => scopedTeachers.map((t) => {
    const subs = scopedSubjects.filter((s) => s.teacher_id === t.id);
    const subIds = new Set(subs.map((s) => s.id));
    const subMap = new Map(subs.map((s) => [s.id, s]));
    const tGrades = scopedGrades.filter((g) => subIds.has(g.subject_id));
    const pcts = tGrades.map((g) => calcPct(g, subMap.get(g.subject_id))).filter((p) => p !== null);
    const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
    const stuIds = new Set(tGrades.map((g) => g.student_id));
    return { teacher: t, subjects: subs.length, students: stuIds.size, avg };
  }), [scopedTeachers, scopedSubjects, scopedGrades]);

  if (!me) return <div className="p-8 text-sm text-muted-foreground">جارٍ التحميل...</div>;
  if (!isPrincipal(me)) return <Navigate to="/" replace />;

  const selectedTeacher = scopedTeachers.find((t) => t.id === selectedId) || null;

  return (
    <div>
      <PageHeader
        title="معلمو المدرسة وأداؤهم"
        description={me.school_name ? `${me.school_name} — رقم وزاري: ${ministryNumber(me)}` : "استعراض المعلمين المرتبطين بالمدرسة وأداء كل معلم"}
      />
      {scopedTeachers.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد معلمون مرتبطون" description="سيظهر هنا المعلمون المرتبطون بنفس رقم المدرسة الوزاري عند تسجيلهم" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {teacherStats.map((ts) => (
              <SchoolTeacherCard
                key={ts.teacher.id}
                teacher={ts.teacher}
                subjectsCount={ts.subjects}
                studentsCount={ts.students}
                avg={ts.avg}
                active={selectedId === ts.teacher.id}
                onClick={() => setSelectedId(ts.teacher.id)}
              />
            ))}
          </div>

          {selectedTeacher ? (
            <div>
              <h2 className="text-lg font-bold mb-3">تقرير أداء: {selectedTeacher.name}</h2>
              <TeacherPerformanceReport
                teacher={selectedTeacher}
                subjects={scopedSubjects}
                grades={scopedGrades}
                students={scopedStudents}
                classes={scopedClasses}
              />
            </div>
          ) : (
            <EmptyState icon={Users} title="اختر معلمًا لعرض إحصائية أدائه" description="انقر على بطاقة المعلم لعرض تقرير الأداء التفصيلي" />
          )}
        </>
      )}
    </div>
  );
}