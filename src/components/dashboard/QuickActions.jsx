import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  NotebookPen, CalendarCheck, ClipboardList, Award, Star, Users,
  FileText, CalendarDays, BarChart2, Settings, SlidersHorizontal,
  BookOpen, GraduationCap, Brain, Target, ClipboardCheck, Compass,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const STORAGE_KEY = "quick_actions_v1";
const MAX_ITEMS = 8;

export const AVAILABLE_ACTIONS = [
  { id: "notes", label: "ملاحظاتي", icon: NotebookPen, to: "/notes", theme: "teal" },
  { id: "attendance", label: "تسجيل الحضور", icon: CalendarCheck, to: "/attendance", theme: "green" },
  { id: "tracking", label: "سجل المتابعة", icon: ClipboardList, to: "/student-tracking", theme: "violet" },
  { id: "achievements", label: "ملف الإنجاز", icon: Award, to: "/student-achievements", theme: "amber" },
  { id: "grades", label: "الدرجات والتقييم", icon: Star, to: "/grades", theme: "blue" },
  { id: "students", label: "الطلاب", icon: Users, to: "/students", theme: "indigo" },
  { id: "classes", label: "الصفوف", icon: BookOpen, to: "/classes", theme: "sky" },
  { id: "subjects", label: "المواد", icon: GraduationCap, to: "/subjects", theme: "purple" },
  { id: "classification", label: "تصنيف الطلاب", icon: Brain, to: "/student-classification", theme: "fuchsia" },
  { id: "class_analysis", label: "تحليل أداء الفصول", icon: Target, to: "/subject-class-analysis", theme: "lime" },
  { id: "remedial", label: "خطط علاجية", icon: ClipboardCheck, to: "/remedial-plans", theme: "teal" },
  { id: "reports", label: "التقارير", icon: FileText, to: "/reports", theme: "rose" },
  { id: "teacher-needs", label: "احتياجات المعلم", icon: Compass, to: "/teacher-needs", theme: "orange" },
  { id: "teacher-tests", label: "الاختبارات وأوراق العمل", icon: FileText, to: "/teacher-tests", theme: "sky" },
  { id: "teacher-reports", label: "التقارير المدرسية", icon: FileText, to: "/teacher-reports", theme: "violet" },
  { id: "schedule", label: "جدول الحصص", icon: CalendarDays, to: "/schedule", theme: "orange" },
  { id: "analytics", label: "التحليلات", icon: BarChart2, to: "/analytics", theme: "cyan" },
  { id: "settings", label: "الإعدادات", icon: Settings, to: "/settings", theme: "emerald" },
];

const THEME = {
  teal: "bg-teal-50 text-teal-600",
  green: "bg-green-50 text-green-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  blue: "bg-blue-50 text-blue-600",
  indigo: "bg-indigo-50 text-indigo-600",
  rose: "bg-rose-50 text-rose-600",
  orange: "bg-orange-50 text-orange-600",
  cyan: "bg-cyan-50 text-cyan-600",
  emerald: "bg-emerald-50 text-emerald-600",
  sky: "bg-sky-50 text-sky-600",
  purple: "bg-purple-50 text-purple-600",
  fuchsia: "bg-fuchsia-50 text-fuchsia-600",
  lime: "bg-lime-50 text-lime-600",
};

const loadSelected = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) return ids.filter((id) => AVAILABLE_ACTIONS.some((a) => a.id === id));
    }
  } catch { /* تجاهل */ }
  return AVAILABLE_ACTIONS.slice(0, MAX_ITEMS).map((a) => a.id);
};

export default function QuickActions() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(loadSelected);
  const [open, setOpen] = useState(false);

  const persist = (ids) => {
    setSelected(ids);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch { /* تجاهل */ }
  };

  const toggle = (id) => {
    if (selected.includes(id)) {
      persist(selected.filter((x) => x !== id));
    } else if (selected.length < MAX_ITEMS) {
      persist([...selected, id]);
    } else {
      toast.info(`يمكن تفعيل حتى ${MAX_ITEMS} إجراءات فقط`);
    }
  };

  const items = selected
    .map((id) => AVAILABLE_ACTIONS.find((a) => a.id === id))
    .filter(Boolean);

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="font-semibold text-sm text-foreground">إجراءات سريعة</h3>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> تخصيص
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {items.map((a) => {
          const Icon = a.icon;
          return (
            <button
              type="button"
              key={a.id}
              onClick={() => navigate(a.to)}
              className="flex flex-col items-center gap-1.5 group focus:outline-none"
            >
              <span
                className={`h-11 w-11 rounded-xl flex items-center justify-center ${THEME[a.theme]} group-active:scale-95 transition-transform`}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="text-[11px] font-medium text-center text-foreground leading-tight line-clamp-2">
                {a.label}
              </span>
            </button>
          );
        })}
        {items.length === 0 && (
          <p className="col-span-4 text-xs text-muted-foreground text-center py-5">
            لا توجد إجراءات مفعّلة — اضغط «تخصيص» لاختيارها
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تخصيص الإجراءات السريعة</DialogTitle>
            <DialogDescription>
              اختر الإجراءات التي تظهر في لوحتك ({selected.length}/{MAX_ITEMS})
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto pr-1">
            {AVAILABLE_ACTIONS.map((a) => {
              const Icon = a.icon;
              const on = selected.includes(a.id);
              const disabled = !on && selected.length >= MAX_ITEMS;
              return (
                <div
                  key={a.id}
                  className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${on ? "border-primary/30 bg-primary/5" : "border-border"}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${THEME[a.theme]}`}>
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="text-sm font-medium text-foreground">{a.label}</span>
                  </div>
                  <Switch checked={on} disabled={disabled} onCheckedChange={() => toggle(a.id)} />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>تم</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}