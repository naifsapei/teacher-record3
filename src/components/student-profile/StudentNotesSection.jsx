import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NotebookPen, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { ministryNumber } from "@/lib/permissions";

export default function StudentNotesSection({ studentId, classId }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [content, setContent] = useState("");

  const { data: notes = [] } = useQuery({
    queryKey: ["student-notes-daily", studentId],
    queryFn: () => base44.entities.StudentNote.filter({ student_id: studentId, type: "daily" }, "-date", 200),
    enabled: !!studentId,
  });

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.StudentNote.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-notes-daily", studentId] });
      setContent("");
      toast.success("تم حفظ الملاحظة");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StudentNote.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-notes-daily", studentId] }),
  });

  const handleAdd = () => {
    if (!content.trim()) { toast.error("اكتب الملاحظة أولًا"); return; }
    addMutation.mutate({
      student_id: studentId,
      class_id: classId || "",
      date: new Date().toISOString().slice(0, 10),
      type: "daily",
      content: content.trim(),
      ministry_number: ministryNumber(user),
    });
  };

  const sorted = [...notes].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <NotebookPen className="h-5 w-5 text-primary" /> الملاحظات اليومية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="اكتب ملاحظة يومية سريعة..."
            className="flex-1 min-h-[60px] resize-none"
          />
          <Button onClick={handleAdd} disabled={addMutation.isPending} className="sm:self-end gap-2">
            <Send className="h-4 w-4" />
            حفظ
          </Button>
        </div>

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">لا توجد ملاحظات يومية مسجلة بعد</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((n) => (
              <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/30 group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm whitespace-pre-wrap break-words">{n.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{n.date}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(n.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}