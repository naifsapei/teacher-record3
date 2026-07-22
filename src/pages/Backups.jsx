import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Database, Plus, Download, Trash2, Shield, RefreshCw, Upload } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { isAutoBackup } from "@/components/AutoBackup";
import { toast } from "sonner";
import { format } from "date-fns";
import { importBackupData } from "@/utils/backupImport";

export default function Backups() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: backups = [], isLoading } = useQuery({
    queryKey: ["backups"],
    queryFn: () => base44.entities.Backup.list("-created_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Backup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      toast.success("تم حذف النسخة الاحتياطية");
    },
  });

  const createBackup = async () => {
    if (!name.trim()) return;
    setCreating(true);

    try {
      const [classes, students, subjects, grades, teachers, attendance] = await Promise.all([
        base44.entities.Class.list(),
        base44.entities.Student.list(),
        base44.entities.Subject.list(),
        base44.entities.Grade.list(),
        base44.entities.Teacher.list(),
        base44.entities.Attendance.list(),
      ]);

      const backupData = JSON.stringify({ classes, students, subjects, grades, teachers, attendance });
      await base44.entities.Backup.create({
        name,
        data: backupData,
        type: "full",
      });

      queryClient.invalidateQueries({ queryKey: ["backups"] });
      setDialogOpen(false);
      setName("");
      toast.success("تم إنشاء النسخة الاحتياطية بنجاح");
    } catch (error) {
      toast.error(error?.message || "تعذر إنشاء النسخة الاحتياطية");
    } finally {
      setCreating(false);
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
      setImportText(JSON.stringify(payload, null, 2));
      setImportFileName(file.name);
      toast.success("تم قراءة الملف بنجاح، يمكنك استيراده الآن");
    } catch (error) {
      toast.error(error?.message || "تعذر قراءة الملف");
    } finally {
      setImporting(false);
    }
  };

  const importBackup = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const parsed = JSON.parse(importText);
      const result = await importBackupData(parsed);
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(`تم استيراد البيانات بنجاح: ${result.classes} صفوف، ${result.students} طالب، ${result.grades} درجة`);
      setImportOpen(false);
      setImportText("");
      setImportFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast.error(error?.message || "تعذر استيراد النسخة الاحتياطية");
    } finally {
      setImporting(false);
    }
  };

  const downloadBackup = (backup) => {
    const blob = new Blob([backup.data || "{}"], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `backup_${backup.name}.json`;
    link.click();
    toast.success("تم تحميل النسخة الاحتياطية");
  };

  return (
    <div>
      <PageHeader
        title="النسخ الاحتياطية"
        description="إدارة وحفظ نسخ احتياطية من البيانات — يتم إنشاء نسخة تلقائية أسبوعيًا للدرجات والطلاب"
        actions={
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            نسخة احتياطية جديدة
          </Button>
        }
      />

      {backups.length === 0 && !isLoading ? (
        <EmptyState
          icon={Database}
          title="لا توجد نسخ احتياطية"
          description="أنشئ نسخة احتياطية لحفظ بياناتك"
          action={
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              إنشاء نسخة
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {backups.map((backup) => (
            <Card key={backup.id} className="group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{backup.name}</h3>
                        {isAutoBackup(backup) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            <RefreshCw className="h-2.5 w-2.5" /> تلقائية
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {backup.created_date && format(new Date(backup.created_date), "yyyy/MM/dd - HH:mm")}
                      </p>
                      <p className="text-xs text-muted-foreground">نسخة كاملة</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => downloadBackup(backup)}>
                    <Download className="h-3 w-3" />
                    تحميل
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(backup.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء نسخة احتياطية</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>اسم النسخة الاحتياطية</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: نسخة نهاية الفصل الأول"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={createBackup} disabled={!name.trim() || creating}>
              {creating ? "جاري الإنشاء..." : "إنشاء النسخة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>استيراد نسخة احتياطية</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>اختر ملف النسخة الاحتياطية</Label>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="block w-full text-sm" />
            {importFileName && <p className="text-xs text-muted-foreground">الملف: {importFileName}</p>}
            <Label>المحتوى</Label>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={10} className="w-full rounded-md border border-input bg-background p-3 text-sm" placeholder="سيظهر JSON هنا بعد اختيار الملف" />
            <p className="text-xs text-muted-foreground">سيتم استيراد البيانات دون حذف السجلات الحالية أو تكرارها، وسيتم تجاهل السجلات المتطابقة.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>إلغاء</Button>
            <Button onClick={importBackup} disabled={importing || !importText.trim()}>
              {importing ? "جاري الاستيراد..." : "استيراد البيانات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}