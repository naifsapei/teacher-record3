import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { Download, Save, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { buildReferralHTML, RECIPIENT_LABELS } from "@/utils/referralReport";
import { renderHTMLToPDF } from "@/utils/reportLayout";
import { resolveSchool, reportSourceInfo, subscriberTitle } from "@/lib/permissions";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function ReferralForm({ open, onOpenChange, onSaved }) {
  const qc = useQueryClient();
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [recipient, setRecipient] = useState("guidance_counselor");
  const [selected, setSelected] = useState([]);
  const [customViolation, setCustomViolation] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayStr());
  const [busy, setBusy] = useState(false);

  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: tracking = [] } = useQuery({
    queryKey: ["tracking", studentId],
    queryFn: () => base44.entities.TrackingRecord.filter({ student_id: studentId }),
    enabled: !!studentId,
  });
  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance", studentId],
    queryFn: () => base44.entities.Attendance.filter({ student_id: studentId }),
    enabled: !!studentId,
  });
  const { data: achievements = [] } = useQuery({
    queryKey: ["achievements", studentId],
    queryFn: () => base44.entities.Achievement.filter({ student_id: studentId }),
    enabled: !!studentId,
  });
  const { data: grades = [] } = useQuery({
    queryKey: ["grades", studentId],
    queryFn: () => base44.entities.Grade.filter({ student_id: studentId }),
    enabled: !!studentId,
  });
  const { data: schoolArr = [] } = useQuery({ queryKey: ["school-info"], queryFn: () => base44.entities.SchoolInfo.list() });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });

  const classStudents = useMemo(() => students.filter((s) => s.class_id === classId), [students, classId]);
  const classSubjects = useMemo(() => subjects.filter((s) => s.class_id === classId), [subjects, classId]);

  const student = students.find((s) => s.id === studentId);
  const cls = classes.find((c) => c.id === classId);
  const subject = subjects.find((s) => s.id === subjectId);

  // violation options from student's negative tracking records
  const violationOptions = useMemo(() => {
    const neg = tracking.filter((t) => t.category === "negative" || (t.points ?? 0) < 0);
    return [...new Set(neg.map((t) => t.action_label).filter(Boolean))];
  }, [tracking]);

  const attSummary = useMemo(() => {
    const s = { present: 0, absent: 0, late: 0, excused: 0 };
    attendance.forEach((a) => { s[a.status] = (s[a.status] || 0) + 1; });
    return s;
  }, [attendance]);

  const reset = () => {
    setClassId(""); setSubjectId(""); setStudentId(""); setRecipient("guidance_counselor");
    setSelected([]); setCustomViolation(""); setNotes(""); setDate(todayStr());
  };

  const toggleViolation = (v) =>
    setSelected((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  const addCustom = () => {
    const v = customViolation.trim();
    if (!v) return;
    if (!selected.includes(v)) setSelected((cur) => [...cur, v]);
    setCustomViolation("");
  };

  const pieces = () => {
    const school = resolveSchool(me, schoolArr[0] || {});
    const src = reportSourceInfo(me, school);
    return {
      student, cls, subject, recipient, violations: selected, notes, date,
      trackingRecords: tracking, attendance, achievements,
      gradeRow: subject ? grades.find((g) => g.subject_id === subject.id) : null,
      school,
      teacherName: src.sourceName || me?.full_name,
      teacherTitle: subscriberTitle(me),
      principalOnly: src.isPrincipalSource,
      sourceLabel: src.sourceLabel,
      sourceName: src.sourceName,
      principalName: src.principalName,
      principalTitle: src.principalTitle,
    };
  };

  const handlePDF = async () => {
    if (!studentId || !classId) { toast.error("اختر الصف والطالب أولاً"); return; }
    setBusy(true);
    try {
      const html = buildReferralHTML(pieces());
      await renderHTMLToPDF(html, `تحويل-${student?.name || "طالب"}.pdf`);
      toast.success("تم إنشاء ملف PDF");
    } catch {
      toast.error("تعذّر إنشاء الملف");
    }
    setBusy(false);
  };

  const handleSave = async () => {
    if (!studentId || !classId || !recipient) { toast.error("يرجى إكمال الحقول المطلوبة"); return; }
    setBusy(true);
    try {
      await base44.entities.StudentReferral.create({
        student_id: studentId,
        class_id: classId,
        subject_id: subjectId || null,
        recipient,
        violations: selected.join("، "),
        notes: notes.trim() || null,
        date,
        status: "open",
        ministry_number: me?.ministry_number || "",
      });
      toast.success("تم حفظ سجل التحويل");
      qc.invalidateQueries({ queryKey: ["referrals"] });
      onSaved?.();
      reset();
      onOpenChange(false);
    } catch {
      toast.error("تعذّر حفظ السجل");
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تحويل طالب</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>الصف الدراسي *</Label>
            <Select value={classId} onValueChange={(v) => { setClassId(v); setStudentId(""); setSubjectId(""); }}>
              <SelectTrigger><SelectValue placeholder="اختر الصف" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>المادة الدراسية</Label>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={!classId}>
              <SelectTrigger><SelectValue placeholder="اختر المادة" /></SelectTrigger>
              <SelectContent>
                {classSubjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>اسم الطالب *</Label>
            <Select value={studentId} onValueChange={setStudentId} disabled={!classId}>
              <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
              <SelectContent>
                {classStudents.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>الجهة المحوّل إليها *</Label>
            <Select value={recipient} onValueChange={setRecipient}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="guidance_counselor">الموجه الطلابي</SelectItem>
                <SelectItem value="student_affairs">وكيل شؤون الطلاب</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>تاريخ التحويل *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {/* Violations */}
        <div className="mt-2">
          <Label>نوع المخالفة / المخالفات</Label>
          <p className="text-xs text-muted-foreground mb-2">مُجمّعة من سجل المتابعة للطالب — اختر ما يناسب أو أضف يدوياً.</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {violationOptions.length === 0 && studentId && (
              <span className="text-xs text-muted-foreground">لا توجد مخالفات مرصودة سابقاً.</span>
            )}
            {violationOptions.map((v) => {
              const on = selected.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleViolation(v)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${on ? "bg-red-100 text-red-700 border-red-300" : "bg-muted/40 text-muted-foreground border-border"}`}
                >
                  {v}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input
              value={customViolation}
              onChange={(e) => setCustomViolation(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
              placeholder="إضافة مخالفة أخرى..."
            />
            <Button type="button" variant="outline" size="icon" onClick={addCustom}><Plus className="h-4 w-4" /></Button>
          </div>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selected.map((v) => (
                <span key={v} className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                  {v}
                  <button type="button" onClick={() => toggleViolation(v)}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Student data preview */}
        {studentId && (
          <div className="rounded-xl border bg-muted/20 p-3 mt-2 space-y-2 text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span><b>الحضور:</b> {attSummary.present}</span>
              <span><b>الغياب:</b> {attSummary.absent}</span>
              <span><b>التأخر:</b> {attSummary.late}</span>
              <span><b>المعذور:</b> {attSummary.excused}</span>
              <span><b>سجلات المتابعة:</b> {tracking.length}</span>
              <span><b>المهارات:</b> {achievements.filter((a) => a.type === "skill").length}</span>
            </div>
            {tracking.length > 0 && (
              <div className="text-xs text-muted-foreground">
                آخر سجل: {tracking[tracking.length - 1]?.date} — {tracking[tracking.length - 1]?.action_label}
              </div>
            )}
          </div>
        )}

        <div>
          <Label>ملاحظات إضافية</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="ملاحظات للجهة المحوّل إليها..." />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button variant="secondary" onClick={handlePDF} disabled={busy || !studentId} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            إنشاء PDF
          </Button>
          <Button onClick={handleSave} disabled={busy || !studentId || !classId} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ التحويل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}