import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import OnboardingStepsDialog from "@/components/onboarding/OnboardingStepsDialog";
import { getOnboardingSteps } from "@/lib/onboardingContent";

export default function WelcomeOnboarding() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const [open, setOpen] = useState(false);

  const steps = getOnboardingSteps(me);
  const showOnboarding = me && !me.onboarding_completed && steps.length > 0;

  useEffect(() => {
    if (showOnboarding) {
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [showOnboarding]);

  if (!showOnboarding) return null;

  const complete = async () => {
    try {
      await base44.auth.updateMe({ onboarding_completed: true });
      qc.invalidateQueries(["me"]);
    } catch (e) {
      console.error("onboarding mark failed", e);
    }
  };

  return <OnboardingStepsDialog open={open} onOpenChange={setOpen} me={me} onComplete={complete} />;
}