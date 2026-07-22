import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { Loader2, MessageSquare, Send, Clock, User, Printer, ArrowLeftRight, Undo2, ScrollText } from "lucide-react";
import { toast } from "sonner";
import {
  RECIPIENT_LABELS, REFERRAL_STATUS_LABELS, REFERRAL_STATUS_COLORS,
  buildReferralHTML, loadPieces,
} from "@/utils/referralReport";
import { renderHTMLToPDF } from "@/utils/reportLayout";
import { isStudentCounselor, isStudentAffairs, appRoleLabel } from "@/lib/permissions";
import { DISCIPLINARY_GROUPS, DISCIPLINARY_ACTION_LABEL } from "@/lib/disciplinaryActions";

const ROLE_LABELS = {
  student_counselor: "موجه طلابي",
  student_affairs: "وكيل شؤون الطلاب",
  teacher: "معلم",
  principal: "مدير مدرسة",
  admin: "مدير النظام",
};

const fmtDate = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" }); }
  catch { return d; }
};

export default function ReferralDetailDialog({ referral, open, onOpenChange }) {
  const qc = useQueryClient();
  const [directives, setDirectives] = useState("");
  const [notes, setNotes] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [disciplinaryAction, setDisciplinaryAction] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: responses = [], isLoading: loadingRes } = useQuery({
    queryKey: ["referral-responses", referral?.id],
    queryFn: () => base44.entities.ReferralResponse.filter({ referral_id: referral.id }),
    enabled: !!referral?.id,
  });

  if (!referral) return null;

  const student = students.find((s) => s.id === referral.student_id);
  const cls = classes.find((c) => c.id === referral.class_id);
  const subject = referral.subject_id ? subjects.find((s) => s.id === referral.subject_id) : null;
  const status = referral.status || "open";

  const isAffairs = !!me && referral.recipient === "student_affairs" && isStudentAffairs(me);
  const isCounselor = !!me && referral.recipient === "guidance_counselor" && isStudentCounselor(me);
  const canRespond = isAffairs || isCounselor;

  const sortedRes = [...responses].sort((a, b) => (a.created_date || "").localeCompare(b.created_date || ""));

  const createResponse = async (overrides = {}) => {
    await base44.entities.ReferralResponse.create({
      referral_id: referral.id,
      teacher_id: referral.created_by_id,
      author_id: me.id,
      author_name: me.display_name || me.full_name || me.email || "—",
      author_role: me.app_role || me.role || "",
      directives: directives.trim() || null,
      actions_taken: overrides.actions_taken ?? (disciplinaryAction ? DISCIPLINARY_ACTION_LABEL(disciplinaryAction) : null),
      notes: notes.trim() || null,
      recommendations: recommendations.trim() || null,
      new_status: overrides.new_status || "in_review",
      ministry_number: me?.ministry_number || "",
    });
  };

  const refreshAndClose = () => {
    qc.invalidateQueries({ queryKey: ["referral-responses", referral.id] });
    qc.invalidateQueries({ queryKey: ["referrals"] });
    qc.invalidateQueries({ queryKey: ["referral-responses-all"] });
    setDirectives(""); setNotes(""); setRecommendations(""); setDisciplinaryAction("");
    onOpenChange(false);
  };

  // مسار وكيل شؤون الطلاب: إعادة الإحالة للمعلم
  const handleReturnToTeacher = async () => {
    if (!disciplinaryAction) { toast.error("اختر الإجراء المتخذ أولاً"); return; }
    setBusy(true);
    try {
      await createResponse({ new_status: "resolved" });
      await base44.entities.StudentReferral.update(referral.id, { status: "resolved" });
      toast.success("تم إعادة الإحالة للمعلم بالإجراء المتخذ");
      refreshAndClose();
    } catch { toast.error("تعذّر إرسال الرد"); }
    setBusy(false);
  };

  // مسار وكيل شؤون الطلاب: طباعة تقرير الطالب بالإجراء المتخذ
  const handlePrintAction = async () => {
    if (!disciplinaryAction) { toast.error("اختر الإجراء المتخذ أولاً"); return; }
    setBusy(true);
    try {
      const pieces = await loadPieces({
        studentId: referral.student_id,
        classId: referral.class_id,
        subjectId: referral.subject_id,
        recipient: referral.recipient,
        violations: referral.violations ? referral.violations.split("، ").filter(Boolean) : [],
        notes: referral.notes,
        date: referral.date,
      });
      const html = buildReferralHTML({
        ...pieces,
        actionTaken: DISCIPLINARY_ACTION_LABEL(disciplinaryAction),
        actionNotes: directives.trim() || null,
        actionByLabel: "وكيل شؤون الطلاب",
      });
      await renderHTMLToPDF(html, `إجراء-${pieces.student?.name || "طالب"}.pdf`);
      toast.success("تم إنشاء تقرير الإجراء");
    } catch { toast.error("تعذّر إنشاء التقرير"); }
    setBusy(false);
  };

  // مسار وكيل شؤون الطلاب: تحويل للموجه الطلابي
  const handleForwardToCounselor = async () => {
    if (!disciplinaryAction) { toast.error("اختر الإجراء المتخذ أولاً"); return; }
    setBusy(true);
    try {
      const actionLabel = DISCIPLINARY_ACTION_LABEL(disciplinaryAction);
      await createResponse({
        new_status: "in_review",
        actions_taken: `تحويل إلى الموجه الطلابي — الإجراء: ${actionLabel}`,
      });
      await base44.entities.StudentReferral.update(referral.id, { recipient: "guidance_counselor", status: "in_review" });
      toast.success("تم تحويل الإحالة إلى الموجه الطلابي");
      refreshAndClose();
    } catch { toast.error("تعذّر التحويل"); }
    setBusy(false);
  };

  // مسار الموجه الطلابي: إرجاع الإحالة للوكيل
  const handleReturnToAffairs = async () => {
    setBusy(true);
    try {
      await createResponse({
        new_status: "in_review",
        actions_taken: "إرجاع الإحالة إلى وكيل شؤون الطلاب",
      });
      await base44.entities.StudentReferral.update(referral.id, { recipient: "student_affairs", status: "in_review" });
      toast.success("تم إرجاع الإحالة إلى وكيل شؤون الطلاب");
      refreshAndClose();
    } catch { toast.error("تعذّر الإرجاع"); }
    setBusy(false);
  };

  // مسار الموجه الطلابي: طباعة تقرير الإحالة
  const handlePrint = async () => {
    setBusy(true);
    try {
      const pieces = await loadPieces({
        studentId: referral.student_id,
        classId: referral.class_id,
        subjectId: referral.subject_id,
        recipient: referral.recipient,
        violations: referral.violations ? referral.violations.split("، ").filter(Boolean) : [],
        notes: referral.notes,
        date: referral.date,
      });
      const html = buildReferralHTML({
        ...pieces,
        actionTaken: recommendations.trim() || directives.trim() || null,
        actionByLabel: "الموجه الطلابي",
      });
      await renderHTMLToPDF(html, `تحويل-${pieces.student?.name || "طالب"}.pdf`);
      toast.success("تم إنشاء التقرير");
    } catch { toast.error("تعذّر إنشاء التقرير"); }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تفاصيل الإحالة</DialogTitle>
        </DialogHeader>

        {/* Referral info */}
        <div className="rounded-xl border bg-muted/20 p-4 space-y-2 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><b className="text-muted-foreground">الطالب:</b> {student?.name || "—"}</div>
            <div><b className="text-muted-foreground">الصف:</b> {cls?.name || "—"}</div>
            <div><b className="text-muted-foreground">المادة:</b> {subject?.name || "—"}</div>
            <div><b className="text-muted-foreground">التاريخ:</b> {referral.date || "—"}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {RECIPIENT_LABELS[referral.recipient] || "—"}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${REFERRAL_STATUS_COLORS[status] || "bg-gray-100 text-gray-600"}`}>
              {REFERRAL_STATUS_LABELS[status] || "مفتوحة"}
            </span>
          </div>
          {referral.violations && (
            <div><b className="text-muted-foreground">المخالفات:</b> {referral.violations}</div>
          )}
          {referral.notes && (
            <div><b className="text-muted-foreground">ملاحظات المعلم:</b> {referral.notes}</div>
          )}
        </div>

        {/* Responses timeline */}
        <div>
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> الردود والإجراءات
          </h4>
          {loadingRes ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : sortedRes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد ردود بعد</p>
          ) : (
            <div className="space-y-3">
              {sortedRes.map((res) => (
                <div key={res.id} className="rounded-lg border bg-card p-3 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="font-medium">{res.author_name || "—"}</span>
                        <span className="text-xs text-muted-foreground mr-2">
                          {ROLE_LABELS[res.author_role] || appRoleLabel({ app_role: res.author_role }) || ""}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {fmtDate(res.created_date)}
                    </span>
                  </div>
                  {res.directives && (
                    <div className="bg-blue-50 border-r-2 border-blue-300 px-3 py-1.5 rounded text-xs">
                      <b>التوجيهات:</b> {res.directives}
                    </div>
                  )}
                  {res.actions_taken && (
                    <div className="bg-amber-50 border-r-2 border-amber-300 px-3 py-1.5 rounded text-xs">
                      <b>الإجراءات المتخذة:</b> {res.actions_taken}
                    </div>
                  )}
                  {res.notes && (
                    <div className="bg-muted/30 px-3 py-1.5 rounded text-xs">
                      <b>ملاحظات:</b> {res.notes}
                    </div>
                  )}
                  {res.recommendations && (
                    <div className="bg-green-50 border-r-2 border-green-300 px-3 py-1.5 rounded text-xs">
                      <b>التوصيات:</b> {res.recommendations}
                    </div>
                  )}
                  {res.new_status && (
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${REFERRAL_STATUS_COLORS[res.new_status] || ""}`}>
                      → {REFERRAL_STATUS_LABELS[res.new_status] || ""}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Response form — student affairs agent */}
        {isAffairs && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" /> الإجراء المتخذ وفق لائحة تنظيم السلوك والمواظبة
            </h4>
            <div>
              <Label>اختر الإجراء المناسب *</Label>
              <Select value={disciplinaryAction} onValueChange={setDisciplinaryAction}>
                <SelectTrigger><SelectValue placeholder="اختر الإجراء وفق لائحة السلوك" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DISCIPLINARY_GROUPS).map(([level, items]) => (
                    <SelectGroup key={level}>
                      <SelectLabel>{level}</SelectLabel>
                      {items.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>التوجيهات / ملاحظات الإجراء</Label>
              <Textarea value={directives} onChange={(e) => setDirectives(e.target.value)} rows={2} placeholder="تفاصيل الإجراء وتوجيهات ولي الأمر / الطالب..." />
            </div>
            <div>
              <Label>ملاحظات إضافية</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="ملاحظات إضافية..." />
            </div>
          </div>
        )}

        {/* Response form — guidance counselor */}
        {isCounselor && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" /> رد الموجه الطلابي
            </h4>
            <div>
              <Label>التوجيهات والتوصيات</Label>
              <Textarea value={directives} onChange={(e) => setDirectives(e.target.value)} rows={2} placeholder="توجيهات وإرشادات للطالب..." />
            </div>
            <div>
              <Label>التوصيات للوكيل</Label>
              <Textarea value={recommendations} onChange={(e) => setRecommendations(e.target.value)} rows={2} placeholder="التوصيات المقترحة لوكيل شؤون الطلاب..." />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="ملاحظات إضافية..." />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إغلاق</Button>
          {isAffairs && (
            <>
              <Button variant="secondary" onClick={handlePrintAction} disabled={busy} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                طباعة تقرير بالإجراء
              </Button>
              <Button variant="outline" onClick={handleForwardToCounselor} disabled={busy} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
                تحويل للموجه الطلابي
              </Button>
              <Button onClick={handleReturnToTeacher} disabled={busy} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                إعادة للمعلم
              </Button>
            </>
          )}
          {isCounselor && (
            <>
              <Button variant="secondary" onClick={handlePrint} disabled={busy} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                طباعة
              </Button>
              <Button onClick={handleReturnToAffairs} disabled={busy} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                إرجاع للوكيل
              </Button>
            </>
          )}
          {!canRespond && (
            <span className="text-xs text-muted-foreground self-center">لا يمكنك الرد على هذه الإحالة</span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}