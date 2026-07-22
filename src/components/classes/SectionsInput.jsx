import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

// مُدخل الشعب: إضافة عدة شعب (أ، ب، ج ...) مع إزالة سريعة.
export default function SectionsInput({ sections = [], onChange }) {
  const [draft, setDraft] = useState("");

  const add = (val) => {
    const v = (val || "").trim();
    if (!v) return;
    if (sections.includes(v)) { setDraft(""); return; }
    onChange([...sections, v]);
    setDraft("");
  };

  const remove = (val) => onChange(sections.filter((s) => s !== val));

  const onKey = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    }
  };

  return (
    <div className="space-y-2">
      <Label>الشعب *</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder="اكتب الشعبة ثم Enter (مثال: أ)"
        />
        <Button type="button" variant="outline" className="gap-1 shrink-0" onClick={() => add(draft)}>
          <Plus className="h-4 w-4" /> إضافة
        </Button>
      </div>
      {sections.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {sections.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 text-sm rounded-md bg-primary/10 text-primary font-medium">
              {s}
              <button type="button" onClick={() => remove(s)} className="hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}