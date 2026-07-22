import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCircle, GraduationCap, BookOpen } from "lucide-react";

export default function TeacherSubjectsPanel({ teachers, subjects, classes }) {
  return (
    <div className="space-y-4">
      {teachers.map((teacher) => {
        const teacherSubjects = subjects.filter((s) => s.teacher_id === teacher.id);
        if (teacherSubjects.length === 0) return null;
        return (
          <Card key={teacher.id} className="border-r-4 border-r-chart-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-base">
                <div className="h-9 w-9 rounded-xl bg-chart-4/10 flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-chart-4" />
                </div>
                <div>
                  <p>{teacher.name}</p>
                  <p className="text-xs font-normal text-muted-foreground">
                    {teacherSubjects.length} {teacherSubjects.length === 1 ? "مادة" : "مواد"}
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {teacherSubjects.map((sub) => {
                  const cls = classes.find((c) => c.id === sub.class_id);
                  return (
                    <div key={sub.id} className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium leading-tight">{sub.name}</p>
                        {cls && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <BookOpen className="h-2.5 w-2.5" />
                            {cls.name}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Unassigned subjects */}
      {(() => {
        const unassigned = subjects.filter((s) => !s.teacher_id);
        if (unassigned.length === 0) return null;
        return (
          <Card className="border-r-4 border-r-muted-foreground/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-base text-muted-foreground">
                <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p>مواد غير مُعيَّنة</p>
                  <p className="text-xs font-normal">{unassigned.length} مادة بدون معلم</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {unassigned.map((sub) => {
                  const cls = classes.find((c) => c.id === sub.class_id);
                  return (
                    <div key={sub.id} className="flex items-center gap-2 bg-muted/50 border border-dashed border-border rounded-xl px-3 py-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium leading-tight text-muted-foreground">{sub.name}</p>
                        {cls && (
                          <p className="text-xs text-muted-foreground">{cls.name}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}