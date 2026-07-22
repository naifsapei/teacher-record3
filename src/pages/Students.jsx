import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Plus, Pencil, Trash2, FileSpreadsheet, Search, Users, FileText, Check, X } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import BriefStudentReport from "@/components/students/BriefStudentReport";
import PullToRefresh from "@/components/shared/PullToRefresh";
import QuickAttendanceToggle from "@/components/attendance/QuickAttendanceToggle";
import { useQuickAttendance } from "@/hooks/useQuickAttendance";
import { toast } from "sonner";
import { semesterLabel } from "@/lib/terminology";
import GradeSectionSelect from "@/components/shared/GradeSectionSelect";
import { resolveClassIds } from "@/lib/classSections";
import { ministryNumber, canManageAcademicData } from "@/lib/permissions";
import { useAuth } from "@/lib/AuthContext";
import { Navigate } from "react-router-dom";

function StudentsContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", student_number: "", class_id: "", semester: "first" });
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkClassId, setBulkClassId] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [reportStudent, setReportStudent] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userMinistryNumber = ministryNumber(user) || "";

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list(),
  });
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: () => base44.entities.Class.list(),
  });

  const activeClassIds = !selectedGrade ? classes.map((c) => c.id) : resolveClassIds(classes, selectedGrade, selectedClassId);
  const specificClassId = selectedClassId && selectedClassId !== "all" ? selectedClassId : "";
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => base44.entities.Subject.list(),
  });

  const attendanceHook = useQuickAttendance(specificClassId || null);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Student.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      closeDialog();
      toast.success("تم إضافة الطالب بنجاح");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Student.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      closeDialog();
      toast.success("تم تحديث بيانات الطالب");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // defense-in-depth: لا يُسمح بالحذف إلا لطالب ضمن قائمة المستخدم وينتمي لمدرسته
      const target = students.find((s) => s.id === id);
      if (!target) throw new Error("لا يمكن حذف طالب غير متاح لك");
      if (userMinistryNumber && target.ministry_number && target.ministry_number !== userMinistryNumber) {
        throw new Error("لا يمكنك حذف طالب من مدرسة أخرى");
      }
      return base44.entities.Student.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("تم حذف الطالب");
    },
    onError: (err) => toast.error(err.message || "تعذّر حذف الطالب"),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm({ name: "", student_number: "", class_id: "", semester: "first" });
  };

  const openEdit = (student) => {
    setEditing(student);
    setForm({ name: student.name, student_number: student.student_number || "", class_id: student.class_id || "", semester: student.semester || "first" });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.class_id) return;
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate({ ...form, ministry_number: userMinistryNumber });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          students: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "اسم الطالب" },
                student_number: { type: "string", description: "رقم الطالب" },
                grade_level: { type: "string", description: "الصف الدراسي (مثال: الأول الثانوي، الثاني المتوسط)" },
                class_name: { type: "string", description: "الصف/الشعبة (مثال: 1ث، أ، 2/1)" },
              },
            },
          },
        },
      },
    });

    if (result.status === "success" && result.output?.students) {
      // مطابقة كل طالب بالصف المناسب بناءً على الصف والشعبة، وإنشاء الصفوف المفقودة تلقائياً
      const classMap = new Map();
      classes.forEach((c) => classMap.set(`${c.grade_level || ""}|${c.name}`, c));

      const toCreateClasses = [];
      const studentsData = [];
      let defaultClassId = specificClassId || classes[0]?.id;

      for (const s of result.output.students) {
        const grade = (s.grade_level || "").trim();
        const className = (s.class_name || "").trim();
        let classId = null;

        if (grade || className) {
          const key = `${grade}|${className}`;
          const existing = classMap.get(key);
          if (existing) {
            classId = existing.id;
          } else {
            const newClass = await base44.entities.Class.create({
              name: className || grade || "فصل جديد",
              grade_level: grade,
              ministry_number: userMinistryNumber,
            });
            classMap.set(key, newClass);
            classId = newClass.id;
          }
        } else if (defaultClassId) {
          classId = defaultClassId;
        }

        if (!classId) {
          toast.error("يرجى إنشاء صف أولاً أو تضمين عمود الصف/الشعبة في الملف");
          setImporting(false);
          return;
        }

        studentsData.push({
          name: s.name,
          student_number: s.student_number || "",
          class_id: classId,
          ministry_number: userMinistryNumber,
        });
      }

      await base44.entities.Student.bulkCreate(studentsData);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success(`تم استيراد ${studentsData.length} طالب بنجاح`);
    } else {
      toast.error("فشل في استيراد البيانات");
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filtered = students
    .filter((s) => activeClassIds.includes(s.class_id))
    .filter((s) => s.name.includes(search) || (s.student_number || "").includes(search));

  const getClassName = (id) => classes.find((c) => c.id === id)?.name || "";

  const handleBulkAdd = async () => {
    if (!bulkText.trim() || !bulkClassId) return;
    setBulkLoading(true);
    const names = bulkText
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (names.length === 0) { setBulkLoading(false); return; }
    const data = names.map((name) => ({ name, class_id: bulkClassId, student_number: "", semester: "first", ministry_number: userMinistryNumber }));
    await base44.entities.Student.bulkCreate(data);
    queryClient.invalidateQueries({ queryKey: ["students"] });
    toast.success(`تم إضافة ${names.length} طالب بنجاح`);
    setBulkText("");
    setBulkClassId("");
    setBulkLoading(false);
    setBulkDialogOpen(false);
  };

  return (
    <PullToRefresh onRefresh={() => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["students"] }),
      queryClient.invalidateQueries({ queryKey: ["classes"] }),
      queryClient.invalidateQueries({ queryKey: ["subjects"] }),
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] }),
    ])}>
    <div>
      <PageHeader
        title="الطلاب"
        description="إدارة بيانات الطلاب واستيرادها"
        actions={
          <div className="flex gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {importing ? "جاري الاستيراد..." : "استيراد الطلاب"}
            </Button>
            <Button variant="outline" onClick={() => setBulkDialogOpen(true)} className="gap-2">
              <Users className="h-4 w-4" />
              إضافة دفعة
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة طالب
            </Button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الرقم..."
            className="pr-10"
          />
        </div>
        <GradeSectionSelect
          classes={classes}
          gradeName={selectedGrade}
          classId={selectedClassId}
          allGradeLabel="جميع الصفوف"
          onChange={({ gradeName: g, classId: c }) => { setSelectedGrade(g); setSelectedClassId(c); }}
          className="w-full sm:w-48"
        />
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center gap-3 mb-4 text-xs">
          <span className="text-muted-foreground">تسجيل سريع ليوم {new Date().toLocaleDateString("ar-SA")}:</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
            <Check className="h-3.5 w-3.5" /> حاضر {attendanceHook.presentCount}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-semibold border border-red-200">
            <X className="h-3.5 w-3.5" /> غائب {attendanceHook.absentCount}
          </span>
        </div>
      )}

      {filtered.length === 0 && !isLoading ? (
        <EmptyState
          icon={ClipboardList}
          title="لا يوجد طلاب"
          description="أضف طلاباً يدوياً أو استورد أسماء الطلاب من نظام نور"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">رقم الطالب</TableHead>
                    <TableHead className="text-right">الصف</TableHead>
                    <TableHead className="text-right">الفصل الدراسي</TableHead>
                    <TableHead className="text-center">حضور اليوم</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((student, i) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{i + 1}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.student_number || "—"}</TableCell>
                      <TableCell>{getClassName(student.class_id)}</TableCell>
                      <TableCell>{semesterLabel(student.semester)}</TableCell>
                      <TableCell>
                        <QuickAttendanceToggle
                          studentId={student.id}
                          classId={student.class_id}
                          record={attendanceHook.getRecord(student.id)}
                          onToggle={attendanceHook.toggle}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="تقرير مختصر" onClick={() => setReportStudent(student)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(student)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(student.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <BriefStudentReport
        student={reportStudent}
        open={!!reportStudent}
        onOpenChange={(o) => { if (!o) setReportStudent(null); }}
        classes={classes}
        subjects={subjects}
      />

      {/* Single student dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الطالب" : "إضافة طالب جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>اسم الطالب *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم الطالب الكامل" />
            </div>
            <div>
              <Label>رقم الطالب</Label>
              <Input value={form.student_number} onChange={(e) => setForm({ ...form, student_number: e.target.value })} placeholder="رقم تعريف الطالب" />
            </div>
            <div>
              <Label>الصف / الشعبة *</Label>
              <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الصف/الشعبة" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الفصل الدراسي *</Label>
              <Select value={form.semester || "first"} onValueChange={(v) => setForm({ ...form, semester: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الفصل الدراسي" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">الفصل الدراسي الأول</SelectItem>
                  <SelectItem value="second">الفصل الدراسي الثاني</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={!form.name.trim() || !form.class_id}>
              {editing ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk add dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              إضافة طلاب دفعة واحدة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>الصف / الشعبة *</Label>
              <Select value={bulkClassId} onValueChange={setBulkClassId}>
                <SelectTrigger><SelectValue placeholder="اختر الصف/الشعبة" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>أسماء الطلاب *</Label>
              <p className="text-xs text-muted-foreground mb-1">اكتب اسماً في كل سطر، سيتم إضافة جميع الأسماء دفعة واحدة</p>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"أحمد محمد\nسارة علي\nخالد عبدالله\n..."}
                className="h-48 font-arabic text-sm leading-7"
                dir="rtl"
              />
              {bulkText.trim() && (
                <p className="text-xs text-primary mt-1">
                  سيتم إضافة {bulkText.split("\n").filter((n) => n.trim()).length} طالب
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkDialogOpen(false); setBulkText(""); setBulkClassId(""); }}>إلغاء</Button>
            <Button
              onClick={handleBulkAdd}
              disabled={!bulkText.trim() || !bulkClassId || bulkLoading}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              {bulkLoading ? "جاري الإضافة..." : "إضافة الجميع"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PullToRefresh>
  );
}

export default function Students() {
  const { user } = useAuth();
  if (user && !canManageAcademicData(user)) {
    return <Navigate to="/" replace />;
  }
  return <StudentsContent />;
}