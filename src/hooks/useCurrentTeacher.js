import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export function useCurrentTeacher() {
  const { user } = useAuth();
  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => base44.entities.Teacher.list(),
  });
  const currentTeacher = useMemo(
    () => teachers.find((t) => t.user_id === user?.id) || null,
    [teachers, user]
  );
  return { currentTeacher, teachers };
}