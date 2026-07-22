import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Star, Users, Share2, BookOpen, Hand, BookCheck, FileText, Search, MoreVertical, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import StudentAvatar from "@/components/students/StudentAvatar";
import ManualGradeDialog from "@/components/student-tracking/ManualGradeDialog";
import WeeklySummaryModal from "@/components/student-tracking/WeeklySummaryModal";
import EvalChips from "@/components/student-tracking/EvalChips";
import StudentAchievementProfile from "@/components/student-tracking/StudentAchievementProfile";
import ExportButtons from "@/components/shared/ExportButtons";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { exportTrackingPDF, exportTrackingExcel, buildTrackingRows } from "@/utils/trackingExport";
import { subscriberTitle, resolveSchool, scopeBySchool } from "@/lib/permissions";
import GradeSectionSelect from "@/components/shared/GradeSectionSelect";

const STATUS_OPTIONS = [
  { value: "all", label: "كل الحالات" },
  { value: "excellent", label: "ممتاز" },
  { value: "very_good", label: "جيد جداً" },
  { value: "good", label: "جيد" },
  { value: "acceptable", label: "مقبول" },
  { value: "weak", label: "ضعيف" },
  { value: "not_evaluated", label: "لم يُقيّم" },
];

function studentBand(student, subjectId, grades, subjectObj) {
  const g = grades.find((gr) => gr.student_id === student.id && gr.subject_id === subjectId);
  if (!g) return "not_evaluated";
  const total = (g.participation || 0) + (g.homework || 0) + (g.class_activity || 0) + (g.research || 0) + (g.written_exam || 0) + (g.practical_exam || 0);
  const max = (subjectObj?.participation_max || 10) + (subjectObj?.homework_max || 10) + (subjectObj?.class_activity_max || 10) + (subjectObj?.research_max || 10) + (subjectObj?.written_exam_max || 30) + (subjectObj?.practical_exam_max || 30);
  if (!max) return "not_evaluated";
  const pct = (total / max) * 100;
  if (pct >= 90) return "excellent";
  if (pct >= 80) return "very_good";
  if (pct >= 70) return "good";
  if (pct >= 60) return "acceptable";
  return "weak";
}

export default function StudentTracking() {
  const [gradeName, setGradeName] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [gradeStudent, setGradeStudent] = useState(null);
  const [summaryStudent, setSummaryStudent] = useState(null);
  const [profileStudent, setProfileStudent] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: rawClasses   = [] } = useQuery({ queryKey: ["classes"],   queryFn: () => base44.entities.Class.list() });
  const { data: rawStudents  = [] } = useQuery({ queryKey: ["students"],  queryFn: () => base44.entities.Student.list() });
  const { data: rawSubjects  = [] } = useQuery({ queryKey: ["subjects"],  queryFn: () => base44.entities.Subject.list() });
  const { data: rawGrades    = [] } = useQuery({ queryKey: ["grades"],    queryFn: () => base44.entities.Grade.list() });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: schoolInfo } = useQuery({ queryKey: ["schoolInfo"], queryFn: () => base44.entities.SchoolInfo.list().then((r) => r[0] || null) });
  const { data: rawTrackingRecords = [] } = useQuery({ queryKey: ["trackingRecords"], queryFn: () => base44.entities.TrackingRecord.list() });
  const { data: rawEvalItems = [] } = useQuery({ queryKey: ["evaluationItems"], queryFn: () => base44.entities.EvaluationItem.list() });

  const classes = useMemo(() => scopeBySchool(rawClasses, me), [rawClasses, me]);
  const students = useMemo(() => scopeBySchool(rawStudents, me), [rawStudents, me]);
  const subjects = useMemo(() => scopeBySchool(rawSubjects, me), [rawSubjects, me]);
  const grades = useMemo(() => scopeBySchool(rawGrades, me), [rawGrades, me]);
  const trackingRecords = useMemo(() => scopeBySchool(rawTrackingRecords, me), [rawTrackingRecords, me]);
  const evalItems = useMemo(() => scopeBySchool(rawEvalItems, me), [rawEvalItems, me]);
  const enabledItems = evalItems.filter((i) => i.enabled);

  const classSubjects = subjects.filter((s) => s.class_id === selectedClass);

  const filteredStudents = selectedClass
    ? students.filter((s) => s.class_id === selectedClass)
    : [];

  const selectedSubjectObj = subjects.find((s) => s.id === selectedSubject) || null;

  const visibleStudents = filteredStudents.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || (s.name || "").toLowerCase().includes(q) || (s.student_number || "").toLowerCase().includes(q);
    const matchStatus = !selectedSubject || statusFilter === "all" || studentBand(s, selectedSubject, grades, selectedSubjectObj) === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleClassChange = ({ gradeName: g, classId: c }) => {
    setGradeName(g);
    setSelectedClass(c);
    setSelectedSubject("");
  };

  const recordsForStudent = (studentId) =>
    trackingRecords.filter((r) => r.student_id === studentId && r.subject_id === selectedSubject);

  const handleApplyEval = async (student, item) => {
    try {
      await base44.entities.TrackingRecord.create({
        student_id: student.id,
        class_id: selectedClass,
        subject_id: selectedSubject,
        date: today,
        action_label: item.name,
        action_emoji: item.icon_key,
        icon_key: item.icon_key,
        category: item.category,
        points: item.points,
        ministry_number: me?.ministry_number || "",
      });
      qc.invalidateQueries(["trackingRecords"]);
      qc.invalidateQueries(["student-profile", student.id]);
    } catch { toast.error("تعذر حفظ التقييم"); }
  };

  const handleRemoveEval = async (record) => {
    try {
      await base44.entities.TrackingRecord.delete(record.id);
      qc.invalidateQueries(["trackingRecords"]);
      qc.invalidateQueries(["student-profile", record.student_id]);
    } catch { toast.error("تعذر حذف التقييم"); }
  };

  const className = classes.find((c) => c.id === selectedClass)?.name || "";
  const subjectName = subjects.find((s) => s.id === selectedSubject)?.name || "";
  const teacherName = me?.display_name || me?.full_name || me?.email || "";

  const buildExportData = () => ({
    school: resolveSchool(me, schoolInfo),
    teacherName,
    teacherTitle: subscriberTitle(me),
    className,
    subjectName,
    rows: buildTrackingRows(filteredStudents, grades, selectedSubject),
  });

  return (
    <PullToRefresh onRefresh={() => Promise.all([
      qc.invalidateQueries(["classes"]),
      qc.invalidateQueries(["students"]),
      qc.invalidateQueries(["subjects"]),
      qc.invalidateQueries(["grades"]),
      qc.invalidateQueries(["trackingRecords"]),
      qc.invalidateQueries(["evaluationItems"]),
    ])}>
    <div dir="rtl">
      <PageHeader
        title="سجل المتابعة"
        description="تقييم أداء الطلاب وإضافة النقاط بشكل سريع"
        actions={
          <ExportButtons
            me={me}
            onExportPDF={() => exportTrackingPDF(buildExportData())}
            onExportExcel={() => exportTrackingExcel(buildExportData())}
            disabled={!selectedSubject}
          />
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <GradeSectionSelect
          classes={classes}
          gradeName={gradeName}
          classId={selectedClass}
          showAll={false}
          onChange={handleClassChange}
          className="w-full sm:w-56"
        />

        <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedClass}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="اختر المادة الدراسية" />
          </SelectTrigger>
          <SelectContent>
            {classSubjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الرقم الدراسي"
            className="pr-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter} disabled={!selectedSubject}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="الحالة الدراسية" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedClass ? (
        <EmptyState icon={Star} title="اختر الصف الدراسي" description="حدد الصف والمادة أولاً لعرض قائمة الطلاب وبدء التقييم" />
      ) : !selectedSubject ? (
        <EmptyState icon={BookOpen} title="اختر المادة الدراسية" description="حدد المادة لتتمكن من متابعة درجات الطلاب وربطها بالسجل" />
      ) : filteredStudents.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد طلاب" description="لا يوجد طلاب مسجلون في هذا الصف" />
      ) : visibleStudents.length === 0 ? (
        <EmptyState icon={Search} title="لا توجد نتائج مطابقة" description="جرّب تعديل نص البحث أو تصفية الحالة الدراسية" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleStudents.map((student) => {
          const studentRecords = recordsForStudent(student.id);
          const studentPoints = studentRecords.reduce((s, r) => s + (r.points || 0), 0);
          return (
            <div
              key={student.id}
              className="flex flex-col gap-2.5 p-3 bg-white rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-right"
            >
              {/* الصف العلوي: الصورة + الاسم + المجموع + القائمة */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setGradeStudent(student)}
                  className="flex-shrink-0"
                  title="إدخال الدرجات"
                  aria-label="إدخال الدرجات"
                >
                  <StudentAvatar me={me} student={student} size="h-11 w-11" />
                </button>
                <button
                  onClick={() => setProfileStudent(student)}
                  className="flex-1 min-w-0 text-right"
                  title="فتح ملف إنجاز الطالب"
                >
                  <p className="font-bold text-sm text-foreground truncate hover:text-primary transition-colors leading-tight">{student.name}</p>
                  {student.student_number && (
                    <p className="text-[11px] text-muted-foreground">#{student.student_number}</p>
                  )}
                </button>
                <span className="shrink-0 inline-flex items-center justify-center min-w-8 h-7 px-2 rounded-full bg-blue-500 text-white text-xs font-bold shadow-sm">
                  {studentPoints}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0" aria-label="خيارات">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setGradeStudent(student)}>
                      <BookCheck className="h-4 w-4 ml-2" /> إدخال الدرجات
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setProfileStudent(student)}>
                      <FolderOpen className="h-4 w-4 ml-2" /> ملف إنجاز الطالب
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSummaryStudent(student)}>
                      <Share2 className="h-4 w-4 ml-2" /> ملخص أسبوعي
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* الصف السفلي: أيقونات التقييم */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                <EvalChips
                  records={studentRecords}
                  items={enabledItems}
                  onApply={(item) => handleApplyEval(student, item)}
                  onRemove={handleRemoveEval}
                />
              </div>
            </div>
          );
          })}
        </div>
      )}

      <ManualGradeDialog
        student={gradeStudent}
        subject={selectedSubjectObj}
        open={!!gradeStudent}
        onClose={() => setGradeStudent(null)}
        onSaved={() => qc.invalidateQueries(["grades"])}
      />

      <WeeklySummaryModal
        student={summaryStudent}
        open={!!summaryStudent}
        onClose={() => setSummaryStudent(null)}
      />

      <StudentAchievementProfile
        student={profileStudent}
        open={!!profileStudent}
        onClose={() => setProfileStudent(null)}
        subjects={subjects}
      />
    </div>
    </PullToRefresh>
  );
}