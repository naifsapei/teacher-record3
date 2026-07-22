import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { groupClassesByGrade, gradeSections, sectionOptionLabel, ALL_SECTIONS } from "@/lib/classSections";

// مكوّن اختيار مشترك: الصف الدراسي أولاً ثم الشعبة (+ خيار "الكل").
// القيمة: { gradeName, classId } — classId معرّف سجل الشعبة أو "all".
export default function GradeSectionSelect({
  classes = [],
  gradeName,
  classId,
  onChange,
  gradeLabel = "الصف الدراسي",
  sectionLabel = "الشعبة",
  showAll = true,
  allGradeLabel = "",
  gradePlaceholder = "اختر الصف الدراسي",
  sectionPlaceholder = "اختر الشعبة",
  disabled,
  className = "",
}) {
  const grades = useMemo(() => groupClassesByGrade(classes), [classes]);
  const sections = useMemo(() => (gradeName ? gradeSections(classes, gradeName) : []), [classes, gradeName]);

  return (
    <>
      <div className={`space-y-1.5 ${className}`}>
        <Label>{gradeLabel}</Label>
        <Select value={gradeName || "__all__"} disabled={disabled} onValueChange={(v) => onChange({ gradeName: v === "__all__" ? "" : v, classId: "" })}>
          <SelectTrigger><SelectValue placeholder={gradePlaceholder} /></SelectTrigger>
          <SelectContent>
            {allGradeLabel && <SelectItem value="__all__">{allGradeLabel}</SelectItem>}
            {grades.map((g) => (
              <SelectItem key={g.gradeName} value={g.gradeName}>{g.gradeName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={`space-y-1.5 ${className}`}>
        <Label>{sectionLabel}</Label>
        <Select value={classId || ""} disabled={disabled || !gradeName} onValueChange={(v) => onChange({ gradeName, classId: v })}>
          <SelectTrigger><SelectValue placeholder={sectionPlaceholder} /></SelectTrigger>
          <SelectContent>
            {showAll && <SelectItem value={ALL_SECTIONS}>الكل</SelectItem>}
            {sections.map((c) => (
              <SelectItem key={c.id} value={c.id}>{sectionOptionLabel(c)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}