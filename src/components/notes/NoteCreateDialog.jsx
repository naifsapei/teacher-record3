import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const TYPE_OPTIONS = [
  { value: "note", label: "ملاحظة" },
  { value: "directive", label: "توجيه" },
  { value: "warning", label: "تنبيه" },
  { value: "praise", label: "شكر وتقدير" },
];

export default function NoteCreateDialog({ open, onOpenChange, teachers, me }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("note");
  const [recipientId, setRecipientId] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");

  const eligible = (teachers || []).filter((t) => t.user_id);

  const reset = () => {
    setTitle(""); setDescription(""); setType("note"); setRecipientId(""); setAttachmentUrl("");
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Note.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      toast.success("تم إرسال الملاحظة");
      reset();
      onOpenChange(false);
    },
    onError: () => toast.error("تعذر إرسال الملاحظة"),
  });

  const handleSubmit = () => {
    if (!title.trim()) { toast.error("يرجى إدخال العنوان"); return; }
    if (!recipientId) { toast.error("يرجى اختيار المعلم"); return; }
    const teacher = eligible.find((t) => t.user_id === recipientId);
    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      type,
      sender_id: me?.id,
      sender_name: me?.display_name || me?.full_name || "",
      recipient_id: recipientId,
      recipient_name: teacher?.name || "",
      ministry_number: me?.ministry_number || "",
      attachments: attachmentUrl.trim() || undefined,
      status: "open",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>إرسال ملاحظة جديدة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>المعلم المستلم *</Label>
            <Select value={recipientId} onValueChange={setRecipientId}>
              <SelectTrigger><SelectValue placeholder="اختر المعلم" /></SelectTrigger>
              <SelectContent>
                {eligible.map((t) => (
                  <SelectItem key={t.id} value={t.user_id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {eligible.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">لا يوجد معلمون مرتبطون بحساب مستخدم بعد.</p>
            )}
          </div>
          <div>
            <Label>العنوان *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الملاحظة" />
          </div>
          <div>
            <Label>الوصف</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="تفاصيل الملاحظة" rows={4} />
          </div>
          <div>
            <Label>نوع الملاحظة</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>رابط مرفق (اختياري)</Label>
            <Input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "جارٍ الإرسال..." : "إرسال"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}