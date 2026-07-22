import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Archive as ArchiveIcon, Plus, Download, Trash2, Loader2, FileText, RotateCcw, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { buildSnapshot, exportArchivePDF } from "@/utils/archiveReport";
import { restoreArchive, purgeScope, archiveCounts } from "@/utils/archiveRestore";
import { toast } from "sonner";

const currentYear = () => {
  const y = new Date().getFullYear();
  return `${y}/${y + 1}`;
};

export default function Archives() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [year, setYear] = useState(currentYear());
  const [scope, setScope] = useState("full");
  const [classId, setClassId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportId, setReportId] = useState(null);
  const [purge, setPurge] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [purgeTarget, setPurgeTarget] = useState(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [purgeBusy, setPurgeBusy] = useState(false);

  const { data: archives = [] } = useQuery({
    queryKey: ["archives"],
    queryFn: () => base44.entities.AcademicArchive.list("-created_date"),
  });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: schoolArr = [] } = useQuery({ queryKey: ["school-info"], queryFn: () => base44.entities.SchoolInfo.list() });

  const reset = () => {
    setName(""); setYear(currentYear()); setScope("full"); setClassId(""); setNotes(""); setPurge(false);
  };

  const handleCreate = async () => {
    if (!year.trim()) { toast.error("أدخل العام الدراسي"); return; }
    if (scope === "class" && !classId) { toast.error("اختر الصف"); return; }
    setBusy(true);
    try {
      const data = await buildSnapshot({ scope, classId: scope === "class" ? classId : null });
      const finalName = name.trim() || (scope === "class"
        ? `أرشيف ${classes.find((c) => c.id === classId)?.name || ""} - ${year}`
        : `أرشيف المدرسة - ${year}`);
      await base44.entities.AcademicArchive.create({
        name: finalName,
        academic_year: year.trim(),
        scope,
        class_id: scope === "class" ? classId : null,
        data,
        notes: notes.trim() || null,
      });
      toast.success("تم إنشاء الأرشيف بنجاح");
      qc.invalidateQueries({ queryKey: ["archives"] });
      const justCreated = { scope, classId: scope === "class" ? classId : null, name: finalName, year: year.trim() };
      reset();
      setOpen(false);
      if (purge) {
        setPurgeTarget(justCreated);
      }
    } catch {
      toast.error("تعذّر إنشاء الأرشيف");
    }
    setBusy(false);
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setRestoreBusy(true);
    try {
      const counts = await restoreArchive(restoreTarget);
      toast.success(`تم استرجاع الأرشيف: ${counts.students} طالب، ${counts.subjects} مادة، ${counts.grades} درجة`);
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["grades"] });
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["classes"] });
      setRestoreTarget(null);
    } catch {
      toast.error("تعذّر استرجاع الأرشيف");
    }
    setRestoreBusy(false);
  };

  const handlePurge = async () => {
    if (!purgeTarget) return;
    setPurgeBusy(true);
    try {
      const res = await purgeScope({ scope: purgeTarget.scope, classId: purgeTarget.classId });
      toast.success(`تم تفريغ النظام: حُذف ${res.students} طالب وبياناتهم. النظام جاهز للفصل الجديد`);
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["grades"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["student-tracking"] });
      qc.invalidateQueries({ queryKey: ["student-achievements"] });
      setPurgeTarget(null);
    } catch {
      toast.error("تعذّر تفريغ النظام");
    }
    setPurgeBusy(false);
  };

  const handleReport = async (a) => {
    setReportId(a.id);
    try {
      await exportArchivePDF(a, schoolArr[0] || {});
      toast.success("تم إنشاء التقرير التاريخي");
    } catch {
      toast.error("تعذّر إنشاء التقرير");
    }
    setReportId(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.AcademicArchive.delete(id);
    qc.invalidateQueries({ queryKey: ["archives"] });
    toast.success("تم حذف الأرشيف");
  };

  const scopeLabel = (a) => a.scope === "class" ? classes.find((c) => c.id === a.class_id)?.name || "صف" : "المدرسة كاملة";

  return (
    <div>
      <PageHeader
        title="الأرشيف"
        description="أرشفة بيانات الطلاب والدرجات في نهاية العام الدراسي واستخراج تقارير تاريخية"
        actions={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> أرشفة عام دراسي
          </Button>
        }
      />

      <Card className="p-0">
        <div className="p-4 border-b">
          <h3 className="font-bold flex items-center gap-2"><ArchiveIcon className="h-4 w-4 text-primary" /> السجلات المؤرشفة</h3>
        </div>
        {archives.length === 0 ? (
          <EmptyState icon={ArchiveIcon} title="لا توجد أرشيفات" description="أنشئ أرشيفاً في نهاية العام الدراسي لحفظ بيانات الطلاب والدرجات واستخراج تقارير تاريخية لاحقاً" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم الأرشيف</TableHead>
                  <TableHead className="text-right">العام الدراسي</TableHead>
                  <TableHead className="text-right">النطاق</TableHead>
                  <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archives.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.academic_year}</TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{scopeLabel(a)}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(a.created_date).toLocaleDateString("ar")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" title="تقرير تاريخي PDF" onClick={() => handleReport(a)} disabled={reportId === a.id}>
                          {reportId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" title="استرجاع البيانات" onClick={() => setRestoreTarget(a)}>
                          <RotateCcw className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>أرشفة عام دراسي</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>اسم الأرشيف (اختياري)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="يُولّد تلقائياً إذا تُرك فارغاً" />
            </div>
            <div>
              <Label>العام الدراسي *</Label>
              <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="1446 / 1447هـ" />
            </div>
            <div>
              <Label>نطاق الأرشفة *</Label>
              <Select value={scope} onValueChange={(v) => { setScope(v); setClassId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">المدرسة كاملة</SelectItem>
                  <SelectItem value="class">صف محدد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope === "class" && (
              <div>
                <Label>الصف *</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger><SelectValue placeholder="اختر الصف" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="ملاحظات على الأرشيف..." />
            </div>
            <p className="text-xs text-muted-foreground">
              سيتم حفظ لقطة من بيانات الطلاب والدرجات والمواد الحالية للوصول إليها واستخراج تقارير تاريخية لاحقاً.
            </p>
            <label dir="rtl" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 cursor-pointer">
              <input type="checkbox" checked={purge} onChange={(e) => setPurge(e.target.checked)} className="mt-0.5" />
              <span className="text-xs text-right">
                <span className="font-semibold text-amber-800">تفريغ النظام بعد الأرشفة (للفصل الجديد)</span>
                <span className="block text-amber-700 mt-0.5">يحذف الطلاب ودرجاتهم وسجلات حضورهم ومتابعتهم بعد حفظ الأرشيف، ليبدأ الفصل الجديد بنظام فارغ. سيُطلب التأكيد لاحقًا.</span>
              </span>
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveIcon className="h-4 w-4" />}
              إنشاء الأرشيف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore confirmation */}
      <Dialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-primary" /> استرجاع بيانات الأرشيف</DialogTitle>
          </DialogHeader>
          {restoreTarget && (
            <div className="space-y-3">
              <p className="text-sm">سيتم استرجاع بيانات الأرشيف <b>{restoreTarget.name}</b> ({restoreTarget.academic_year}) وإضافتها كنسخة جديدة في النظام:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted p-2"><b>{archiveCounts(restoreTarget).students}</b> طالب</div>
                <div className="rounded-lg bg-muted p-2"><b>{archiveCounts(restoreTarget).subjects}</b> مادة</div>
                <div className="rounded-lg bg-muted p-2"><b>{archiveCounts(restoreTarget).classes}</b> صف</div>
                <div className="rounded-lg bg-muted p-2"><b>{archiveCounts(restoreTarget).grades}</b> درجة</div>
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-300 rounded-lg p-2">
                تنبيه: سيتم تجاهل السجلات الموجودة من نفس الاسم/الرقم الوزاري/الفصل، وسيتم إضافة ما يفتقد فقط. هذا يحافظ على البيانات الحالية ويمنع التكرار غير المقصود.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRestoreTarget(null)}>إلغاء</Button>
            <Button onClick={handleRestore} disabled={restoreBusy} className="gap-2">
              {restoreBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              استرجاع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purge confirmation */}
      <Dialog open={!!purgeTarget} onOpenChange={(o) => !o && setPurgeTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> تأكيد تفريغ النظام</DialogTitle>
          </DialogHeader>
          {purgeTarget && (
            <div className="space-y-3">
              <p className="text-sm">
                تم إنشاء الأرشيف <b>{purgeTarget.name}</b> بنجاح. هل تريد تفريغ النظام للفصل الجديد؟
              </p>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive space-y-1">
                <p className="font-semibold">سيتم حذف نهائي لكل ما يلي:</p>
                <ul className="list-disc pr-4 space-y-0.5">
                  <li>جميع {purgeTarget.scope === "class" ? "طلاب هذا الصف" : "الطلاب"}</li>
                  <li>درجات الطلاب وسجلات الحضور والانصراف</li>
                  <li>سجلات المتابعة والإنجازات والملاحظات والتحويلات</li>
                </ul>
                <p className="pt-1 font-semibold">تبقى بنية الصفوف والمواد والمعلمين محفوظة لاستخدامها في الفصل الجديد.</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPurgeTarget(null)}>لا، إبقاء البيانات</Button>
            <Button variant="destructive" onClick={handlePurge} disabled={purgeBusy} className="gap-2">
              {purgeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              نعم، افرغ النظام
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}