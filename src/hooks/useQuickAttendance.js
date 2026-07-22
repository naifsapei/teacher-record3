import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { todayStr } from "@/lib/attendanceStatus";
import { useAuth } from "@/lib/AuthContext";
import { ministryNumber } from "@/lib/permissions";

export function useQuickAttendance(classId) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = todayStr();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["attendance-today", classId || "all", today],
    queryFn: () =>
      classId
        ? base44.entities.Attendance.filter({ class_id: classId, date: today })
        : base44.entities.Attendance.filter({ date: today }),
    enabled: classId !== undefined,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ studentId, classId, status, existing }) => {
      if (existing) {
        if (!status) return base44.entities.Attendance.delete(existing.id);
        return base44.entities.Attendance.update(existing.id, { status });
      }
      return base44.entities.Attendance.create({
        student_id: studentId,
        class_id: classId,
        date: today,
        status,
        ministry_number: ministryNumber(user),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (e) => toast.error("تعذّر تحديث الحضور: " + (e?.message || "")),
  });

  const getRecord = (studentId) => records.find((r) => r.student_id === studentId) || null;
  const getStatus = (studentId) => getRecord(studentId)?.status || null;
  const presentCount = records.filter((r) => r.status === "present").length;
  const absentCount = records.filter((r) => r.status === "absent").length;

  return {
    records,
    isLoading,
    getRecord,
    getStatus,
    presentCount,
    absentCount,
    toggle: toggleMutation.mutate,
    isPending: toggleMutation.isPending,
  };
}