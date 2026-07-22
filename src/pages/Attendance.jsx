import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarCheck, Save, CheckCircle2, XCircle, Clock, ShieldAlert, Users, ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import StudentAttendanceCard from "@/components/attendance/StudentAttendanceCard";
import AttendanceReportExport from "@/components/attendance/AttendanceReportExport";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { subscriberTitle, resolveSchool } from "@/lib/permissions";
import { toast } from "sonner";
import { format, addDays, subDays, parseISO } from "date-fns";
import GradeSectionSelect from "@/components/shared/GradeSectionSelect";

const STATUS_CONFIG = {
  present: { label: "حاضر",  color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  absent:  { label: "غائب",  color: "bg-red-100 text-red-700 border-red-200",             icon: XCircle },
  late:    { label: "متأخر", color: "bg-amber-100 text-amber-700 border-amber-200",       icon: Clock },
  excused: { label: "معذور", color: "bg-blue-100 text-blue-700 border-blue-200",          icon: ShieldAlert },
};

export default function Attendance() {
  const [gradeName, setGradeName] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate]   = useState(format(new Date(), "yyyy-MM-dd"));
  const [statusEdits, setStatusEdits] = useState({});
  const [saving, setSaving]           = useState(false);
  const queryClient = useQueryClient();

  const { data: classes    = [] } = useQuery({ queryKey: ["classes"],    queryFn: () => base44.entities.Class.list() });
  const { data: students   = [] } = useQuery({ queryKey: ["students"],   queryFn: () => base44.entities.Student.list() });
  const { data: attendance = [] } = useQuery({ queryKey: ["attendance"], queryFn: () => base44.entities.Attendance.list() });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: schoolInfo } = useQuery({ queryKey: ["schoolInfo"], queryFn: () => base44.entities.SchoolInfo.list().then((r) => r[0] || null) });

  const className = classes.find((c) => c.id === selectedClass)?.name || "";
  const teacherName = me?.display_name || me?.full_name || me?.email || "";
  const teacherTitle = subscriberTitle(me);
  const principalName = resolveSchool(me, schoolInfo).principal_name;

  const filteredStudents = useMemo(
    () => selectedClass ? students.filter((s) => s.class_id === selectedClass) : [],
    [selectedClass, students]
  );

  const studentStats = useMemo(() => {
    const map = {};
    attendance.forEach((a) => {
      if (a.class_id !== selectedClass) return;
      if (!map[a.student_id]) map[a.student_id] = { present: 0, absent: 0, late: 0, excused: 0 };
      if (map[a.student_id][a.status] !== undefined) map[a.student_id][a.status]++;
    });
    return map;
  }, [attendance, selectedClass]);

  const getRecord = (sid) => attendance.find((a) => a.student_id === sid && a.class_id === selectedClass && a.date === selectedDate);
  const getStatus = (sid) => statusEdits[sid] ?? getRecord(sid)?.status ?? "present";

  const setStatus = (sid, val) => setStatusEdits((p) => ({ ...p, [sid]: val }));

  const hasEdits = Object.keys(statusEdits).length > 0;

  const handleSave = async () => {
    setSaving(true);
    const allIds = new Set([...Object.keys(statusEdits)]);
    await Promise.all([...allIds].map(async (sid) => {
      const existing = getRecord(sid);
      const data = {
        student_id: sid,
        class_id:   selectedClass,
        date:       selectedDate,
        status:     statusEdits[sid] ?? existing?.status ?? "present",
        ministry_number: me?.ministry_number || "",
      };
      return existing
        ? base44.entities.Attendance.update(existing.id, data)
        : base44.entities.Attendance.create(data);
    }));
    queryClient.invalidateQueries({ queryKey: ["attendance"] });
    setStatusEdits({});
    setSaving(false);
    toast.success("تم حفظ الحضور بنجاح ✅");
  };

  // mark all as one status quickly
  const markAll = (statusVal) => {
    const edits = {};
    filteredStudents.forEach((s) => { edits[s.id] = statusVal; });
    setStatusEdits(edits);
    toast.info(`تم تحديد الكل كـ "${STATUS_CONFIG[statusVal].label}"`);
  };

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    filteredStudents.forEach((s) => counts[getStatus(s.id)]++);
    return counts;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredStudents, statusEdits, attendance, selectedClass, selectedDate]);

  const navigateDate = (dir) => {
    const d = parseISO(selectedDate);
    setSelectedDate(format(dir === "next" ? addDays(d, 1) : subDays(d, 1), "yyyy-MM-dd"));
    setStatusEdits({});
  };

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
  const displayDate = (() => {
    try {
      return new Intl.DateTimeFormat("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(parseISO(selectedDate));
    } catch { return selectedDate; }
  })();

  return (
    <PullToRefresh onRefresh={() => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["attendance"] }),
      queryClient.invalidateQueries({ queryKey: ["students"] }),
      queryClient.invalidateQueries({ queryKey: ["classes"] }),
    ])}>
    <div dir="rtl">
      <PageHeader
        title="الحضور اليومي"
        description="تسجيل حضور وغياب الطلاب بشكل سريع"
        actions={
          <div className="flex items-center gap-2">
            {hasEdits && selectedClass && (
              <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-md">
                <Save className="h-4 w-4" />
                {saving ? "جاري الحفظ..." : `حفظ (${Object.keys(statusEdits).length})`}
              </Button>
            )}
          </div>
        }
      />

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Class selector */}
        <GradeSectionSelect
          classes={classes}
          gradeName={gradeName}
          classId={selectedClass}
          showAll={false}
          onChange={({ gradeName: g, classId: c }) => { setGradeName(g); setSelectedClass(c); setStatusEdits({}); }}
          className="w-full sm:w-60"
        />

        {/* Date navigator */}
        <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-3 py-1.5 shadow-sm flex-1 sm:flex-none">
          <button onClick={() => navigateDate("prev")} className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-xs font-semibold text-foreground leading-tight">{displayDate}</p>
            {isToday && <span className="text-[10px] text-primary font-medium">اليوم</span>}
          </div>
          <button onClick={() => navigateDate("next")} disabled={isToday} className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Date input fallback */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => { setSelectedDate(e.target.value); setStatusEdits({}); }}
          className="h-10 rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full sm:w-40"
        />
      </div>

      {!selectedClass ? (
        <EmptyState icon={CalendarCheck} title="اختر الصف الدراسي" description="حدد الصف أولاً لتسجيل الحضور اليومي" />
      ) : filteredStudents.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد طلاب" description="لا يوجد طلاب مسجلون في هذا الصف" />
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
            {Object.entries(STATUS_CONFIG).map(([key, conf]) => {
              const Icon = conf.icon;
              return (
                <div key={key} className={`rounded-2xl border p-3 flex items-center gap-3 ${conf.color}`}>
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/60 flex-shrink-0">
                    <Icon className="h-5 w-5" strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-2xl font-extrabold">{summary[key]}</span>
                    <span className="text-xs font-medium opacity-90">{conf.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/40 rounded-xl border border-dashed border-border">
            <span className="text-xs text-muted-foreground flex items-center ml-1">تحديد سريع للكل:</span>
            {Object.entries(STATUS_CONFIG).map(([key, conf]) => {
              const Icon = conf.icon;
              return (
                <button
                  key={key}
                  onClick={() => markAll(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:shadow-sm ${conf.color}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {conf.label} الكل
                </button>
              );
            })}
          </div>

          {/* Student cards */}
          <div className="space-y-2.5">
            {filteredStudents.map((student, i) => (
              <StudentAttendanceCard
                key={student.id}
                student={student}
                index={i}
                status={getStatus(student.id)}
                onStatusChange={(val) => setStatus(student.id, val)}
                stats={studentStats[student.id]}
              />
            ))}
          </div>

          {/* Floating save button */}
          {hasEdits && (
            <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40">
              <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-2xl rounded-2xl gap-2 px-8">
                <Save className="h-5 w-5" />
                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </div>
          )}
        </>
      )}

      {selectedClass && (
        <div className="mt-6">
          <AttendanceReportExport
            me={me}
            school={resolveSchool(me, schoolInfo)}
            className={className}
            teacherName={teacherName}
            teacherTitle={teacherTitle}
            principalName={principalName}
            students={filteredStudents}
            attendance={attendance}
            classId={selectedClass}
            date={selectedDate}
          />
        </div>
      )}


    </div>
    </PullToRefresh>
  );
}