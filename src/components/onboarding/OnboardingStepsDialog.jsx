import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getOnboardingSteps, getRoleWelcomeTitle } from "@/lib/onboardingContent";
import { ChevronLeft, CheckCircle2, SkipForward, HelpCircle } from "lucide-react";
import { toast } from "sonner";

export default function OnboardingStepsDialog({ open, onOpenChange, me, onComplete }) {
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const steps = getOnboardingSteps(me);
  const totalSteps = steps.length;

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!me || totalSteps === 0) return null;

  const current = steps[step];
  const Icon = current?.icon || HelpCircle;
  const isLast = step === totalSteps - 1;

  const complete = async () => {
    setCompleting(true);
    try {
      if (onComplete) await onComplete();
    } catch (e) {
      console.error("onboarding complete failed", e);
    } finally {
      setCompleting(false);
      onOpenChange?.(false);
    }
  };

  const skip = () => {
    onOpenChange?.(false);
    toast.info("يمكنك مراجعة الدليل لاحقاً من الإعدادات");
  };

  const next = () => {
    if (isLast) complete();
    else setStep((s) => s + 1);
  };

  const prev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) skip(); else onOpenChange?.(o); }}>
      <DialogContent className="max-w-md" dir="rtl">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-accent" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <Icon className="h-10 w-10 text-primary" strokeWidth={1.8} />
          </div>
        </div>

        {/* Content */}
        <div className="text-center px-2">
          {step === 0 && (
            <p className="text-xs text-accent font-semibold mb-1">{getRoleWelcomeTitle(me)}</p>
          )}
          <h2 className="text-lg font-bold text-foreground mb-2">{current?.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{current?.description}</p>
        </div>

        {/* Step indicator */}
        <p className="text-center text-xs text-muted-foreground mt-2">
          الخطوة {step + 1} من {totalSteps}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={prev} disabled={completing}>
              السابق
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={skip} disabled={completing} className="mr-auto text-muted-foreground">
            <SkipForward className="h-4 w-4" />
            تخطي
          </Button>
          <Button size="sm" onClick={next} disabled={completing} className="gap-1.5">
            {completing ? (
              "جارٍ الحفظ..."
            ) : isLast ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                ابدأ الآن
              </>
            ) : (
              <>
                التالي
                <ChevronLeft className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}