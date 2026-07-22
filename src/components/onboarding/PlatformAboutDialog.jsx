import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, Target, Sparkles, Users, ListChecks, X } from "lucide-react";
import { PLATFORM_ABOUT } from "@/lib/onboardingContent";

export default function PlatformAboutDialog({ open, onOpenChange, trigger }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  return (
    <>
      {trigger !== false && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors py-2"
        >
          <HelpCircle className="h-4 w-4" />
          نبذة تعريفية عن منصة سجل المعلم
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">نبذة عن المنصة</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">تعريف مختصر بالمنصة وخدماتها</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* الفكرة والهدف */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">فكرة المنصة وهدفها</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{PLATFORM_ABOUT.idea}</p>
              <ul className="mt-2 space-y-1.5">
                {PLATFORM_ABOUT.goals.map((g, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-accent mt-0.5">✓</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* الخدمات */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">الخدمات التي نقدمها</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PLATFORM_ABOUT.services.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* الفئات المستفيدة */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">الفئات المستفيدة</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_ABOUT.audiences.map((a, i) => (
                  <span key={i} className="text-xs font-medium bg-primary/5 text-primary border border-primary/20 rounded-full px-3 py-1.5">
                    {a}
                  </span>
                ))}
              </div>
            </section>

            {/* طريقة الاستفادة */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <ListChecks className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">كيف تستفيد من المنصة</h3>
              </div>
              <ol className="space-y-2">
                {PLATFORM_ABOUT.howToUse.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-muted-foreground leading-relaxed pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className="pt-2">
            <Button className="w-full" onClick={() => setOpen(false)}>
              فهمت، شكراً
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}