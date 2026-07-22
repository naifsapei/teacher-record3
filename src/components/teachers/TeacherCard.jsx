import { Users, BookOpen, GraduationCap, TrendingUp, Hash, BadgeCheck, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { bandColor } from "@/utils/teachersReport";
import { specializationsText } from "@/lib/permissions";

export default function TeacherCard({ teacher, stats, onClick }) {
  const s = stats || {};
  const linked = teacher.user_id;
  return (
    <Card
      className="group hover:shadow-lg hover:border-primary/40 transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-chart-4/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-chart-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{teacher.name}</h3>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                {teacher.employee_number && (
                  <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{teacher.employee_number}</span>
                )}
                {specializationsText(teacher) && <span>{specializationsText(teacher)}</span>}
              </div>
            </div>
          </div>
          {linked ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1 shrink-0">
              <BadgeCheck className="h-3 w-3" /> مرتبط
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1 shrink-0">
              <AlertCircle className="h-3 w-3" /> غير مرتبط
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
          {teacher.grade_level && <span>المرحلة: {teacher.grade_level}</span>}
          {teacher.phone && <span>{teacher.phone}</span>}
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-lg bg-muted/40 py-2">
            <BookOpen className="h-4 w-4 mx-auto text-blue-500 mb-0.5" />
            <p className="text-sm font-bold">{s.subjectCount || 0}</p>
            <p className="text-[10px] text-muted-foreground">مواد</p>
          </div>
          <div className="rounded-lg bg-muted/40 py-2">
            <GraduationCap className="h-4 w-4 mx-auto text-purple-500 mb-0.5" />
            <p className="text-sm font-bold">{s.classCount || 0}</p>
            <p className="text-[10px] text-muted-foreground">فصول</p>
          </div>
          <div className="rounded-lg bg-muted/40 py-2">
            <Users className="h-4 w-4 mx-auto text-chart-4 mb-0.5" />
            <p className="text-sm font-bold">{s.studentCount || 0}</p>
            <p className="text-[10px] text-muted-foreground">طلاب</p>
          </div>
          <div className="rounded-lg bg-muted/40 py-2">
            <TrendingUp className="h-4 w-4 mx-auto mb-0.5" style={{ color: bandColor(s.avg || 0) }} />
            <p className="text-sm font-bold" style={{ color: bandColor(s.avg || 0) }}>{s.avg || 0}%</p>
            <p className="text-[10px] text-muted-foreground">المتوسط</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}