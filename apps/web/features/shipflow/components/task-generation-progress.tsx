"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const PHASES = [
  { afterSec: 0, label: "Reading your PRD…" },
  { afterSec: 3, label: "AI is drafting tasks…" },
  { afterSec: 15, label: "Finishing up — saving tasks…" },
  { afterSec: 35, label: "Still working — large specs can take up to a minute…" },
] as const;

function phaseForElapsed(seconds: number) {
  let current: (typeof PHASES)[number] = PHASES[0];
  for (const phase of PHASES) {
    if (seconds >= phase.afterSec) current = phase;
  }
  return current;
}

export function TaskGenerationProgress({ className }: { className?: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const phase = phaseForElapsed(elapsed);

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs text-muted-foreground">{phase.label}</p>
      <p className="text-[11px] text-muted-foreground/80">
        {elapsed < 10
          ? "Usually finishes in 10–20 seconds"
          : `${elapsed}s elapsed — please keep this tab open`}
      </p>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-violet-500/15">
        <div
          className="absolute inset-y-0 w-1/3 rounded-full bg-violet-500 motion-safe:animate-[task-gen-slide_1.4s_ease-in-out_infinite]"
          aria-hidden
        />
      </div>
    </div>
  );
}
