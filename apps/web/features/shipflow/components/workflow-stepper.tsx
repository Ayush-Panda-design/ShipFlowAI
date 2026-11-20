"use client";

import {
  Check,
  Lightbulb,
  MessagesSquare,
  FileText,
  ListChecks,
  Code2,
  ShieldCheck,
  Rocket,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  getWorkflowJourney,
  type MilestoneKey,
  type NextAction,
} from "@/features/shipflow/lib/workflow-journey";
import { cn } from "@/lib/utils";

const MILESTONE_ICONS: Record<MilestoneKey, LucideIcon> = {
  request: Lightbulb,
  clarify: MessagesSquare,
  prd: FileText,
  plan: ListChecks,
  build: Code2,
  review: ShieldCheck,
  ship: Rocket,
};

const TONE_STYLES: Record<
  NextAction["tone"],
  { container: string; dot: string; title: string }
> = {
  info: {
    container: "border-border bg-surface-sunken/70",
    dot: "bg-muted-foreground",
    title: "text-foreground",
  },
  action: {
    container: "border-brand/20 bg-brand-soft/70",
    dot: "bg-brand motion-safe:animate-pulse",
    title: "text-foreground",
  },
  running: {
    container: "border-amber/40 bg-amber-soft",
    dot: "bg-status-warning animate-pulse",
    title: "text-foreground",
  },
  success: {
    container: "border-success/25 bg-success-soft",
    dot: "bg-status-success",
    title: "text-foreground",
  },
  blocked: {
    container: "border-danger/25 bg-danger-soft",
    dot: "bg-destructive",
    title: "text-foreground",
  },
};

export function WorkflowStepper({
  status,
  taskGenerationActive = false,
}: {
  status: string;
  /** Client-side flag while POST /generate-tasks is in flight. */
  taskGenerationActive?: boolean;
}) {
  const journey = getWorkflowJourney(status);
  const tone = TONE_STYLES[journey.nextAction.tone];
  const showIndeterminate =
    journey.nextAction.inFlight || (taskGenerationActive && status === "planning");

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-5 pt-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="sf-eyebrow">
              Delivery progress
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {showIndeterminate ? "Working…" : `${journey.percent}%`}
            </span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
            {showIndeterminate ? (
              <div
                className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-brand via-amber to-amber motion-safe:animate-[task-gen-slide_1.4s_ease-in-out_infinite]"
                aria-hidden
              />
            ) : (
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand via-amber to-amber transition-all duration-700 ease-out"
                style={{ width: `${journey.percent}%` }}
              />
            )}
          </div>
        </div>

        <ol className="flex items-start gap-1 overflow-x-auto pb-1">
          {journey.milestones.map((milestone, index) => {
            const Icon = MILESTONE_ICONS[milestone.key];
            const isDone = milestone.state === "done";
            const isCurrent = milestone.state === "current";

            return (
              <li
                key={milestone.key}
                className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
              >
                <div className="flex w-full items-center">
                  <span
                    className={cn(
                      "h-0.5 flex-1 rounded-full transition-colors",
                      index === 0
                        ? "bg-transparent"
                        : isDone || isCurrent
                          ? "bg-success/60"
                          : "bg-border",
                    )}
                  />
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                      isDone &&
                        "border-success bg-success text-white",
                      isCurrent &&
                        "border-brand bg-brand-soft text-brand shadow-[0_0_0_5px_var(--brand-soft)] motion-safe:animate-[sf-ring_2.4s_ease-in-out_infinite]",
                      !isDone &&
                        !isCurrent &&
                        "border-border bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {isDone ? (
                      <Check className="size-4 sf-pop" strokeWidth={3} />
                    ) : (
                      <Icon className="size-4" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "h-0.5 flex-1 rounded-full transition-colors",
                      index === journey.milestones.length - 1
                        ? "bg-transparent"
                        : isDone
                          ? "bg-success/60"
                          : "bg-border",
                    )}
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate text-xs font-medium",
                      isCurrent
                        ? "text-foreground"
                        : isDone
                          ? "text-foreground/80"
                          : "text-muted-foreground",
                    )}
                  >
                    {milestone.label}
                  </p>
                  <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
                    {milestone.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div
          className={cn(
            "flex items-start gap-3 rounded-lg border px-4 py-3",
            tone.container,
          )}
        >
          <span
            className={cn("mt-1.5 size-2 shrink-0 rounded-full", tone.dot)}
          />
          <div className="min-w-0">
            <p className={cn("text-sm font-semibold", tone.title)} aria-live="polite">
              {journey.nextAction.inFlight ? "In progress · " : "Next step · "}
              {journey.nextAction.title}
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              {journey.nextAction.hint}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
