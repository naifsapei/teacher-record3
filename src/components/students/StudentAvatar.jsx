import { User } from "lucide-react";
import { resolveStudentAvatar } from "@/lib/studentAvatar";

export default function StudentAvatar({ me, student, size = "h-16 w-16", className = "" }) {
  const av = resolveStudentAvatar(me);
  if (av.type === "image") {
    return (
      <img
        src={av.url}
        alt={student?.name || ""}
        className={`${size} rounded-full object-cover border-2 border-background shadow-sm ${className}`}
      />
    );
  }
  const initials = (student?.name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("");
  return (
    <div className={`${size} rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold ${className}`}>
      {initials ? <span className="text-lg">{initials}</span> : <User className="h-6 w-6" />}
    </div>
  );
}