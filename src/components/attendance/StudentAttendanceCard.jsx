import { CheckCircle2, XCircle, Clock, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StudentAvatar from "@/components/students/StudentAvatar";

const STATUS_BUTTONS = [
  { key: "present", label: "حاضر",  icon: CheckCircle2, active: "bg-emerald-500 text-white shadow-emerald-200 shadow-md ring-2 ring-emerald-300",     inactive: "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100" },
  { key: "absent",  label: "غياب",   icon: XCircle,      active: "bg-red-500 text-white shadow-red-200 shadow-md ring-2 ring-red-300",                inactive: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" },
  { key: "late",    label: "متأخر", icon: Clock,         active: "bg-amber-500 text-white shadow-amber-200 shadow-md ring-2 ring-amber-300",           inactive: "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100" },
  { key: "excused", label: "معذور", icon: ShieldAlert,   active: "bg-blue-500 text-white shadow-blue-200 shadow-md ring-2 ring-blue-300",              inactive: "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100" },
];

const STATUS_COLORS = {
  present: "border-r-4 border-r-emerald-400 bg-white",
  absent:  "border-r-4 border-r-red-400 bg-red-50/40",
  late:    "border-r-4 border-r-amber-400 bg-amber-50/40",
  excused: "border-r-4 border-r-blue-400 bg-blue-50/40",
};

const MINI_STAT = [
  { key: "present", label: "حضور",  icon: CheckCircle2, cls: "text-emerald-700 bg-emerald-50 border border-emerald-200" },
  { key: "absent",  label: "غياب",   icon: XCircle,      cls: "text-red-700 bg-red-50 border border-red-200" },
  { key: "late",    label: "تأخر",   icon: Clock,        cls: "text-amber-700 bg-amber-50 border border-amber-200" },
];

export default function StudentAttendanceCard({ student, index, status, onStatusChange, stats }) {
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const s = stats || { present: 0, absent: 0, late: 0, excused: 0 };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`rounded-2xl shadow-sm overflow-hidden transition-all duration-200 ${STATUS_COLORS[status] || STATUS_COLORS.present}`}
    >
      <div className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          {/* Avatar */}
          <StudentAvatar me={me} student={student} size="h-11 w-11 sm:h-12 sm:w-12" className="ring-2 ring-background shadow" />

          {/* Name + number + mini stats */}
          <div className="flex-1 min-w-0 sm:px-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-foreground text-[15px] leading-snug break-words line-clamp-2">{student.name}</p>
                {student.student_number && (
                  <p className="text-xs text-muted-foreground mt-0.5">#{student.student_number}</p>
                )}
              </div>
            </div>

            {/* Stats chips — clearly separated row */}
            <div className="flex items-center gap-1.5 mt-2">
              {MINI_STAT.map((m) => {
                const Icon = m.icon;
                return (
                  <span key={m.key} className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg ${m.cls}`}>
                    <Icon className="h-3 w-3" strokeWidth={2.5} />
                    <span>{s[m.key] || 0}</span>
                    <span className="opacity-80">{m.label}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Status Buttons — separated, responsive */}
          <div className="flex gap-1.5 flex-shrink-0 sm:flex-col sm:gap-1.5 justify-start">
            {STATUS_BUTTONS.map((btn) => {
              const Icon = btn.icon;
              const isActive = status === btn.key;
              return (
                <motion.button
                  key={btn.key}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => onStatusChange(btn.key)}
                  title={btn.label}
                  className={`h-9 w-9 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center transition-all duration-150 ${isActive ? btn.active : btn.inactive}`}
                >
                  <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 2} />
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}