import { getEvalIcon, getCategory } from "./evalIcons";

export default function EvalPicker({ items, onPick }) {
  if (!items || items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground p-3 text-center">
        لا توجد عناصر تقييم مفعّلة.
        <br />
        فعّلها من الإعدادات.
      </p>
    );
  }
  return (
    <div className="space-y-0.5 max-h-64 overflow-y-auto">
      <p className="text-[10px] font-bold text-muted-foreground px-2 pb-1.5">اختر عنصر التقييم</p>
      {items.map((it) => {
        const cat = getCategory(it.category);
        const Icon = getEvalIcon(it.icon_key);
        return (
          <button
            key={it.id}
            onClick={() => onPick(it)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted transition-colors text-right"
          >
            <span className={`h-7 w-7 rounded-full flex items-center justify-center text-white shrink-0 ${cat.bg}`}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="flex-1 text-xs font-medium text-foreground truncate">{it.name}</span>
            <span className={`text-[10px] font-bold ${cat.text}`}>
              {it.points > 0 ? "+" : ""}{it.points}
            </span>
          </button>
        );
      })}
    </div>
  );
}