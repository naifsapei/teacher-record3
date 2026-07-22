import { Check, X } from "lucide-react";

export default function QuickAttendanceToggle({ studentId, classId, record, onToggle }) {
  const status = record?.status || null;
  const toggle = (newStatus) => onToggle(studentId, classId, newStatus, record);

  return (
    <div className="flex items-center gap-1 justify-center">
      <button
        type="button"
        onClick={() => toggle(status === "present" ? null : "present")}
        title="حاضر"
        className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors border ${
          status === "present"
            ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
            : "bg-white text-muted-foreground border-border hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300"
        }`}
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => toggle(status === "absent" ? null : "absent")}
        title="غائب"
        className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors border ${
          status === "absent"
            ? "bg-red-500 text-white border-red-500 shadow-sm"
            : "bg-white text-muted-foreground border-border hover:bg-red-50 hover:text-red-600 hover:border-red-300"
        }`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}