import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Plus } from "lucide-react";
import { getEvalIcon, getCategory } from "./evalIcons";
import EvalPicker from "./EvalPicker";

export default function EvalChips({ records, items, onApply, onRemove }) {
  const [openIdx, setOpenIdx] = useState(null);

  const groups = [];
  const map = {};
  (records || []).forEach((r) => {
    const key = (r.action_label || "") + "|" + (r.category || "");
    if (!map[key]) {
      map[key] = { label: r.action_label, category: r.category, icon_key: r.icon_key, records: [] };
      groups.push(map[key]);
    }
    map[key].records.push(r);
  });

  const emptySlots = Math.max(3, 6 - groups.length);

  const handlePick = (item) => {
    onApply(item);
    setOpenIdx(null);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap justify-start">
      {groups.map((g, idx) => {
        const cat = getCategory(g.category);
        const Icon = getEvalIcon(g.icon_key);
        return (
          <button
            key={idx}
            onClick={() => onRemove(g.records[g.records.length - 1])}
            title={`${g.label} (إزالة)`}
            className="relative shrink-0"
          >
            <span className={`h-9 w-9 rounded-full flex items-center justify-center text-white shadow-sm ${cat.bg}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="absolute -top-1.5 -left-1.5 h-4 min-w-4 px-1 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-white">
              {g.records.length}
            </span>
          </button>
        );
      })}

      {Array.from({ length: emptySlots }).map((_, i) => (
        <Popover key={"e" + i} open={openIdx === i} onOpenChange={(o) => setOpenIdx(o ? i : null)}>
          <PopoverTrigger asChild>
            <button
              className="h-9 w-9 rounded-full border-2 border-dashed border-border bg-muted/40 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors shrink-0"
              aria-label="إضافة تقييم"
            >
              <Plus className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="center" dir="rtl">
            <EvalPicker items={items} onPick={handlePick} />
          </PopoverContent>
        </Popover>
      ))}
    </div>
  );
}