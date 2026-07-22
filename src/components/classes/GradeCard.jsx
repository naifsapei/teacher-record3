import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Pencil, Trash2, X } from "lucide-react";
import { classSection, classDisplayName } from "@/lib/classSections";
import { SEMESTER_LABELS } from "@/lib/terminology";

// بطاقة صف دراسي تعرض شعبه مع إمكانية الحذف السريع.
export default function GradeCard({ grade, onEdit, onRemoveSection, onDeleteGrade }) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold leading-tight">{grade.gradeName}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {grade.gradeLevel && `${grade.gradeLevel}`}
                {grade.classes[0]?.academic_year && ` • ${grade.classes[0].academic_year}`}
                {grade.classes[0]?.semester && ` • ${SEMESTER_LABELS[grade.classes[0].semester] || ""}`}
              </p>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onEdit(grade)} title="تعديل الصف">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDeleteGrade(grade)} title="حذف الصف بأكمله">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {grade.classes.map((c) => {
            const s = classSection(c);
            const label = s || classDisplayName(c);
            return (
              <Badge key={c.id} variant="secondary" className="gap-1 py-1 px-2.5 text-sm">
                {label}
                <button onClick={() => onRemoveSection(c)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}