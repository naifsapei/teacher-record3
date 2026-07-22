import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export const AUTO_BACKUP_PREFIX = "نسخة تلقائية";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function isAutoBackup(backup) {
  return (backup?.name || "").startsWith(AUTO_BACKUP_PREFIX);
}

export default function AutoBackup() {
  const qc = useQueryClient();
  const ranRef = useRef(false);
  const { data: backups = [], isFetched } = useQuery({
    queryKey: ["backups"],
    queryFn: () => base44.entities.Backup.list("-created_date", 50),
  });

  useEffect(() => {
    if (ranRef.current || !isFetched) return;
    ranRef.current = true;
    (async () => {
      try {
        const latestAuto = backups.find(isAutoBackup);
        const lastDate = latestAuto?.created_date ? new Date(latestAuto.created_date).getTime() : 0;
        if (Date.now() - lastDate < WEEK_MS) return;
        const [students, grades, classes, subjects] = await Promise.all([
          base44.entities.Student.list(),
          base44.entities.Grade.list(),
          base44.entities.Class.list(),
          base44.entities.Subject.list(),
        ]);
        const data = JSON.stringify({ students, grades, classes, subjects, auto: true });
        const dateStr = new Date().toISOString().slice(0, 10);
        await base44.entities.Backup.create({
          name: `${AUTO_BACKUP_PREFIX} - ${dateStr}`,
          data,
          type: "full",
        });
        qc.invalidateQueries({ queryKey: ["backups"] });
      } catch {
        // silent — auto backup should never disrupt the user
      }
    })();
  }, [isFetched, backups, qc]);

  return null;
}