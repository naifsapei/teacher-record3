import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send, Download, Trash2, Loader2, FileText, Eye } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import ReferralForm from "@/components/referrals/ReferralForm";
import ReferralDetailDialog from "@/components/referrals/ReferralDetailDialog";
import {
  RECIPIENT_LABELS, REFERRAL_STATUS_LABELS, REFERRAL_STATUS_COLORS, loadPieces, exportReferralPDF,
} from "@/utils/referralReport";
import { isAdmin, isTeacher, isStudentCounselor, isStudentAffairs } from "@/lib/permissions";
import { toast } from "sonner";

export default function Actions() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [detailReferral, setDetailReferral] = useState(null);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const { data: referrals = [] } = useQuery({
    queryKey: ["referrals"],
    queryFn: () => base44.entities.StudentReferral.list("-created_date"),
  });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => base44.entities.Student.list() });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });
  const { data: allResponses = [] } = useQuery({
    queryKey: ["referral-responses-all"],
    queryFn: () => base44.entities.ReferralResponse.list("-created_date"),
  });

  const nameOf = (list, id) => list.find((x) => x.id === id)?.name || "—";
  const canCreate = isAdmin(me) || isTeacher(me);

  const visibleReferrals = useMemo(() => {
    if (!me) return [];
    if (isAdmin(me)) return referrals;
    if (isStudentCounselor(me)) return referrals.filter((r) => r.recipient === "guidance_counselor");
    if (isStudentAffairs(me)) return referrals.filter((r) => r.recipient === "student_affairs");
    if (isTeacher(me)) return referrals.filter((r) => r.created_by_id === me.id);
    return referrals;
  }, [referrals, me]);

  const responseCountFor = (id) => allResponses.filter((r) => r.referral_id === id).length;

  const pageDesc = canCreate
    ? "إجراءات طلابية رسمية — تحويل الطالب إلى الموجه الطلابي أو وكيل شؤون الطلاب"
    : "الإحالات المستلمة من المعلمين — عرض التوجيهات والإجراءات والردود";

  const handleReexport = async (r) => {
    setBusyId(r.id);
    try {
      const pieces = await loadPieces({
        studentId: r.student_id,
        classId: r.class_id,
        subjectId: r.subject_id,
        recipient: r.recipient,
        violations: r.violations ? r.violations.split("، ").filter(Boolean) : [],
        notes: r.notes,
        date: r.date,
      });
      await exportReferralPDF(pieces, `تحويل-${nameOf(students, r.student_id)}.pdf`);
      toast.success("تم إعادة تصدير التقرير");
    } catch {
      toast.error("تعذّر تصدير التقرير");
    }
    setBusyId(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.StudentReferral.delete(id);
    qc.invalidateQueries({ queryKey: ["referrals"] });
    toast.success("تم حذف السجل");
  };

  return (
    <div>
      <PageHeader
        title="الإجراءات"
        description={pageDesc}
        actions={
          canCreate ? (
            <Button onClick={() => setFormOpen(true)} className="gap-2">
              <Send className="h-4 w-4" /> تحويل طالب
            </Button>
          ) : undefined
        }
      />

      {/* Action options — only for teachers/admin */}
      {canCreate && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setFormOpen(true)}
            className="text-right rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors p-5"
          >
            <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-3">
              <Send className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base">تحويل طالب</h3>
            <p className="text-sm text-muted-foreground mt-1">
              تحويل بيانات الطالب المرصودة في سجل المتابعة إلى الموجه الطلابي أو وكيل شؤون الطلاب بتقرير PDF رسمي.
            </p>
          </button>
        </div>
      )}

      {/* Saved referrals */}
      <Card className="p-0">
        <div className="p-4 border-b">
          <h3 className="font-bold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> سجل التحويلات</h3>
        </div>
        {visibleReferrals.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={canCreate ? "لا توجد تحويلات محفوظة" : "لا توجد إحالات مستلمة"}
            description={canCreate ? "ابدأ بتحويل طالب لإصدار تقرير رسمي وحفظه هنا" : "ستظهر هنا الإحالات المرسلة إليك من المعلمين"}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الطالب</TableHead>
                  <TableHead className="text-right">الصف</TableHead>
                  <TableHead className="text-right">المادة</TableHead>
                  <TableHead className="text-right">الجهة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الردود</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleReferrals.map((r) => {
                  const resCount = responseCountFor(r.id);
                  const status = r.status || "open";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{nameOf(students, r.student_id)}</TableCell>
                      <TableCell>{nameOf(classes, r.class_id)}</TableCell>
                      <TableCell>{r.subject_id ? nameOf(subjects, r.subject_id) : "—"}</TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {RECIPIENT_LABELS[r.recipient] || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${REFERRAL_STATUS_COLORS[status] || "bg-gray-100 text-gray-600"}`}>
                          {REFERRAL_STATUS_LABELS[status] || "مفتوحة"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {resCount > 0 ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                            {resCount} رد
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{r.date}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="عرض التفاصيل والردود" onClick={() => setDetailReferral(r)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canCreate && (
                            <>
                              <Button variant="ghost" size="icon" title="إعادة تصدير PDF" onClick={() => handleReexport(r)} disabled={busyId === r.id}>
                                {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <ReferralForm open={formOpen} onOpenChange={setFormOpen} />
      <ReferralDetailDialog
        referral={detailReferral}
        open={!!detailReferral}
        onOpenChange={(v) => !v && setDetailReferral(null)}
      />
    </div>
  );
}