import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { scopeTeachersBySchool, isPrincipalOnly, isSchoolSupervisor, isTeacher } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Plus, Send, Clock, Reply, Mail, MailOpen } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import NoteCreateDialog from "@/components/notes/NoteCreateDialog";
import { toast } from "sonner";

const TYPE_LABELS = { note: "ملاحظة", directive: "توجيه", warning: "تنبيه", praise: "شكر" };
const STATUS_LABELS = { open: "جديدة", read: "مقروءة", replied: "تم الرد", closed: "مغلقة" };

export default function Notes() {
  const qc = useQueryClient();
  const [selectedNote, setSelectedNote] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [replyText, setReplyText] = useState("");

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const { data: notes = [], isLoading } = useQuery({ queryKey: ["notes"], queryFn: () => base44.entities.Note.list("-created_date", 50) });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers"], queryFn: () => base44.entities.Teacher.list() });
  const { data: replies = [] } = useQuery({
    queryKey: ["note-replies", selectedNote?.id],
    queryFn: () => base44.entities.NoteReply.filter({ note_id: selectedNote.id }),
    enabled: !!selectedNote,
  });

  const scopedTeachers = useMemo(() => scopeTeachersBySchool(teachers, me), [teachers, me]);

  const myNotes = useMemo(() => {
    if (!me) return [];
    if (isTeacher(me)) return notes.filter((n) => n.recipient_id === me.id);
    if (isPrincipalOnly(me)) return notes.filter((n) => n.created_by_id === me.id || n.ministry_number === me?.ministry_number);
    if (isSchoolSupervisor(me)) return notes.filter((n) => n.ministry_number === me?.ministry_number);
    if (me.role === "admin") return notes;
    return [];
  }, [notes, me]);

  const unreadCount = useMemo(() => myNotes.filter((n) => !n.read_at && n.recipient_id === me?.id).length, [myNotes, me]);
  const canCreate = isPrincipalOnly(me);

  const markReadMutation = useMutation({
    mutationFn: (noteId) => base44.entities.Note.update(noteId, { read_at: new Date().toISOString(), status: "read" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });

  const openNote = (note) => {
    setSelectedNote(note);
    setReplyText("");
    if (!note.read_at && note.recipient_id === me?.id) {
      markReadMutation.mutate(note.id);
    }
  };

  const replyMutation = useMutation({
    mutationFn: (data) => base44.entities.NoteReply.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["note-replies", selectedNote.id] });
      base44.entities.Note.update(selectedNote.id, { status: "replied" }).then(() =>
        qc.invalidateQueries({ queryKey: ["notes"] })
      );
      setReplyText("");
      toast.success("تم إرسال الرد");
    },
  });

  const handleReply = () => {
    if (!replyText.trim() || !selectedNote) return;
    replyMutation.mutate({
      note_id: selectedNote.id,
      author_id: me.id,
      author_name: me.display_name || me.full_name || "",
      content: replyText.trim(),
      type: "reply",
      ministry_number: me.ministry_number || "",
      recipient_id: selectedNote.recipient_id,
    });
  };

  return (
    <div>
      <PageHeader
        title="الملاحظات"
        description={canCreate ? "إرسال ملاحظات للمعلمين ومتابعة الردود" : "ملاحظات وإحالات من إدارة المدرسة"}
        actions={canCreate && (
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> ملاحظة جديدة
          </Button>
        )}
      />

      {unreadCount > 0 && (
        <Badge className="mb-4 gap-1.5 bg-chart-2 text-white"><Mail className="w-3.5 h-3.5" /> {unreadCount} ملاحظة غير مقروءة</Badge>
      )}

      {isLoading ? (
        <p className="text-center text-muted-foreground py-10">جارٍ التحميل...</p>
      ) : myNotes.length === 0 ? (
        <EmptyState icon={MessageSquare} title="لا توجد ملاحظات" description={canCreate ? "ابدأ بإرسال ملاحظة لأحد المعلمين" : "ستظهر الملاحظات هنا عند استلامها"} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {myNotes.map((note) => (
            <Card key={note.id} className="hover:shadow-lg transition-all cursor-pointer" onClick={() => openNote(note)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-chart-2/10 flex items-center justify-center shrink-0">
                      {note.read_at ? <MailOpen className="h-4 w-4 text-chart-2" /> : <Mail className="h-4 w-4 text-chart-2" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{note.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {note.created_by_id === me?.id ? `إلى: ${note.recipient_name || "—"}` : `من: ${note.sender_name || "—"}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{TYPE_LABELS[note.type] || "ملاحظة"}</Badge>
                </div>
                {note.description && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{note.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  <Badge variant="secondary" className="text-[10px]">{STATUS_LABELS[note.status] || note.status}</Badge>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />{note.created_date ? new Date(note.created_date).toLocaleDateString("ar-SA") : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NoteCreateDialog open={showCreate} onOpenChange={setShowCreate} teachers={scopedTeachers} me={me} />

      <Dialog open={!!selectedNote} onOpenChange={(o) => !o && setSelectedNote(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {selectedNote?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{TYPE_LABELS[selectedNote?.type] || "ملاحظة"}</Badge>
              <Badge variant="secondary">{STATUS_LABELS[selectedNote?.status] || selectedNote?.status}</Badge>
              <span className="text-xs text-muted-foreground">من: {selectedNote?.sender_name || "—"}</span>
            </div>
            {selectedNote?.description && <p className="text-sm whitespace-pre-wrap">{selectedNote.description}</p>}
            {selectedNote?.attachments && /^https?:\/\//i.test(selectedNote.attachments) && (
              <a href={selectedNote.attachments} target="_blank" rel="noreferrer" className="text-sm text-primary underline">عرض المرفق</a>
            )}

            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><Reply className="w-4 h-4" /> الردود والمتابعة</p>
              {replies.length === 0 ? (
                <p className="text-xs text-muted-foreground">لا توجد ردود بعد</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {replies.map((r) => (
                    <div key={r.id} className="bg-muted/40 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{r.author_name || "—"}</span>
                        <span className="text-[10px] text-muted-foreground">{r.created_date ? new Date(r.created_date).toLocaleString("ar-SA") : ""}</span>
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{r.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">إضافة رد</Label>
              <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="اكتب ردك هنا..." rows={3} />
              <Button size="sm" onClick={handleReply} disabled={!replyText.trim() || replyMutation.isPending} className="gap-1.5">
                <Send className="w-3.5 h-3.5" /> إرسال الرد
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}