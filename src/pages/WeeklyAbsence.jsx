import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { startOfWeek, addDays, format, subWeeks } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarRange } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import ClassAbsenceChart from "@/components/absence/ClassAbsenceChart";
import GradeSectionSelect from "@/components/shared/GradeSectionSelect";
import { resolveClassIds } from "@/lib/classSections";
import { scopeBySchool } from "@/lib/permissions";

export default function WeeklyAbsence() {
  const [range, setRange] = useState("this");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const { data: rawAttendance = [], isLoading } = useQuery({
    queryKey: ["attendance"],
    queryFn: () => base44.entities.Attendance.list(),
  });
  const { data: rawClasses = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: rawStudents = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const attendance = useMemo(() => scopeBySchool(rawAttendance, me), [rawAttendance, me]);
  const classes = useMemo(() => scopeBySchool(rawClasses, me), [rawClasses, me]);
  const students = useMemo(() => scopeBySchool(rawStudents, me), [rawStudents, me]);

  const activeClassIds = useMemo(
    () => !selectedGrade ? classes.map((c) => c.id) : resolveClassIds(classes, selectedGrade, selectedClassId),
    [classes, selectedGrade, selectedClassId]
  );

  const { start, end, label } = useMemo(() => {
    const base = range === "last" ? subWeeks(new Date(), 1) : new Date();
    const s = startOfWeek(base, { weekStartsOn: 0 });
    return { start: s, end: addDays(s, 6), label: `${format(s, "yyyy-MM-dd")} → ${format(addDays(s, 6), "yyyy-MM-dd")}` };
  }, [range]);

  const weekRecords = useMemo(() => {
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    return attendance.filter((r) => r.date && r.date >= startStr && r.date <= endStr);
  }, [attendance, start, end]);

  const chartData = useMemo(() => {
    const studentClass = new Map(students.map((s) => [s.id, s.class_id]));
    return classes
      .filter((cls) => activeClassIds.includes(cls.id))
      .map((cls) => {
        const clsRecords = weekRecords.filter((r) => {
          const cid = r.class_id || studentClass.get(r.student_id);
          return cid === cls.id;
        });
        const total = clsRecords.length;
        const absent = clsRecords.filter((r) => r.status === "absent").length;
        const rate = total > 0 ? Math.round((absent / total) * 100) : 0;
        return { name: cls.name, الغياب: rate, total, absent, rate };
      })
      .filter((d) => d.total > 0);
  }, [classes, students, weekRecords]);

  return (
    <div>
      <PageHeader
        title="تقرير الغياب الأسبوعي"
        description="نسب غياب الطلاب في كل فصل للمتابعة الدقيقة"
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-40 gap-2">
              <CalendarRange className="h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this">هذا الأسبوع</SelectItem>
              <SelectItem value="last">الأسبوع الماضي</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <p className="text-sm text-muted-foreground mb-4">الفترة: {label}</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <GradeSectionSelect
          classes={classes}
          gradeName={selectedGrade}
          classId={selectedClassId}
          allGradeLabel="جميع الصفوف"
          onChange={({ gradeName: g, classId: c }) => { setSelectedGrade(g); setSelectedClassId(c); }}
          className="flex-1 min-w-[180px]"
        />
      </div>

      <ClassAbsenceChart data={chartData} />

      {chartData.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصف</TableHead>
                  <TableHead className="text-center">إجمالي السجلات</TableHead>
                  <TableHead className="text-center">الغياب</TableHead>
                  <TableHead className="text-center">نسبة الغياب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData
                  .slice()
                  .sort((a, b) => b.rate - a.rate)
                  .map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-center">{row.total}</TableCell>
                      <TableCell className="text-center text-destructive font-medium">{row.absent}</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${row.rate >= 25 ? "bg-destructive/10 text-destructive" : row.rate >= 10 ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-600"}`}>
                          {row.rate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        !isLoading && (
          <EmptyState
            icon={CalendarRange}
            title="لا توجد سجلات حضور"
            description="لم يُسجَّل حضور في الفترة المحددة"
          />
        )
      )}
    </div>
  );
}