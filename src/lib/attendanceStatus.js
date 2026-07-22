export const ATTENDANCE_STATUS = {
  present: { label: "حاضر", short: "ح", color: "text-emerald-700 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  absent: { label: "غائب", short: "غ", color: "text-red-700 bg-red-50 border-red-200", dot: "bg-red-500" },
  late: { label: "متأخر", short: "م", color: "text-amber-700 bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  excused: { label: "بعذر", short: "ع", color: "text-blue-700 bg-blue-50 border-blue-200", dot: "bg-blue-500" },
};

export const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};