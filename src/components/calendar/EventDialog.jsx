import { useState, useEffect } from "react";
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
import { Trash2 } from "lucide-react";

const EMPTY = { title: "", type: "exam", date: "", class_id: "none", subject_id: "none", notes: "" };

export default function EventDialog({ open, onOpenChange, event, defaultDate, classes, subjects, onSave, onDelete }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) {
      if (event) {
        setForm({
          title: event.title || "",
          type: event.type || "exam",
          date: event.date || "",
          class_id: event.class_id || "none",
          subject_id: event.subject_id || "none",
          notes: event.notes || "",
        });
      } else {
        setForm({ ...EMPTY, date: defaultDate || "" });
      }
    }
  }, [open, event, defaultDate]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    const payload = {
      title: form.title.trim(),
      type: form.type,
      date: form.date,
      class_id: form.class_id === "none" ? null : form.class_id,
      subject_id: form.subject_id === "none" ? null : form.subject_id,
      notes: form.notes.trim() || null,
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? "تعديل الحدث" : "إضافة حدث جديد"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>العنوان *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="مثال: اختبار الفصل الأول" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>النوع *</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exam">اختبار</SelectItem>
                  <SelectItem value="assignment">تسليم مهمة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>التاريخ *</Label>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الصف</Label>
              <Select value={form.class_id} onValueChange={(v) => set("class_id", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— عام —</SelectItem>
                  {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المادة</Label>
              <Select value={form.subject_id} onValueChange={(v) => set("subject_id", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— عام —</SelectItem>
                  {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>ملاحظات</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="تفاصيل إضافية..." />
          </div>

          <DialogFooter className="gap-2">
            {event && (
              <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(event)}>
                <Trash2 className="h-4 w-4" /> حذف
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit" disabled={!form.title.trim() || !form.date}>حفظ</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}