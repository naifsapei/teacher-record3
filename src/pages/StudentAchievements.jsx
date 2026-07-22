import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Award, Target, Activity, CheckCircle2, Clock, CircleDashed, Printer } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import AchievementDialog from "@/components/achievements/AchievementDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import GradeSectionSelect from "@/components/shared/GradeSectionSelect";
import { scopeBySchool } from "@/lib/permissions";

const SKILL_STATUS = {
  acquired: { label: "مكتسبة", class: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  in_progress: { label: "قيد التطوير", class: "bg-amber-100 text-amber-700", icon: Clock },
  not_acquired: { label: "غير مكتسبة", class: "bg-rose-100 text-rose-700", icon: CircleDashed },
};

function formatDate(d) {
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "long", day: "numeric" }).format(new Date(d));
  } catch { return d; }
}

function StatCard({ title, value, icon: Icon, tone }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
      <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center", tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function StudentAchievements() {
  const [gradeName, setGradeName] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [tab, setTab] = useState("skills");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const qc = useQueryClient();
  const { data: rawClasses = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: rawStudents = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: rawAchievements = [] } = useQuery({ queryKey: ["achievements"], queryFn: () => base44.entities.Achievement.list() });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const classes = useMemo(() => scopeBySchool(rawClasses, me), [rawClasses, me]);
  const students = useMemo(() => scopeBySchool(rawStudents, me), [rawStudents, me]);
  const achievements = useMemo(() => scopeBySchool(rawAchievements, me), [rawAchievements, me]);

  const classStudents = selectedClass ? students.filter((s) => s.class_id === selectedClass) : [];
  const studentObj = students.find((s) => s.id === selectedStudent) || null;

  const studentAch = selectedStudent ? achievements.filter((a) => a.student_id === selectedStudent) : [];
  const skills = studentAch.filter((a) => a.type === "skill");
  const activities = studentAch.filter((a) => a.type === "activity");
  const acquiredCount = skills.filter((s) => s.status === "acquired").length;
  const inProgressCount = skills.filter((s) => s.status === "in_progress").length;

  const handleClassChange = ({ gradeName: g, classId: c }) => { setGradeName(g); setSelectedClass(c); setSelectedStudent(""); };

  const openAdd = () => {
    if (!selectedStudent) { toast.error("اختر الطالب أولاً"); return; }
    setEditing(null); setDialogOpen(true);
  };
  const openEdit = (a) => { setEditing(a); setDialogOpen(true); };

  const handleDelete = async (a) => {
    if (!confirm("هل تريد حذف هذا الإنجاز؟")) return;
    try {
      await base44.entities.Achievement.delete(a.id);
      qc.invalidateQueries(["achievements"]);
      toast.success("تم حذف الإنجاز");
    } catch (e) {
      toast.error("تعذر الحذف");
      console.error(e);
    }
  };

  const renderCard = (a) => {
    const isSkill = a.type === "skill";
    const status = isSkill ? SKILL_STATUS[a.status] || SKILL_STATUS.in_progress : null;
    const StatusIcon = status?.icon;
    return (
      <div key={a.id} className="bg-card rounded-2xl border border-border p-4 hover:shadow-md hover:border-primary/30 transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0", isSkill ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-600")}>
              {isSkill ? <Target className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{a.title}</p>
              <p className="text-[11px] text-muted-foreground">{formatDate(a.date)}{a.semester ? ` · ${a.semester}` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => openEdit(a)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center" title="تعديل">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button onClick={() => handleDelete(a)} className="h-8 w-8 rounded-lg hover:bg-rose-50 flex items-center justify-center" title="حذف">
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
            </button>
          </div>
        </div>

        {a.description && <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed">{a.description}</p>}

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {isSkill ? (
            <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md", status.class)}>
              {StatusIcon && <StatusIcon className="h-3 w-3" />}{status.label}
            </span>
          ) : a.activity_result ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-amber-100 text-amber-700">
              <Award className="h-3 w-3" />{a.activity_result}
            </span>
          ) : null}
          {a.notes && <span className="text-[11px] text-muted-foreground">📝 {a.notes}</span>}
        </div>
      </div>
    );
  };

  return (
    <div dir="rtl">
      <PageHeader
        title="سجل إنجازات الطالب"
        description="مهارات وأنشطة الطالب خلال الفصل الدراسي — مرجع للمعلم وولي الأمر"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> طباعة
            </Button>
            <Button onClick={openAdd} disabled={!selectedStudent} className="gap-2">
              <Plus className="h-4 w-4" /> إضافة إنجاز
            </Button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <GradeSectionSelect
          classes={classes}
          gradeName={gradeName}
          classId={selectedClass}
          showAll={false}
          onChange={handleClassChange}
          className="w-full sm:w-56"
        />
        <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
          <SelectContent>{classStudents.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {!selectedStudent ? (
        <EmptyState icon={Award} title="اختر الطالب" description="حدد الصف ثم الطالب لعرض سجل إنجازاته ومهاراته المكتسبة" />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard title="مهارات مكتسبة" value={acquiredCount} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-600" />
            <StatCard title="قيد التطوير" value={inProgressCount} icon={Clock} tone="bg-amber-100 text-amber-600" />
            <StatCard title="إجمالي المهارات" value={skills.length} icon={Target} tone="bg-primary/10 text-primary" />
            <StatCard title="الأنشطة" value={activities.length} icon={Activity} tone="bg-amber-100 text-amber-600" />
          </div>

          <div className="flex gap-2 mb-4 border-b border-border">
            {[
              { v: "skills", label: `المهارات (${skills.length})` },
              { v: "activities", label: `الأنشطة (${activities.length})` },
            ].map((t) => (
              <button
                key={t.v}
                onClick={() => setTab(t.v)}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  tab === t.v ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "skills" ? (
            skills.length === 0 ? (
              <EmptyState icon={Target} title="لا توجد مهارات مسجلة" description="أضف المهارات التي اكتسبها الطالب أو قيد تطويرها" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{skills.map(renderCard)}</div>
            )
          ) : activities.length === 0 ? (
            <EmptyState icon={Activity} title="لا توجد أنشطة مسجلة" description="أضف الأنشطة التي شارك فيها الطالب خلال الفصل" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{activities.map(renderCard)}</div>
          )}
        </>
      )}

      {dialogOpen && (
        <AchievementDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          achievement={editing}
          student={studentObj}
          classId={selectedClass}
        />
      )}
    </div>
  );
}