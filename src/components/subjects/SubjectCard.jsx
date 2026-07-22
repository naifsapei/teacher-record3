import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, BookOpen, UserCircle, Pencil, Trash2, Hash } from "lucide-react";

const SUBJECT_COLORS = [
  "from-emerald-500 to-teal-600",
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-violet-600",
  "from-orange-500 to-amber-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-sky-600",
];

function getColor(name = "") {
  const code = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return SUBJECT_COLORS[code % SUBJECT_COLORS.length];
}

const GRADE_ITEMS = [
  { key: "participation_max",  label: "مشاركة",        color: "bg-emerald-50 text-emerald-700", def: 10 },
  { key: "homework_max",       label: "واجبات",         color: "bg-blue-50 text-blue-700",       def: 10 },
  { key: "class_activity_max", label: "صفية",          color: "bg-purple-50 text-purple-700",   def: 10 },
  { key: "research_max",       label: "بحوث",          color: "bg-pink-50 text-pink-700",       def: 10 },
  { key: "written_exam_max",   label: "تحريري",        color: "bg-orange-50 text-orange-700",   def: 30 },
  { key: "practical_exam_max", label: "عملي",          color: "bg-red-50 text-red-700",         def: 30 },
];

export default function SubjectCard({ subject, className, teacherName, studentsCount, onEdit, onDelete }) {
  const gradient = getColor(subject.name);
  const maxTotal = GRADE_ITEMS.reduce((sum, f) => sum + (subject[f.key] ?? f.def), 0);

  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md">
      <div className={`bg-gradient-to-l ${gradient} p-5 relative`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg leading-tight">{subject.name}</h3>
              <p className="text-white/70 text-xs mt-0.5">المجموع الكلي: {maxTotal} درجة</p>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/20 hover:bg-white/30 text-white" onClick={() => onEdit(subject)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/20 hover:bg-red-500/60 text-white" onClick={() => onDelete(subject.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          {className && (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-muted-foreground">الصف:</span>
              <span className="font-medium">{className}</span>
            </div>
          )}
          {teacherName ? (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-7 w-7 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <UserCircle className="h-3.5 w-3.5 text-chart-4" />
              </div>
              <span className="text-muted-foreground">المعلم:</span>
              <span className="font-medium">{teacherName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground italic">لم يُحدد معلم</span>
            </div>
          )}
          {studentsCount !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-7 w-7 rounded-lg bg-green-100 flex items-center justify-center">
                <Hash className="h-3.5 w-3.5 text-green-600" />
              </div>
              <span className="text-muted-foreground">الطلاب:</span>
              <span className="font-medium">{studentsCount} طالب</span>
            </div>
          )}
        </div>

        {/* Grade distribution */}
        <div className="grid grid-cols-3 gap-1.5">
          {GRADE_ITEMS.map((item) => (
            <div key={item.key} className={`${item.color} rounded-lg p-2 text-center`}>
              <p className="text-xs opacity-70">{item.label}</p>
              <p className="font-bold text-sm">{subject[item.key] ?? item.def}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}