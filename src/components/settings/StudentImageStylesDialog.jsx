import { useState } from "react";
import { Check, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BOY_AVATAR_URL, GIRL_AVATAR_URL, getStudentAvatarStyle, setStudentAvatarStyle } from "@/lib/studentAvatar";

export default function StudentImageStylesDialog({ open, onOpenChange, me }) {
  const [selected, setSelected] = useState(() => getStudentAvatarStyle());
  const isBoys = me?.gender === "male";
  const isGirls = me?.gender === "female";

  const options = [
    { id: "initials", label: "الأحرف الأولى", preview: <User className="h-8 w-8 text-primary" /> },
  ];
  if (isBoys) {
    options.unshift({
      id: "boy_icon",
      label: "طالب بالزي العربي",
      preview: <img src={BOY_AVATAR_URL} alt="طالب" className="h-14 w-14 rounded-full object-cover" />,
    });
  }
  if (isGirls) {
    options.unshift({
      id: "girl_icon",
      label: "طالبة بالزي المدرسي",
      preview: <img src={GIRL_AVATAR_URL} alt="طالبة" className="h-14 w-14 rounded-full object-cover" />,
    });
  }

  const save = () => {
    setStudentAvatarStyle(selected);
    toast.success("تم حفظ نمط صورة الطالب");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>أنماط صور الطلاب</DialogTitle>
          <DialogDescription>
            اختر النمط الذي يظهر كأيقونة لملف الطالب{isBoys ? " (مدارس البنين)" : " (مدارس البنات)"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-2">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setSelected(o.id)}
              className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all ${
                selected === o.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              {selected === o.id && (
                <span className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              )}
              <span className="h-14 w-14 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {o.preview}
              </span>
              <span className="text-xs font-medium text-center text-foreground leading-tight">{o.label}</span>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}