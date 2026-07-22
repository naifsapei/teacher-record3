import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, ChevronLeft, Plus, FileText, ClipboardCheck } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EventDialog from "@/components/calendar/EventDialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { ministryNumber } from "@/lib/permissions";

const WEEK_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const TYPE_META = {
  exam: { label: "اختبار", icon: ClipboardCheck, dot: "bg-red-500", chip: "bg-red-100 text-red-700 border-red-200" },
  assignment: { label: "مهمة", icon: FileText, dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700 border-amber-200" },
};

const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function Calendar() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [defaultDate, setDefaultDate] = useState("");

  const { data: events = [] } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: () => base44.entities.CalendarEvent.list(),
  });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => base44.entities.Class.list() });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => base44.entities.Subject.list() });

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((e) => { if (e.date) (map[e.date] ||= []).push(e); });
    return map;
  }, [events]);

  const grid = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startOffset = first.getDay(); // 0 = Sunday
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells = [];
    // leading blanks
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.y, cursor.m, d));
    // trailing to fill 42
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const isToday = (d) => d && fmt(d) === fmt(today);

  const openNew = (dateStr) => {
    setEditing(null);
    setDefaultDate(dateStr || fmt(today));
    setDialogOpen(true);
  };

  const openEdit = (ev) => {
    setEditing(ev);
    setDefaultDate(ev.date);
    setDialogOpen(true);
  };

  const handleSave = async (payload) => {
    if (editing) {
      await base44.entities.CalendarEvent.update(editing.id, payload);
    } else {
      await base44.entities.CalendarEvent.create({ ...payload, ministry_number: ministryNumber(user) });
    }
    qc.invalidateQueries({ queryKey: ["calendar-events"] });
    setDialogOpen(false);
  };

  const handleDelete = async (ev) => {
    await base44.entities.CalendarEvent.delete(ev.id);
    qc.invalidateQueries({ queryKey: ["calendar-events"] });
    setDialogOpen(false);
  };

  const shift = (delta) =>
    setCursor((c) => {
      const m = c.m + delta;
      if (m < 0) return { y: c.y - 1, m: 11 };
      if (m > 11) return { y: c.y + 1, m: 0 };
      return { y: c.y, m };
    });

  const upcoming = useMemo(() => {
    const now = fmt(today);
    return events
      .filter((e) => e.date >= now)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(0, 5);
  }, [events]);

  return (
    <div>
      <PageHeader
        title="تقويم المعلم"
        description="جدولة مواعيد الاختبارات وتسليم المهام الدراسية لتنظيم العمل وتجنب النسيان"
        actions={<Button onClick={() => openNew("")}><Plus className="h-4 w-4" /> حدث جديد</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="السابق">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-bold">{MONTHS[cursor.m]} {cursor.y}</h2>
            <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="التالي">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEK_DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              if (!d) return <div key={i} className="min-h-[80px] rounded-lg bg-muted/30" />;
              const ds = fmt(d);
              const dayEvents = eventsByDate[ds] || [];
              const todayCls = isToday(d);
              return (
                <button
                  key={i}
                  onClick={() => openNew(ds)}
                  className={cn(
                    "min-h-[80px] rounded-lg border p-1.5 text-right flex flex-col gap-1 transition-colors",
                    todayCls ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <span className={cn(
                    "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                    todayCls ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}>
                    {d.getDate()}
                  </span>
                  <div className="space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const meta = TYPE_META[ev.type] || TYPE_META.exam;
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                          className={cn("text-[10px] px-1.5 py-0.5 rounded border truncate flex items-center gap-1", meta.chip)}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dot)} />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <p className="text-[10px] text-muted-foreground">+{dayEvents.length - 2}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> اختبار</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> تسليم مهمة</span>
          </div>
        </Card>

        {/* Upcoming events */}
        <Card className="p-4">
          <h3 className="font-bold mb-3">الأحداث القادمة</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">لا توجد أحداث قادمة</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((ev) => {
                const meta = TYPE_META[ev.type] || TYPE_META.exam;
                const cls = classes.find((c) => c.id === ev.class_id);
                return (
                  <button
                    key={ev.id}
                    onClick={() => openEdit(ev)}
                    className="w-full text-right rounded-xl border p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", meta.chip)}>{meta.label}</span>
                      <span className="text-xs text-muted-foreground mr-auto">{ev.date}</span>
                    </div>
                    <p className="font-semibold text-sm mt-1.5 truncate">{ev.title}</p>
                    {cls && <p className="text-xs text-muted-foreground mt-0.5">{cls.name}</p>}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editing}
        defaultDate={defaultDate}
        classes={classes}
        subjects={subjects}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}